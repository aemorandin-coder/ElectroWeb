// C-202: el nombre para la tienda a partir del que trae la lista de un proveedor:
// "BOMBA PERIF 1/2 HP 120V DAEWOO" → "Bomba periférica 1/2 HP 120 V Daewoo".
// Escrito normal, como una oración; siglas, unidades y marcas como se escriben. Nada se inventa: lo que no se entiende
// queda como vino, en mayúsculas, y se avisa para revisarlo. Lo usan la Lista del proveedor (la columna "Nombre en la
// tienda") y el aviso del asistente de productos. No toca la base: solo propone.

import {
  ADJETIVOS, ADJETIVOS_ENTEROS, COMPUESTAS, CON_ACENTO, CON_DUDA, CONTABLES, FEMENINOS, FRASES, INVARIABLES,
  MASCULINOS_EN_A, MATERIALES, PALABRAS_CORTAS, PREFIJOS, PREPOSICIONES, SIGLAS, SIN_ACENTO, SINGULAR_EN_S, SUSTANTIVOS,
  UNIDADES, VERBOS_DE_USO, type Forma,
} from './diccionario';
import { ALIAS_MARCA, MARCAS } from './marcas';

export type TipoAviso = 'cortado' | 'revisar' | 'leido' | 'marca' | 'corregido';
export interface AvisoNombre { tipo: TipoAviso; texto: string }
export interface PropuestaNombre { nombre: string; avisos: AvisoNombre[] }

/** El largo en que el sistema de la ferretería aliada corta los nombres: 243 de sus 3.113 terminan justo ahí */
export const CORTE_LISTA = 30;

const sinAcentos = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const clave = (s: string) => sinAcentos(s).toLocaleUpperCase('es');
const minusculas = (s: string) => s.toLocaleLowerCase('es');
const VOCALES = /[AEIOUÁÉÍÓÚ]/;
const ACENTUAR: Record<string, string> = { A: 'á', E: 'é', I: 'í', O: 'ó', U: 'ú' };

/** "4.2" → "4,2"; "1.1/2" → "1 1/2" (así escribe su sistema el uno y medio) */
const numero = (t: string) => t.replace(/(\d)\.(\d+\/\d+)/g, '$1 $2').replace(/(\d)\.(\d)/g, '$1,$2');
const NUMERO = /^\d+(?:[.,]\d+)?(?:\/\d+)?$|^\d+\.\d+\/\d+$/;
const NUMERO_UNIDAD = /^(\d+(?:[.,]\d+)?(?:\/\d+)?|\d+\.\d+\/\d+)([A-Z]+)$/;
const MEDIDAS = /^[\d.,/-]+(?:X[\d.,/-]+)+$/;
const PULGADAS = /^[\d.,/]+"$/;
const esCodigo = (t: string) => /\d/.test(t) && /[A-Z]/.test(t);

/** La vocal que lleva el acento en un grupo ("AU" de hidráulico → la A; "IA" de diámetro → la A) */
function acentuarGrupo(grupo: string): string {
  const fuerte = grupo.search(/[AEO]/);
  const i = fuerte >= 0 ? fuerte : grupo.length - 1;
  return grupo.slice(0, i) + ACENTUAR[grupo[i]] + grupo.slice(i + 1);
}

/** Una palabra entera, en minúsculas y con su acento: ELECTRICO → eléctrico, UNION → unión, TUBERIA → tubería */
export function palabraNormal(t: string): string {
  if (/[^\x00-\x7F]/.test(t)) return minusculas(t); // ya trae acentos o Ñ: está bien escrita
  const k = t.toUpperCase();
  if (CON_ACENTO[k]) return CON_ACENTO[k];
  if (SIN_ACENTO.has(k) || k.length < 5) return minusculas(t);
  let m: RegExpMatchArray | null;
  if (/[^T]ION$/.test(k)) return minusculas(k.slice(0, -3)) + 'ión';
  if (/ERIAS?$/.test(k) && k.length >= 6) return minusculas(k.replace(/ERIA(S?)$/, 'ERÍA$1'));
  if ((m = k.match(/^(.+?)([AEIOU]+)METROS?$/)) && m[1].length >= 2) return minusculas(m[1] + acentuarGrupo(m[2]) + k.slice(m[1].length + m[2].length));
  if (k.length >= 7 && (m = k.match(/^(.*?)([AEIOU]+)([^AEIOU]+)(ICOS?|ICAS?)$/))) return minusculas(m[1] + acentuarGrupo(m[2]) + m[3] + m[4]);
  if (k.length >= 6 && (m = k.match(/^(.*?)([AEIOU]+)([^AEIOU]+)(ULAS?)$/))) return minusculas(m[1] + acentuarGrupo(m[2]) + m[3] + m[4]);
  if (/[^I]ON$/.test(k) || (/AN$/.test(k) && k.length >= 6)) return minusculas(k.slice(0, -2)) + (k.endsWith('ON') ? 'ón' : 'án');
  return minusculas(t);
}

