'use client';

// C-249d: crear o cambiar una campaña de correo en su propia página, por pasos (PLAN.md §1.9, la A que eligió el equipo el
// 15/11): lo que dice (el asunto y la línea de la bandeja), el contenido, la prueba y "Revisar y enviar", con el correo al
// lado. Antes era un editor de una sola vez dentro de Marketing; lo que tenía sigue aquí, campo por campo.
//
// Lo que pidió la sesión de los correos (15/11), y no cambia:
//   1. "Armar con Claude" (C-217) está al principio, en el primer paso, como estaba arriba del editor: llena el asunto, la
//      vista previa y los bloques sin cambiar de paso.
//   2. La vista previa es un iframe con sandbox="" (sin scripts), armado por /api/admin/campaigns/preview con
//      `renderCampana` de lib/email-campaigns.ts tal cual.
//   3. La prueba a tu correo es el paso de antes de "Enviar a todos".
// La edición entre dos personas sigue (C-170): la versión con que se abrió, la combinación de cambios y quién más la tiene
// abierta. Las APIs de campañas no cambian.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import Asistente, { Afecta, Campo, ElegirPublicar, FilaResumen, ListaCambios, type CambioCampo, type PasoAsistente } from '@/components/admin/Asistente';
import ArmarConIA from '@/components/admin/campanas/ArmarConIA';
import PresenciaEnEditor from '@/components/admin/edicion/PresenciaEnEditor';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import {
  IconoClientes, IconoCorreo, IconoEditar, IconoEliminar, IconoEnlace, IconoEnviar, IconoFlechaAbajo, IconoFlechaArriba,
  IconoGuardar, IconoImagen, IconoInfo, IconoPausa, IconoReloj, IconoSubir, IconoTexto, IconoVer, type IconType,
} from '@/components/iconos';
import { adminCardFlush, adminHint, adminIconButton, adminInput, adminLabel, adminNotice, adminSecondaryButton, adminSpinner } from '@/lib/admin-ui';
import { iguales } from '@/lib/edicion/combinar';
import { enviarConVersion } from '@/lib/edicion/guardado';
import { useConflictoDeFormulario } from '@/lib/edicion/useConflictoDeFormulario';
import ModalDestinatarios from './ModalDestinatarios';
import {
  bloqueLleno, bloquesEnPalabras, clientes, NOMBRE_BLOQUE, NUEVA, problemaContenido, problemaDeBloque, type Audiencia, type Bloque,
  type Contenido,
} from './campana';

export interface CampanaPanel extends Contenido { id: string; updatedAt: string }
export interface Envio { audiencia: Audiencia; marketingActivo: boolean; limiteDiario: number; remitente: string }

const PASOS: { titulo: string; queHacer: string; icono: IconType }[] = [
  { titulo: 'Lo que dice', queHacer: 'El asunto y la línea que se lee en la bandeja.', icono: IconoCorreo },
  { titulo: 'El contenido', queHacer: 'Títulos, textos, imágenes y botones, en orden.', icono: IconoTexto },
  { titulo: 'La prueba', queHacer: 'Mándatela a tu correo y mírala en el teléfono.', icono: IconoEnviar },
  { titulo: 'Revisar y enviar', queHacer: 'A quiénes llega, y guardarla o enviarla.', icono: IconoVer },
];
const ULTIMO = PASOS.length - 1;
const LISTA = '/admin/marketing#campanas';

const ETIQUETAS = { subject: 'Asunto', preheader: 'Texto de vista previa', bloques: 'Contenido del correo' };
const enTexto = (campo: string, valor: unknown) =>
  campo === 'bloques' ? `${(valor as Bloque[]).length} ${(valor as Bloque[]).length === 1 ? 'bloque' : 'bloques'}` : String(valor || '(vacío)');

