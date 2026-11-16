// C-254: lo que sale a la tienda del sorteo ya hecho (la bandera del inicio y la entrega en /sorteo), con lista blanca.
// El correo del ganador sale solo tapado, y su nombre, su foto y su video solo con su permiso y la entrega publicada.
// Nunca salen el costo del premio, el id del ganador ni la huella.
import type { Sorteo } from '@prisma/client';
import { etapaDeLaBandera, entregaVisible, FOTO_ENTREGA, type EtapaBandera } from '@/lib/sorteo/entrega';
import { logoDelNombreCorto, logoEnElPremio, partesDelPremio, type LogoDePremio } from '@/lib/sorteo/premio';
import { correoTapado } from '@/lib/sorteo/reglas';
import type { BoletosDeCliente } from '@/lib/sorteo/servidor';
import { leerYoutube, type VideoYoutube } from '@/lib/youtube';

export interface EntregaPublica {
  nombre: string;
  ciudad: string | null;
  /** Una subida de la tienda */
  foto: string;
  video: VideoYoutube | null;
}

/** La entrega que se puede mostrar, o null (sin permiso, sin publicar o con algo que no pasa la revisión) */
export function entregaPublica(s: Sorteo): EntregaPublica | null {
  if (!s.sorteadoAt || !entregaVisible(s) || !s.entregaFoto || !FOTO_ENTREGA.test(s.entregaFoto)) return null;
  return { nombre: (s.entregaNombre ?? '').trim(), ciudad: s.entregaCiudad?.trim() || null, foto: s.entregaFoto, video: leerYoutube(s.entregaVideo) };
}

export interface GanadorPublico {
  /** El correo tapado ("ma***@gmail.com"), para cuando no hay entrega */
  correo: string | null;
  /** C-263: el código del boleto que ganó ("F3E-XEP"): cada participante lo compara con los suyos */
  codigo: string | null;
  boletos: number | null;
  sorteadoAt: Date;
  entrega: EntregaPublica | null;
}

/** Quién ganó, para /sorteo. null si todavía no se sorteó */
export function ganadorPublico(s: Sorteo): GanadorPublico | null {
  if (!s.sorteadoAt) return null;
  return { correo: s.ganadorEmail ? correoTapado(s.ganadorEmail) : null, codigo: s.ganadorCodigo, boletos: s.boletosAlSortear, sorteadoAt: s.sorteadoAt, entrega: entregaPublica(s) };
}

export interface BanderaPublica {
  titulo: string;
  premio: string;
  imagen: string | null;
  nombreCorto: string | null;
  etapa: EtapaBandera;
  resultadoEl: Date;
  /** La persona, cuando la entrega está publicada: su nombre, su foto y si hay video */
  persona: { nombre: string; foto: string; video: boolean } | null;
}

/** Lo que dice la bandera del inicio ahora, o null si no sale */
export function banderaPublica(s: Sorteo, ahora: Date = new Date()): BanderaPublica | null {
  const e = etapaDeLaBandera(s, ahora);
  if (!e) return null;
  const entrega = e.conEntrega ? entregaPublica(s) : null;
  return {
    titulo: s.titulo, premio: s.premio, imagen: s.imagen, nombreCorto: s.nombreCorto?.trim() || null, etapa: e.etapa, resultadoEl: s.resultadoEl,
    persona: entrega ? { nombre: entrega.nombre, foto: entrega.foto, video: Boolean(entrega.video) } : null,
  };
}

/**
 * C-263: los boletos de un cliente para dibujarlos en su pantalla (el boleto épico de /sorteo y Mi panel) y en su flyer.
 * Solo sus propios datos, que salen de su sesión: su correo tapado, sus boletos con su código y su enlace corto. Nunca su id,
 * su correo completo ni nada de otro cliente; de sus amigos, solo el nombre corto que ya ve en "Invitando amigos".
 */
export interface BoletoPublico {
  codigo: string;
  tipo: 'compra' | 'amigos';
  /** Lo que dice el boleto: "Compra ORD-2026-0041" o "Invitaste a 2 amigos" */
  origen: string;
  /** Solo en la pantalla, debajo del boleto: el monto de la compra y los dos amigos del par */
  monto: number | null;
  amigos: string[];
  /** ISO */
  fecha: string;
}

export interface MisBoletosPublicos {
  boletos: BoletoPublico[];
  /** "an***@gmail.com" */
  correo: string;
  /** El enlace corto para invitar, con el dominio */
  enlace: string;
  sorteo: {
    titulo: string;
    /** El nombre del premio sin la etiqueta ("PlayStation 4 Sony") */
    premio: string;
    /** El logo que va en el boleto (PS4 o PS5), o null: va el nombre corto escrito */
    logo: LogoDePremio | null;
    nombreCorto: string | null;
    /** Una foto de la tienda (ruta propia), o null */
    imagen: string | null;
    /** ISO */
    resultadoEl: string;
    /** La compra mínima, en USD */
    minimo: number;
    tope: number;
  };
}

/** `nombres: false`: sin los nombres cortos de los amigos (Mi panel, como C-262: la lista con nombres está en /sorteo) */
export function misBoletosPublicos(s: Sorteo, b: BoletosDeCliente, base: string, { nombres = true } = {}): MisBoletosPublicos {
  const { nombre } = partesDelPremio(s.premio);
  const nombreCorto = s.nombreCorto?.trim() || null;
  const imagen = s.imagen && s.imagen.startsWith('/') && !s.imagen.startsWith('//') ? s.imagen : null;
  return {
    boletos: b.boletos.map((x) => ({ codigo: x.codigo, tipo: x.tipo, origen: x.origen, monto: x.monto, amigos: nombres ? x.amigos : [], fecha: x.fecha.toISOString() })),
    correo: b.correo,
    enlace: `${base}${b.enlaceCorto}`,
    sorteo: {
      titulo: s.titulo, premio: nombre, logo: logoEnElPremio(nombre, nombreCorto)?.logo ?? logoDelNombreCorto(nombreCorto), nombreCorto, imagen,
      resultadoEl: s.resultadoEl.toISOString(), minimo: Number(s.compraMinimaUSD), tope: s.topeInvitar,
    },
  };
}
