'use client';

// C-254: "Publicar la entrega" del sorteo ya hecho, en 3 pasos (PLAN.md §1.9; el equipo eligió lo recomendado viendo las
// maquetas): la foto y el video, su nombre y "Revisar y publicar", con la vista previa de /sorteo y de la bandera del
// inicio al lado.
// - La foto se sube o se toma con el teléfono (nunca se pega una dirección). Antes de subirla se achica en el navegador:
//   una foto de teléfono pasa los 5 MB de la subida, y así tampoco viaja su EXIF (el servidor igual la vuelve a guardar sin
//   nada de eso al publicar).
// - El video es el enlace de YouTube (oculto o Short), como los demás videos de la tienda: se revisa mientras se escribe con
//   la misma función que usa el servidor (lib/youtube.ts).
// - La casilla "La persona aceptó salir en la tienda" va al final, junto a "Publicar la entrega": sin ella el botón no se
//   enciende, y el servidor también la exige.

import { useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import Ayuda from '@/components/admin/Ayuda';
import Pasos, { type Paso } from '@/components/admin/Pasos';
import {
  IconoCalendario, IconoCamaraFotos, IconoCheck, IconoCuenta, IconoEditar, IconoEliminar, IconoEnlace, IconoFlechaDerecha,
  IconoFlechaIzquierda, IconoImagen, IconoInicio, IconoPremio, IconoSubir, IconoVer, IconoVideo, type IconType,
} from '@/components/iconos';
import { CuerpoPestana } from '@/components/sorteo/BanderaSorteo';
import GanadorSorteo from '@/components/sorteo/GanadorSorteo';
import { diaLargo, fotoDelSorteo } from '@/components/sorteo/PremioSorteo';
import { adminCard, adminError, adminHint, adminInput, adminPrimaryButton, adminSecondaryButton, adminSpinner } from '@/lib/admin-ui';
import { banderaHasta, esquemaEntrega, FOTO_ENTREGA, nombreConCiudad } from '@/lib/sorteo/entrega';
import { leerQueTrae } from '@/lib/sorteo/premio';
import { leerYoutube } from '@/lib/youtube';
import type { SorteoPanel } from './tipos';

interface Form { foto: string; video: string; nombre: string; ciudad: string }

const REVISAR = 2;
const PASOS: { titulo: string; icono: IconType; queHacer: string }[] = [
  { titulo: 'La foto y el video', icono: IconoCamaraFotos, queHacer: 'Lo que se ve de la entrega.' },
  { titulo: 'Su nombre', icono: IconoCuenta, queHacer: 'Cómo quiere salir.' },
  { titulo: 'Revisar y publicar', icono: IconoVer, queHacer: 'Mira cómo queda antes de publicarlo.' },
];
const PASO_DE: Record<string, number> = { foto: 0, video: 0, nombre: 1, ciudad: 1, permiso: REVISAR };

/** Lado más largo de la foto que se sube: sobra para la página y la bandera, y queda muy por debajo de los 5 MB */
const LADO = 1600;

/** La foto achicada en el navegador (JPEG). Si el navegador no puede, va la original y el servidor dice si pesa demasiado */
async function achicar(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = new window.Image();
    img.src = url;
    await img.decode();
    const escala = Math.min(1, LADO / Math.max(img.naturalWidth, img.naturalHeight));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(img.naturalWidth * escala);
    lienzo.height = Math.round(img.naturalHeight * escala);
    const ctx = lienzo.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise<Blob | null>((listo) => lienzo.toBlob(listo, 'image/jpeg', 0.86));
    return blob ? new File([blob], 'entrega.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Lo que le falta a un paso; null si está completo */
function problemaDe(paso: number, f: Form): string | null {
  if (paso === 0) {
    if (!FOTO_ENTREGA.test(f.foto)) return 'Falta su foto con el premio.';
    if (f.video.trim() && !leerYoutube(f.video)) return 'El enlace del video no es de YouTube.';
    return null;
  }
  if (paso === 1) {
    const nombre = esquemaEntrega.shape.nombre.safeParse(f.nombre);
    if (!nombre.success) return nombre.error.issues[0]?.message ?? 'Revisa el nombre.';
    const ciudad = esquemaEntrega.shape.ciudad.safeParse(f.ciudad);
    if (!ciudad.success) return ciudad.error.issues[0]?.message ?? 'Revisa la ciudad.';
    return null;
  }
  return null;
}

const tipoDeVideo = (enlace: string) => {
  const v = leerYoutube(enlace);
  return v ? (v.vertical ? 'Short de YouTube: sale vertical' : 'Video de YouTube: sale horizontal') : null;
};

export default function AsistenteEntrega({ sorteo, onCancelar, onListo }: {
  sorteo: SorteoPanel;
  onCancelar: () => void;
  onListo: () => Promise<void>;
}) {
  const e = sorteo.entrega;
  const yaPublicada = Boolean(e.publicadaAt);
  const inicial: Form = { foto: e.foto, video: e.video, nombre: e.nombre, ciudad: e.ciudad };
  const [form, setForm] = useState<Form>(inicial);
  const [paso, setPaso] = useState(0);
  const [alcanzado, setAlcanzado] = useState(yaPublicada ? REVISAR : 0);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [permiso, setPermiso] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  // "Hoy" se fija al abrir el asistente
  const [ahora] = useState(() => Date.now());
  const archivo = useRef<HTMLInputElement>(null);
  const camara = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrores((x) => { const r = { ...x }; delete r[k]; return r; });
  };

  const problemas = [0, 1].map((i) => problemaDe(i, form));
  const listoHasta = (i: number) => problemas.slice(0, i).every((p) => p === null);
  const video = leerYoutube(form.video);
  const nombre = form.nombre.trim();
  const ciudad = form.ciudad.trim();
  const publicadaAt = new Date(e.publicadaAt ?? ahora);
  const hasta = banderaHasta(publicadaAt);
  const pasos: Paso[] = PASOS.map((p, i) => ({
    titulo: p.titulo,
    icono: p.icono,
    hecho: i < REVISAR && i < alcanzado && problemas[i] === null,
    disponible: listoHasta(i),
    resumen: i === 0 ? (FOTO_ENTREGA.test(form.foto) ? `Con foto${video ? ` · ${video.vertical ? 'Short' : 'video'}` : ' · sin video'}` : 'Su foto y el video')
      : i === 1 ? (nombre ? nombreConCiudad(nombre, ciudad) : 'Cómo quiere salir')
        : 'Vista previa',
  }));

  // "Cambiar" una ya publicada: antes → después (§1.9)
  const cambios = yaPublicada ? ([
    ['Foto', form.foto !== inicial.foto ? 'otra foto' : null, 'la de antes'],
    ['Video', form.video.trim() !== inicial.video ? (form.video.trim() ? tipoDeVideo(form.video) ?? '—' : 'sin video') : null, inicial.video ? 'con video' : 'sin video'],
    ['Nombre', nombreConCiudad(nombre, ciudad) !== nombreConCiudad(inicial.nombre, inicial.ciudad) ? nombreConCiudad(nombre, ciudad) : null, nombreConCiudad(inicial.nombre, inicial.ciudad)],
  ] as const).filter(([, despues]) => despues !== null) : [];
  const sinCambios = yaPublicada && cambios.length === 0;

  const ir = (i: number) => {
    setPaso(i);
    setAlcanzado((a) => Math.max(a, i));
  };

  const subir = async (original: File) => {
    setSubiendo(true);
    try {
      const file = await achicar(original);
      if (file.size > 5 * 1024 * 1024) { toast.error('La foto pesa más de 5 MB'); return; }
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'sorteo');
      const r = await fetch('/api/upload/settings', { method: 'POST', body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || typeof d.url !== 'string') { toast.error(d.error || 'No se pudo subir la foto'); return; }
      set('foto', d.url);
    } catch {
      toast.error('Sin conexión. Intenta de nuevo.');
    } finally {
      setSubiendo(false);
      if (archivo.current) archivo.current.value = '';
      if (camara.current) camara.current.value = '';
    }
  };

  const publicar = async () => {
    setGuardando(true);
    try {
      const r = await fetch('/api/admin/sorteo/entrega', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sorteoId: sorteo.id, foto: form.foto, video: form.video.trim(), nombre, ciudad, permiso }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        const campos = (d?.fields ?? {}) as Record<string, string>;
        setErrores(campos);
        const primero = Object.keys(campos).map((k) => PASO_DE[k]).filter((n) => n !== undefined).sort()[0];
        if (primero !== undefined) setPaso(primero);
        toast.error(d?.error || 'No se pudo publicar');
        return;
      }
      toast.success(yaPublicada ? 'Entrega cambiada' : `Entrega publicada: sale en /sorteo y en el inicio hasta el ${diaLargo(hasta)}`);
      await onListo();
    } finally {
      setGuardando(false);
    }
  };

  const problema = paso < REVISAR ? problemas[paso] : null;
  const premioFoto = fotoDelSorteo(sorteo.imagen);
  const corto = sorteo.nombreCorto.trim() || null;
  const conFoto = FOTO_ENTREGA.test(form.foto);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white">
          <IconoPremio className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="text-lg font-semibold text-ink">{yaPublicada ? 'Cambiar la entrega' : 'Publicar la entrega'}: {sorteo.titulo}</h2>
      </div>

      <Pasos pasos={pasos} actual={paso} onIr={ir} etiqueta="Pasos de la entrega" />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
        <section className={adminCard} aria-labelledby="entrega-paso-titulo">
          <div className="mb-5 flex items-center gap-3">
            <span className="iconos-marca flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              {(() => { const Icono = PASOS[paso].icono; return <Icono className="h-5 w-5" aria-hidden="true" />; })()}
            </span>
            <div className="min-w-0">
              <h3 id="entrega-paso-titulo" className="text-base font-semibold text-ink">{PASOS[paso].titulo}</h3>
              <p className="text-sm text-muted">{PASOS[paso].queHacer}</p>
            </div>
          </div>

          <div className="max-w-3xl">
            {paso === 0 && (
              <div className="space-y-6">
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-ink">Foto de la persona</p>
                  <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-brand-300 bg-brand-50 p-3 sm:max-w-lg">
                    <div className="relative flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white">
                      {subiendo ? <span className={adminSpinner} aria-label="Subiendo" />
                        : conFoto ? <Image src={form.foto} alt="" fill sizes="80px" className="object-cover" />
                          : <IconoImagen className="h-7 w-7 text-subtle" aria-hidden="true" />}
                    </div>
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <p className="text-sm font-semibold text-ink">{conFoto ? 'Así sale en /sorteo y en el inicio' : 'Todavía sin foto'}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <input ref={archivo} name="entrega-foto" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true"
                          onChange={(ev) => { const f = ev.target.files?.[0]; if (f) void subir(f); }} />
                        <input ref={camara} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true"
                          onChange={(ev) => { const f = ev.target.files?.[0]; if (f) void subir(f); }} />
                        <button type="button" onClick={() => archivo.current?.click()} disabled={subiendo} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-brand-500 hover:underline">
                          <IconoSubir className="h-4 w-4" aria-hidden="true" /> {conFoto ? 'Subir otra' : 'Subir foto'}
                        </button>
                        <button type="button" onClick={() => camara.current?.click()} disabled={subiendo} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-brand-500 hover:underline lg:hidden">
                          <IconoCamaraFotos className="h-4 w-4" aria-hidden="true" /> Tomar foto
                        </button>
                        {conFoto && (
                          <button type="button" onClick={() => set('foto', '')} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-deal hover:underline">
                            <IconoEliminar className="h-4 w-4" aria-hidden="true" /> Quitar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {errores.foto ? <p className={adminError} role="alert">{errores.foto}</p> : <p className={adminHint}>Con su premio, de frente y con luz.</p>}
                </div>

                <Campo etiqueta="Video de la entrega (si hay)" id="entrega-video" error={errores.video}
                  ayuda="Súbelo a YouTube como Oculto (solo lo ve quien tiene el enlace) o como Short, y pega aquí su enlace, como los demás videos de la tienda. Ej.: https://youtu.be/… o https://youtube.com/shorts/…">
                  <div className="relative sm:max-w-lg">
                    <IconoEnlace className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                    <input id="entrega-video" inputMode="url" value={form.video} maxLength={300} placeholder="https://youtu.be/…"
                      onChange={(ev) => set('video', ev.target.value)}
                      className={`${adminInput(Boolean(errores.video) || (Boolean(form.video.trim()) && !video))} pl-9`} />
                  </div>
                  {form.video.trim() && !errores.video && (video
                    ? <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success-strong px-2.5 py-0.5 text-xs font-semibold text-white"><IconoCheck className="h-3.5 w-3.5" aria-hidden="true" /> {tipoDeVideo(form.video)}</p>
                    : <p className={adminError} role="alert">Ese enlace no es de YouTube. Pega el de YouTube: youtu.be/… o youtube.com/shorts/…</p>)}
                </Campo>
              </div>
            )}

            {paso === 1 && (
              <div className="space-y-5">
                <Campo etiqueta="Nombre" id="entrega-nombre" error={errores.nombre} pista="Como quiere salir: el nombre y la inicial del apellido. Ej.: María G.">
                  <input id="entrega-nombre" value={form.nombre} maxLength={30} autoComplete="off" onChange={(ev) => set('nombre', ev.target.value)} className={`${adminInput(Boolean(errores.nombre))} sm:max-w-sm`} />
                </Campo>
                <Campo etiqueta="De dónde es (si quiere)" id="entrega-ciudad" error={errores.ciudad} pista="Su ciudad o su estado.">
                  <input id="entrega-ciudad" value={form.ciudad} maxLength={40} autoComplete="off" onChange={(ev) => set('ciudad', ev.target.value)} className={`${adminInput(Boolean(errores.ciudad))} sm:max-w-sm`} />
                </Campo>
                {nombre && (
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-brand-50 p-3 text-sm text-ink">
                    <span className="text-xs font-semibold text-ink-soft">Así sale:</span> <strong className="font-semibold">{nombreConCiudad(nombre, ciudad)}</strong>
                    <span className="text-muted" aria-hidden="true">·</span> en la bandera, <strong className="font-semibold">¡{nombre} ganó{corto ? ` una ${corto}` : ''}!</strong>
                  </p>
                )}
              </div>
            )}

            {paso === REVISAR && (
              <div className="space-y-4">
                <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                  <Resumen icono={IconoCamaraFotos} titulo="Foto de la persona" detalle={conFoto ? 'Con foto' : 'Falta la foto'} onCambiar={() => ir(0)} />
                  <Resumen icono={IconoVideo} titulo={video ? (video.vertical ? 'Short de YouTube' : 'Video de YouTube') : 'Sin video'} detalle={video ? form.video.trim() : 'Sale solo la foto'} onCambiar={() => ir(0)} />
                  <Resumen icono={IconoCuenta} titulo={nombreConCiudad(nombre, ciudad) || 'Falta el nombre'} detalle="Su nombre como quiere salir" onCambiar={() => ir(1)} />
                </ul>
                <p className="flex items-start gap-2 rounded-2xl border border-line p-3 text-sm text-ink-soft">
                  <IconoCalendario className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                  <span>
                    {yaPublicada ? `Publicada el ${diaLargo(publicadaAt)}. ` : `Desde hoy, ${diaLargo(publicadaAt)}, en /sorteo. `}
                    En la bandera del inicio, <strong className="font-semibold text-ink">hasta el {diaLargo(hasta)}</strong> ({yaPublicada ? 'el cambio no la alarga' : '7 días'}).
                  </span>
                </p>
                {yaPublicada && (
                  <div className="rounded-2xl border border-line p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink"><IconoEditar className="h-4 w-4 text-brand-500" aria-hidden="true" /> Lo que cambia</p>
                    {cambios.length === 0 ? <p className="mt-2 text-sm text-muted">Todavía no cambiaste nada.</p> : (
                      <ul className="mt-2 grid gap-1.5">
                        {cambios.map(([campo, despues, antes]) => (
                          <li key={campo} className="grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)] items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm">
                            <span className="text-ink-soft">{campo}</span>
                            <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                              <s className="truncate text-muted">{antes}</s>
                              <IconoFlechaDerecha className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                              <span className="truncate rounded-md bg-brand-50 px-1.5 font-semibold text-brand-700">{despues}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${permiso ? 'border-brand-500 bg-brand-50' : 'border-brand-200 bg-white hover:border-brand-300'}`}>
                  <input type="checkbox" name="entrega-permiso" checked={permiso} onChange={(ev) => { setPermiso(ev.target.checked); setErrores((x) => { const r = { ...x }; delete r.permiso; return r; }); }} className="mt-0.5 h-5 w-5 shrink-0 accent-brand-500" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">La persona aceptó salir en la tienda</span>
                    <span className="block text-xs text-muted">Con su foto, su video y su nombre. Si después cambia de idea, la quitas con {'"Quitar de la tienda"'}.</span>
                  </span>
                </label>
                {errores.permiso && <p className={adminError} role="alert">{errores.permiso}</p>}
              </div>
            )}
          </div>

          {/* El pie (§1.6): a la izquierda volver; a la derecha adónde lleva, o por qué todavía no */}
          <div className="-mx-5 -mb-5 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-line bg-surface px-5 py-3">
            {paso > 0
              ? <button type="button" onClick={() => setPaso(paso - 1)} className={adminSecondaryButton}><IconoFlechaIzquierda className="h-4 w-4" aria-hidden="true" /> Atrás</button>
              : <button type="button" onClick={onCancelar} className={adminSecondaryButton}>Cancelar</button>}
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3">
              {problema && <p className="text-xs text-muted" role="status">{problema}</p>}
              {paso === REVISAR && !permiso && <p className="text-xs text-muted" role="status">Marca el permiso para publicar.</p>}
              {paso === REVISAR && permiso && sinCambios && <p className="text-xs text-muted" role="status">No hay cambios que guardar.</p>}
              {paso < REVISAR ? (
                <button type="button" onClick={() => ir(paso + 1)} disabled={Boolean(problema) || subiendo} className={adminPrimaryButton}>
                  Siguiente: {PASOS[paso + 1].titulo.toLowerCase()} <IconoFlechaDerecha className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button type="button" onClick={() => void publicar()} disabled={guardando || !permiso || sinCambios || !listoHasta(REVISAR)} className={adminPrimaryButton}>
                  {guardando ? 'Publicando…' : <><IconoCheck className="h-4 w-4" aria-hidden="true" /> {yaPublicada ? 'Guardar el cambio' : 'Publicar la entrega'}</>}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* La vista previa: /sorteo y la bandera, con los datos de ahora. En el teléfono, solo al revisar */}
        <aside className={`${paso === REVISAR ? '' : 'hidden lg:block'} space-y-4 lg:sticky lg:top-44`} aria-label="Vista previa">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <IconoVer className="h-4 w-4 text-brand-500" aria-hidden="true" /> Así se ve en /sorteo
            </p>
            <div className="mx-auto w-full max-w-[17rem] rounded-[2rem] border-8 border-ink bg-white p-2.5">
              <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-line-strong" aria-hidden="true" />
              {conFoto ? (
                <GanadorSorteo
                  compacto titulo={sorteo.titulo} premio={sorteo.premio} imagen={sorteo.imagen} nombreCorto={corto} incluye={leerQueTrae(sorteo.incluye)}
                  ganador={{ correo: null, codigo: sorteo.ganadorCodigo, boletos: sorteo.boletosAlSortear, sorteadoAt: new Date(sorteo.sorteadoAt ?? ahora), entrega: { nombre: nombre || '…', ciudad: ciudad || null, foto: form.foto, video } }}
                />
              ) : (
                <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-brand-300 bg-brand-50 text-xs text-ink-soft">
                  <IconoImagen className="h-6 w-6 text-brand-500" aria-hidden="true" /> Sube su foto para verla aquí
                </div>
              )}
            </div>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <IconoInicio className="h-4 w-4 text-brand-500" aria-hidden="true" /> En el inicio, hasta el {diaLargo(hasta)}
            </p>
            <div className="flex items-start gap-3">
              <span className="flex w-24 shrink-0 flex-col items-center gap-2.5 overflow-hidden rounded-r-2xl bg-brand-700 pb-3.5 pl-2 pr-2.5 pt-2.5 text-center text-white shadow-lg">
                <CuerpoPestana foto={premioFoto} corto={corto} etapa="ganador" persona={conFoto ? { foto: form.foto, video: Boolean(video) } : null} />
              </span>
              <p className="min-w-0 pt-1 text-xs text-muted">
                En pantallas anchas, la pestaña. En el teléfono, la píldora: <strong className="font-semibold text-ink">¡{nombre || '…'} ganó{corto ? ` una ${corto}` : ''}!</strong>
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Un campo con su etiqueta, la (i) si hace falta, una línea de ayuda o el error */
function Campo({ etiqueta, id, error, pista, ayuda, children }: { etiqueta: string; id: string; error?: string; pista?: string; ayuda?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-1">
        <label htmlFor={id} className="text-sm font-semibold text-ink">{etiqueta}</label>
        {ayuda && <Ayuda>{ayuda}</Ayuda>}
      </div>
      {children}
      {error ? <p className={adminError} role="alert">{error}</p> : pista ? <p className={adminHint}>{pista}</p> : null}
    </div>
  );
}

function Resumen({ icono: Icono, titulo, detalle, onCambiar }: { icono: IconType; titulo: string; detalle: string; onCambiar: () => void }) {
  return (
    <li className="flex items-center gap-3 bg-white px-4 py-3">
      <span className="iconos-marca flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icono className="h-4 w-4" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{titulo}</span>
        <span className="block truncate text-xs text-muted">{detalle}</span>
      </span>
      <button type="button" onClick={onCambiar} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-500 hover:underline">
        <IconoEditar className="h-4 w-4" aria-hidden="true" /> Cambiar
      </button>
    </li>
  );
}
