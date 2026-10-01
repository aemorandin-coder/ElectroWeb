import { codigoUtil } from './codigo-barras';
import { clave, textoPlano } from './texto';
import { leerLado, leerMedidas, leerPeso, type Medidas } from './unidades';

// Qué dice una página sobre un producto (C-155). Módulo puro: recibe el HTML y devuelve datos sueltos.
// Tres fuentes dentro de la página, de la más fiable a la menos:
// 1. Los datos estructurados (JSON-LD de schema.org, tipo Product): marca, código de barras, modelo.
// 2. Las fichas técnicas: filas de tabla de dos celdas, listas <dt>/<dd> y líneas "Etiqueta: valor".
// 3. El texto corrido, solo para el peso y las medidas ("Weight 10g").

export interface Par {
  nombre: string;
  valor: string;
}

export interface DatosPagina {
  /** Idioma declarado por la página: 'es', 'en'… ('' si no lo dice) */
  idioma: string;
  titulo: string;
  /** Nombre del producto según la página (datos estructurados o título) */
  nombre: string;
  marca: string;
  modelo: string;
  /** Códigos de barras válidos que aparecen en la página */
  codigos: string[];
  pares: Par[];
  pesoProducto: number | null;
  pesoPaquete: number | null;
  medidasProducto: Medidas | null;
  medidasPaquete: Medidas | null;
}

const ETQ_PAQUETE = /paquete|caja|empaque|embalaje|embalagem|envio|package|packag|shipping|box|bruto|gross/;
const ETQ_PESO = /^(peso|weight|masa)\b|\b(peso|weight)$/;
const ETQ_MEDIDAS = /dimensi|medida|tamano|size|measure/;
const ETQ_CABLE = /cable|cord|wire|correa|strap|pantalla|screen|display/;

type Json = unknown;

function texto(valor: Json, maximo = 120): string {
  if (typeof valor === 'string') return textoPlano(valor, maximo);
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
  if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
    const o = valor as Record<string, Json>;
    return texto(o.name ?? o.value ?? '', maximo);
  }
  return '';
}

/** Los nodos de tipo Product de un bloque JSON-LD, estén donde estén (@graph, listas, anidados) */
function productosDe(nodo: Json, salida: Array<Record<string, Json>>, nivel = 0): void {
  if (nivel > 6 || !nodo || typeof nodo !== 'object') return;
  if (Array.isArray(nodo)) {
    for (const hijo of nodo.slice(0, 50)) productosDe(hijo, salida, nivel + 1);
    return;
  }
  const o = nodo as Record<string, Json>;
  const tipo = o['@type'];
  if (tipo === 'Product' || (Array.isArray(tipo) && tipo.includes('Product'))) salida.push(o);
  if (o['@graph']) productosDe(o['@graph'], salida, nivel + 1);
  if (o.mainEntity) productosDe(o.mainEntity, salida, nivel + 1);
}

function cantidad(valor: Json): string {
  if (!valor) return '';
  if (typeof valor === 'string' || typeof valor === 'number') return String(valor);
  if (typeof valor === 'object' && !Array.isArray(valor)) {
    const o = valor as Record<string, Json>;
    const n = o.value ?? o.minValue;
    if (n === undefined || n === null) return '';
    const codigos: Record<string, string> = { KGM: 'kg', GRM: 'g', LBR: 'lb', ONZ: 'oz', CMT: 'cm', MMT: 'mm', INH: 'in', MTR: 'm' };
    const unidad = typeof o.unitCode === 'string' ? codigos[o.unitCode.toUpperCase()] ?? '' : '';
    return `${String(n)} ${unidad || texto(o.unitText, 12)}`.trim();
  }
  return '';
}

/** HTML a líneas de texto: una por bloque (fila, elemento de lista, párrafo) */
function lineas(html: string): string[] {
  const cuerpo = html
    .replace(/<(script|style|noscript|template|svg|head)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/?(tr|li|p|div|br|dt|dd|h[1-6]|section|article|ul|ol|table)\b[^>]*>/gi, '\n');
  return cuerpo
    .split('\n')
    .map((l) => textoPlano(l, 600))
    .filter((l) => l.length >= 4);
}

