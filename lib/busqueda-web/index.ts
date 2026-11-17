import { leerAjustesIa } from '@/lib/ia/ajustes';
import { registrarAtajadas } from '@/lib/ia/atajadas';
import { marcarFallaDeRegla } from '@/lib/ia/claude';
import type { Cambio } from '@/lib/ia/reglas';
import { mensajeDeCorreccion, revisarFicha } from '@/lib/ia/revisar';
import { nombresBase, claveNombre } from '@/lib/spec-sugerencias';
import { buscarEnLaWeb, dominioDe } from './buscadores';
import { codigoUtil } from './codigo-barras';
import { descargar } from './descarga';
import { especificacionesDe, type EspecificacionHallada } from './especificaciones';
import { cajaDesdeProducto, estimarPorTipo } from './estimar';
import { extraerDatos, type DatosPagina } from './extraer';
import { buscarConClaude, leerConClaude } from './claude';
import { buscarConGroq, leerConGroq, type BusquedaGroq, type LecturaGroq } from './groq';
import { redactarDescripcion } from './redactar';
import { clave, palabras, textoPlano } from './texto';
import type { EspecificacionWeb, FuenteWeb, Hallazgo, MedidasCaja, ResultadoBusquedaWeb } from './tipos';
import { comoTexto, ordenadas, redondear } from './unidades';

// Buscar un producto en la web desde el asistente (C-155). Solo servidor.
// Decisiones de Andrés del 01/10: un botón por producto; sin API de pago, leyendo páginas; trae descripción, peso y
// medidas de la caja, especificaciones, marca y código de barras; busca por modelo y nombre; y si no encuentra las
// medidas propone un estimado, marcado como tal.
//
// Todo lo que sale de aquí es una sugerencia: el asistente la muestra y Andrés decide qué usar. Nada se guarda solo.

const PAGINAS_MAXIMAS = 6;
const ESPECIFICACIONES_MAXIMAS = 12;
/** Con este número de datos reconocidos no hace falta una segunda búsqueda */
const FICHA_SUFICIENTE = 5;

export interface PedidoBusqueda {
  nombre: string;
  /** Modelo o referencia del fabricante, si se conoce */
  modelo?: string;
  /** Nombre de la categoría del producto en la tienda */
  categoria?: string;
}

/** Los números del nombre (modelo, capacidad) tienen que estar en la página: "A400 480GB" no es "A400 240GB" */
function numerosDe(texto: string): string[] {
  return [...new Set(clave(texto).match(/\d{2,}/g) ?? [])];
}

/** De 0 a 1: cuánto se parece una página al producto buscado. 0 si falta alguno de sus números */
export function parecido(buscado: string, pagina: string): number {
  const texto = clave(pagina);
  const numeros = new Set(texto.match(/\d{2,}/g) ?? []);
  if (numerosDe(buscado).some((n) => !numeros.has(n))) return 0;
  const buscadas = palabras(buscado).filter((p) => !/^\d+$/.test(p));
  if (buscadas.length === 0) return 1;
  const presentes = new Set(texto.split(' '));
  // "480gb" en el nombre y "480 GB" en la página son lo mismo
  const junto = texto.replace(/ /g, '');
  const aciertos = buscadas.filter((p) => presentes.has(p) || (p.length >= 4 && junto.includes(p))).length;
  return aciertos / buscadas.length;
}

function masRepetido<T>(valores: T[], llave: (v: T) => string): { valor: T; veces: number } | null {
  const cuenta = new Map<string, { valor: T; veces: number }>();
  for (const v of valores) {
    const k = llave(v);
    const fila = cuenta.get(k) ?? { valor: v, veces: 0 };
    fila.veces += 1;
    cuenta.set(k, fila);
  }
  // Con empate gana el primero: las páginas vienen ordenadas por el buscador
  return [...cuenta.values()].sort((a, b) => b.veces - a.veces)[0] ?? null;
}

function mediana(valores: number[]): number {
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.floor((orden.length - 1) / 2)];
}

interface PaginaLeida {
  fuente: FuenteWeb;
  datos: DatosPagina;
  especificaciones: EspecificacionHallada[];
}

