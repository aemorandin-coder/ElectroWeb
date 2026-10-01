import { nombresBase, claveNombre } from '@/lib/spec-sugerencias';
import { buscarEnLaWeb, dominioDe } from './buscadores';
import { codigoUtil } from './codigo-barras';
import { descargar } from './descarga';
import { especificacionesDe, type EspecificacionHallada } from './especificaciones';
import { cajaDesdeProducto, estimarPorTipo } from './estimar';
import { extraerDatos, type DatosPagina } from './extraer';
import { buscarConGroq, leerConGroq } from './groq';
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

  // Sin ninguna página leída (los buscadores no le responden al servidor, o no hay resultados): Groq busca por su
  // cuenta. No hay con qué contrastar lo que traiga, así que todo queda como sin confirmar
  if (!resultado.encontrado) {
    const ia = await buscarConGroq({ nombre: buscado, categoria }, sugeridos);
    const util = ia && (ia.especificaciones.length >= 2 || ia.medidas || ia.pesoKg);
    if (ia && util) {
      const sinConfirmar = 'Lo trajo la búsqueda con IA, sin una página para contrastarlo';
      resultado.encontrado = true;
      resultado.redaccion = 'ia';
      resultado.avisos = ['Los datos vienen de la búsqueda con IA y no se pudieron contrastar con una página: revísalos uno por uno.'];
      resultado.fuentes = ia.fuentes.map((dominio) => ({ dominio, url: `https://${dominio}`, titulo: dominio }));
      if (ia.marca) resultado.marca = { valor: ia.marca, fuente: '', estimado: true, nota: sinConfirmar };
      if (ia.codigoBarras) resultado.codigoBarras = { valor: ia.codigoBarras, fuente: '', estimado: true, nota: `${sinConfirmar}. ${notaCodigo}` };
      if (ia.pesoKg) resultado.peso = { valor: ia.pesoKg, fuente: '', estimado: true, nota: `${sinConfirmar}. ${comprobar}` };
      if (ia.medidas) resultado.medidas = { valor: ordenadas(ia.medidas), fuente: '', estimado: true, nota: `${sinConfirmar}. ${comprobar}` };
      resultado.especificaciones = ia.especificaciones;
      resultado.descripcion = ia.descripcion;
    } else if (buscador) {
      resultado.avisos.push('No encontramos páginas que hablen de este producto. Prueba con la marca y el modelo exactos.');
    }
    if (!resultado.peso && estimadoTipo) resultado.peso = { valor: estimadoTipo.pesoKg, fuente: '', estimado: true, nota: `Estimado por el tipo de producto (${estimadoTipo.tipo}). ${comprobar}` };
    if (!resultado.medidas && estimadoTipo) resultado.medidas = { valor: estimadoTipo.medidas, fuente: '', estimado: true, nota: `Estimado por el tipo de producto (${estimadoTipo.tipo}). ${comprobar}` };
    if (!resultado.medidas || !resultado.peso) resultado.avisos.push('No hay un estimado de peso y medidas para este tipo de producto: mide y pesa la caja.');
    return resultado;
  }

  // Groq ordena lo leído (groq.ts). Si no hay clave o falla, sigue la lectura propia
  const ia = await leerConGroq({ nombre: buscado, categoria }, paginas.map((p) => ({ dominio: p.fuente.dominio, titulo: p.fuente.titulo, pares: p.datos.pares })), sugeridos);

  // Marca: la que más páginas repiten
  const marcas = paginas.filter((p) => p.datos.marca && p.datos.marca.length <= 40).map((p) => ({ marca: p.datos.marca, fuente: p.fuente.dominio }));
  const marca = masRepetido(marcas, (m) => clave(m.marca));
  if (marca) {
    resultado.marca = { valor: marca.valor.marca, fuente: marca.valor.fuente, estimado: false, nota: marca.veces > 1 ? `Coinciden ${marca.veces} páginas` : '' };
  } else if (ia?.marca) {
    resultado.marca = { valor: ia.marca, fuente: paginas[0].fuente.dominio, estimado: false, nota: '' };
  }

  // Código de barras: el que más se repite. Cada color o versión tiene el suyo, así que siempre se pide comprobarlo
  const codigos = paginas.flatMap((p) => p.datos.codigos.map((codigo) => ({ codigo, fuente: p.fuente.dominio })));
  const codigo = masRepetido(codigos, (c) => c.codigo);
  if (codigo) {
    // Con una sola página no hay con qué contrastarlo: queda sin confirmar
    resultado.codigoBarras = { valor: codigo.valor.codigo, fuente: codigo.valor.fuente, estimado: codigo.veces < 2, nota: codigo.veces > 1 ? `Coinciden ${codigo.veces} páginas. ${notaCodigo}` : notaCodigo };
  } else if (ia?.codigoBarras) {
    resultado.codigoBarras = { valor: ia.codigoBarras, fuente: paginas[0].fuente.dominio, estimado: true, nota: notaCodigo };
  } else {
    const deBase = await buscarEnUpcItemDb(buscado);
    if (deBase) {
      resultado.codigoBarras = { valor: deBase.codigo, fuente: 'upcitemdb.com', estimado: true, nota: `De una base pública de códigos, sin contrastar. ${notaCodigo}` };
      if (!resultado.marca && deBase.marca) resultado.marca = { valor: deBase.marca, fuente: 'upcitemdb.com', estimado: false, nota: '' };
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
    resultado.peso = { valor: kg, fuente: de.fuente, estimado: false, nota: `Peso del paquete según ${de.fuente}. ${comprobar}` };
  } else if (pesosProducto.length > 0) {
    const kg = mediana(primero(pesosProducto, Boolean(ia?.peso && !ia.peso.delPaquete)).map((p) => p.kg));
    const de = pesosProducto.find((p) => p.kg === kg) ?? pesosProducto[0];
    const caja = cajaDesdeProducto(null, kg).pesoKg as number;
    resultado.peso = { valor: caja, fuente: de.fuente, estimado: true, nota: `Estimado: el producto pesa ${String(redondear(kg * 1000, 0))} g sin caja (${de.fuente}). ${comprobar}` };
  } else if (estimadoTipo) {
    resultado.peso = { valor: estimadoTipo.pesoKg, fuente: '', estimado: true, nota: `Estimado por el tipo de producto (${estimadoTipo.tipo}). ${comprobar}` };
  }

  const igual = (m: MedidasCaja) => `${m.largo}x${m.ancho}x${m.alto}`;
  if (medidasPaquete.length > 0) {
    const elegida = masRepetido(primero(medidasPaquete, ia?.medidas?.delPaquete === true), (x) => igual(x.m)) as { valor: (typeof medidasPaquete)[number]; veces: number };
    resultado.medidas = { valor: elegida.valor.m, fuente: elegida.valor.fuente, estimado: false, nota: `Medidas del paquete según ${elegida.valor.fuente}. ${comprobar}` };
  } else if (medidasProducto.length > 0) {
    const elegida = masRepetido(primero(medidasProducto, Boolean(ia?.medidas && !ia.medidas.delPaquete)), (x) => igual(x.m)) as { valor: (typeof medidasProducto)[number]; veces: number };
    const caja = cajaDesdeProducto(elegida.valor.m, null).medidas as MedidasCaja;
    const p = elegida.valor.m;
    resultado.medidas = { valor: caja, fuente: elegida.valor.fuente, estimado: true, nota: `Estimado: el producto mide ${comoTexto(p.largo)} × ${comoTexto(p.ancho)} × ${comoTexto(p.alto)} cm sin caja (${elegida.valor.fuente}). ${comprobar}` };
  } else if (estimadoTipo) {
    resultado.medidas = { valor: estimadoTipo.medidas, fuente: '', estimado: true, nota: `Estimado por el tipo de producto (${estimadoTipo.tipo}). ${comprobar}` };
  }
  if (!resultado.medidas || !resultado.peso) {
    resultado.avisos.push('No hay un estimado de peso y medidas para este tipo de producto: mide y pesa la caja.');
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
  resultado.especificaciones = elegidas
    .filter((e) => !(teclas && claveNombre(e.nombre) === 'botones' && e.valor === teclas.valor))
    .sort((a, b) => a.orden - b.orden)
    .slice(0, ESPECIFICACIONES_MAXIMAS)
    .map(({ nombre: n, valor, fuente }) => ({ nombre: n, valor, fuente }));
  // Con Groq, su lista: viene en español y sin el ruido de las fichas. Con menos de 3, la de las reglas
  if (ia && ia.especificaciones.length >= 3) {
    resultado.especificaciones = ia.especificaciones;
    resultado.redaccion = 'ia';
  }

  resultado.descripcion = ia?.descripcion || redactarDescripcion({ nombre, marca: resultado.marca?.valor ?? '', especificaciones: resultado.especificaciones });
  if (ia?.descripcion) resultado.redaccion = 'ia';
  return resultado;
}

export type { Hallazgo };
