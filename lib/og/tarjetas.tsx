/* eslint-disable @next/next/no-img-element -- Satori dibuja <img> con direcciones data:; next/image no existe aquí */
// Imágenes para compartir un enlace de la tienda (C-178): 1200 × 630, las dibuja ImageResponse (Satori).
// Satori solo entiende flexbox y estilos en línea: sin clases ni Tailwind. Los colores son los tokens de PLAN.md §1.
// Módulo sin servidor: recibe las fotos ya preparadas (direcciones data:) y los textos ya formateados.

import type { ReactElement } from 'react';

export const ANCHO = 1200;
export const ALTO = 630;

export type EstiloTarjeta = 'claro' | 'oscuro';

const MARGEN_IZQUIERDO = 64;
const MARGEN_DERECHO = 40;
/** Ancho de la columna de texto: la foto ocupa un cuadrado de ALTO × ALTO a la derecha */
const TEXTO = ANCHO - ALTO - MARGEN_IZQUIERDO - MARGEN_DERECHO;
const ESPACIADO_NOMBRE = -0.5;

const C = {
  brand50: '#f4f7fc', brand200: '#d4e0f5', brand300: '#aac1eb', brand400: '#7599de', brand500: '#2a63cd',
  brand700: '#1a3b7e', brand800: '#142d61', brand950: '#0a1530',
  ink: '#212529', inkSoft: '#495057', muted: '#6a6c6b', line: '#e9ecef', surface: '#f8f9fa',
  accent: '#22d3ee', deal: '#dc2626', dealBg: '#fef2f2', blanco: '#ffffff',
};

/** Lo que dice la tarjeta de un producto, ya formateado ("$52,78") */
export interface DatosProducto {
  nombre: string;
  precio: string;
  /** "Desde", si el producto tiene varios montos */
  desde?: boolean;
  /** Precio anterior tachado, solo si hay oferta */
  antes?: string | null;
  /** "Ahorra $12,22", solo si hay oferta */
  ahorro?: string | null;
  /** "Caja abierta", "Usado"… (nada si es nuevo y físico) */
  condicion?: string | null;
  /** Categoría o plataforma */
  detalle?: string | null;
  /** Foto cuadrada del producto (data:) */
  foto: string;
}

export interface Marca {
  /** Logo largo (ícono y "Electro Shop") para fondo claro (data:) */
  logoLargo: string;
  /** Solo el ícono redondo (data:), para escribir "Electro Shop" en blanco sobre fondo oscuro */
  icono: string;
  dominio: string;
}

const tema = (estilo: EstiloTarjeta) => estilo === 'claro'
  ? { fondo: C.blanco, texto: C.ink, suave: C.muted, precio: C.brand500, chipFondo: C.brand50, chipBorde: C.brand200, chipTexto: C.brand700, antes: C.muted, ahorroFondo: C.dealBg, ahorroTexto: C.deal }
  : { fondo: C.brand950, texto: C.blanco, suave: C.brand300, precio: C.accent, chipFondo: C.brand800, chipBorde: C.brand700, chipTexto: C.brand200, antes: C.brand300, ahorroFondo: C.deal, ahorroTexto: C.blanco };

/** De noche, detrás de la foto, la luz de una vitrina. Satori falla con una propiedad en undefined: solo se agrega si va */
const luzDeVitrina = (oscuro: boolean) =>
  oscuro ? { backgroundImage: `radial-gradient(circle at 76% 50%, ${C.brand800} 0%, ${C.brand950} 58%)` } : {};

