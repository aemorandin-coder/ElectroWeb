// C-254: lo que sale a la tienda del sorteo ya hecho (la bandera del inicio y la entrega en /sorteo), con lista blanca.
// El correo del ganador sale solo tapado, y su nombre, su foto y su video solo con su permiso y la entrega publicada.
// Nunca salen el costo del premio, el id del ganador ni la huella.
import type { Sorteo } from '@prisma/client';
import { etapaDeLaBandera, entregaVisible, FOTO_ENTREGA, type EtapaBandera } from '@/lib/sorteo/entrega';
import { correoTapado } from '@/lib/sorteo/reglas';
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
  boletos: number | null;
  sorteadoAt: Date;
  entrega: EntregaPublica | null;
}

/** Quién ganó, para /sorteo. null si todavía no se sorteó */
export function ganadorPublico(s: Sorteo): GanadorPublico | null {
  if (!s.sorteadoAt) return null;
  return { correo: s.ganadorEmail ? correoTapado(s.ganadorEmail) : null, boletos: s.boletosAlSortear, sorteadoAt: s.sorteadoAt, entrega: entregaPublica(s) };
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
