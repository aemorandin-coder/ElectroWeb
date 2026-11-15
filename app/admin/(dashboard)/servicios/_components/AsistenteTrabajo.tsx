'use client';

// C-249e: crear o cambiar un trabajo del portafolio de Servicios en su propia página, por pasos (PLAN.md §1.9, la A que eligió
// el equipo el 15/11): qué se hizo, el video, antes y después, el testimonio y "Revisar y publicar", con la tarjeta de
// /servicios al lado. Antes era una ventana de una sola vez; lo que tenía sigue aquí, campo por campo.
// - Las fotos (la miniatura, antes y después) se suben: antes se pegaba su dirección (§1.9). Van por /api/upload/settings con
//   el tipo 'servicio', como la foto del sorteo. Sin miniatura propia, la tienda usa la del video de YouTube.
// - Las APIs (/api/admin/service-videos) no cambian.

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Asistente, { Afecta, Campo, ElegirPublicar, FilaResumen, ListaCambios, VistaPrevia, type CambioCampo, type PasoAsistente } from '@/components/admin/Asistente';
import CampoUnidad from '@/components/admin/CampoUnidad';
import Opcion from '@/components/admin/Opcion';
import SubirFoto from '@/components/admin/SubirFoto';
import TarjetaTrabajo, { getYoutubeVideoId } from '@/components/servicios/TarjetaTrabajo';
import { IconoChat, IconoEstrella, IconoGuardar, IconoImagen, IconoOcultar, IconoServicioTecnico, IconoVer, IconoVideo, IconoWeb, type IconType } from '@/components/iconos';
import { adminInput } from '@/lib/admin-ui';

export interface TrabajoPanel {
  id: string; title: string; description: string; videoUrl: string; thumbnail: string; platform: string; category: string;
  beforeImage: string; afterImage: string; customerName: string; testimonial: string; isActive: boolean; order: number;
  avgRating: number | null; reviewCount: number;
}
interface Formulario {
  title: string; description: string; videoUrl: string; thumbnail: string; platform: string; category: string;
  beforeImage: string; afterImage: string; customerName: string; testimonial: string; order: string;
}

// Las mismas del panel y de la tienda
const CATEGORIAS = [
  { value: 'CCTV', label: 'Sistemas CCTV' }, { value: 'REDES', label: 'Diseño de Redes' }, { value: 'POS', label: 'Puntos de Venta' },
  { value: 'GAMING', label: 'PCs Gaming' }, { value: 'CONSOLAS', label: 'Consolas' }, { value: 'ELECTRONICA', label: 'Electrónica General' },
];
const PLATAFORMAS = [{ value: 'YOUTUBE', label: 'YouTube' }, { value: 'TIKTOK', label: 'TikTok' }, { value: 'KICK', label: 'Kick' }];

const PASOS: { titulo: string; queHacer: string; icono: IconType }[] = [
  { titulo: 'Qué se hizo', queHacer: 'El trabajo, de qué es y en qué lugar sale.', icono: IconoServicioTecnico },
  { titulo: 'El video', queHacer: 'Dónde está y su miniatura.', icono: IconoVideo },
  { titulo: 'Antes y después', queHacer: 'Las fotos del estado inicial y del resultado.', icono: IconoImagen },
  { titulo: 'El testimonio', queHacer: 'Lo que dijo el cliente, sin su nombre completo.', icono: IconoChat },
  { titulo: 'Revisar y publicar', queHacer: 'Mira cómo queda antes de guardarlo.', icono: IconoVer },
];
const ULTIMO = PASOS.length - 1;
const LISTA = '/admin/servicios';

