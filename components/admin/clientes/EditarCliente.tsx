'use client';

// C-276: "Editar" de la ficha de un cliente, por pasos (PLAN.md §1.9): quién es, cómo le escribimos, su empresa y "Revisar
// y guardar" con antes → después y a quién afecta. Son los datos que cambiaba la ventana vieja de la lista (nombre, correo,
// teléfono, WhatsApp, tipo, empresa, RIF, y el estado de la verificación con su nota). Los datos van a PUT
// /api/customers/[id] con lo que había al abrir (si otra persona cambió ese mismo campo, no se pisa); la verificación, a
// Verificaciones, que le avisa al cliente y no deja que dos personas la resuelvan dos veces.

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Asistente, { Afecta, Campo, FilaResumen, ListaCambios, VistaPrevia, type CambioCampo, type PasoAsistente } from '@/components/admin/Asistente';
import { OpcionRadio } from '@/components/admin/Opcion';
import {
  IconoCuenta, IconoCorreo, IconoGuardar, IconoMaletin, IconoNotificaciones, IconoTelefono, IconoVer, type IconType,
} from '@/components/iconos';
import { adminDato, adminInput } from '@/lib/admin-ui';
import { CAMPOS_EDITABLES, NOMBRE_CAMPO, TIPOS, problemaDe, valorLegible, type CampoEditable, type DatosEditables } from '@/lib/clientes/edicion';
import type { EstadoVerificacion } from '@/lib/clientes/datos-editables';

const ESTADOS: Record<EstadoVerificacion, string> = { NONE: 'Sin documentos', PENDING: 'Por revisar', APPROVED: 'Verificada', REJECTED: 'Rechazada' };

const PASOS: { titulo: string; queHacer: string; icono: IconType }[] = [
  { titulo: 'Quién es', queHacer: 'Su nombre y su correo.', icono: IconoCuenta },
  { titulo: 'Cómo le escribimos', queHacer: 'Su teléfono y su WhatsApp.', icono: IconoTelefono },
  { titulo: 'Empresa', queHacer: 'Si compra como empresa, sus datos y su verificación.', icono: IconoMaletin },
  { titulo: 'Revisar y guardar', queHacer: 'Mira qué cambia antes de guardarlo.', icono: IconoVer },
];

type Verificacion = { perfilId: string; estado: EstadoVerificacion; notas: string; documentos: boolean } | null;

