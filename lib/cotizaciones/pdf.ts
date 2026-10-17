// El presupuesto en PDF (C-182): para descargarlo desde el enlace del cliente y para que Numen lo mande por WhatsApp.
// Es la misma hoja de DocumentoCotizacion (maqueta A que eligió Luis), dibujada en el servidor con el lienzo de
// lib/pdf-simple.ts: carta, Helvetica, márgenes de @page presupuesto. Con `bn`, para impresoras sin color: los fondos
// de color se quitan, los recuadros quedan con borde y todo sale en tinta, como al imprimir la hoja en blanco y negro.
// Solo en el servidor.

import path from 'node:path';
import sharp from 'sharp';
import { formatUSD, formatVES } from '@/lib/currency';
import { Lienzo, rgb, type EstiloTexto, type Rgb } from '@/lib/pdf-simple';
import { qrMatriz } from '@/lib/qr';
import { leerSubida } from '@/lib/subidas';
import { fechaCorta, fechaHora, fechaLarga, lineasDeTexto, totalLinea } from './core';
import type { EmpresaCotizacion } from './empresa';
import type { CotizacionPublica } from './index';

const MX = 37; // 13 mm a los lados
const ARRIBA = 34; // 12 mm
const ABAJO = 792 - 36; // hasta dónde se escribe: debajo va el pie con el número de página
const W = 612 - MX * 2;
// Los tamaños de la hoja impresa (raíz de 14 px): text-xs, text-sm, text-base y text-xl, en puntos
const T = { xs: 7.9, sm: 9.2, base: 10.5, xl: 13 };

const COLOR = {
  noche: rgb('#0a1530'), azul: rgb('#2a63cd'), sello: rgb('#1e4ba3'), tinta: rgb('#212529'), suave: rgb('#495057'),
  gris: rgb('#6a6c6b'), linea: rgb('#e9ecef'), lineaFuerte: rgb('#dee2e6'), fondo: rgb('#f8f9fa'), blanco: [1, 1, 1] as Rgb,
  // Los tonos de la hoja: success/10, warning/10 y sus bordes, mezclados sobre blanco
  verde: rgb('#047857'), verdeFondo: rgb('#e7f8f2'), verdeBorde: rgb('#94e0c6'),
  rojo: rgb('#dc2626'), rojoFondo: rgb('#fef2f2'), rojoBorde: rgb('#f1a8a8'),
  ambar: rgb('#b45309'), ambarFondo: rgb('#fef5e7'), ambarBorde: rgb('#fbd391'), ambarBarra: rgb('#f59e0b'),
};
type Paleta = { [K in keyof typeof COLOR]: Rgb } & { relleno: boolean };

/** En blanco y negro: tinta en vez de colores, sin fondos y con las rayas claras más oscuras para que salgan */
function paleta(bn: boolean): Paleta {
  if (!bn) return { ...COLOR, relleno: true };
  const tinta = COLOR.tinta;
  return {
    ...COLOR, noche: tinta, azul: tinta, sello: tinta, verde: tinta, verdeBorde: tinta, rojo: tinta, rojoBorde: tinta,
    ambar: tinta, ambarBorde: tinta, ambarBarra: tinta, linea: rgb('#bfc4c9'), lineaFuerte: tinta, relleno: false,
  };
}

interface Imagen { jpeg: Buffer; ancho: number; alto: number }

async function aJpeg(buffer: Buffer, ancho: number, alto: number, bn: boolean): Promise<Imagen> {
  let img = sharp(buffer).rotate().resize(ancho, alto, { fit: 'inside', withoutEnlargement: true }).flatten({ background: '#ffffff' });
  if (bn) img = img.grayscale();
  // El PDF declara las imágenes en RGB: también la gris va con tres canales
  const { data, info } = await img.toColourspace('srgb').jpeg({ quality: 90 }).toBuffer({ resolveWithObject: true });
  return { jpeg: data, ancho: info.width, alto: info.height };
}

// El logo largo del membrete (el ícono y "Electro Shop" con la letra de la marca), como en las tarjetas para compartir
const LOGO = path.join(process.cwd(), 'public', 'images', 'brand', 'logo-largo.png');
const logos = new Map<boolean, Promise<Imagen | null>>();
function logoLargo(bn: boolean): Promise<Imagen | null> {
  let logo = logos.get(bn);
  if (!logo) {
    logo = sharp(LOGO).toBuffer().then((b) => aJpeg(b, 1000, 174, bn)).catch(() => null);
    logos.set(bn, logo);
  }
  return logo;
}