/** Base pública de códigos de barras (100 consultas al día sin clave). Solo se usa si las páginas no dieron el código */
async function buscarEnUpcItemDb(buscado: string): Promise<{ codigo: string; marca: string } | null> {
  try {
    const pagina = await descargar(
      `https://api.upcitemdb.com/prod/trial/search?s=${encodeURIComponent(buscado)}&match_mode=0&type=product`,
      { acepta: 'json', tiempoMs: 5000 },
    );
    const json = JSON.parse(pagina.texto) as { items?: Array<{ ean?: string; upc?: string; title?: string; brand?: string }> };
    for (const item of (json.items ?? []).slice(0, 20)) {
      const titulo = textoPlano(item.title ?? '', 200);
      if (parecido(buscado, titulo) < 0.75) continue;
      const codigo = codigoUtil(item.upc ?? '') || codigoUtil(item.ean ?? '');
      if (codigo) return { codigo, marca: textoPlano(item.brand ?? '', 60) };
    }
  } catch {
    // Sin esta fuente la búsqueda sigue igual
  }
  return null;
}

/** Una copia de la ficha para armarla otra vez (con la segunda respuesta de Claude) sin pisar la primera */
function clonar(r: ResultadoBusquedaWeb): ResultadoBusquedaWeb {
  return { ...r, fuentes: [...r.fuentes], especificaciones: [...r.especificaciones], avisos: [...r.avisos] };
}

/**
 * C-288: las reglas de la tienda sobre la ficha ya armada (lib/ia/revisar.ts → revisarFicha): notas para el equipo, un solo
 * modelo, el modelo del nombre, peso y medidas posibles, una descripción en español y con datos. Si una regla de tipo "pide" se
 * rompió y la ficha salió de Claude, se le pide otra vez, una sola vez, diciéndole qué regla rompió. Si vuelve a romperla (o no
 * vino de Claude), se usan los datos limpios, con lo que la rompió ya vacío, y queda anotado.
 */
async function conReglas(o: {
  nombre: string;
  frases: readonly string[];
  primera: ResultadoBusquedaWeb;
  /** El id del pedido de Claude con el que se armó la primera ficha; null si no vino de Claude */
  pedidoDeClaude: string | null;
  /** Otra vez, con la corrección en el mensaje: la ficha nueva y el id de su pedido, o null si Claude no respondió */
  reintentar: (correccion: string) => Promise<{ ficha: ResultadoBusquedaWeb; pedidoId: string } | null>;
}): Promise<ResultadoBusquedaWeb> {
  let revision = revisarFicha(o.primera, o.nombre, o.frases);
  const atajadas: Cambio[] = [];
  if (revision.pedirOtraVez.length > 0) {
    const pedidas = revision.pedirOtraVez;
    if (o.pedidoDeClaude) {
      atajadas.push(...pedidas.map((p) => ({ regla: p.regla, accion: 'pide' as const, antes: p.antes, despues: null })));
      const segunda = await o.reintentar(mensajeDeCorreccion(pedidas));
      if (segunda) {
        revision = revisarFicha(segunda.ficha, o.nombre, o.frases);
        if (revision.pedirOtraVez.length > 0) marcarFallaDeRegla(segunda.pedidoId, revision.pedirOtraVez[0].regla);
      }
    }
    // Sigue rompiéndola (o no se le podía pedir otra vez): se usan los datos limpios y queda anotado
    atajadas.push(...revision.pedirOtraVez.map((p) => ({ regla: p.regla, accion: 'marca' as const, antes: p.antes, despues: null })));
  }
  atajadas.push(...revision.cambios);
  registrarAtajadas('busqueda', atajadas, o.nombre);
  const ficha = revision.datos;
  ficha.avisos = [...new Set([...ficha.avisos, ...revision.avisos])];
  return ficha;
}