/** Antes → después del contenido: qué bloques lleva y cuántos cambian */
function cambioContenido(antes: Bloque[], despues: Bloque[]): CambioCampo | null {
  if (iguales(antes, despues)) return null;
  const mismos = antes.length === despues.length && antes.every((b, i) => b.tipo === despues[i].tipo);
  const tocados = despues.filter((b, i) => !iguales(b, antes[i])).length;
  return {
    campo: 'bloques', nombre: 'Contenido', antes: bloquesEnPalabras(antes),
    despues: mismos ? `${bloquesEnPalabras(despues)} (cambia${tocados === 1 ? ' 1 bloque' : `n ${tocados} bloques`})` : bloquesEnPalabras(despues),
  };
}

export default function AsistenteCampana({ campana, envio }: { campana: CampanaPanel | null; envio: Envio }) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const { data: session } = useSession();
  const editar = Boolean(campana);
  const [form, setForm] = useState<Contenido>(() => (campana ? { subject: campana.subject, preheader: campana.preheader, bloques: campana.bloques } : NUEVA));
  const [campanaId, setCampanaId] = useState<string | null>(campana?.id ?? null);
  // C-170: la campaña como está guardada y su versión: la base para combinar si otra persona guardó antes. En un ref para que
  // el reintento después de combinar use la versión nueva; `guardada` es lo mismo para pintar "Lo que cambia"
  const abierta: Contenido | null = campana ? { subject: campana.subject, preheader: campana.preheader, bloques: campana.bloques } : null;
  const base = useRef<{ datos: Contenido; version: string } | null>(abierta && campana ? { datos: abierta, version: campana.updatedAt } : null);
  const [guardada, setGuardada] = useState<Contenido | null>(abierta);
  const [paso, setPaso] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [html, setHtml] = useState('');
  const [errorVista, setErrorVista] = useState<string | null>(null);
  // Al revisar, el servidor valida el correo entero con la misma regla del guardado (sin guardar nada)
  const [revision, setRevision] = useState<{ cargando: boolean; error: string | null }>({ cargando: false, error: null });
  const [verDestinatarios, setVerDestinatarios] = useState(false);
  // Por defecto, el correo de quien está en el panel (derivado, sin efecto)
  const [correoElegido, setCorreoPrueba] = useState<string | null>(null);
  const correoPrueba = correoElegido ?? session?.user?.email ?? '';
  const [probando, setProbando] = useState(false);
  const [probada, setProbada] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState<number | null>(null);
  const [enviarYa, setEnviarYa] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);
  const indiceSubida = useRef<number | null>(null);
  const { resolver: resolverConflicto, dialogo: dialogoConflicto } = useConflictoDeFormulario(ETIQUETAS, enTexto);

  const destinatarios = envio.audiencia.aceptan;
  const puedeEnviar = envio.marketingActivo && destinatarios > 0;
  const enviar = enviarYa && puedeEnviar;

  // Vista previa con la misma función del envío real, con una pequeña espera mientras se escribe
  useEffect(() => {
    let vigente = true;
    const t = setTimeout(async () => {
      // Mientras se escribe, los bloques vacíos no cuentan: la validación completa es al revisar, al guardar o al probar
      const bloques = form.bloques.filter(bloqueLleno);
      if (bloques.length === 0) {
        setHtml('');
        setErrorVista('Escribe o agrega un bloque para ver la vista previa.');
        return;
      }
      try {
        const res = await fetch('/api/admin/campaigns/preview', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, bloques, subject: form.subject.trim().length >= 3 ? form.subject : 'Sin asunto' }),
        });
        const data = await res.json().catch(() => null);
        if (!vigente) return;
        if (res.ok) { setHtml(data.html); setErrorVista(null); } else setErrorVista(data?.error || 'Revisa el contenido');
      } catch {
        if (vigente) setErrorVista('Sin conexión con la tienda: la vista previa vuelve sola.');
      }
    }, 500);
    return () => { vigente = false; clearTimeout(t); };
  }, [form]);

  const set = <K extends keyof Contenido>(k: K, v: Contenido[K]) => setForm((f) => ({ ...f, [k]: v }));
  const cambiarBloque = (indice: number, cambios: Partial<Bloque>) =>
    setForm((c) => ({ ...c, bloques: c.bloques.map((b, i) => (i === indice ? ({ ...b, ...cambios } as Bloque) : b)) }));
  const mover = (indice: number, delta: number) =>
    setForm((c) => {
      const bloques = [...c.bloques];
      const destino = indice + delta;
      if (destino < 0 || destino >= bloques.length) return c;
      [bloques[indice], bloques[destino]] = [bloques[destino], bloques[indice]];
      return { ...c, bloques };
    });
  const quitar = (indice: number) => setForm((c) => ({ ...c, bloques: c.bloques.filter((_, i) => i !== indice) }));
  const agregar = (bloque: Bloque) => setForm((c) => ({ ...c, bloques: [...c.bloques, bloque] }));

  const subirImagen = async (file: File) => {
    const indice = indiceSubida.current;
    if (indice === null) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen pesa más de 5 MB'); return; }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', 'campaign');
    setSubiendo(indice);
    try {
      const res = await fetch('/api/upload/settings', { method: 'POST', body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) { toast.error(data?.error || 'No se pudo subir la imagen'); return; }
      cambiarBloque(indice, { url: data.url });
    } catch {
      toast.error('Sin conexión. Intenta de nuevo.');
    } finally {
      setSubiendo(null);
      if (archivo.current) archivo.current.value = '';
    }
  };

  // ---------- lo que le falta a cada paso (las reglas del servidor)
  const problemaAsunto = form.subject.trim().length < 3 ? 'Falta el asunto (3 letras o más).' : null;
  const problemaBloques = problemaContenido(form.bloques);
  const problemas = [problemaAsunto, problemaBloques, null];
  const primerProblema = problemas.findIndex((p) => p !== null);

  const comprobar = async () => {
    setRevision({ cargando: true, error: null });
    try {
      const res = await fetch('/api/admin/campaigns/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json().catch(() => null);
      setRevision({ cargando: false, error: res.ok ? null : data?.error || 'Revisa el contenido' });
    } catch {
      setRevision({ cargando: false, error: null });
    }
  };

  const irA = (i: number) => {
    setPaso(i);
    if (i === ULTIMO) void comprobar();
  };

  /**
   * Guarda el borrador y sigue con `despues`. Al editar lleva la versión con que se abrió (C-170): si otra persona guardó
   * antes, se combina lo de cada una y solo se pregunta por lo que las dos tocaron; después se sigue con lo mismo.
   */
  const guardar = async (datos: Contenido, despues: (id: string) => void | Promise<void>, intento = 0): Promise<void> => {
    setGuardando(true);
    try {
      if (!campanaId) {
        const res = await fetch('/api/admin/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
        const data = await res.json().catch(() => null);
        if (!res.ok) { toast.error(data?.error || 'No se pudo guardar'); return; }
        const id = data.id as string;
        // El alta devuelve solo el id: su versión se lee aparte, para que el siguiente guardado no la pise (C-170)
        const leida = await fetch(`/api/admin/campaigns/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        base.current = { datos, version: leida?.updatedAt ?? '' };
        setGuardada(datos);
        setCampanaId(id);
        await despues(id);
        return;
      }
      // Nada que guardar: sigue con lo que venía (enviarla)
      if (base.current && iguales(datos, base.current.datos)) { await despues(campanaId); return; }
      const r = await enviarConVersion<{ updatedAt: string }>(`/api/admin/campaigns/${campanaId}`, 'PATCH', { ...datos }, base.current?.version);
      if (r.ok) {
        base.current = { datos, version: r.datos.updatedAt };
        setGuardada(datos);
        await despues(campanaId);
        return;
      }
      if (r.conflicto?.tipo === 'cambiado' && base.current && intento < 3) {
        const actual = r.conflicto.actual as Contenido & { updatedAt: string };
        const suyo: Contenido = { subject: actual.subject, preheader: actual.preheader, bloques: actual.bloques };
        const abierta = base.current.datos;
        base.current = { datos: suyo, version: actual.updatedAt };
        setGuardada(suyo);
        resolverConflicto({
          base: abierta, mio: datos, suyo, quien: r.conflicto.por?.nombre ?? 'Otra persona',
          continuar: async (final) => { setForm(final); await guardar(final, despues, intento + 1); },
        });
        return;
      }
      toast.error(r.error);
      if (r.conflicto?.tipo === 'no_existe' || r.status === 409) volverALaLista();
    } finally {
      setGuardando(false);
    }
  };

  /** "Guardar borrador" en cualquier paso, como arriba del editor de antes */
  const guardarBorrador = () => {
    if (primerProblema >= 0) { setPaso(primerProblema); toast.error(problemas[primerProblema] ?? 'Revisa el contenido'); return; }
    void guardar(form, () => { toast.success('Borrador guardado'); });
  };

  // La lista pide sus datos al montarse: no hace falta router.refresh()
  const volverALaLista = () => { router.push(LISTA); };

  const finalizar = async () => {
    if (enviar) {
      const ok = await confirm({
        title: 'Enviar campaña',
        message: `Se enviará "${form.subject.trim()}" a ${clientes(destinatarios)} que ${destinatarios === 1 ? 'aceptó' : 'aceptaron'} promociones, uno por uno. No se puede deshacer.`,
        confirmText: 'Enviar ahora', cancelText: 'Cancelar', type: 'warning',
      });
      if (!ok) return;
    }
    await guardar(form, async (id) => {
      if (!enviar) { toast.success('Borrador guardado'); volverALaLista(); return; }
      const res = await fetch(`/api/admin/campaigns/${id}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'enviar' }) });
      const data = await res.json().catch(() => null);
      if (!res.ok) { toast.error(`${data?.error || 'No se pudo enviar'} El borrador quedó guardado.`); return; }
      toast.success(`Enviando a ${clientes(data.totalRecipients)}`);
      volverALaLista();
    });
  };

  const enviarPrueba = async () => {
    setProbando(true);
    try {
      const res = await fetch('/api/admin/campaigns/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, email: correoPrueba }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { toast.error(data?.error || 'No se pudo enviar la prueba'); return; }
      setProbada(correoPrueba);
      toast.success(`Prueba enviada a ${correoPrueba}`);
    } catch {
      toast.error('Sin conexión. Intenta de nuevo.');
    } finally {
      setProbando(false);
    }
  };

  // ---------- antes → después (al cambiar un borrador guardado) y a quiénes llega
  const cambios: CambioCampo[] = guardada
    ? [
      ...(form.subject.trim() !== guardada.subject.trim() ? [{ campo: 'subject', nombre: 'Asunto', antes: guardada.subject.trim(), despues: form.subject.trim() }] : []),
      ...(form.preheader.trim() !== guardada.preheader.trim() ? [{ campo: 'preheader', nombre: 'Vista previa', antes: guardada.preheader.trim() || 'Sin texto', despues: form.preheader.trim() || 'Sin texto' }] : []),
      ...[cambioContenido(guardada.bloques, form.bloques)].filter((c): c is CambioCampo => c !== null),
    ]
    : [];

  const { audiencia } = envio;
  const noReciben = audiencia.clientes - audiencia.aceptan;
  const filasAfecta: { icono: IconType; texto: ReactNode }[] = [
    destinatarios > 0
      ? { icono: IconoClientes, texto: <>Llega a <strong>{clientes(destinatarios)}</strong> que aceptan promociones, uno por uno, con su nombre y su enlace de baja.</> }
      : { icono: IconoClientes, texto: 'Hoy no llega a nadie: ningún cliente con el correo verificado aceptó promociones.' },
    ...(noReciben > 0 ? [{
      icono: IconoInfo,
      texto: `${noReciben} no la ${noReciben === 1 ? 'recibe' : 'reciben'}: ${[
        audiencia.sinDecidir > 0 ? `${audiencia.sinDecidir} sin decidir` : '',
        audiencia.dijeronQueNo > 0 ? `${audiencia.dijeronQueNo} ${audiencia.dijeronQueNo === 1 ? 'dijo' : 'dijeron'} que no` : '',
        audiencia.sinVerificar > 0 ? `${audiencia.sinVerificar} sin verificar el correo` : '',
      ].filter(Boolean).join(', ')}.`,
    }] : []),
    ...(destinatarios > envio.limiteDiario ? [{ icono: IconoReloj, texto: `Pasa del límite de ${envio.limiteDiario} correos por día: se pausa al llegar y la reanudas al día siguiente.` }] : []),
  ];

  const sinCambios = editar && cambios.length === 0 && !enviar;
  const pasos: PasoAsistente[] = PASOS.map((p, i) => ({
    ...p,
    problema: i < ULTIMO ? problemas[i] : null,
    resumen: i === 0 ? (form.subject.trim() || 'Falta el asunto')
      : i === 1 ? `${form.bloques.length} ${form.bloques.length === 1 ? 'bloque' : 'bloques'}`
        : i === 2 ? (probada ? `Enviada a ${probada}` : 'A tu correo, antes de enviarla')
          : destinatarios > 0 ? `A ${clientes(destinatarios)}` : 'A nadie todavía',
  }));

  const vistaPrevia = (
    <>
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          <IconoCorreo className="h-4 w-4 text-brand-500" aria-hidden="true" /> En la bandeja
        </p>
        <div inert className="flex select-none items-start gap-3 rounded-xl border border-line bg-white p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white" aria-hidden="true">ES</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">{envio.remitente}</span>
            <span className="block truncate text-sm text-ink">{form.subject.trim() || 'Sin asunto'}</span>
            <span className="block truncate text-xs text-muted">{form.preheader.trim() || 'Sin texto de vista previa'}</span>
          </span>
        </div>
      </div>
      {/* El correo entero: sandbox="" sin scripts ni enlaces que naveguen. No va "inert": se recorre con la rueda (C-244) */}
      <section className={adminCardFlush} aria-label="El correo">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-ink">Así llega</h3>
            <p className="text-xs text-muted">A {clientes(destinatarios)}, con su nombre y el enlace de baja.</p>
          </div>
          {destinatarios > 0 && (
            <button type="button" onClick={() => setVerDestinatarios(true)} className="inline-flex min-h-11 shrink-0 items-center text-xs font-semibold text-brand-600 hover:underline">
              Ver destinatarios
            </button>
          )}
        </div>
        {errorVista ? (
          <p className={`${adminNotice('warning')} m-4`}>{errorVista}</p>
        ) : (
          <iframe title="Vista previa de la campaña" srcDoc={html} sandbox="" className="h-[30rem] w-full bg-surface lg:h-[calc(100dvh-22rem)] lg:min-h-[22rem]" />
        )}
      </section>
    </>
  );

  return (
    <>
      <Asistente
        titulo={campana ? `Cambiar: ${campana.subject}` : 'Nueva campaña'}
        subtitulo={campana ? 'Campaña de correo · Borrador' : 'Paso a paso, con el correo como lo recibe el cliente.'}
        icono={IconoEnviar}
        volver={{ href: LISTA, texto: 'Campañas de correo' }}
        etiqueta="Pasos de la campaña"
        pasos={pasos}
        paso={paso}
        onPaso={irA}
        editar={editar}
        arriba={(
          <div className="flex flex-wrap items-start justify-between gap-3">
            {/* C-170: quién más tiene abierta esta campaña, y el aviso si otra persona la cambió o la borró */}
            <div className="min-w-0 flex-1">{campanaId && <PresenciaEnEditor recurso={`campaign:${campanaId}`} etiqueta={form.subject || 'una campaña de correo'} nombreRecurso="campaña" femenino />}</div>
            {paso < ULTIMO && (
              <button type="button" onClick={guardarBorrador} disabled={guardando} className={adminSecondaryButton}>
                <IconoGuardar className="h-4 w-4" aria-hidden="true" /> {guardando ? 'Guardando…' : 'Guardar borrador'}
              </button>
            )}
          </div>
        )}
        final={{
          contenido: guardando ? 'Guardando…' : enviar
            ? <><IconoEnviar className="h-4 w-4" aria-hidden="true" /> Enviar a todos</>
            : <><IconoGuardar className="h-4 w-4" aria-hidden="true" /> Guardar el borrador</>,
          onClick: () => void finalizar(),
          deshabilitado: guardando || revision.cargando || Boolean(revision.error) || sinCambios,
          motivo: revision.error ? 'Arregla lo que dice arriba para seguir.' : sinCambios ? 'No hay cambios que guardar.' : null,
        }}
        vistaPrevia={vistaPrevia}
        vistaAncha
      >
        {paso === 0 && (
          <div className="space-y-5">
            {/* C-217: el borrador desde un objetivo, con productos reales; llena el asunto, la vista previa y los bloques */}
            <ArmarConIA
              enTarjeta={false}
              // Hay algo que perder si tiene asunto, un texto escrito o una imagen (el título y el botón de una campaña nueva no cuentan)
              hayContenido={Boolean(form.subject.trim()) || form.bloques.some((b) => (b.tipo === 'texto' ? b.texto.trim() !== '' : b.tipo === 'imagen' && b.url.trim() !== ''))}
              alArmar={(c) => setForm({ subject: c.subject, preheader: c.preheader ?? '', bloques: c.bloques as Bloque[] })}
            />
            <Campo etiqueta="Asunto" id="campana-asunto" error={problemaAsunto && form.subject ? problemaAsunto : undefined} pista="Lo primero que se lee en la bandeja.">
              <input id="campana-asunto" value={form.subject} maxLength={150} onChange={(e) => set('subject', e.target.value)} placeholder="Ofertas de la semana en audio" className={adminInput(Boolean(problemaAsunto && form.subject))} />
            </Campo>
            <Campo etiqueta="Texto de vista previa (opcional)" id="campana-preheader" pista="Lo que se lee junto al asunto en la bandeja.">
              <input id="campana-preheader" value={form.preheader} maxLength={200} onChange={(e) => set('preheader', e.target.value)} placeholder="Hasta el domingo, con envío a todo el país" className={adminInput()} />
            </Campo>
          </div>
        )}

        {paso === 1 && (
          <div className="space-y-4">
            <p className={adminHint}>Escribe <span className="font-mono">{'{nombre}'}</span> en un título o un texto para saludar a cada cliente por su nombre.</p>
            <ol className="divide-y divide-line border-y border-line">
              {form.bloques.map((bloque, indice) => {
                const problema = bloqueLleno(bloque) ? problemaDeBloque(bloque) : null;
                return (
                  <li key={indice} className="space-y-3 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{indice + 1}. {NOMBRE_BLOQUE[bloque.tipo]}</p>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => mover(indice, -1)} disabled={indice === 0} className={adminIconButton} aria-label="Subir bloque"><IconoFlechaArriba className="h-4 w-4" /></button>
                        <button type="button" onClick={() => mover(indice, 1)} disabled={indice === form.bloques.length - 1} className={adminIconButton} aria-label="Bajar bloque"><IconoFlechaAbajo className="h-4 w-4" /></button>
                        <button type="button" onClick={() => quitar(indice)} className={`${adminIconButton} hover:text-deal`} aria-label="Quitar bloque"><IconoEliminar className="h-4 w-4" /></button>
                      </div>
                    </div>

                    {bloque.tipo === 'titulo' && (
                      <input value={bloque.texto} maxLength={150} onChange={(e) => cambiarBloque(indice, { texto: e.target.value })} aria-label="Título" className={adminInput()} />
                    )}
                    {bloque.tipo === 'texto' && (
                      <textarea value={bloque.texto} rows={5} maxLength={4000} onChange={(e) => cambiarBloque(indice, { texto: e.target.value })} aria-label="Texto" placeholder="Deja una línea en blanco para separar párrafos." className={`${adminInput()} h-auto py-2.5`} />
                    )}
                    {bloque.tipo === 'imagen' && (
                      <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                        <button
                          type="button"
                          onClick={() => { indiceSubida.current = indice; archivo.current?.click(); }}
                          aria-label={bloque.url ? 'Subir otra imagen' : 'Subir la imagen'}
                          className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-surface text-muted hover:border-brand-200"
                        >
                          {subiendo === indice ? <span className={adminSpinner} aria-label="Subiendo" /> : bloque.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={bloque.url} alt="" className="h-full w-full object-contain" />
                          ) : (
                            <span className="text-center text-xs"><IconoSubir className="mx-auto mb-1 h-5 w-5" aria-hidden="true" />Subir JPG o PNG</span>
                          )}
                        </button>
                        <div className="space-y-3">
                          <div>
                            <label htmlFor={`bloque-${indice}-alt`} className={adminLabel}>Descripción de la imagen</label>
                            <input id={`bloque-${indice}-alt`} value={bloque.alt} maxLength={150} onChange={(e) => cambiarBloque(indice, { alt: e.target.value })} placeholder="Audífonos en oferta" className={`${adminInput()} sm:max-w-sm`} />
                            <p className={adminHint}>La leen quienes tienen las imágenes bloqueadas.</p>
                          </div>
                          <div>
                            <label htmlFor={`bloque-${indice}-enlace`} className={adminLabel}>Enlace al tocarla</label>
                            <input id={`bloque-${indice}-enlace`} value={bloque.enlace ?? ''} onChange={(e) => cambiarBloque(indice, { enlace: e.target.value })} placeholder="/productos/audifonos" className={`${adminInput()} sm:max-w-sm`} />
                          </div>
                        </div>
                      </div>
                    )}
                    {bloque.tipo === 'boton' && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label htmlFor={`bloque-${indice}-texto`} className={adminLabel}>Texto del botón</label>
                          <input id={`bloque-${indice}-texto`} value={bloque.texto} maxLength={40} onChange={(e) => cambiarBloque(indice, { texto: e.target.value })} className={adminInput()} />
                        </div>
                        <div>
                          <label htmlFor={`bloque-${indice}-url`} className={adminLabel}>Enlace</label>
                          <input id={`bloque-${indice}-url`} value={bloque.url} onChange={(e) => cambiarBloque(indice, { url: e.target.value })} placeholder="/productos" className={adminInput()} />
                        </div>
                      </div>
                    )}
                    {problema && <p className="text-xs font-semibold text-deal" role="alert">Este bloque {problema}.</p>}
                  </li>
                );
              })}
            </ol>

            <input ref={archivo} type="file" accept="image/png,image/jpeg,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void subirImagen(f); }} />

            <div>
              <p className={adminLabel}>Agregar un bloque</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => agregar({ tipo: 'titulo', texto: '' })} className={`${adminSecondaryButton} h-9 px-3 text-xs`}><IconoTexto className="h-4 w-4" aria-hidden="true" /> Título</button>
                <button type="button" onClick={() => agregar({ tipo: 'texto', texto: '' })} className={`${adminSecondaryButton} h-9 px-3 text-xs`}><IconoEditar className="h-4 w-4" aria-hidden="true" /> Texto</button>
                <button type="button" onClick={() => agregar({ tipo: 'imagen', url: '', alt: '', enlace: '' })} className={`${adminSecondaryButton} h-9 px-3 text-xs`}><IconoImagen className="h-4 w-4" aria-hidden="true" /> Imagen</button>
                <button type="button" onClick={() => agregar({ tipo: 'boton', texto: 'Ver más', url: '/productos' })} className={`${adminSecondaryButton} h-9 px-3 text-xs`}><IconoEnlace className="h-4 w-4" aria-hidden="true" /> Botón</button>
              </div>
            </div>
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-4">
            <Campo etiqueta="Enviar una prueba a" id="campana-prueba" pista="Llega solo a esa dirección, marcada como prueba. Revísala en el teléfono antes de enviar la campaña.">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input id="campana-prueba" type="email" value={correoPrueba} onChange={(e) => setCorreoPrueba(e.target.value)} placeholder="tu@correo.com" className={`${adminInput()} sm:max-w-sm`} />
                <button type="button" onClick={enviarPrueba} disabled={probando || !correoPrueba || Boolean(errorVista)} className={`${adminSecondaryButton} shrink-0`}>
                  <IconoEnviar className="h-4 w-4" aria-hidden="true" /> {probando ? 'Enviando…' : 'Enviar prueba'}
                </button>
              </div>
            </Campo>
            {probada && <p className="text-sm text-success-strong" role="status">Prueba enviada a {probada}. Mírala en el teléfono: así la verán los clientes.</p>}
            {errorVista && <p className="text-xs text-muted">{errorVista}</p>}
          </div>
        )}

        {paso === ULTIMO && (
          <div className="space-y-4">
            {revision.error && <p className={adminNotice('danger')} role="alert">{revision.error}</p>}
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
              <FilaResumen icono={IconoCorreo} titulo={form.subject.trim() || 'Sin asunto'} detalle={form.preheader.trim() ? `En la bandeja: "${form.preheader.trim()}"` : 'Sin texto de vista previa'} onCambiar={() => irA(0)} />
              <FilaResumen icono={IconoTexto} titulo={`${form.bloques.length} ${form.bloques.length === 1 ? 'bloque' : 'bloques'}`} detalle={bloquesEnPalabras(form.bloques)} onCambiar={() => irA(1)} />
              <FilaResumen icono={IconoEnviar} titulo={probada ? `Prueba enviada a ${probada}` : 'Todavía no te mandaste una prueba'} detalle={probada ? 'Revísala en el teléfono antes de enviarla.' : 'Mírala en tu correo antes de enviarla a todos.'} onCambiar={() => irA(2)} />
            </ul>

            {editar && <ListaCambios cambios={cambios} />}

            {puedeEnviar ? (
              <ElegirPublicar name="campana-enviar" publicar={enviarYa} onCambiar={setEnviarYa}
                ya={{ titulo: `Enviarla ya a ${clientes(destinatarios)}`, detalle: 'Uno por uno. No se puede deshacer.', icono: IconoEnviar }}
                sin={{ titulo: 'Guardarla como borrador', detalle: 'La envías después desde la lista.', icono: IconoGuardar }} />
            ) : (
              <p className={`${adminNotice('warning')} flex items-start gap-2`}>
                <IconoPausa className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {!envio.marketingActivo
                    ? <>Puedes guardarla y probarla, pero para enviarla a los clientes activa <strong>Correos de marketing</strong> en Ajustes → Correo.</>
                    : 'Se guarda como borrador: todavía ningún cliente aceptó promociones.'}
                </span>
              </p>
            )}
            <div>
              <Afecta cargando={false} filas={filasAfecta} />
              {destinatarios > 0 && (
                <button type="button" onClick={() => setVerDestinatarios(true)} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-500 hover:underline">
                  <IconoClientes className="h-4 w-4" aria-hidden="true" /> Ver destinatarios
                </button>
              )}
            </div>
          </div>
        )}
      </Asistente>
      {dialogoConflicto}
      {/* Montado solo mientras está abierto: al cerrar se reinician búsqueda y páginas (C-109) */}
      {verDestinatarios && <ModalDestinatarios abierto alCerrar={() => setVerDestinatarios(false)} />}
    </>
  );
}