export async function presupuestoPdf(c: CotizacionPublica, empresa: EmpresaCotizacion, opciones: { enlace: string | null; bn?: boolean }): Promise<Buffer> {
  const bn = Boolean(opciones.bn);
  const P = paleta(bn);
  const [logo, selloFirmado] = await Promise.all([
    logoLargo(bn),
    leerSubida(empresa.selloFirmado).then((b) => (b ? aJpeg(b, 640, 280, bn).catch(() => null) : null)),
  ]);
  const L = new Lienzo();
  let y = ARRIBA;

  // ---------- Piezas

  const fila = (x: number, top: number, texto: string, e: EstiloTexto) => L.texto(x, top + e.tam * 1.01, texto, e);
  const escribir = (x: number, top: number, ancho: number, texto: string, e: EstiloTexto, interlinea = 1.35) => L.parrafo(x, top, ancho, texto, { ...e, interlinea });

  /** "Etiqueta: valor" con la etiqueta en negrita, cortado al ancho. Devuelve dónde termina. */
  const conEtiqueta = (x: number, top: number, ancho: number, etiqueta: string, valor: string, o: { tam: number; colorEtiqueta: Rgb; color: Rgb; alinear?: 'izq' | 'der' }) => {
    const lh = o.tam * 1.35;
    const we = L.medir(`${etiqueta} `, o.tam, true);
    const lineas: string[] = [];
    let actual = '';
    let disponible = ancho - we;
    for (const palabra of valor.split(/\s+/).filter(Boolean)) {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (L.medir(prueba, o.tam) <= disponible) { actual = prueba; continue; }
      if (!actual && lineas.length > 0) { actual = palabra; continue; }
      lineas.push(actual);
      actual = palabra;
      disponible = ancho;
    }
    lineas.push(actual);
    lineas.forEach((linea, i) => {
      const base = top + i * lh + o.tam * 1.01;
      const wl = L.medir(linea, o.tam);
      if (i === 0) {
        const x0 = o.alinear === 'der' ? x + ancho - we - wl : x;
        L.texto(x0, base, etiqueta, { tam: o.tam, negrita: true, color: o.colorEtiqueta });
        L.texto(x0 + we, base, linea, { tam: o.tam, color: o.color });
      } else {
        L.texto(o.alinear === 'der' ? x + ancho : x, base, linea, { tam: o.tam, color: o.color, alinear: o.alinear });
      }
    });
    return top + lineas.length * lh;
  };

  /** Un recuadro con fondo, borde y esquinas redondeadas detrás de lo que dibuja `contenido` (que devuelve dónde termina) */
  const recuadro = (x: number, top: number, ancho: number, o: { fondo?: Rgb; borde?: Rgb; grosor?: number; abajo?: number }, contenido: () => number) => {
    const marca = L.posicion;
    const fin = contenido() + (o.abajo ?? 8);
    L.debajo(marca, () => L.rect(x, top, ancho, fin - top, { relleno: P.relleno ? o.fondo : undefined, borde: o.borde, grosor: o.grosor ?? 0.75, radio: 4 }));
    return fin;
  };

  const dibujarLogo = () => {
    if (logo) {
      const h = 30;
      L.imagen(logo.jpeg, logo.ancho, logo.alto, MX, y, (h * logo.ancho) / logo.alto, h);
    }
  };

  /** El membrete de cada hoja: la empresa a la izquierda y el recuadro del documento a la derecha */
  const membrete = (titulo: string, numero: string, filas: Array<[string, string]>, estado?: { texto: string; color: Rgb; fondo: Rgb; borde: Rgb } | null) => {
    const wl = 309;
    dibujarLogo();
    let yl = y + (logo ? 36 : 0);
    if (empresa.nombre !== empresa.marca) yl = escribir(MX, yl, wl, empresa.nombre.toUpperCase(), { tam: T.xs, negrita: true, color: P.noche });
    if (empresa.lema) yl = escribir(MX, yl, wl, empresa.lema, { tam: T.xs, color: P.suave });
    const contacto = [empresa.whatsapp && `WhatsApp: ${empresa.whatsapp}`, empresa.telefono && empresa.telefono !== empresa.whatsapp && `Tel.: ${empresa.telefono}`].filter(Boolean).join(' · ');
    const lineaRif = [empresa.rif && `RIF: ${empresa.rif}`, empresa.direccion].filter(Boolean).join(' · ');
    if (lineaRif) yl = escribir(MX, yl, wl, lineaRif, { tam: T.xs, color: P.suave });
    const lineaContacto = [contacto, empresa.correo, empresa.sitio].filter(Boolean).join(' · ');
    if (lineaContacto) yl = escribir(MX, yl, wl, lineaContacto, { tam: T.xs, color: P.suave });

    const xr = MX + wl + 16;
    const wr = W - wl - 16;
    const der = xr + wr - 10;
    const yr = recuadro(xr, y, wr, { fondo: P.fondo, borde: P.noche, grosor: 1.2 }, () => {
      let yy = y + 8;
      fila(der, yy, titulo.toUpperCase(), { tam: T.sm, negrita: true, color: P.noche, alinear: 'der' });
      yy += T.sm * 1.4;
      fila(der, yy, `N.º ${numero}`, { tam: T.xl, negrita: true, color: P.azul, alinear: 'der' });
      yy += T.xl * 1.35 + 1;
      for (const [etiqueta, valor] of filas) yy = conEtiqueta(xr + 10, yy, wr - 20, etiqueta, valor, { tam: T.xs, colorEtiqueta: P.tinta, color: P.suave, alinear: 'der' });
      if (estado) {
        const we = L.medir(estado.texto, T.xs, true) + 16;
        yy += 4;
        L.rect(der - we, yy, we, 13, { relleno: P.relleno ? estado.fondo : undefined, borde: estado.borde, grosor: 0.75, radio: 6.5 });
        fila(der - we / 2, yy + 2.4, estado.texto, { tam: T.xs, negrita: true, color: estado.color, alinear: 'centro' });
        yy += 13;
      }
      return yy;
    });
    y = Math.max(yl, yr) + 8;
    L.linea(MX, y, MX + W, y, P.noche, 1.6);
    y += 10;
  };

  const nuevaHoja = () => {
    L.pagina();
    y = ARRIBA;
    fila(MX, y, `${empresa.marca} · Presupuesto N.º ${c.number} (continuación)`, { tam: T.xs, color: P.gris });
    y += 14;
    L.linea(MX, y, MX + W, y, P.linea, 0.75);
    y += 10;
  };
  /** Si lo que sigue (de `alto` puntos) no cabe, empieza otra hoja */
  const asegurar = (alto: number, alPasar?: () => void) => {
    if (y + alto <= ABAJO) return;
    nuevaHoja();
    alPasar?.();
  };
  /** Dibuja un bloque que va junto: si no cabe, lo borra y lo dibuja en la hoja siguiente */
  const junto = (dibujar: () => number) => {
    const marca = L.posicion;
    const desde = y;
    const fin = dibujar();
    if (fin <= ABAJO || desde <= ARRIBA + 30) { y = fin; return; }
    L.deshacer(marca);
    nuevaHoja();
    y = dibujar();
  };

  const cabezaTabla = (columnas: Array<{ x: number; w: number; texto: string; alinear: 'izq' | 'der' | 'centro' }>) => {
    const h = 18;
    if (P.relleno) {
      L.rect(MX, y, W, h, { relleno: P.noche, radio: 4 });
      L.rect(MX, y + h / 2, W, h / 2, { relleno: P.noche });
    } else {
      L.linea(MX, y + h, MX + W, y + h, P.tinta, 1.4);
    }
    for (const col of columnas) {
      const x = col.alinear === 'der' ? col.x + col.w - 8 : col.alinear === 'centro' ? col.x + col.w / 2 : col.x + 8;
      fila(x, y + 5, col.texto.toUpperCase(), { tam: T.xs, negrita: true, color: P.relleno ? P.blanco : P.tinta, alinear: col.alinear });
    }
    y += h;
  };

  // ---------- Hoja 1: el presupuesto

  const aprobada = Boolean(c.approvedAt && c.approvedName);
  const estado = aprobada
    ? { texto: `Aprobado el ${new Date(c.approvedAt!).toLocaleDateString('es-VE', { timeZone: 'America/Caracas' })}`, color: P.verde, fondo: COLOR.verdeFondo, borde: P.verdeBorde }
    : c.status === 'EXPIRED' ? { texto: 'Vencido', color: P.rojo, fondo: COLOR.rojoFondo, borde: P.rojoBorde }
    : c.status === 'SENT' ? { texto: 'Pendiente de aprobación', color: P.ambar, fondo: COLOR.ambarFondo, borde: P.ambarBorde }
    : null;
  const fecha = c.sentAt ?? c.createdAt;
  membrete('Presupuesto', c.number, [
    ['Fecha:', fechaLarga(fecha)],
    ['Validez:', `${c.validityDays} días${c.venceEl ? `, hasta el ${fechaCorta(c.venceEl)}` : ''}`],
  ], estado);

  // El cliente
  {
    const wi = W - 24;
    const wizq = ((wi - 18) * 1.2) / 2.2;
    const wder = wi - 18 - wizq;
    const datos = { tam: T.sm, colorEtiqueta: P.noche, color: P.suave };
    y = recuadro(MX, y, W, { fondo: P.fondo, borde: P.lineaFuerte }, () => {
      let yi = y + 7;
      yi = conEtiqueta(MX + 12, yi, wizq, 'Cliente o empresa:', c.clientName, datos);
      if (c.clientDoc) yi = conEtiqueta(MX + 12, yi, wizq, 'RIF o cédula:', c.clientDoc, datos);
      if (c.contactName) yi = conEtiqueta(MX + 12, yi, wizq, 'Atención:', c.contactName, datos);
      let yd = y + 7;
      const xd = MX + 12 + wizq + 18;
      if (c.location) yd = conEtiqueta(xd, yd, wder, 'Ubicación:', c.location, { ...datos, alinear: 'der' });
      if (c.subject) yd = conEtiqueta(xd, yd, wder, 'Para:', c.subject, { ...datos, alinear: 'der' });
      return Math.max(yi, yd);
    }) + 9;
  }

  // Las partidas
  const wCant = 46;
  const wPrecio = 80;
  const wDesc = W - wCant - wPrecio * 2;
  const columnas = [
    { x: MX, w: wDesc, texto: 'Descripción', alinear: 'izq' as const },
    { x: MX + wDesc, w: wCant, texto: 'Cant.', alinear: 'centro' as const },
    { x: MX + wDesc + wCant, w: wPrecio, texto: 'Precio unit.', alinear: 'der' as const },
    { x: MX + wDesc + wCant + wPrecio, w: wPrecio, texto: 'Total', alinear: 'der' as const },
  ];
  asegurar(60);
  cabezaTabla(columnas);
  c.items.forEach((l, i) => {
    const titulo = L.lineas(l.title, wDesc - 16, T.sm, true);
    const descripcion = l.description ? L.lineas(l.description, wDesc - 16, T.xs) : [];
    const alto = 9 + titulo.length * T.sm * 1.3 + (descripcion.length ? 1.5 + descripcion.length * T.xs * 1.4 : 0);
    asegurar(alto, () => cabezaTabla(columnas));
    if (i % 2 === 1 && P.relleno) L.rect(MX, y, W, alto, { relleno: P.fondo });
    let yy = y + 5;
    for (const t of titulo) { fila(MX + 8, yy, t, { tam: T.sm, negrita: true, color: P.noche }); yy += T.sm * 1.3; }
    if (descripcion.length) {
      yy += 1.5;
      for (const t of descripcion) { fila(MX + 8, yy, t, { tam: T.xs, color: P.suave }); yy += T.xs * 1.4; }
    }
    fila(MX + wDesc + wCant / 2, y + 5, String(l.quantity), { tam: T.sm, color: P.tinta, alinear: 'centro' });
    fila(MX + wDesc + wCant + wPrecio - 8, y + 5, formatUSD(l.unitPriceUSD), { tam: T.sm, color: P.tinta, alinear: 'der' });
    fila(MX + W - 8, y + 5, l.unitPriceUSD === 0 ? 'Incluido' : formatUSD(totalLinea(l.unitPriceUSD, l.quantity)), { tam: T.sm, negrita: true, color: P.tinta, alinear: 'der' });
    y += alto;
    L.linea(MX, y, MX + W, y, P.linea, 0.75);
  });
  y += 10;

  // Las condiciones al lado de los totales
  const { totales } = c;
  const condiciones = lineasDeTexto(c.conditions);
  const conRetencion = totales.retencionUSD > 0;
  junto(() => {
    const top = y;
    const wc = ((W - 16) * 0.95) / 2.25;
    const xc = MX + 10;
    const anchoC = wc - 20;
    const finCondiciones = recuadro(MX, top, wc, { fondo: P.fondo, borde: P.linea }, () => {
      let yy = top + 7;
      const texto = { tam: T.xs, color: P.suave };
      if (condiciones.length > 0) {
        fila(xc, yy, 'Condiciones comerciales', { tam: T.sm, negrita: true, color: P.noche });
        yy += T.sm * 1.4;
        for (const linea of condiciones) {
          fila(xc, yy, '•', texto);
          yy = escribir(xc + 8, yy, anchoC - 8, linea, texto, 1.35);
        }
        yy += 4;
      }
      fila(xc, yy, 'Formas de pago', { tam: T.sm, negrita: true, color: P.noche });
      yy += T.sm * 1.4;
      if (empresa.pagos.length > 0) {
        for (const pago of empresa.pagos) yy = conEtiqueta(xc, yy, anchoC, `${pago.nombre}:`, pago.lineas.map((x) => x.replace(/^[^:]+: /, '')).join(' · '), { tam: T.xs, colorEtiqueta: P.tinta, color: P.suave });
      } else {
        yy = escribir(xc, yy, anchoC, 'Las que la tienda tenga activas al momento de pagar.', texto, 1.35);
      }
      yy += 3;
      return escribir(xc, yy, anchoC, `Al pagar, avísanos${empresa.whatsapp ? ` por WhatsApp al ${empresa.whatsapp}` : ''} con el número de este presupuesto (${c.number}) para confirmar el pedido.`, texto, 1.35);
    });

    const xt = MX + wc + 16;
    const wt = W - wc - 16;
    const derT = xt + wt - 8;
    let yy = top;
    /** Una fila de los totales: la etiqueta a la izquierda (cortada si no cabe) y el monto a la derecha */
    const total = (etiqueta: string, valor: string, e: { tamE: number; negritaE?: boolean; colorE: Rgb; tamV: number; colorV: Rgb; negritaV?: boolean }, alto = 1.6) => {
      const wv = L.medir(valor, e.tamV, e.negritaV ?? true);
      const lh = Math.max(e.tamE, e.tamV) * alto;
      const lineas = L.lineas(etiqueta, wt - 16 - wv - 10, e.tamE, e.negritaE);
      const base = yy + (lh - e.tamV) / 2 + e.tamV * 0.82;
      L.texto(derT, base, valor, { tam: e.tamV, negrita: e.negritaV ?? true, color: e.colorV, alinear: 'der' });
      lineas.forEach((linea, i) => L.texto(xt + 8, base + i * e.tamE * 1.3, linea, { tam: e.tamE, negrita: e.negritaE, color: e.colorE }));
      yy += lh + (lineas.length - 1) * e.tamE * 1.3;
    };
    const nota = (texto: string) => { yy = escribir(xt + 8, yy, wt - 16, texto, { tam: T.xs, color: P.gris, alinear: 'der' }, 1.4) + 2; };

    if (totales.ivaUSD > 0) {
      total('Base imponible', formatUSD(totales.baseUSD), { tamE: T.sm, colorE: P.suave, tamV: T.sm, colorV: P.noche });
      total(`IVA (${c.taxPercent} %), incluido en los precios`, formatUSD(totales.ivaUSD), { tamE: T.sm, colorE: P.suave, tamV: T.sm, colorV: P.noche });
    }
    L.linea(xt, yy, xt + wt, yy, P.noche, 1.2);
    yy += 3;
    total('Monto total', formatUSD(totales.totalUSD), { tamE: T.base, negritaE: true, colorE: P.noche, tamV: T.xl, colorV: P.noche }, 1.5);
    if (empresa.tasaVES > 0) nota(`${formatVES(Math.round(totales.totalUSD * empresa.tasaVES * 100) / 100)} a la tasa BCV de hoy (${formatVES(empresa.tasaVES)})`);
    if (conRetencion) {
      total(`Retención del IVA (${c.ivaRetentionPercent} %), la practica el cliente`, `-${formatUSD(totales.retencionUSD)}`, { tamE: T.sm, colorE: P.suave, tamV: T.sm, colorV: P.suave, negritaV: false });
      total(`Neto a pagar a ${empresa.marca}`, formatUSD(totales.netoUSD), { tamE: T.sm, negritaE: true, colorE: P.tinta, tamV: T.base + 1, colorV: P.noche });
      if (empresa.tasaVES > 0) nota(`${formatVES(Math.round(totales.netoUSD * empresa.tasaVES * 100) / 100)} a la tasa BCV de hoy`);
      yy = escribir(xt + 8, yy, wt - 16, `El cliente retiene ese monto del IVA al pagar y le entrega a ${empresa.nombre} su comprobante de retención.`, { tam: T.xs, color: P.gris }, 1.4) + 2;
    }
    if (totales.anticipoUSD !== null && totales.saldoUSD !== null) {
      const resaltado = (etiqueta: string, valor: string, color: Rgb, fondo: Rgb, tamV: number) => {
        yy += 4;
        const h = 18;
        if (P.relleno) L.rect(xt, yy, wt, h, { relleno: fondo, radio: 4 });
        else { L.linea(xt, yy, xt + wt, yy, P.tinta, 0.75); L.linea(xt, yy + h, xt + wt, yy + h, P.tinta, 0.75); }
        const base = yy + h / 2 + T.sm * 0.36;
        L.texto(xt + 8, base, etiqueta, { tam: T.sm, negrita: true, color });
        L.texto(derT, base + (tamV - T.sm) * 0.36, valor, { tam: tamV, negrita: true, color, alinear: 'der' });
        yy += h;
      };
      resaltado(`Anticipo (${c.advancePercent} %${conRetencion ? ' del neto' : ''})`, formatUSD(totales.anticipoUSD), P.verde, COLOR.verdeFondo, T.base);
      resaltado(`Saldo contra entrega (${100 - (c.advancePercent ?? 0)} %)`, formatUSD(totales.saldoUSD), P.rojo, COLOR.rojoFondo, T.sm);
    }
    return Math.max(finCondiciones, yy) + 10;
  });

  // Lo que no incluye, en ámbar
  if (c.notice) {
    const notice = c.notice;
    junto(() => {
      const top = y;
      const fin = recuadro(MX, top, W, { fondo: COLOR.ambarFondo, borde: P.ambarBorde }, () => {
        const yy = top + 7;
        // El triángulo con el signo de admiración, como FiAlertTriangle
        L.poligono([[MX + 12, yy + 9.5], [MX + 17, yy + 0.5], [MX + 22, yy + 9.5]], P.ambar);
        fila(MX + 17, yy + 2.6, '!', { tam: 6.5, negrita: true, color: P.blanco, alinear: 'centro' });
        fila(MX + 27, yy, 'Nota importante: lo que no incluye', { tam: T.sm, negrita: true, color: P.ambar });
        return escribir(MX + 12, yy + T.sm * 1.45, W - 24, notice, { tam: T.xs, color: P.suave }, 1.45);
      });
      L.rect(MX, top, 3.5, fin - top, { relleno: P.ambarBarra });
      return fin + 10;
    });
  }

  // La garantía y las firmas van juntas (con una garantía muy larga, la garantía se deja partir)
  const terminos = lineasDeTexto(c.terms);
  const dibujarTerminos = (desde: number, partir: boolean) => {
    let yy = desde;
    // Al principio de una hoja, la raya de la continuación ya separa
    if (desde > ARRIBA + 30) L.linea(MX, yy, MX + W, yy, P.linea, 0.75);
    yy += 7;
    fila(MX, yy, 'Entrega y garantía', { tam: T.sm, negrita: true, color: P.noche });
    yy += T.sm * 1.4;
    terminos.forEach((linea, i) => {
      const texto = { tam: T.xs, color: P.suave };
      if (partir) {
        y = yy;
        asegurar(L.altoParrafo(W - 18, linea, { ...texto, interlinea: 1.4 }));
        yy = y;
      }
      fila(MX + 12, yy, `${i + 1}.`, { ...texto, alinear: 'der' });
      yy = escribir(MX + 18, yy, W - 18, linea, texto, 1.4);
    });
    return yy + 4;
  };

  const dibujarFirmas = (desde: number) => {
    const top = desde + 2;
    const wf = (W - 28) / 2;
    const zona = 58;
    const lineaY = top + zona;
    const xIzq = MX;
    const xDer = MX + wf + 28;
    // Por la tienda: el sello firmado o el sello con los datos de la empresa
    if (selloFirmado) {
      const escala = Math.min(150 / selloFirmado.ancho, 56 / selloFirmado.alto);
      const w = selloFirmado.ancho * escala;
      const h = selloFirmado.alto * escala;
      L.imagen(selloFirmado.jpeg, selloFirmado.ancho, selloFirmado.alto, xIzq + (wf - w) / 2, lineaY - 2 - h, w, h);
    } else {
      const lineas = [
        empresa.rif && { texto: `RIF: ${empresa.rif}`, negrita: true },
        (empresa.telefono || empresa.whatsapp) && { texto: `Tel.: ${empresa.telefono || empresa.whatsapp}`, negrita: false },
        empresa.lugar && { texto: empresa.lugar.toUpperCase(), negrita: true },
      ].filter((l): l is { texto: string; negrita: boolean } => Boolean(l));
      const hLogo = 12;
      const wLogo = logo ? (hLogo * logo.ancho) / logo.alto : L.medir(empresa.marca, T.base, true);
      const ws = Math.max(wLogo, ...lineas.map((l) => L.medir(l.texto, T.xs, l.negrita))) + 22;
      const hs = 11 + hLogo + lineas.length * T.xs * 1.22 + 4;
      const xs = xIzq + (wf - ws) / 2;
      const ys = lineaY - 4 - hs;
      L.girado(xs + ws / 2, ys + hs / 2, -3, () => {
        L.rect(xs, ys, ws, hs, { borde: P.sello, grosor: 1.6, radio: 6 });
        L.rect(xs + 2.5, ys + 2.5, ws - 5, hs - 5, { borde: P.sello, grosor: 0.6, radio: 4 });
        let yy = ys + 6;
        if (logo) L.imagen(logo.jpeg, logo.ancho, logo.alto, xs + (ws - wLogo) / 2, yy, wLogo, hLogo);
        else fila(xs + ws / 2, yy, empresa.marca, { tam: T.base, negrita: true, color: P.sello, alinear: 'centro' });
        yy += hLogo + 2;
        for (const l of lineas) {
          fila(xs + ws / 2, yy, l.texto, { tam: T.xs, negrita: l.negrita, color: P.sello, alinear: 'centro' });
          yy += T.xs * 1.22;
        }
      });
    }
    // Por el cliente: su aprobación, o el código para aprobarla
    if (aprobada) {
      const lineas = [
        { texto: 'APROBADO', negrita: true, color: P.verde },
        { texto: c.approvedName ?? '', negrita: true, color: P.tinta },
        ...(c.approvedDoc ? [{ texto: c.approvedDoc, negrita: false, color: P.tinta }] : []),
        { texto: c.approvedAt ? fechaHora(c.approvedAt) : '', negrita: false, color: P.suave },
      ];
      const wa = Math.max(...lineas.map((l) => L.medir(l.texto, T.xs, l.negrita))) + 20;
      const ha = 10 + lineas.length * T.xs * 1.3;
      const xa = xDer + (wf - wa) / 2;
      const ya = lineaY - 4 - ha;
      L.girado(xa + wa / 2, ya + ha / 2, -2, () => {
        L.rect(xa, ya, wa, ha, { borde: P.verde, grosor: 1.6, radio: 6 });
        let yy = ya + 5;
        for (const l of lineas) {
          fila(xa + wa / 2, yy, l.texto, { tam: T.xs, negrita: l.negrita, color: l.color, alinear: 'centro' });
          yy += T.xs * 1.3;
        }
      });
    } else if (c.status === 'SENT') {
      const lado = opciones.enlace ? 56 : 0;
      const wTexto = Math.min(150, wf - lado - 8);
      const textoPendiente = opciones.enlace
        ? 'Para aprobarlo, escanea o toca el código y escribe tu nombre y tu cédula o RIF.'
        : 'Se aprueba con el enlace del presupuesto, con tu nombre y tu cédula o RIF.';
      const hTexto = T.xs * 1.4 + L.altoParrafo(wTexto, textoPendiente, { tam: T.xs, interlinea: 1.35 });
      const wBloque = lado + (lado ? 8 : 0) + wTexto;
      const xb = xDer + (wf - wBloque) / 2;
      if (opciones.enlace) {
        L.qr(xb, lineaY - 2 - lado, lado, qrMatriz(opciones.enlace), P.tinta);
        L.enlace(xb, lineaY - 2 - lado, wBloque, lado, opciones.enlace);
      }
      const yt = lineaY - 4 - Math.max(hTexto, lado ? lado / 2 + hTexto / 2 : 0);
      const xt = xb + lado + (lado ? 8 : 0);
      fila(xt, yt, 'Pendiente de aprobación', { tam: T.xs, negrita: true, color: P.ambar });
      escribir(xt, yt + T.xs * 1.4, wTexto, textoPendiente, { tam: T.xs, color: P.suave });
    }
    for (const [x, nombre, detalle] of [
      [xIzq, `Por ${empresa.nombre}`, empresa.rif ? `RIF: ${empresa.rif}` : 'Emisión del presupuesto'],
      [xDer, `Por ${c.clientName}`, aprobada ? 'Aprobación registrada con fecha y hora' : 'Conformidad y aprobación'],
    ] as const) {
      L.linea(x, lineaY, x + wf, lineaY, P.tinta, 0.6);
      const finNombre = escribir(x, lineaY + 5, wf, nombre, { tam: T.xs, negrita: true, color: P.tinta, alinear: 'centro' });
      escribir(x, finNombre, wf, detalle, { tam: T.xs, color: P.suave, alinear: 'centro' });
    }
    const fin = lineaY + 5 + T.xs * 1.35 * 2 + 8;
    fila(MX + W / 2, fin, 'Este presupuesto no es una factura.', { tam: T.xs, color: P.gris, alinear: 'centro' });
    return fin + T.xs * 1.4;
  };

  if (terminos.length <= 8) {
    junto(() => dibujarFirmas(terminos.length > 0 ? dibujarTerminos(y, false) : y));
  } else {
    y = dibujarTerminos(y, true);
    junto(() => dibujarFirmas(y));
  }

  // ---------- Hoja 2: el anexo técnico, si lo hay

  if (c.annex) {
    L.pagina();
    y = ARRIBA;
    membrete('Anexo técnico', `${c.number} · 1`, [
      ...(c.annexTitle ? [['Contenido:', c.annexTitle] as [string, string]] : []),
      ['Fecha:', fechaLarga(fecha)],
    ]);
    if (c.annexTitle) {
      asegurar(30);
      y = escribir(MX, y, W, c.annexTitle, { tam: T.base, negrita: true, color: P.noche }) + 2;
    }
    const texto = { tam: T.sm, color: P.suave };
    const parrafo = (t: string, x = MX, ancho = W) => {
      for (const linea of L.lineas(t, ancho, T.sm)) {
        asegurar(T.sm * 1.6);
        fila(x, y, linea, texto);
        y += T.sm * 1.6;
      }
    };
    const lineas = c.annex.split('\n');
    for (let i = 0; i < lineas.length;) {
      const linea = lineas[i].trim();
      if (!linea) { i++; continue; }
      if (linea.includes('|')) {
        const filas: string[][] = [];
        while (i < lineas.length && lineas[i].includes('|')) { filas.push(lineas[i].split('|').map((x) => x.trim())); i++; }
        const [cabeza, ...cuerpo] = filas;
        // El ancho de cada columna, por lo que ocupa; lo que sobra va a la primera y, si no cabe, todas se achican
        const natural = cabeza.map((_, k) => Math.min(260, Math.max(L.medir(cabeza[k].toUpperCase(), T.xs, true), ...cuerpo.map((f) => L.medir(f[k] ?? '', T.sm, k === 0))) + 16));
        const suma = natural.reduce((a, b) => a + b, 0);
        const anchos = suma <= W ? natural.map((w, k) => (k === 0 ? w + W - suma : w)) : natural.map((w) => (w * W) / suma);
        const xs = anchos.map((_, k) => MX + anchos.slice(0, k).reduce((a, b) => a + b, 0));
        const cols = cabeza.map((t, k) => ({ x: xs[k], w: anchos[k], texto: t, alinear: (k ? 'der' : 'izq') as 'der' | 'izq' }));
        y += 6;
        asegurar(40);
        cabezaTabla(cols);
        cuerpo.forEach((f, n) => {
          const celdas = cabeza.map((_, k) => L.lineas(f[k] ?? '', anchos[k] - 16, T.sm, k === 0));
          const alto = 10 + Math.max(...celdas.map((x) => x.length)) * T.sm * 1.3;
          asegurar(alto, () => cabezaTabla(cols));
          if (n % 2 === 1 && P.relleno) L.rect(MX, y, W, alto, { relleno: P.fondo });
          celdas.forEach((ls, k) => ls.forEach((t, j) => fila(k ? xs[k] + anchos[k] - 8 : xs[k] + 8, y + 5 + j * T.sm * 1.3, t, {
            tam: T.sm, negrita: k === 0, color: k ? P.tinta : P.noche, alinear: k ? 'der' : 'izq',
          })));
          y += alto;
          L.linea(MX, y, MX + W, y, P.linea, 0.75);
        });
        y += 4;
        continue;
      }
      if (linea.startsWith('- ')) {
        y += 4;
        while (i < lineas.length && lineas[i].trim().startsWith('- ')) {
          const item = lineas[i].trim().slice(2);
          asegurar(T.sm * 1.6);
          fila(MX + 6, y, '•', texto);
          parrafo(item, MX + 16, W - 16);
          i++;
        }
        continue;
      }
      const partes: string[] = [];
      while (i < lineas.length && lineas[i].trim() && !lineas[i].includes('|') && !lineas[i].trim().startsWith('- ')) { partes.push(lineas[i].trim()); i++; }
      y += 6;
      parrafo(partes.join(' '));
    }
    y += 12;
    asegurar(14);
    fila(MX + W / 2, y, `Anexo del presupuesto ${c.number}. No es una factura.`, { tam: T.xs, color: P.gris, alinear: 'centro' });
  }

  // ---------- El pie de cada hoja
  const hojas = L.numeroDePaginas;
  for (let n = 0; n < hojas; n++) {
    L.enPagina(n, () => {
      L.texto(MX, 792 - 24, `Presupuesto ${c.number} · ${empresa.sitio}`, { tam: 7, color: P.gris });
      L.texto(MX + W, 792 - 24, `Hoja ${n + 1} de ${hojas}`, { tam: 7, color: P.gris, alinear: 'der' });
    });
  }
  return L.pdf();
}