export async function buscarProductoEnLaWeb(pedido: PedidoBusqueda): Promise<ResultadoBusquedaWeb> {
  const nombre = textoPlano(pedido.nombre, 150);
  const modelo = textoPlano(pedido.modelo ?? '', 60);
  const categoria = textoPlano(pedido.categoria ?? '', 80);
  // El modelo solo se suma si el nombre no lo trae ya
  const buscado = modelo && !clave(nombre).includes(clave(modelo)) ? `${nombre} ${modelo}` : nombre;
  const resultado: ResultadoBusquedaWeb = {
    encontrado: false,
    consulta: buscado,
    fuentes: [],
    marca: null,
    codigoBarras: null,
    peso: null,
    medidas: null,
    especificaciones: [],
    descripcion: '',
    redaccion: 'reglas',
    modeloIA: '',
    avisos: [],
  };
  const sugeridos = [...new Set([...nombresBase(categoria).filter((n) => !/garant|marca/i.test(n)), 'Conexión', 'Capacidad', 'Color', 'Material', 'Compatibilidad', 'Incluye', 'Peso', 'Dimensiones'])];
  const comprobar = 'Compruébalo con la caja real: de aquí salen el embalaje y el flete';
  const notaCodigo = 'Cada color o versión tiene su propio código: compáralo con el de la caja';

  // Dos búsquedas como mucho: la segunda solo si la primera trajo pocas fichas
  const paginas: PaginaLeida[] = [];
  const dominiosLeidos = new Set<string>();
  let buscador: string | null = null;
  for (const consulta of [`${buscado} especificaciones`, `${buscado} ficha técnica características`]) {
    const ronda = await buscarEnLaWeb(consulta);
    buscador ??= ronda.buscador;
    const candidatos = ronda.resultados.filter((r) => !dominiosLeidos.has(dominioDe(r.url))).slice(0, PAGINAS_MAXIMAS);
    candidatos.forEach((r) => dominiosLeidos.add(dominioDe(r.url)));
    // Las páginas se leen a la vez: la que tarde o falle no detiene a las demás
    const descargas = await Promise.allSettled(candidatos.map((r) => descargar(r.url)));
    descargas.forEach((d, i) => {
      if (d.status !== 'fulfilled') return;
      const datos = extraerDatos(d.value.texto);
      const r = candidatos[i];
      // Vale el nombre que la página le da al producto, su título o el del buscador
      const similitud = Math.max(parecido(buscado, datos.nombre), parecido(buscado, datos.titulo), parecido(buscado, r.titulo));
      if (similitud < 0.5) return;
      paginas.push({
        fuente: { dominio: dominioDe(d.value.url), url: d.value.url, titulo: textoPlano(datos.titulo || r.titulo, 90) },
        datos,
        especificaciones: especificacionesDe(datos.pares, datos.idioma),
      });
    });
    const reconocidas = new Set(paginas.flatMap((p) => p.especificaciones.filter((e) => e.reconocida).map((e) => claveNombre(e.nombre))));
    if (reconocidas.size >= FICHA_SUFICIENTE) break;
  }
  if (!buscador) resultado.avisos.push('Los buscadores no respondieron. Prueba otra vez en unos minutos.');

  resultado.encontrado = paginas.length > 0;
  resultado.fuentes = paginas.map((p) => p.fuente).slice(0, 5);
  const estimadoTipo = estimarPorTipo(nombre, categoria);
  const { frases } = await leerAjustesIa();

  // Sin ninguna página leída (los buscadores no le responden al servidor, o no hay resultados): la IA busca por su
  // cuenta, Claude primero y Groq si falla (C-211). No hay con qué contrastar lo que traiga: todo queda sin confirmar
  if (!resultado.encontrado) {
    const armarSinPaginas = (ia: BusquedaGroq | null, firma: string): ResultadoBusquedaWeb => {
      const r = clonar(resultado);
      const util = ia && (ia.especificaciones.length >= 2 || ia.medidas || ia.pesoKg);
      if (ia && util) {
        r.modeloIA = firma;
        const sinConfirmar = 'Lo trajo la búsqueda con IA, sin una página para contrastarlo';
        r.encontrado = true;
        r.redaccion = 'ia';
        r.avisos = ['Los datos vienen de la búsqueda con IA y no se pudieron contrastar con una página: revísalos uno por uno.'];
        r.fuentes = ia.fuentes.map((dominio) => ({ dominio, url: `https://${dominio}`, titulo: dominio }));
        if (ia.marca) r.marca = { valor: ia.marca, fuente: '', estimado: true, nota: sinConfirmar };
        if (ia.codigoBarras) r.codigoBarras = { valor: ia.codigoBarras, fuente: '', estimado: true, nota: `${sinConfirmar}. ${notaCodigo}` };
        if (ia.pesoKg) r.peso = { valor: ia.pesoKg, fuente: '', estimado: true, nota: `${sinConfirmar}. ${comprobar}` };
        if (ia.medidas) r.medidas = { valor: ordenadas(ia.medidas), fuente: '', estimado: true, nota: `${sinConfirmar}. ${comprobar}` };
        r.especificaciones = ia.especificaciones;
        r.descripcion = ia.descripcion;
      } else if (buscador) {
        r.avisos.push('No encontramos páginas que hablen de este producto. Prueba con la marca y el modelo exactos.');
      }
      if (!r.peso && estimadoTipo) r.peso = { valor: estimadoTipo.pesoKg, fuente: '', estimado: true, nota: `Estimado por el tipo de producto (${estimadoTipo.tipo}). ${comprobar}` };
      if (!r.medidas && estimadoTipo) r.medidas = { valor: estimadoTipo.medidas, fuente: '', estimado: true, nota: `Estimado por el tipo de producto (${estimadoTipo.tipo}). ${comprobar}` };
      if (!r.medidas || !r.peso) r.avisos.push('No hay un estimado de peso y medidas para este tipo de producto: mide y pesa la caja.');
      return r;
    };
    const conClaude = await buscarConClaude({ nombre: buscado, categoria }, sugeridos);
    const ia = conClaude?.busqueda ?? (await buscarConGroq({ nombre: buscado, categoria }, sugeridos));
    return conReglas({
      nombre: buscado,
      frases,
      primera: armarSinPaginas(ia, conClaude?.firma ?? 'Groq'),
      pedidoDeClaude: conClaude?.pedidoId ?? null,
      reintentar: async (correccion) => {
        const otra = await buscarConClaude({ nombre: buscado, categoria }, sugeridos, { correccion, reintento: true });
        return otra ? { ficha: armarSinPaginas(otra.busqueda, otra.firma), pedidoId: otra.pedidoId } : null;
      },
    });
  }

  // La IA ordena lo leído: Claude (claude.ts, C-211) y, si no hay clave o falla, Groq (groq.ts). Sin ninguna, sigue la
  // lectura propia
  const paraLeer = paginas.map((p) => ({ dominio: p.fuente.dominio, titulo: p.fuente.titulo, pares: p.datos.pares }));
  const conClaude = await leerConClaude({ nombre: buscado, categoria }, paraLeer, sugeridos);
  const iaPrimera = conClaude?.lectura ?? (await leerConGroq({ nombre: buscado, categoria }, paraLeer, sugeridos));

  // La base pública de códigos de barras se consulta una sola vez, aunque la ficha se arme dos
  let upcPendiente: ReturnType<typeof buscarEnUpcItemDb> | undefined;
  const upc = () => (upcPendiente ??= buscarEnUpcItemDb(buscado));

  // La ficha, con lo que leyó la IA (o sin ella). Se arma de nuevo si hay que pedírsela otra vez a Claude (C-288)
  const armar = async (ia: LecturaGroq | null, firmaIA: string): Promise<ResultadoBusquedaWeb> => {
    const r = clonar(resultado);
    // Marca: la que más páginas repiten
    const marcas = paginas.filter((p) => p.datos.marca && p.datos.marca.length <= 40).map((p) => ({ marca: p.datos.marca, fuente: p.fuente.dominio }));
    const marca = masRepetido(marcas, (m) => clave(m.marca));
    if (marca) {
      r.marca = { valor: marca.valor.marca, fuente: marca.valor.fuente, estimado: false, nota: marca.veces > 1 ? `Coinciden ${marca.veces} páginas` : '' };
    } else if (ia?.marca) {
      r.marca = { valor: ia.marca, fuente: paginas[0].fuente.dominio, estimado: false, nota: '' };
    }

    // Código de barras: el que más se repite. Cada color o versión tiene el suyo, así que siempre se pide comprobarlo
    const codigos = paginas.flatMap((p) => p.datos.codigos.map((codigo) => ({ codigo, fuente: p.fuente.dominio })));
    const codigo = masRepetido(codigos, (c) => c.codigo);
    if (codigo) {
      // Con una sola página no hay con qué contrastarlo: queda sin confirmar
      r.codigoBarras = { valor: codigo.valor.codigo, fuente: codigo.valor.fuente, estimado: codigo.veces < 2, nota: codigo.veces > 1 ? `Coinciden ${codigo.veces} páginas. ${notaCodigo}` : notaCodigo };
    } else if (ia?.codigoBarras) {
      r.codigoBarras = { valor: ia.codigoBarras, fuente: paginas[0].fuente.dominio, estimado: true, nota: notaCodigo };
    } else {
      const deBase = await upc();
      if (deBase) {
        r.codigoBarras = { valor: deBase.codigo, fuente: 'upcitemdb.com', estimado: true, nota: `De una base pública de códigos, sin contrastar. ${notaCodigo}` };
        if (!r.marca && deBase.marca) r.marca = { valor: deBase.marca, fuente: 'upcitemdb.com', estimado: false, nota: '' };
      }
    }

    // Peso y medidas de la caja. Orden: lo que una página dice del paquete, lo calculado desde el producto sin
    // empacar, y un estimado por el tipo de producto
    const pesosPaquete = paginas.filter((p) => p.datos.pesoPaquete).map((p) => ({ kg: p.datos.pesoPaquete as number, fuente: p.fuente.dominio }));
    const pesosProducto = paginas.filter((p) => p.datos.pesoProducto).map((p) => ({ kg: p.datos.pesoProducto as number, fuente: p.fuente.dominio }));
    const medidasPaquete = paginas.filter((p) => p.datos.medidasPaquete).map((p) => ({ m: ordenadas(p.datos.medidasPaquete as MedidasCaja), fuente: p.fuente.dominio }));
    const medidasProducto = paginas.filter((p) => p.datos.medidasProducto).map((p) => ({ m: ordenadas(p.datos.medidasProducto as MedidasCaja), fuente: p.fuente.dominio }));
    // Lo que Groq señaló (con la cita comprobada) va delante: distingue mejor la caja del producto que las etiquetas
    if (ia?.peso) (ia.peso.delPaquete ? pesosPaquete : pesosProducto).unshift({ kg: ia.peso.kg, fuente: ia.peso.fuente });
    if (ia?.medidas) (ia.medidas.delPaquete ? medidasPaquete : medidasProducto).unshift({ m: ordenadas(ia.medidas.cm), fuente: ia.medidas.fuente });
    const primero = <T,>(lista: T[], deGroq: boolean) => (deGroq ? lista.slice(0, 1) : lista);

    if (pesosPaquete.length > 0) {
      const kg = mediana(primero(pesosPaquete, ia?.peso?.delPaquete === true).map((p) => p.kg));
      const de = pesosPaquete.find((p) => p.kg === kg) ?? pesosPaquete[0];
      r.peso = { valor: kg, fuente: de.fuente, estimado: false, nota: `Peso del paquete según ${de.fuente}. ${comprobar}` };
    } else if (pesosProducto.length > 0) {
      const kg = mediana(primero(pesosProducto, Boolean(ia?.peso && !ia.peso.delPaquete)).map((p) => p.kg));
      const de = pesosProducto.find((p) => p.kg === kg) ?? pesosProducto[0];
      const caja = cajaDesdeProducto(null, kg).pesoKg as number;
      r.peso = { valor: caja, fuente: de.fuente, estimado: true, nota: `Estimado: el producto pesa ${String(redondear(kg * 1000, 0))} g sin caja (${de.fuente}). ${comprobar}` };
    } else if (estimadoTipo) {
      r.peso = { valor: estimadoTipo.pesoKg, fuente: '', estimado: true, nota: `Estimado por el tipo de producto (${estimadoTipo.tipo}). ${comprobar}` };
    }

    const igual = (m: MedidasCaja) => `${m.largo}x${m.ancho}x${m.alto}`;
    if (medidasPaquete.length > 0) {
      const elegida = masRepetido(primero(medidasPaquete, ia?.medidas?.delPaquete === true), (x) => igual(x.m)) as { valor: (typeof medidasPaquete)[number]; veces: number };
      r.medidas = { valor: elegida.valor.m, fuente: elegida.valor.fuente, estimado: false, nota: `Medidas del paquete según ${elegida.valor.fuente}. ${comprobar}` };
    } else if (medidasProducto.length > 0) {
      const elegida = masRepetido(primero(medidasProducto, Boolean(ia?.medidas && !ia.medidas.delPaquete)), (x) => igual(x.m)) as { valor: (typeof medidasProducto)[number]; veces: number };
      const caja = cajaDesdeProducto(elegida.valor.m, null).medidas as MedidasCaja;
      const p = elegida.valor.m;
      r.medidas = { valor: caja, fuente: elegida.valor.fuente, estimado: true, nota: `Estimado: el producto mide ${comoTexto(p.largo)} × ${comoTexto(p.ancho)} × ${comoTexto(p.alto)} cm sin caja (${elegida.valor.fuente}). ${comprobar}` };
    } else if (estimadoTipo) {
      r.medidas = { valor: estimadoTipo.medidas, fuente: '', estimado: true, nota: `Estimado por el tipo de producto (${estimadoTipo.tipo}). ${comprobar}` };
    }
    if (!r.medidas || !r.peso) {
      r.avisos.push('No hay un estimado de peso y medidas para este tipo de producto: mide y pesa la caja.');
    }

    // Especificaciones: un valor por nombre. Entre páginas gana el que más se repite
    const porNombre = new Map<string, Array<EspecificacionHallada & { fuente: string }>>();
    for (const p of paginas) {
      for (const e of p.especificaciones) {
        const k = claveNombre(e.nombre);
        porNombre.set(k, [...(porNombre.get(k) ?? []), { ...e, fuente: p.fuente.dominio }]);
      }
    }
    const sugeridas = nombresBase(categoria).map(claveNombre);
    const elegidas: Array<EspecificacionWeb & { orden: number }> = [];
    for (const [k, lista] of porNombre) {
      const mejor = masRepetido(lista, (e) => clave(e.valor)) as { valor: (typeof lista)[number]; veces: number };
      const reconocida = lista.some((e) => e.reconocida);
      // Una etiqueta que la tienda no conoce solo entra si dos páginas la traen
      if (!reconocida && lista.length < 2) continue;
      const enCategoria = sugeridas.indexOf(k);
      elegidas.push({
        nombre: mejor.valor.nombre,
        valor: mejor.valor.valor,
        fuente: mejor.valor.fuente,
        orden: enCategoria >= 0 ? enCategoria : reconocida ? 100 - lista.length : 200 - lista.length,
      });
    }
    // "Botones: 87" y "Número de teclas: 87" son el mismo dato: queda el de las teclas
    const teclas = elegidas.find((e) => claveNombre(e.nombre) === 'numero de teclas');
    r.especificaciones = elegidas
      .filter((e) => !(teclas && claveNombre(e.nombre) === 'botones' && e.valor === teclas.valor))
      .sort((a, b) => a.orden - b.orden)
      .slice(0, ESPECIFICACIONES_MAXIMAS)
      .map(({ nombre: n, valor, fuente }) => ({ nombre: n, valor, fuente }));
    // Con Groq, su lista: viene en español y sin el ruido de las fichas. Con menos de 3, la de las reglas
    if (ia && ia.especificaciones.length >= 3) {
      r.especificaciones = ia.especificaciones;
      r.redaccion = 'ia';
      r.modeloIA = firmaIA;
    }

    r.descripcion = ia?.descripcion || redactarDescripcion({ nombre, marca: r.marca?.valor ?? '', especificaciones: r.especificaciones });
    if (ia?.descripcion) {
      r.redaccion = 'ia';
      r.modeloIA = firmaIA;
    }
    return r;
  };

  return conReglas({
    nombre: buscado,
    frases,
    primera: await armar(iaPrimera, conClaude?.firma ?? 'Groq'),
    pedidoDeClaude: conClaude?.pedidoId ?? null,
    reintentar: async (correccion) => {
      const otra = await leerConClaude({ nombre: buscado, categoria }, paraLeer, sugeridos, { correccion, reintento: true });
      return otra ? { ficha: await armar(otra.lectura, otra.firma), pedidoId: otra.pedidoId } : null;
    },
  });
}

export type { Hallazgo };