// Avance de cada carácter de Inter Bold (lib/og/fuentes/Inter-Bold.ttf), en fracciones del tamaño de la letra.
// Medido con fontTools (hmtx / unitsPerEm). Las letras con acento miden lo mismo que su base (á = a, Ñ = N).
const ANCHO_BOLD: Record<string, number> = JSON.parse('{" ":0.237,"!":0.338,"\\"":0.552,"#":0.649,"$":0.655,"%":1.016,"&":0.672,"\'":0.339,"(":0.377,")":0.377,"*":0.559,"+":0.679,",":0.334,"-":0.468,".":0.334,"/":0.388,"0":0.674,"1":0.431,"2":0.63,"3":0.646,"4":0.676,"5":0.622,"6":0.649,"7":0.582,"8":0.651,"9":0.649,":":0.334,";":0.343,"<":0.679,"=":0.679,">":0.679,"?":0.56,"@":1.016,"A":0.747,"B":0.662,"C":0.74,"D":0.722,"E":0.607,"F":0.587,"G":0.75,"H":0.747,"I":0.281,"J":0.584,"K":0.719,"L":0.565,"M":0.932,"N":0.762,"O":0.771,"P":0.648,"Q":0.777,"R":0.657,"S":0.655,"T":0.667,"U":0.732,"V":0.747,"W":1.038,"X":0.738,"Y":0.731,"Z":0.664,"[":0.377,"\\\\":0.388,"]":0.377,"^":0.487,"_":0.476,"`":0.365,"a":0.581,"b":0.63,"c":0.588,"d":0.63,"e":0.596,"f":0.398,"g":0.632,"h":0.623,"i":0.271,"j":0.271,"k":0.58,"l":0.271,"m":0.913,"n":0.623,"o":0.613,"p":0.63,"q":0.63,"r":0.407,"s":0.56,"t":0.366,"u":0.623,"v":0.6,"w":0.85,"x":0.58,"y":0.602,"z":0.573,"{":0.469,"|":0.372,"}":0.469,"~":0.679,"¿":0.56,"¡":0.338,"°":0.459,"º":0.49,"ª":0.464,"€":0.685,"™":0.64,"–":0.5,"—":1,"“":0.54,"”":0.532,"‘":0.311,"’":0.311,"•":0.474,"…":1.002}');

const anchoLetra = (letra: string) => ANCHO_BOLD[letra] ?? ANCHO_BOLD[letra.normalize('NFD')[0]] ?? 0.65;

/** Cuántas líneas ocupa un texto en Inter Bold con corte por palabra (`espaciado`: el letterSpacing, en px) */
function lineas(texto: string, tamano: number, ancho: number, espaciado: number): number {
  const medir = (palabra: string) => [...palabra].reduce((suma, letra) => suma + anchoLetra(letra) * tamano + espaciado, 0);
  const espacio = ANCHO_BOLD[' '] * tamano + espaciado;
  let cuenta = 1;
  let actual = 0;
  for (const palabra of texto.split(' ')) {
    const largo = medir(palabra);
    if (actual > 0 && actual + espacio + largo > ancho) { cuenta++; actual = largo; } else actual += (actual > 0 ? espacio : 0) + largo;
  }
  return cuenta;
}

/**
 * El nombre del producto en 3 líneas como máximo, lo más grande que entre: la tarjeta se lee a unos 400 px de ancho.
 * Si ni con la letra más chica entra, se corta en una palabra.
 */
function nombreAjustado(nombre: string, ancho: number): { texto: string; tamano: number } {
  const limpio = nombre.replace(/\s+/g, ' ').trim();
  for (const tamano of [56, 50, 44, 40]) if (lineas(limpio, tamano, ancho, ESPACIADO_NOMBRE) <= 3) return { texto: limpio, tamano };
  const palabras = limpio.split(' ');
  while (palabras.length > 1 && lineas(`${palabras.join(' ')}…`, 40, ancho, ESPACIADO_NOMBRE) > 3) palabras.pop();
  return { texto: `${palabras.join(' ')}…`, tamano: 40 };
}

function Wordmark({ estilo, marca, alto }: { estilo: EstiloTarjeta; marca: Marca; alto: number }) {
  if (estilo === 'claro') {
    // logo-largo.png mide 1660 × 288
    return <img src={marca.logoLargo} width={Math.round(alto * 1660 / 288)} height={alto} alt="" />;
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <img src={marca.icono} width={alto} height={alto} alt="" />
      <div style={{ display: 'flex', marginLeft: Math.round(alto * 0.32), fontFamily: 'Tektrron', fontSize: Math.round(alto * 0.62), color: C.blanco, lineHeight: 1 }}>
        Electro Shop
      </div>
    </div>
  );
}