function parValido(nombre: string, valor: string): boolean {
  if (nombre.length < 2 || nombre.length > 40 || valor.length < 1 || valor.length > 120) return false;
  if (nombre.split(' ').length > 6 || /[?!¿¡{}=]|https?:/.test(nombre)) return false;
  if (/language\s*_\s*tag|^[-–—\s]*$/i.test(valor)) return false;
  return true;
}

export function extraerDatos(html: string): DatosPagina {
  const datos: DatosPagina = {
    idioma: (html.match(/<html[^>]*\blang=["']?([a-z]{2})/i)?.[1] ?? '').toLowerCase(),
    titulo: textoPlano(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '', 160),
    nombre: '',
    marca: '',
    modelo: '',
    codigos: [],
    pares: [],
    pesoProducto: null,
    pesoPaquete: null,
    medidasProducto: null,
    medidasPaquete: null,
  };
  const codigos = new Set<string>();
  const anotarCodigo = (valor: Json) => {
    const util = codigoUtil(texto(valor, 20));
    if (util) codigos.add(util);
  };
  const pares: Par[] = [];
  const vistos = new Set<string>();
  const anotarPar = (nombreCrudo: string, valorCrudo: string) => {
    const nombre = nombreCrudo.replace(/[:：]\s*$/, '').trim();
    const valor = valorCrudo.replace(/\s+-$/, '').trim();
    if (!parValido(nombre, valor)) return;
    const id = `${clave(nombre)}|${clave(valor)}`;
    if (vistos.has(id) || pares.length >= 200) return;
    vistos.add(id);
    pares.push({ nombre, valor });
  };

  // 1. Datos estructurados
  for (const bloque of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let json: Json;
    try {
      // Algunas tiendas dejan saltos de línea dentro de los textos: JSON no los admite
      json = JSON.parse(bloque[1].replace(/[\n\r\t]+/g, ' '));
    } catch {
      continue;
    }
    const productos: Array<Record<string, Json>> = [];
    productosDe(json, productos);
    for (const p of productos) {
      if (!datos.nombre) datos.nombre = texto(p.name, 160);
      if (!datos.marca) datos.marca = texto(p.brand, 60) || texto(p.manufacturer, 60);
      if (!datos.modelo) datos.modelo = texto(p.model, 60) || texto(p.mpn, 60);
      for (const campo of ['gtin', 'gtin13', 'gtin12', 'gtin14', 'gtin8', 'ean', 'upc']) anotarCodigo(p[campo]);
      const peso = cantidad(p.weight);
      if (peso) anotarPar('Peso', peso);
      const lados = [cantidad(p.depth), cantidad(p.width), cantidad(p.height)];
      if (lados.every(Boolean)) anotarPar('Dimensiones', lados.join(' x '));
      const extra = Array.isArray(p.additionalProperty) ? p.additionalProperty.slice(0, 40) : [];
      for (const propiedad of extra) {
        if (propiedad && typeof propiedad === 'object') {
          const o = propiedad as Record<string, Json>;
          anotarPar(texto(o.name, 60), texto(o.value, 140));
        }
      }
    }
  }
  if (!datos.nombre) {
    datos.nombre = textoPlano(html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1] ?? '', 160) || datos.titulo;
  }

  // 2. Fichas técnicas
  for (const fila of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const celdas = [...fila[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => textoPlano(c[1], 160));
    if (celdas.length === 2) anotarPar(celdas[0], celdas[1]);
  }
  for (const par of html.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gi)) {
    anotarPar(textoPlano(par[1], 60), textoPlano(par[2], 160));
  }
  const todas = lineas(html);
  for (const linea of todas) {
    const m = linea.match(/^([^:：]{2,40})[:：]\s*(\S.{0,118})$/);
    if (m) anotarPar(m[1], m[2]);
  }

  // Marca, modelo y código de barras que vengan en la ficha
  for (const par of pares) {
    const k = clave(par.nombre);
    if (!datos.marca && /^(marca|brand|fabricante|manufacturer)$/.test(k) && par.valor.length <= 40) datos.marca = par.valor;
    if (!datos.modelo && /^(modelo|model|numero de modelo|model number|mpn|numero de pieza|part number)$/.test(k) && par.valor.length <= 60) datos.modelo = par.valor;
    if (/^(upc|ean|gtin|ean13|gtin13|codigo de barras|barcode|codigo ean|codigo upc)\b/.test(k)) anotarCodigo(par.valor);
  }

  // Peso y medidas de la ficha
  const lados: { producto: Partial<Medidas>; paquete: Partial<Medidas> } = { producto: {}, paquete: {} };
  for (const par of pares) {
    const k = clave(par.nombre);
    const esPaquete = ETQ_PAQUETE.test(k) || /bruto|con embalaje|com embalagem|gross/i.test(par.valor);
    if (ETQ_CABLE.test(k)) continue;
    if (ETQ_PESO.test(k)) {
      const kg = leerPeso(par.valor);
      if (kg && esPaquete && !datos.pesoPaquete) datos.pesoPaquete = kg;
      else if (kg && !esPaquete && !datos.pesoProducto) datos.pesoProducto = kg;
      continue;
    }
    if (ETQ_MEDIDAS.test(k)) {
      const medidas = leerMedidas(par.valor);
      if (medidas && esPaquete && !datos.medidasPaquete) datos.medidasPaquete = medidas;
      else if (medidas && !esPaquete && !datos.medidasProducto) datos.medidasProducto = medidas;
      // Amazon escribe el peso del paquete al final de sus medidas: "15,5 x 9,2 x 3,4 cm; 60 g"
      const resto = par.valor.split(/[;|]/).slice(1).join(' ');
      const kg = resto ? leerPeso(resto) : null;
      if (kg && esPaquete && !datos.pesoPaquete) datos.pesoPaquete = kg;
      else if (kg && !esPaquete && !datos.pesoProducto) datos.pesoProducto = kg;
      continue;
    }
    const cual = /^(alto|altura|height)\b/.test(k) ? 'alto' : /^(ancho|anchura|width)\b/.test(k) ? 'ancho' : /^(largo|longitud|length|profundidad|fondo|depth)\b/.test(k) ? 'largo' : null;
    if (cual) {
      const cm = leerLado(par.valor);
      const grupo = esPaquete ? lados.paquete : lados.producto;
      if (cm && grupo[cual] === undefined) grupo[cual] = cm;
    }
  }
  const completas = (m: Partial<Medidas>): Medidas | null =>
    m.largo !== undefined && m.ancho !== undefined && m.alto !== undefined ? { largo: m.largo, ancho: m.ancho, alto: m.alto } : null;
  datos.medidasProducto ??= completas(lados.producto);
  datos.medidasPaquete ??= completas(lados.paquete);

  // 3. Texto corrido: solo si la ficha no lo dijo
  if (!datos.pesoProducto && !datos.pesoPaquete) {
    for (const linea of todas) {
      const m = linea.match(/\b(peso|weight)\b[^0-9]{0,25}(\d[^;|]{0,24})/i);
      const kg = m ? leerPeso(m[2]) : null;
      if (kg) {
        if (ETQ_PAQUETE.test(clave(linea.slice(0, (m?.index ?? 0) + 40)))) datos.pesoPaquete = kg;
        else datos.pesoProducto = kg;
        break;
      }
    }
  }
  if (!datos.medidasProducto && !datos.medidasPaquete) {
    for (const linea of todas) {
      const m = linea.match(/\b(dimensiones|dimensions|dimensões|medidas|tamaño)\b[^0-9]{0,30}(\d.{0,80})/i);
      const medidas = m && !ETQ_CABLE.test(clave(linea.slice(0, (m.index ?? 0) + 30))) ? leerMedidas(m[2]) : null;
      if (medidas) {
        if (ETQ_PAQUETE.test(clave(linea))) datos.medidasPaquete = medidas;
        else datos.medidasProducto = medidas;
        break;
      }
    }
  }

  datos.codigos = [...codigos];
  datos.pares = pares;
  return datos;
}