type Genero = { femenino: boolean; plural: boolean };
function generoDe(palabra: string): Genero {
  const p = minusculas(palabra.split(' ')[0]);
  const plural = p.length > 3 && /s$/.test(p) && !SINGULAR_EN_S.test(p);
  const singular = plural ? p.replace(/(iones)$/, 'ión').replace(/s$/, '') : p;
  const femenino = FEMENINOS.has(singular) || FEMENINOS.has(p)
    || (/a$/.test(singular) && !MASCULINOS_EN_A.has(singular))
    || /(ión|dad|tad|tud|umbre)$/.test(singular);
  return { femenino, plural };
}

function pluralDe(adjetivo: string): string {
  if (INVARIABLES.has(adjetivo)) return adjetivo;
  if (/[aeiouáéó]$/.test(adjetivo)) return adjetivo + 's';
  if (/z$/.test(adjetivo)) return adjetivo.slice(0, -1) + 'ces';
  return adjetivo.replace(/á(?=[nr]$)/, 'a') + 'es';
}

function concordar(forma: Forma, g: Genero): string {
  const base = typeof forma === 'string' ? forma : forma[g.femenino ? 1 : 0];
  return g.plural ? pluralDe(base) : base;
}

/** El proponedor, con las marcas de la tienda (que mandan sobre la lista de `marcas.ts`) */
export interface OpcionesNombre {
  /** Lo que no se entiende queda en mayúsculas y se avisa (Lista del proveedor). En el asistente va en minúsculas. */
  conservarDudas?: boolean;
}

/** Dos palabras que se leen juntas */
const DE_DOS: Readonly<Record<string, string>> = {
  'FUENTE PODER': 'fuente de poder', 'LLAVE PASO': 'llave de paso', 'LLAVE CHORRO': 'llave de chorro',
  'LL PASO': 'llave de paso', 'LL CHORRO': 'llave de chorro', 'CINTA EMB': 'cinta de embalaje',
};