const CHIP = { letra: 24, relleno: 16, borde: 2, separacion: 10 };

/**
 * Las etiquetas van en una sola línea: si la segunda (la categoría) no cabe, queda solo la primera (la condición).
 * Se miden con los anchos de Inter Bold y un 5 % de margen (la etiqueta es SemiBold, un poco más angosta).
 */
function etiquetasQueCaben(etiquetas: string[]): string[] {
  const ancho = (texto: string) => [...texto].reduce((suma, letra) => suma + anchoLetra(letra), 0) * CHIP.letra * 1.05 + 2 * (CHIP.relleno + CHIP.borde) + CHIP.separacion;
  const caben: string[] = [];
  let usado = 0;
  for (const etiqueta of etiquetas) {
    if (usado + ancho(etiqueta) > TEXTO) break;
    caben.push(etiqueta);
    usado += ancho(etiqueta);
  }
  return caben;
}

function Chip({ texto, estilo }: { texto: string; estilo: EstiloTarjeta }) {
  const t = tema(estilo);
  return (
    <div style={{ display: 'flex', flexShrink: 0, whiteSpace: 'nowrap', padding: `7px ${CHIP.relleno}px`, borderRadius: 999, background: t.chipFondo, border: `${CHIP.borde}px solid ${t.chipBorde}`, color: t.chipTexto, fontSize: CHIP.letra, fontWeight: 600, marginRight: CHIP.separacion }}>
      {texto}
    </div>
  );
}

/** Producto: el texto a la izquierda y la foto de la tienda (con su cinta ES) a la derecha, de borde a borde */
export function TarjetaProducto({ datos, marca, estilo }: { datos: DatosProducto; marca: Marca; estilo: EstiloTarjeta }): ReactElement {
  const t = tema(estilo);
  const nombre = nombreAjustado(datos.nombre, TEXTO);
  const chips = etiquetasQueCaben([datos.condicion, datos.detalle].filter((c): c is string => Boolean(c)));
  const oscuro = estilo === 'oscuro';
  const lado = oscuro ? ALTO - 72 : ALTO;

  return (
    <div style={{
      width: ANCHO, height: ALTO, display: 'flex', fontFamily: 'Inter', color: t.texto, background: t.fondo,
      ...luzDeVitrina(oscuro),
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: ANCHO - ALTO, padding: `56px ${MARGEN_DERECHO}px 50px ${MARGEN_IZQUIERDO}px` }}>
        <Wordmark estilo={estilo} marca={marca} alto={50} />

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1, padding: '24px 0' }}>
          {chips.length > 0 && (
            <div style={{ display: 'flex', marginBottom: 18 }}>{chips.map((c) => <Chip key={c} texto={c} estilo={estilo} />)}</div>
          )}
          <div style={{ display: 'flex', fontSize: nombre.tamano, fontWeight: 700, lineHeight: 1.1, letterSpacing: ESPACIADO_NOMBRE }}>{nombre.texto}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {datos.antes && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', fontSize: 36, fontWeight: 500, color: t.antes, textDecoration: 'line-through', marginRight: 16 }}>{datos.antes}</div>
              {datos.ahorro && (
                <div style={{ display: 'flex', padding: '5px 14px', borderRadius: 10, background: t.ahorroFondo, color: t.ahorroTexto, fontSize: 26, fontWeight: 700 }}>{datos.ahorro}</div>
              )}
            </div>
          )}
          {datos.desde && <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, color: t.suave, marginBottom: 2 }}>Desde</div>}
          <div style={{ display: 'flex', fontSize: 100, fontWeight: 800, color: t.precio, lineHeight: 1, letterSpacing: -3 }}>{datos.precio}</div>
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 500, color: t.suave, marginTop: 16 }}>{marca.dominio}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: ALTO, height: ALTO }}>
        <div style={{ display: 'flex', width: lado, height: lado, borderRadius: oscuro ? 28 : 0, overflow: 'hidden', background: C.blanco }}>
          <img src={datos.foto} width={lado} height={lado} alt="" />
        </div>
      </div>
    </div>
  );
}

