'use client';

import { useId, useState } from 'react';
import toast from 'react-hot-toast';
import { IconoCandado, IconoCerrar, IconoChevronDerecha, IconoChevronIzquierda, IconoCheck, IconoEditar, IconoInfo, IconoPlay, IconoRestablecer } from '@/components/iconos';
import Ayuda from '@/components/admin/Ayuda';
import Pasos, { type Paso } from '@/components/admin/Pasos';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import {
  adminHint, adminInput, adminModalFooter, adminModalOverlay, adminModalPanel, adminNotice, adminPrimaryButton, adminSecondaryButton,
} from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useCajonAccesible } from '@/lib/hooks/useCajonAccesible';
import { infoDeUso, INSTRUCCIONES_MAX, INSTRUCCIONES_MIN, reglasDe, type UsoIa } from '@/lib/ia/reglas';
import FilaRegla from './FilaRegla';
import { diferenciaDeLineas } from './diferencia';
import { ICONOS_DE_USO } from './iconos';
import PruebaDeInstrucciones from './PruebaDeInstrucciones';
import { llamar, type DatosIa } from './tipos';

// C-288 · Cambiar las instrucciones de un uso de Claude, por pasos (PLAN.md §1.9): 1) lo que hace y las reglas que siguen aunque se
// cambien, 2) las instrucciones, 3) probarlas con un caso real sin guardar nada, 4) revisar el antes → después y publicar.
// Rigen desde el próximo pedido; lo que ya redactó Claude no cambia. "De fábrica" las devuelve.

const LINEAS_VISIBLES = 60;