export function proponedorDeNombres(marcasTienda: readonly string[] = [], { conservarDudas = true }: OpcionesNombre = {}) {
  const marcas = new Map<string, string>();
  for (const m of [...MARCAS, ...marcasTienda]) if (m.trim()) marcas.set(clave(m.trim()), m.trim());
  for (const [alias, m] of Object.entries(ALIAS_MARCA)) if (!marcas.has(alias)) marcas.set(alias, marcas.get(clave(m)) ?? m);
  const deVarias = [...marcas.entries()].filter(([k]) => k.includes(' ')).map(([k, v]) => ({ partes: k.split(' '), v }));
  const simples = [...marcas.entries()].filter(([k]) => !k.includes(' ') && k.length >= 5);

  /** Una sola marca empieza así ("LINCO" → Lincoln, "BELLOT" → Bellota) */
  const completarMarca = (k: string) => {
    if (k.length < 4) return null;
    const opciones = [...marcas.entries()].filter(([m]) => !m.includes(' ') && m.length > k.length && m.startsWith(k));
    return opciones.length === 1 ? opciones[0][1] : null;
  };
  /** Una letra de más, de menos o cambiada ("DAEWOIO" → Daewoo) */
  const corregirMarca = (k: string) => {
    if (k.length < 5) return null;
    const cerca = simples.filter(([m]) => Math.abs(m.length - k.length) === 1 && distanciaUno(m, k));
    return cerca.length === 1 ? cerca[0][1] : null;
  };

  /** Una parte de "SATIN/NIQ" o "BRCE-MACHET": la misma lectura que una palabra suelta, sin cambiar el género */
  const escribirParte = (p: string, genero: Genero, revisar: string[]) => {
    if (marcas.has(p)) return marcas.get(p)!;
    if (SIGLAS.has(p) || p.length === 1) return p;
    if (ADJETIVOS[p]) return concordar(ADJETIVOS[p], genero);
    if (SUSTANTIVOS[p]) return SUSTANTIVOS[p];
    if (/\d/.test(p) || (p.length <= 3 && !PALABRAS_CORTAS.has(p))) { if (!/\d/.test(p)) revisar.push(p); return p; }
    return palabraNormal(p);
  };

  return function proponer(original: string): PropuestaNombre {
    const avisos: AvisoNombre[] = [];
    const revisar: string[] = [];
    const leidas: string[] = [];
    const limpio = original.replace(/\s+/g, ' ').trim();
    if (!limpio) return { nombre: '', avisos };
    const esPintura = /\b(CAUC|ESM|ESMALT|ESMALTE|CAUCHO|FONDO|FOND|PASTA|ASF|IMPER|PINTURA|BARNIZ|SELLADOR|MASTIC|ESTUCO|KEROSENE|THINNER|ACEITE|SOLVENTE|MINIO|GALON)\b/.test(clave(limpio));

    // Pedazos: separados por espacios y por "+" ("VIAS+TOMA"), sin la raya suelta del final ("FOND- ESM")
    const pedazos = limpio.split(' ').flatMap((p) => (marcas.has(clave(p)) ? [p] : p.split(/(\+)/))).map((p) => p.replace(/-$/, '')).filter(Boolean);
    // Marcas y frases de dos palabras: "MAXI TOOLS", "FUENTE PODER"
    for (let i = 0; i + 1 < pedazos.length; i++) {
      const dos = DE_DOS[`${clave(pedazos[i])} ${clave(pedazos[i + 1])}`];
      if (dos) pedazos.splice(i, 2, `\u0002${dos}`);
    }
    for (let i = 0; i < pedazos.length; i++) {
      for (const { partes, v } of deVarias) {
        if (partes.every((parte, j) => clave(pedazos[i + j] ?? '') === parte)) pedazos.splice(i, partes.length, `\u0001${v}`);
      }
    }

    const salida: string[] = [];
    let genero: Genero = { femenino: false, plural: false };
    let hayNombre = false;
    let trasPreposicion = false;
    let comunAlFinal = -1;
    let hayMarca = false;
    const ultimo = () => salida[salida.length - 1] ?? '';
    const sinDeColgante = () => { if (/ de$/.test(ultimo())) salida[salida.length - 1] = ultimo().slice(0, -3); };
    /** Un sustantivo: fija el género de lo que sigue, salvo que vaya después de "de", "con"… */
    const sustantivo = (palabra: string) => {
      const previo = minusculas(ultimo());
      if (MATERIALES.has(palabra) && hayNombre && !PREPOSICIONES.has(previo) && !/\d/.test(previo)) salida.push('de');
      salida.push(palabra);
      if (!trasPreposicion && !MATERIALES.has(palabra)) genero = generoDe(palabra);
      hayNombre = true;
      trasPreposicion = /\bde$/.test(palabra);
    };
    const adjetivo = (palabra: string) => { salida.push(palabra); trasPreposicion = false; };
    const marcar = (texto: string) => { salida.push(texto); trasPreposicion = false; };
    const marca = (texto: string) => { marcar(texto); hayMarca = true; };

    for (let i = 0; i < pedazos.length; i++) {
      const pedazo = pedazos[i];
      if (pedazo.startsWith('\u0001')) { marca(pedazo.slice(1)); continue; }
      if (pedazo.startsWith('\u0002')) { sustantivo(pedazo.slice(1)); continue; }
      if (pedazo === '+') { salida.push('+'); trasPreposicion = false; continue; }
      // Paréntesis y comas alrededor
      const [, abre, nucleo, cierra] = pedazo.match(/^([("]*)(.*?)([),;:]*)$/) ?? ['', '', pedazo, ''];
      const t = nucleo.toLocaleUpperCase('es');
      const k = clave(nucleo);
      const antesDe = salida.length;
      const conPunto = /\.$/.test(k) && !/\d\.$/.test(k);
      const kk = conPunto ? k.slice(0, -1) : k;
      const anterior = salida.length > 0 ? ultimo() : '';
      const anteriorEsNumero = /^[\d.,/]+$/.test(anterior) || /\d"?$/.test(anterior);
      const siguiente = clave(pedazos[i + 1] ?? '');

      if (!t) { if (salida.length > 0) salida[salida.length - 1] += abre + cierra; continue; }
      if (marcas.has(kk)) marca(marcas.get(kk)!);
      else if (/^\p{Lu}?[\p{Ll}']+$/u.test(nucleo) && /\p{Ll}/u.test(nucleo)) {
        if (ADJETIVOS_ENTEROS.has(minusculas(nucleo)) || PREPOSICIONES.has(minusculas(nucleo))) adjetivo(nucleo); else sustantivo(nucleo);
      }
      else if (COMPUESTAS[kk]) { const c = COMPUESTAS[kk]; if (c.startsWith('mango') || c === 'termoencogible') sustantivo(c); else adjetivo(c); }
      else if (PULGADAS.test(t)) marcar(numero(t));
      else if (MEDIDAS.test(kk)) marcar(numero(kk).replace(/X/g, 'x'));
      else if (NUMERO.test(kk)) marcar(numero(kk));
      else if (/^#\d+$/.test(kk)) marcar(kk);
      else if (NUMERO_UNIDAD.test(kk)) {
        const [, n, u] = kk.match(NUMERO_UNIDAD)!;
        const valor = Number(n.replace(',', '.').replace(/^(\d+)\/(\d+)$/, (_, a, b) => String(Number(a) / Number(b))));
        const fraccion = /\//.test(n);
        if (u === 'G') marcar(fraccion ? `${numero(n)} de galón` : valor <= 5 ? `${numero(n)} ${valor === 1 ? 'galón' : 'galones'}` : `${numero(n)} g`);
        else if (u === 'P') marcar(`${numero(n)}"`);
        else if (CONTABLES[u]) marcar(`${numero(n)} ${CONTABLES[u][valor === 1 ? 0 : 1]}`);
        else if (UNIDADES[u]) marcar(`${numero(n)} ${UNIDADES[u]}`);
        else if (esCodigo(kk)) marcar(kk);
        else marcar(numero(kk));
      }
      else if (anteriorEsNumero && (UNIDADES[kk] || CONTABLES[kk] || kk === 'G' || kk === 'GR')) {
        const valor = Number(anterior.replace(',', '.').replace(/"$/, ''));
        if (kk === 'G' && !esPintura) { revisar.push(t); marcar(t); }
        else if (kk === 'G') salida[salida.length - 1] = /\//.test(anterior) ? `${anterior} de galón` : `${anterior} ${valor === 1 ? 'galón' : 'galones'}`;
        else if (CONTABLES[kk]) marcar(CONTABLES[kk][valor === 1 ? 0 : 1]);
        else marcar(UNIDADES[kk]);
      }
      else if (esCodigo(kk) || /^[A-Z]{1,4}-\d/.test(kk)) marcar(kk);
      else if (kk === 'X') {
        if (['MT', 'MTS', 'M'].includes(siguiente)) { salida.push('por metro'); i++; } else salida.push('x');
      }
      else if (/^[A-Z]{1,2}\/[A-Z]+/.test(kk) && PREFIJOS[kk.split('/')[0]] && (kk.split('/')[1].length >= 3 || SIGLAS.has(kk.split('/')[1]))) {
        // "P/SOLDAR" → "para soldar": se procesa lo de después de la barra como un pedazo más
        const [pre, ...resto] = kk.split('/');
        if (pre !== 'M') sinDeColgante();
        salida.push(PREFIJOS[pre]);
        trasPreposicion = pre !== 'M';
        if (pre === 'M') hayNombre = true;
        pedazos.splice(i + 1, 0, resto.join('/'));
      }
      else if (/^[A-Z]{1,2}\/$/.test(kk) && PREFIJOS[kk[0]]) { if (kk[0] !== 'M') sinDeColgante(); salida.push(PREFIJOS[kk[0]]); trasPreposicion = kk[0] !== 'M'; }
      else if (/\//.test(kk) && !/^[\d/]+$/.test(kk)) {
        // Dos palabras con barra: "SATIN/NIQ" → "satinado/níquel"; lo que no se entiende queda como vino
        const partes = kk.split('/').filter(Boolean);
        if (partes.every((p) => p.length <= 2)) { revisar.push(t); marcar(t); }
        else adjetivo(partes.map((p) => escribirParte(p, genero, revisar)).join('/'));
      }
      else if (/-/.test(kk) && /^[A-ZÑ-]+$/.test(kk)) {
        // Palabras con raya: "O-RING", "PVC-HUM"
        marcar(kk.split('-').map((p) => escribirParte(p, genero, revisar)).join('-'));
      }
      else if (SIGLAS.has(kk)) marcar(kk);
      else if (CON_DUDA[kk]) {
        const d = CON_DUDA[kk];
        const escrita = concordar(d.forma, genero);
        leidas.push(`${kk} como "${escrita}"`);
        if (d.sustantivo) sustantivo(escrita); else adjetivo(escrita);
      }
      else if (FRASES[kk]) adjetivo(minusculas(ultimo()) === 'para' ? FRASES[kk].replace(/^de /, '') : FRASES[kk]);
      else if (SUSTANTIVOS[kk]) sustantivo(SUSTANTIVOS[kk]);
      else if (ADJETIVOS[kk]) adjetivo(concordar(ADJETIVOS[kk], genero));
      else if (kk === 'CAB' && minusculas(ultimo()) === 'con') sustantivo('cabo');
      else if (/^[A-ZÑ]+$/.test(kk) && !PALABRAS_CORTAS.has(kk) && i === pedazos.length - 1 && completarMarca(kk)) {
        const m = completarMarca(kk)!;
        avisos.push({ tipo: 'marca', texto: `Marca completada: ${kk} → ${m}` });
        marca(m);
      }
      else if (/^[A-ZÑ]+$/.test(kk) && i === pedazos.length - 1 && corregirMarca(kk)) {
        const m = corregirMarca(kk)!;
        avisos.push({ tipo: 'corregido', texto: `Corregido: ${kk} → ${m}` });
        marca(m);
      }
      else if (PREPOSICIONES.has(minusculas(kk)) || ['Y', 'O', 'E', 'U'].includes(kk)) {
        // "JGO DE HTAS": el "de" ya va con "juego de"
        if (PREPOSICIONES.has(minusculas(kk)) && kk !== 'DE') sinDeColgante();
        if (!(kk === 'DE' && /\bde$/.test(ultimo()))) salida.push(minusculas(kk));
        trasPreposicion = PREPOSICIONES.has(minusculas(kk));
      }
      else if (kk === 'ELEC' && /kg$/.test(ultimo())) adjetivo('de electrodos');
      else if ((kk === 'EMB' || kk === 'EMBT') && ultimo() === 'cinta') adjetivo('de embalaje');
      else if (kk === 'PINT' && ultimo() === 'para') adjetivo('pintar');
      else if (VERBOS_DE_USO.has(kk)) {
        if (hayNombre && !PREPOSICIONES.has(minusculas(ultimo()))) salida.push('para');
        adjetivo(minusculas(kk));
      }
      else if (/^[A-ZÑ]+$/.test(kk) && !PALABRAS_CORTAS.has(kk) && (kk.length <= 3 || conPunto || !VOCALES.test(kk)
        || (/[^AEIOUNSRLDZJYX]$/.test(kk) && (i < pedazos.length - 1 || kk.length < 5)))) {
        // Una abreviatura que no está en el diccionario: queda como vino, para que se vea
        if (conservarDudas) { revisar.push(t); marcar(t); } else sustantivo(palabraNormal(nucleo));
      }
      else if (/^[A-Z']+$/.test(kk)) {
        const palabra = palabraNormal(nucleo.replace(/\.$/, ''));
        if (ADJETIVOS_ENTEROS.has(palabra) || /(ico|ica|icos|icas)$/.test(palabra)) adjetivo(palabra);
        else {
          const tras = trasPreposicion;
          sustantivo(palabra);
          comunAlFinal = i === pedazos.length - 1 && !tras ? salida.length - 1 : -1;
        }
      }
      else marcar(nucleo);

      // La puntuación que rodeaba al pedazo vuelve a su lugar
      if (abre && salida.length > antesDe) salida[antesDe] = abre + salida[antesDe];
      if (cierra && salida.length > antesDe) salida[salida.length - 1] += cierra;
    }

    // Sin marca conocida, la última palabra que no está en el diccionario suele ser la marca: "PILA BOTON 3V CR2016 TIANQIU"
    if (!hayMarca && conservarDudas && comunAlFinal === salida.length - 1 && comunAlFinal > 0) {
      const palabra = salida[comunAlFinal];
      if (!MATERIALES.has(palabra) && palabra.length >= 4 && !/\s/.test(palabra)) {
        salida[comunAlFinal] = palabra.charAt(0).toLocaleUpperCase('es') + palabra.slice(1);
        avisos.push({ tipo: 'revisar', texto: `¿${salida[comunAlFinal]} es la marca? Si lo es, escríbela como la escribe el fabricante` });
      }
    }

    let nombre = salida.join(' ').replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')').trim();
    // Como una oración: la primera letra en mayúscula si es una palabra común
    if (/^[a-záéíóúñü]/.test(nombre)) nombre = nombre.charAt(0).toLocaleUpperCase('es') + nombre.slice(1);

    if (limpio.length === CORTE_LISTA && !avisos.some((a) => a.tipo === 'marca')) {
      const final = clave(limpio.split(' ').pop() ?? '');
      if (!marcas.has(final) && !/\d/.test(final)) avisos.unshift({ tipo: 'cortado', texto: `Su nombre llega a ${CORTE_LISTA} letras, donde su sistema corta: puede faltar el final` });
    }
    if (revisar.length > 0) avisos.push({ tipo: 'revisar', texto: `No se entendió: ${[...new Set(revisar)].join(', ')}` });
    if (leidas.length > 0) avisos.push({ tipo: 'leido', texto: `Se leyó ${leidas.join('; ')}` });
    return { nombre, avisos };
  };
}

/** a y b se diferencian en una letra (de más, de menos o cambiada) */
function distanciaUno(a: string, b: string): boolean {
  if (a === b) return false;
  if (a.length === b.length) {
    let difs = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && ++difs > 1) return false;
    return difs === 1;
  }
  const [corta, larga] = a.length < b.length ? [a, b] : [b, a];
  if (larga.length - corta.length !== 1) return false;
  for (let i = 0; i < larga.length; i++) if (larga.slice(0, i) + larga.slice(i + 1) === corta) return true;
  return false;
}

/** Sin marcas de la tienda (pruebas y lugares donde no hacen falta) */
export const proponerNombre = (original: string, marcasTienda: readonly string[] = []) => proponedorDeNombres(marcasTienda)(original);

/** Casi todo en mayúsculas (desde 8 letras: "PS5" o "HP" no cuentan) */
export function enMayusculas(texto: string): boolean {
  const letras = texto.match(/\p{L}/gu) ?? [];
  if (letras.length < 8) return false;
  return letras.filter((l) => l !== minusculas(l)).length / letras.length >= 0.7;
}

/** Lo que el asistente avisa del nombre: en mayúsculas, y las abreviaturas que se reconocen ("P/", "PERIF") */
export function revisarNombre(nombre: string): { mayusculas: boolean; abreviaturas: string[] } {
  const abreviaturas = new Set<string>();
  for (const pedazo of nombre.split(/\s+/)) {
    const escrito = pedazo.replace(/[(),;:]/g, '');
    if (!escrito || escrito !== escrito.toLocaleUpperCase('es')) continue; // en minúsculas lo escribió alguien a propósito
    const k = clave(escrito).replace(/\.$/, '');
    if (/^[PCST]\//.test(k)) abreviaturas.add(k.slice(0, 2));
    else if (SUSTANTIVOS[k] || ADJETIVOS[k] || FRASES[k] || CON_DUDA[k]) abreviaturas.add(k);
  }
  return { mayusculas: enMayusculas(nombre), abreviaturas: [...abreviaturas] };
}