const tamanoDeTitulo = (titulo: string) => (titulo.length <= 16 ? 76 : titulo.length <= 28 ? 62 : 52);

/** Páginas sin productos que mostrar (servicios, contacto, términos…): el título y el ícono de la marca en la vitrina */
export function TarjetaPagina({ titulo, bajada, marca }: { titulo: string; bajada?: string | null; marca: Marca }): ReactElement {
  const t = tema('oscuro');
  return (
    <div style={{ width: ANCHO, height: ALTO, display: 'flex', fontFamily: 'Inter', color: t.texto, background: t.fondo, ...luzDeVitrina(true) }}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: ANCHO - ALTO, padding: `56px ${MARGEN_DERECHO}px 50px ${MARGEN_IZQUIERDO}px` }}>
        <Wordmark estilo="oscuro" marca={marca} alto={50} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: tamanoDeTitulo(titulo), fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5 }}>{titulo}</div>
          {bajada && <div style={{ display: 'flex', fontSize: 30, fontWeight: 500, color: t.suave, lineHeight: 1.3, marginTop: 20 }}>{bajada}</div>}
        </div>
        <div style={{ display: 'flex', fontSize: 26, fontWeight: 500, color: t.suave }}>{marca.dominio}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: ALTO, height: ALTO }}>
        <img src={marca.icono} width={300} height={300} alt="" />
      </div>
    </div>
  );
}

/** Categoría, portada y páginas con productos: el título a la izquierda y un mosaico de hasta 4 productos */
export function TarjetaVitrina({ titulo, bajada, fotos, marca, estilo }: { titulo: string; bajada?: string | null; fotos: string[]; marca: Marca; estilo: EstiloTarjeta }): ReactElement {
  const t = tema(estilo);
  const oscuro = estilo === 'oscuro';
  const hueco = 12;
  const margen = oscuro ? 36 : 0;
  const caja = ALTO - 2 * margen;
  const lado = Math.floor((caja - hueco) / 2);
  // Con menos de 4 fotos se repiten en orden: el mosaico nunca queda con huecos (con ninguna, va TarjetaPagina)
  const cuatro = [0, 1, 2, 3].map((i) => fotos[i % Math.max(fotos.length, 1)]).filter(Boolean);
  const tamanoTitulo = tamanoDeTitulo(titulo);

  return (
    <div style={{
      width: ANCHO, height: ALTO, display: 'flex', fontFamily: 'Inter', color: t.texto, background: t.fondo,
      ...luzDeVitrina(oscuro),
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: ANCHO - ALTO, padding: `56px ${MARGEN_DERECHO}px 50px ${MARGEN_IZQUIERDO}px` }}>
        <Wordmark estilo={estilo} marca={marca} alto={50} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: tamanoTitulo, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5 }}>{titulo}</div>
          {bajada && <div style={{ display: 'flex', fontSize: 30, fontWeight: 500, color: t.suave, lineHeight: 1.3, marginTop: 20 }}>{bajada}</div>}
        </div>
        <div style={{ display: 'flex', fontSize: 26, fontWeight: 500, color: t.suave }}>{marca.dominio}</div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', width: ALTO, height: ALTO, padding: margen, background: oscuro ? 'transparent' : C.line, alignContent: 'space-between', justifyContent: 'space-between' }}>
        {cuatro.map((foto, i) => (
          <div key={i} style={{ display: 'flex', width: lado, height: lado, borderRadius: oscuro ? 20 : 0, overflow: 'hidden', background: C.blanco }}>
            <img src={foto} width={lado} height={lado} alt="" />
          </div>
        ))}
      </div>
    </div>
  );
}