export default function EditarInstrucciones({ uso, datos, pasoInicial, alCerrar, alPublicar }: {
  uso: UsoIa;
  datos: DatosIa;
  pasoInicial: number;
  alCerrar: () => void;
  alPublicar: () => Promise<void>;
}) {
  const id = useId();
  const { confirm } = useConfirm();
  const info = infoDeUso(uso);
  const delServidor = datos.usos.find((u) => u.id === uso);
  const vigente = delServidor?.vigente ?? '';
  const [paso, setPaso] = useState(pasoInicial);
  const [texto, setTexto] = useState(vigente);
  const [probada, setProbada] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const reglas = reglasDe(uso);
  const Icono = ICONOS_DE_USO[info?.icono ?? 'IconoBuscar'];

  const largo = texto.trim().length;
  const hayCambios = texto.trim() !== vigente.trim();
  const sinFabrica = delServidor ? texto.trim() === delServidor.deFabrica.trim() : false;
  const valido = largo >= INSTRUCCIONES_MIN && largo <= INSTRUCCIONES_MAX;
  const lineas = paso === 3 ? diferenciaDeLineas(vigente, texto).filter((l) => l.tipo !== 'igual') : [];

  useBodyScrollLock(true);
  const cerrar = async () => {
    if (hayCambios) {
      const descartar = await confirm({ title: 'Descartar los cambios', message: 'Escribiste cambios en las instrucciones y no los publicaste. ¿Cerrar y perderlos?', confirmText: 'Descartar', cancelText: 'Seguir editando', type: 'warning' });
      if (!descartar) return;
    }
    alCerrar();
  };
  useCajonAccesible(true, `ia-${id}`, () => void cerrar());

  const pasos: Paso[] = [
    { titulo: 'Lo que hace', resumen: `${reglas.length} reglas`, hecho: paso > 0, disponible: true, icono: IconoCandado },
    { titulo: 'Las instrucciones', resumen: hayCambios ? 'Con cambios' : 'Como están', hecho: paso > 1 && valido, disponible: true, icono: IconoEditar },
    { titulo: 'Probar', resumen: probada ? 'Probada' : 'Sin probar', hecho: probada && paso > 2, disponible: valido, icono: IconoPlay },
    { titulo: 'Revisar y publicar', resumen: hayCambios ? 'Hay cambios' : 'Sin cambios', hecho: false, disponible: valido, icono: IconoCheck },
  ];
  const motivoParaSeguir = paso === 1 && !valido ? (largo < INSTRUCCIONES_MIN ? `Faltan ${INSTRUCCIONES_MIN - largo} caracteres: llevan al menos ${INSTRUCCIONES_MIN}.` : 'Pasan de 12.000 caracteres.') : null;

  const publicar = async () => {
    setOcupado(true);
    try {
      // Iguales a las de fábrica = volver a ellas (así, si la fábrica cambia en una versión, este uso la sigue)
      const r = await llamar('/api/admin/ia/instrucciones', 'PUT', { uso, texto: sinFabrica ? null : texto.trim(), desde: datos.updatedAt });
      if (r.ok) {
        toast.success(sinFabrica ? 'Instrucciones de fábrica: rigen desde el próximo pedido' : 'Instrucciones publicadas: rigen desde el próximo pedido');
        await alPublicar();
        alCerrar();
        return;
      }
      toast.error(r.datos.error ?? 'No se pudieron publicar');
      if (r.estado === 409) await alPublicar();
    } catch {
      toast.error('Sin conexión. Tus cambios siguen aquí; intenta de nuevo.');
    } finally {
      setOcupado(false);
    }
  };

  const siguiente = paso < 3 ? pasos[paso + 1].titulo : null;

  return (
    <div className={adminModalOverlay}>
      <div className="fixed inset-0" onClick={() => void cerrar()} aria-hidden="true" />
      <div id={`ia-${id}`} role="dialog" aria-modal="true" aria-labelledby={`${id}-titulo`} className={`${adminModalPanel} relative z-10 sm:max-w-3xl`}>
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white"><Icono className="h-[18px] w-[18px]" aria-hidden="true" /></span>
          <h2 id={`${id}-titulo`} className="min-w-0 flex-1 text-lg font-semibold text-ink">{info?.nombre}: instrucciones</h2>
          <button type="button" onClick={() => void cerrar()} aria-label="Cerrar" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-500">
            <IconoCerrar className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 pt-3">
          <Pasos pasos={pasos} actual={paso} onIr={setPaso} etiqueta="Pasos para cambiar las instrucciones" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {paso === 0 && (
            <div>
              <div className={`${adminNotice('warning')} flex items-start gap-3`}>
                <IconoInfo aria-hidden="true" />
                <span><b>{info?.nombre}</b> · {info?.hace}</span>
              </div>
              <p className="mt-3 text-sm text-ink-soft"><b>Lo que le llega:</b> {info?.recibe}</p>
              <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-ink">Sus reglas</h3>
                <span className="text-xs text-muted">Siguen aunque cambies las instrucciones</span>
              </div>
              <ul className="mt-1">{reglas.map((r) => <FilaRegla key={r.id} regla={r} />)}</ul>
            </div>
          )}

          {paso === 1 && (
            <div>
              <div className="flex items-center gap-1">
                <label htmlFor={`${id}-texto`} className="text-sm font-semibold text-ink">
                  Las instrucciones de {delServidor?.delEquipo ? 'hoy (del equipo)' : 'hoy (de fábrica)'}
                </label>
                <Ayuda>
                  Tú escribes cómo quieres que trabaje; la tienda comprueba el resultado con sus reglas.
                  {uso === 'busqueda' ? ' Los nombres de especificaciones de cada categoría también se agregan solos al final.' : ''}
                </Ayuda>
              </div>
              <textarea
                id={`${id}-texto`}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                spellCheck={false}
                rows={14}
                className={`${adminInput(!valido && largo > 0)} mt-1.5 h-auto min-h-[16rem] resize-y py-3 font-mono text-xs leading-relaxed`}
                aria-invalid={!valido}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className={`text-xs ${valido ? 'text-muted' : 'font-semibold text-deal'}`}>{largo.toLocaleString('es-VE')} de {INSTRUCCIONES_MAX.toLocaleString('es-VE')} caracteres</span>
                <button type="button" onClick={() => setTexto(delServidor?.deFabrica ?? '')} disabled={sinFabrica} className={`${adminSecondaryButton} h-9! px-3! text-[13px]`}>
                  <IconoRestablecer className="h-4 w-4" aria-hidden="true" />De fábrica
                </button>
              </div>
              <p className={adminHint}>Las reglas de seguridad van aparte, fijas: no se pueden borrar desde aquí.</p>
              {delServidor?.delEquipo && delServidor.porNombre && (
                <p className={adminHint}>Las de hoy las escribió {delServidor.porNombre}{delServidor.at ? `, el ${new Date(delServidor.at).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', timeZone: 'America/Caracas' })}` : ''}.</p>
              )}
            </div>
          )}

          {paso === 2 && <PruebaDeInstrucciones uso={uso} texto={texto.trim()} alProbar={() => setProbada(true)} />}

          {paso === 3 && (
            <div>
              {!hayCambios ? (
                <p className="text-sm text-ink-soft">No cambiaste nada: las instrucciones quedan como están.</p>
              ) : (
                <>
                  <h3 className="text-base font-semibold text-ink">Lo que cambia</h3>
                  <p className="mt-0.5 text-xs text-muted">{lineas.filter((l) => l.tipo === 'quita').length} líneas se quitan y {lineas.filter((l) => l.tipo === 'agrega').length} se agregan.</p>
                  <div className="mt-2 grid gap-1 rounded-xl border border-line bg-surface p-2.5 font-mono text-xs leading-relaxed">
                    {lineas.slice(0, LINEAS_VISIBLES).map((l, i) => (
                      <p key={i} className={`rounded px-1.5 py-0.5 [overflow-wrap:anywhere] ${l.tipo === 'quita' ? 'text-muted line-through' : 'bg-brand-100 text-brand-700'}`}>
                        <span className="sr-only">{l.tipo === 'quita' ? 'Se quita: ' : 'Se agrega: '}</span>
                        {l.texto || ' '}
                      </p>
                    ))}
                    {lineas.length > LINEAS_VISIBLES && <p className="px-1.5 text-muted">… y {lineas.length - LINEAS_VISIBLES} líneas más</p>}
                  </div>
                </>
              )}
              <p className="mt-3 max-w-prose text-sm text-ink-soft">
                Afecta a: <b>cada &quot;{info?.nombre}&quot; desde que publiques</b>. Lo que ya redactó Claude no cambia. Queda anotado con tu nombre y &quot;De fábrica&quot; las devuelve. Las {reglas.length} reglas siguen igual.
                {sinFabrica && hayCambios ? ' Las que escribiste son las de fábrica: se vuelve a ellas.' : ''}
              </p>
              {!probada && hayCambios && <p className={adminHint}>Todavía no las probaste: puedes volver al paso &quot;Probar&quot; antes de publicar.</p>}
            </div>
          )}
        </div>

        <div className={adminModalFooter}>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            {paso > 0
              ? <button type="button" onClick={() => setPaso(paso - 1)} className={adminSecondaryButton}><IconoChevronIzquierda className="h-4 w-4" aria-hidden="true" />Atrás</button>
              : <span />}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              {motivoParaSeguir && <p className="text-xs text-muted sm:max-w-56 sm:text-right">{motivoParaSeguir}</p>}
              {siguiente ? (
                <button type="button" onClick={() => setPaso(paso + 1)} disabled={paso === 1 && !valido} className={adminPrimaryButton}>
                  Siguiente: {siguiente.toLowerCase()}<IconoChevronDerecha className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button type="button" onClick={() => void publicar()} disabled={!hayCambios || !valido || ocupado} className={adminPrimaryButton}>
                  <IconoCheck className="h-4 w-4" aria-hidden="true" />{ocupado ? 'Publicando…' : hayCambios ? 'Publicar' : 'Sin cambios'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