export default function EditarCliente({ id, datos, verificacion }: { id: string; datos: DatosEditables; verificacion: Verificacion }) {
  const router = useRouter();
  const [form, setForm] = useState<DatosEditables>(datos);
  const [estado, setEstado] = useState<EstadoVerificacion>(verificacion?.estado ?? 'NONE');
  const [nota, setNota] = useState(verificacion?.notas ?? '');
  const [paso, setPaso] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Partial<Record<CampoEditable, string>>>({});
  const set = (k: CampoEditable, v: string) => { setForm((f) => ({ ...f, [k]: v })); setErrores((e) => ({ ...e, [k]: undefined })); };
  const ficha = `/admin/customers/${id}`;

  const problema = (c: CampoEditable) => (form[c] !== datos[c] ? problemaDe(c, form[c], form) : null);
  const empresa = form.tipo === 'COMPANY';
  const cambiaVerificacion = Boolean(verificacion) && empresa && (estado !== verificacion?.estado || nota.trim() !== (verificacion?.notas ?? '').trim());
  const faltaMotivo = cambiaVerificacion && estado === 'REJECTED' && nota.trim().length < 3;

  const cambiados = CAMPOS_EDITABLES.filter((c) => form[c].trim() !== datos[c].trim());
  const cambios: CambioCampo[] = [
    ...cambiados.map((c) => ({ campo: c, nombre: NOMBRE_CAMPO[c], antes: valorLegible(c, datos[c]), despues: valorLegible(c, form[c]) })),
    ...(cambiaVerificacion && estado !== verificacion?.estado ? [{ campo: 'verificacion', nombre: 'Verificación', antes: ESTADOS[verificacion?.estado ?? 'NONE'], despues: ESTADOS[estado] }] : []),
    ...(cambiaVerificacion && nota.trim() !== (verificacion?.notas ?? '').trim() ? [{ campo: 'nota', nombre: 'Nota de la verificación', antes: verificacion?.notas.trim() || 'Sin nota', despues: nota.trim() || 'Sin nota' }] : []),
  ];

  const pasos: PasoAsistente[] = PASOS.map((p, i) => ({
    ...p,
    problema: i === 0 ? problema('nombre') ?? problema('correo')
      : i === 1 ? problema('telefono') ?? problema('whatsapp')
        : i === 2 ? problema('empresa') ?? problema('rif') ?? (faltaMotivo ? 'Si la rechazas, escribe el motivo: le llega al cliente.' : null)
          : null,
    resumen: i === 0 ? `${form.nombre.trim() || 'Sin nombre'} · ${form.correo.trim()}`
      : i === 1 ? [form.telefono.trim(), form.whatsapp.trim() && form.whatsapp.trim() !== form.telefono.trim() ? `WhatsApp ${form.whatsapp.trim()}` : null].filter(Boolean).join(' · ') || 'Sin teléfono'
        : i === 2 ? (empresa ? `${form.empresa.trim() || 'Empresa'}${verificacion ? ` · ${ESTADOS[estado]}` : ''}` : 'Persona')
          : `${cambios.length} ${cambios.length === 1 ? 'cambio' : 'cambios'}`,
  }));

  const afecta = (): { icono: IconType; texto: ReactNode }[] => {
    const filas: { icono: IconType; texto: ReactNode }[] = [];
    if (cambiados.includes('correo')) filas.push({ icono: IconoCorreo, texto: <>Su correo queda <strong>sin verificar</strong> y le enviamos el enlace de activación a <strong>{form.correo.trim()}</strong>. Los enlaces que tenía en la dirección anterior dejan de servir. Entra con el correo nuevo.</> });
    if (cambiados.includes('nombre')) filas.push({ icono: IconoCuenta, texto: 'Así lo verá en su cuenta y en los correos de ahora en adelante. Sus pedidos y facturas ya hechos no cambian.' });
    if (cambiados.includes('tipo')) filas.push({ icono: IconoMaletin, texto: empresa ? 'Pasa a comprar como empresa.' : 'Deja de verse como empresa en su ficha. Los datos de la empresa se guardan por si vuelve.' });
    if (cambiaVerificacion && estado !== verificacion?.estado && (estado === 'APPROVED' || estado === 'REJECTED')) {
      filas.push({ icono: IconoNotificaciones, texto: <>Le llega un aviso y un correo: <strong>{estado === 'APPROVED' ? 'su empresa está verificada' : 'no pudimos verificar su empresa'}</strong>{estado === 'REJECTED' && nota.trim() ? ', con el motivo que escribiste' : ''}.</> });
    }
    return filas;
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      if (cambiados.length > 0) {
        const r = await fetch(`/api/customers/${id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cambios: Object.fromEntries(cambiados.map((c) => [c, form[c]])),
            antes: Object.fromEntries(cambiados.map((c) => [c, datos[c]])),
          }),
        });
        const d = (await r.json().catch(() => ({}))) as { error?: string; campo?: CampoEditable; activacionEnviada?: boolean; correoSinVerificar?: boolean };
        if (!r.ok) {
          if (d.campo) {
            setErrores((e) => ({ ...e, [d.campo as CampoEditable]: d.error }));
            setPaso(d.campo === 'nombre' || d.campo === 'correo' ? 0 : d.campo === 'telefono' || d.campo === 'whatsapp' ? 1 : 2);
          }
          toast.error(d.error || 'No se pudieron guardar sus datos');
          return;
        }
        if (d.correoSinVerificar) toast.success(d.activacionEnviada ? 'Le enviamos el enlace de activación al correo nuevo' : 'Correo cambiado. Reenvíale la activación desde su ficha.');
      }
      if (cambiaVerificacion && verificacion) {
        const r = await fetch('/api/admin/verifications', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId: verificacion.perfilId, status: estado === 'NONE' ? 'PENDING' : estado, notes: nota.trim() || null }),
        });
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        if (!r.ok) {
          toast.error(cambiados.length > 0 ? `Sus datos quedaron guardados, pero la verificación no: ${d.error || 'inténtalo de nuevo'}` : d.error || 'No se pudo guardar la verificación');
          router.refresh();
          return;
        }
      }
      toast.success('Cambios guardados');
      router.push(ficha);
      router.refresh();
    } catch {
      toast.error('Error de conexión. Verifica tu internet.');
    } finally {
      setGuardando(false);
    }
  };

  const sinCambios = cambios.length === 0;
  const inicial = (form.nombre.trim() || form.correo.trim() || '?').charAt(0).toUpperCase();

  return (
    <Asistente
      titulo={`Editar: ${datos.nombre || datos.correo}`}
      subtitulo="Sus datos de contacto y de empresa."
      icono={IconoCuenta}
      volver={{ href: ficha, texto: 'Su ficha' }}
      etiqueta="Pasos para editar al cliente"
      pasos={pasos}
      paso={paso}
      onPaso={setPaso}
      editar
      final={{
        contenido: guardando ? 'Guardando…' : <><IconoGuardar className="h-4 w-4" aria-hidden="true" /> Guardar los cambios</>,
        onClick: () => void guardar(),
        deshabilitado: guardando || sinCambios || pasos.some((p) => p.problema !== null),
        motivo: sinCambios ? 'No hay cambios que guardar.' : null,
      }}
      vistaPrevia={
        <VistaPrevia rotulo="En la lista de clientes">
          <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand-700">{inicial}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-ink">{form.nombre.trim() || 'Sin nombre'}</span>
              <span className="block truncate text-xs text-muted">{form.correo.trim()}</span>
            </span>
            {empresa && <span className={adminDato}><IconoMaletin className="h-3.5 w-3.5" aria-hidden="true" /> Empresa</span>}
          </div>
        </VistaPrevia>
      }
    >
      {paso === 0 && (
        <div className="space-y-5">
          <Campo etiqueta="Nombre" id="cliente-nombre" error={errores.nombre ?? problema('nombre') ?? undefined}>
            <input id="cliente-nombre" value={form.nombre} maxLength={80} autoComplete="off" onChange={(e) => set('nombre', e.target.value)} className={`${adminInput(Boolean(errores.nombre || problema('nombre')))} sm:max-w-sm`} />
          </Campo>
          <Campo etiqueta="Correo" id="cliente-correo" error={errores.correo ?? problema('correo') ?? undefined}
            pista={form.correo.trim() !== datos.correo.trim() ? 'Si lo cambias, queda sin verificar hasta que abra el enlace que le llega.' : undefined}
            ayuda="Es con el que entra a la tienda. Si lo cambias, le llega un enlace nuevo de activación a la dirección nueva y los de la anterior dejan de servir.">
            <input id="cliente-correo" type="email" inputMode="email" value={form.correo} maxLength={120} autoComplete="off" onChange={(e) => set('correo', e.target.value)} className={`${adminInput(Boolean(errores.correo || problema('correo')))} sm:max-w-sm`} />
          </Campo>
        </div>
      )}

      {paso === 1 && (
        <div className="space-y-5">
          <Campo etiqueta="Teléfono" id="cliente-telefono" error={errores.telefono ?? problema('telefono') ?? undefined}>
            <input id="cliente-telefono" type="tel" inputMode="tel" value={form.telefono} maxLength={20} placeholder="0414-1234567" onChange={(e) => set('telefono', e.target.value)} className={`${adminInput(Boolean(errores.telefono || problema('telefono')))} sm:max-w-56`} />
          </Campo>
          <Campo etiqueta="WhatsApp" id="cliente-whatsapp" error={errores.whatsapp ?? problema('whatsapp') ?? undefined} pista="Si es el mismo del teléfono, puedes dejarlo vacío.">
            <input id="cliente-whatsapp" type="tel" inputMode="tel" value={form.whatsapp} maxLength={20} placeholder="0414-1234567" onChange={(e) => set('whatsapp', e.target.value)} className={`${adminInput(Boolean(errores.whatsapp || problema('whatsapp')))} sm:max-w-56`} />
          </Campo>
        </div>
      )}

      {paso === 2 && (
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-ink">Compra como</legend>
            <div className="grid gap-2 sm:max-w-lg sm:grid-cols-2">
              <OpcionRadio name="cliente-tipo" elegida={!empresa} onElegir={() => set('tipo', 'PERSON')} icono={IconoCuenta} titulo={TIPOS.PERSON} detalle="Con su cédula" />
              <OpcionRadio name="cliente-tipo" elegida={empresa} onElegir={() => set('tipo', 'COMPANY')} icono={IconoMaletin} titulo={TIPOS.COMPANY} detalle="Con el RIF de su empresa" />
            </div>
          </fieldset>
          {empresa && (
            <>
              <div className="grid gap-5 sm:grid-cols-2 sm:max-w-2xl">
                <Campo etiqueta="Nombre de la empresa" id="cliente-empresa" error={errores.empresa ?? problema('empresa') ?? undefined}>
                  <input id="cliente-empresa" value={form.empresa} maxLength={120} onChange={(e) => set('empresa', e.target.value)} className={adminInput(Boolean(errores.empresa || problema('empresa')))} />
                </Campo>
                <Campo etiqueta="RIF" id="cliente-rif" error={errores.rif ?? problema('rif') ?? undefined}>
                  <input id="cliente-rif" value={form.rif} maxLength={14} placeholder="J-12345678-9" onChange={(e) => set('rif', e.target.value.toUpperCase())} className={`${adminInput(Boolean(errores.rif || problema('rif')))} sm:max-w-48`} />
                </Campo>
              </div>
              {verificacion ? (
                <div className="space-y-3 sm:max-w-2xl">
                  <Campo etiqueta="Verificación" id="cliente-verificacion"
                    pista={verificacion.documentos ? 'Mira el acta y el RIF en Verificaciones antes de aprobarla.' : 'Todavía no envió el acta ni el RIF.'}
                    ayuda="Si la apruebas o la rechazas, le llega un aviso y un correo con el resultado.">
                    <select id="cliente-verificacion" value={estado} onChange={(e) => setEstado(e.target.value as EstadoVerificacion)} className={`${adminInput()} sm:max-w-56`}>
                      {verificacion.estado === 'NONE' && <option value="NONE">{ESTADOS.NONE}</option>}
                      <option value="PENDING">{ESTADOS.PENDING}</option>
                      <option value="APPROVED">{ESTADOS.APPROVED}</option>
                      <option value="REJECTED">{ESTADOS.REJECTED}</option>
                    </select>
                  </Campo>
                  <Campo etiqueta={estado === 'REJECTED' ? 'Motivo (le llega al cliente)' : 'Nota de la verificación'} id="cliente-nota"
                    error={faltaMotivo ? 'Escribe el motivo: le llega al cliente.' : undefined}>
                    <textarea id="cliente-nota" rows={2} maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)}
                      placeholder={estado === 'REJECTED' ? 'Ej. El RIF no se lee: envíalo de nuevo, por favor.' : 'Opcional'} className={`${adminInput(faltaMotivo)} h-auto py-2`} />
                  </Campo>
                </div>
              ) : (
                <p className="text-sm text-muted">Su verificación aparece aquí cuando complete su perfil.</p>
              )}
            </>
          )}
        </div>
      )}

      {paso === 3 && (
        <div className="space-y-4">
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            <FilaResumen icono={IconoCuenta} titulo={form.nombre.trim() || 'Sin nombre'} detalle={form.correo.trim()} onCambiar={() => setPaso(0)} />
            <FilaResumen icono={IconoTelefono} titulo={pasos[1].resumen} onCambiar={() => setPaso(1)} />
            <FilaResumen icono={IconoMaletin} titulo={pasos[2].resumen} detalle={empresa && form.rif.trim() ? `RIF ${form.rif.trim()}` : undefined} onCambiar={() => setPaso(2)} />
          </ul>
          <ListaCambios cambios={cambios}>
            {cambios.length > 0 && <Afecta cargando={false} filas={afecta()} />}
          </ListaCambios>
        </div>
      )}
    </Asistente>
  );
}