const formularioDe = (t: TrabajoPanel | null, orden: number): Formulario => ({
  title: t?.title ?? '', description: t?.description ?? '', videoUrl: t?.videoUrl ?? '', thumbnail: t?.thumbnail ?? '', platform: t?.platform ?? 'YOUTUBE',
  category: t?.category ?? '', beforeImage: t?.beforeImage ?? '', afterImage: t?.afterImage ?? '', customerName: t?.customerName ?? '',
  testimonial: t?.testimonial ?? '', order: String(t?.order ?? orden),
});
const etiquetaDe = (lista: { value: string; label: string }[], v: string, siNo: string) => lista.find((x) => x.value === v)?.label ?? (v || siNo);
const conFoto = (v: string) => (v ? 'Con foto' : 'Sin foto');

export default function AsistenteTrabajo({ trabajo, ordenSugerido }: { trabajo: TrabajoPanel | null; ordenSugerido: number }) {
  const router = useRouter();
  const editar = Boolean(trabajo);
  const [inicial] = useState<Formulario>(() => formularioDe(trabajo, ordenSugerido));
  const [form, setForm] = useState<Formulario>(inicial);
  const [publicar, setPublicar] = useState(trabajo ? trabajo.isActive : true);
  const [paso, setPaso] = useState(0);
  const [guardando, setGuardando] = useState(false);

  const set = <K extends keyof Formulario>(k: K, v: Formulario[K]) => setForm((f) => ({ ...f, [k]: v }));
  const deYoutube = Boolean(getYoutubeVideoId(form.videoUrl));

  // ---------- lo que le falta a cada paso (las reglas del servidor: título y video, y el video con http o https)
  const problemaDe = (i: number): string | null => {
    if (i === 0) {
      if (!form.title.trim()) return 'Falta el título.';
      if (!/^\d{1,6}$/.test(form.order.trim())) return 'El lugar en la lista es un número entero, desde 0.';
      return null;
    }
    if (i === 1) {
      if (!form.videoUrl.trim()) return 'Falta el enlace del video.';
      if (!/^https?:\/\/[^\s]+$/i.test(form.videoUrl.trim())) return 'El enlace del video debe empezar con https://';
      return null;
    }
    return null;
  };

  const volverALaLista = () => { router.push(LISTA); router.refresh(); };

  const guardar = async () => {
    setGuardando(true);
    try {
      const cuerpo = {
        title: form.title.trim(), description: form.description.trim(), videoUrl: form.videoUrl.trim(), thumbnail: form.thumbnail, platform: form.platform,
        category: form.category, beforeImage: form.beforeImage, afterImage: form.afterImage, customerName: form.customerName.trim(),
        testimonial: form.testimonial.trim(), isActive: publicar, order: Number(form.order) || 0,
      };
      const res = await fetch(trabajo ? `/api/admin/service-videos/${trabajo.id}` : '/api/admin/service-videos', {
        method: trabajo ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'No se pudo guardar');
        return;
      }
      toast.success(trabajo ? 'Trabajo actualizado' : publicar ? 'Trabajo publicado' : 'Trabajo guardado sin publicar');
      volverALaLista();
    } catch {
      toast.error('No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  // ---------- antes → después
  const filas: { campo: keyof Formulario; nombre: string; ver: (f: Formulario) => string }[] = [
    { campo: 'title', nombre: 'Título', ver: (f) => f.title.trim() },
    { campo: 'description', nombre: 'Descripción', ver: (f) => f.description.trim() || 'Sin descripción' },
    { campo: 'category', nombre: 'Categoría', ver: (f) => etiquetaDe(CATEGORIAS, f.category, 'Sin categoría') },
    { campo: 'order', nombre: 'Lugar', ver: (f) => f.order },
    { campo: 'platform', nombre: 'Plataforma', ver: (f) => etiquetaDe(PLATAFORMAS, f.platform, 'YouTube') },
    { campo: 'videoUrl', nombre: 'Video', ver: (f) => f.videoUrl.trim() },
    { campo: 'thumbnail', nombre: 'Miniatura', ver: (f) => (f.thumbnail ? 'Foto propia' : 'La del video') },
    { campo: 'beforeImage', nombre: 'Antes', ver: (f) => conFoto(f.beforeImage) },
    { campo: 'afterImage', nombre: 'Después', ver: (f) => conFoto(f.afterImage) },
    { campo: 'customerName', nombre: 'Cliente', ver: (f) => f.customerName.trim() || 'Sin nombre' },
    { campo: 'testimonial', nombre: 'Testimonio', ver: (f) => f.testimonial.trim() || 'Sin testimonio' },
  ];
  const igual = (k: keyof Formulario) => (k === 'order' ? Number(form.order) === Number(inicial.order) : form[k].trim() === inicial[k].trim());
  const cambios: CambioCampo[] = trabajo ? [
    ...filas.filter((f) => !igual(f.campo)).map((f) => ({ campo: f.campo, nombre: f.nombre, antes: f.ver(inicial), despues: f.ver(form) })),
    ...(publicar !== trabajo.isActive ? [{ campo: 'isActive', nombre: 'En /servicios', antes: trabajo.isActive ? 'Publicado' : 'Sin publicar', despues: publicar ? 'Publicado' : 'Sin publicar' }] : []),
  ] : [];
  const filasAfecta = (): { icono: IconType; texto: ReactNode }[] => {
    if (!trabajo) return [];
    const lista: { icono: IconType; texto: ReactNode }[] = [];
    if (publicar !== trabajo.isActive) lista.push(publicar ? { icono: IconoWeb, texto: 'Se ve en /servicios desde que guardes.' } : { icono: IconoOcultar, texto: 'Deja de verse en /servicios.' });
    if (trabajo.reviewCount > 0) lista.push({ icono: IconoEstrella, texto: <>Tiene <strong>{trabajo.reviewCount} {trabajo.reviewCount === 1 ? 'reseña' : 'reseñas'}</strong>: siguen con el trabajo.</> });
    return lista;
  };

  // ---------- la vista previa: la tarjeta de /servicios, y antes y después como en su ventana
  const vistaPrevia = (
    <>
      <VistaPrevia rotulo="Así se ve en /servicios" nota={publicar ? 'Al tocarla se abre con el video y las fotos.' : 'Sin publicar: todavía no se ve en la tienda.'}>
        <TarjetaTrabajo v={{
          id: trabajo?.id ?? 'nuevo', title: form.title.trim() || 'Título del trabajo', description: form.description.trim() || null, videoUrl: form.videoUrl.trim(),
          thumbnail: form.thumbnail || null, platform: form.platform, category: form.category || null, beforeImage: form.beforeImage || null,
          afterImage: form.afterImage || null, customerName: form.customerName.trim() || null, testimonial: form.testimonial.trim() || null,
          avgRating: trabajo?.avgRating ?? null, reviewCount: trabajo?.reviewCount ?? 0,
        }} />
      </VistaPrevia>
      {(form.beforeImage || form.afterImage) && (
        <VistaPrevia rotulo="Antes y después">
          <div className="grid grid-cols-2 gap-2">
            {[{ url: form.beforeImage, texto: 'ANTES', clase: 'bg-brand-700' }, { url: form.afterImage, texto: 'DESPUÉS', clase: 'bg-brand-500' }].map((f) => (
              <div key={f.texto} className="relative aspect-video overflow-hidden rounded-lg border border-line bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {f.url ? <img src={f.url} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-xs text-muted">Sin foto</span>}
                <span className={`absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[11px] font-bold text-white ${f.clase}`}>{f.texto}</span>
              </div>
            ))}
          </div>
        </VistaPrevia>
      )}
    </>
  );

  const pasos: PasoAsistente[] = PASOS.map((p, i) => ({
    ...p,
    problema: i < ULTIMO ? problemaDe(i) : null,
    resumen: i === 0 ? (form.title.trim() || 'Falta el título')
      : i === 1 ? (form.videoUrl.trim() ? etiquetaDe(PLATAFORMAS, form.platform, 'YouTube') : 'Falta el video')
        : i === 2 ? [form.beforeImage ? 'Antes' : '', form.afterImage ? 'después' : ''].filter(Boolean).join(' y ') || 'Opcional'
          : i === 3 ? (form.testimonial.trim() ? (form.customerName.trim() || 'Con testimonio') : 'Opcional')
            : trabajo ? `${cambios.length} ${cambios.length === 1 ? 'cambio' : 'cambios'}` : 'Vista previa',
  }));
  const sinCambios = editar && cambios.length === 0;

  return (
    <Asistente
      titulo={trabajo ? `Cambiar: ${trabajo.title}` : 'Nuevo trabajo'}
      subtitulo={trabajo ? `Trabajo realizado · ${trabajo.isActive ? 'Publicado' : 'Sin publicar'}` : 'Paso a paso, con la tarjeta de /servicios al lado.'}
      icono={IconoServicioTecnico}
      volver={{ href: LISTA, texto: 'Trabajos realizados' }}
      etiqueta="Pasos del trabajo"
      pasos={pasos}
      paso={paso}
      onPaso={setPaso}
      editar={editar}
      final={{
        contenido: guardando ? 'Guardando…' : <><IconoGuardar className="h-4 w-4" aria-hidden="true" /> {trabajo ? 'Guardar el cambio' : publicar ? 'Publicar el trabajo' : 'Guardar sin publicar'}</>,
        onClick: () => void guardar(),
        deshabilitado: guardando || sinCambios,
        motivo: sinCambios ? 'No hay cambios que guardar.' : null,
      }}
      vistaPrevia={vistaPrevia}
    >
      {paso === 0 && (
        <div className="space-y-5">
          <Campo etiqueta="Título" id="trabajo-titulo">
            <input id="trabajo-titulo" value={form.title} maxLength={150} onChange={(e) => set('title', e.target.value)} placeholder="Cómo arreglar el drift de un control de PS5" className={adminInput()} />
          </Campo>
          <Campo etiqueta="Descripción (opcional)" id="trabajo-descripcion" pista="Lo que se hizo, en pocas líneas.">
            <textarea id="trabajo-descripcion" value={form.description} rows={3} onChange={(e) => set('description', e.target.value)} placeholder="Breve descripción del trabajo realizado…" className={`${adminInput()} h-auto py-2.5`} />
          </Campo>
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-ink">Categoría</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Categoría">
              {[{ value: '', label: 'Sin categoría' }, ...CATEGORIAS].map((c) => (
                <Opcion key={c.value || 'ninguna'} tamano="chica" role="radio" aria-checked={form.category === c.value} elegida={form.category === c.value} onClick={() => set('category', c.value)} titulo={c.label} />
              ))}
            </div>
          </fieldset>
          <Campo etiqueta="Lugar en la lista" id="trabajo-orden" pista="Los de número más bajo salen primero.">
            <CampoUnidad id="trabajo-orden" unidad="n.º" inputMode="numeric" value={form.order} onChange={(e) => set('order', e.target.value.replace(/\D/g, ''))} />
          </Campo>
        </div>
      )}

      {paso === 1 && (
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-ink">Plataforma</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Plataforma">
              {PLATAFORMAS.map((p) => (
                <Opcion key={p.value} tamano="chica" role="radio" aria-checked={form.platform === p.value} elegida={form.platform === p.value} onClick={() => set('platform', p.value)} titulo={p.label} />
              ))}
            </div>
          </fieldset>
          <Campo etiqueta="Enlace del video" id="trabajo-video" pista="Si la tienda no puede mostrarlo adentro, lo abre aparte.">
            <input id="trabajo-video" type="url" value={form.videoUrl} onChange={(e) => set('videoUrl', e.target.value)} placeholder="https://youtube.com/watch?v=…" className={`${adminInput()} sm:max-w-lg`} />
          </Campo>
          <SubirFoto nombre="trabajo-miniatura" etiqueta="Miniatura (opcional)" tipo="servicio" url={form.thumbnail} onCambiar={(u) => set('thumbnail', u)}
            sinFoto={deYoutube ? 'Se usa la del video de YouTube' : 'Sin miniatura'} conFoto="Foto propia"
            pista={deYoutube ? 'Sube una solo si quieres otra en lugar de la del video.' : 'JPG, PNG o WEBP, hasta 5 MB. Mejor apaisada (16:9).'} />
        </div>
      )}

      {paso === 2 && (
        <div className="space-y-5">
          <SubirFoto nombre="trabajo-antes" etiqueta="Antes (opcional)" tipo="servicio" url={form.beforeImage} onCambiar={(u) => set('beforeImage', u)} conFoto="El estado inicial" />
          <SubirFoto nombre="trabajo-despues" etiqueta="Después (opcional)" tipo="servicio" url={form.afterImage} onCambiar={(u) => set('afterImage', u)} conFoto="El resultado" pista="En la ventana del trabajo se pasa de una a otra." />
        </div>
      )}

      {paso === 3 && (
        <div className="space-y-5">
          <Campo etiqueta="Quién lo dice (opcional)" id="trabajo-cliente" pista='Sin el nombre completo: "Cliente en Barquisimeto".'>
            <input id="trabajo-cliente" value={form.customerName} onChange={(e) => set('customerName', e.target.value)} placeholder="Cliente en Barquisimeto" className={`${adminInput()} sm:max-w-sm`} />
          </Campo>
          <Campo etiqueta="Testimonio (opcional)" id="trabajo-testimonio">
            <textarea id="trabajo-testimonio" value={form.testimonial} rows={3} onChange={(e) => set('testimonial', e.target.value)} placeholder="Lo que dijo el cliente…" className={`${adminInput()} h-auto py-2.5`} />
          </Campo>
        </div>
      )}

      {paso === ULTIMO && (
        <div className="space-y-4">
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            <FilaResumen icono={IconoServicioTecnico} titulo={form.title.trim()} detalle={`${etiquetaDe(CATEGORIAS, form.category, 'Sin categoría')} · lugar ${form.order}`} onCambiar={() => setPaso(0)} />
            <FilaResumen icono={IconoVideo} titulo={`${etiquetaDe(PLATAFORMAS, form.platform, 'YouTube')} · ${form.thumbnail ? 'miniatura propia' : 'miniatura del video'}`} detalle={form.videoUrl.trim()} onCambiar={() => setPaso(1)} />
            <FilaResumen icono={IconoImagen} titulo={`Antes: ${conFoto(form.beforeImage).toLowerCase()} · después: ${conFoto(form.afterImage).toLowerCase()}`} onCambiar={() => setPaso(2)} />
            <FilaResumen icono={IconoChat} titulo={form.testimonial.trim() ? `"${form.testimonial.trim().slice(0, 60)}${form.testimonial.trim().length > 60 ? '…' : ''}"` : 'Sin testimonio'} detalle={form.customerName.trim() || undefined} onCambiar={() => setPaso(3)} />
          </ul>
          <ElegirPublicar name="trabajo-publicar" publicar={publicar} onCambiar={setPublicar}
            ya={{ titulo: trabajo?.isActive ? 'Publicado' : 'Publicarlo ya', detalle: 'Se ve en /servicios.', icono: IconoWeb }}
            sin={{ titulo: trabajo ? 'Sin publicar' : 'Guardarlo sin publicar', detalle: 'No se ve en la tienda; lo activas después desde la lista.', icono: IconoOcultar }} />
          {trabajo && (
            <ListaCambios cambios={cambios}>
              {cambios.length > 0 && filasAfecta().length > 0 && <Afecta cargando={false} filas={filasAfecta()} />}
            </ListaCambios>
          )}
        </div>
      )}
    </Asistente>
  );
}
