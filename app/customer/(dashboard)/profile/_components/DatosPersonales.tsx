'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiCheckCircle, FiLock, FiMail, FiSend } from 'react-icons/fi';
import { adminBadge, adminError, adminHint, adminInput, adminLabel, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { ControlDocumento, ControlTelefono, AYUDA_DOCUMENTO } from '@/components/forms/ControlesDatos';
import { leerDocumento, leerTelefono } from '@/lib/validations/registro';
import { ESTADOS_VENEZUELA } from '@/lib/envios/empresas';
import { Seccion } from './comun';
import type { DatosPerfil } from './tipos';

// Datos personales (C-138). Nombre y cédula se escriben una vez: después solo los corrige el equipo.
// Antes: tooltips que solo salían con el mouse, confirmación para guardar y la página se recargaba entera.

const GENEROS = [
  { valor: '', texto: 'Sin especificar' },
  { valor: 'female', texto: 'Femenino' },
  { valor: 'male', texto: 'Masculino' },
  { valor: 'other', texto: 'Otro' },
];

function partirTelefono(telefono: string | null): { codigo: string; numero: string } {
  const partes = (telefono || '').trim().match(/^(\+\d{1,4})\s*(.*)$/);
  return partes ? { codigo: partes[1], numero: partes[2] } : { codigo: '+58', numero: telefono || '' };
}

interface Formulario {
  nombre: string;
  docTipo: string;
  docNumero: string;
  telCodigo: string;
  telNumero: string;
  nacimiento: string;
  genero: string;
  ciudad: string;
  estado: string;
}

function desdeDatos(datos: DatosPerfil): Formulario {
  const tel = partirTelefono(datos.profile?.phone ?? null);
  return {
    nombre: datos.user.name || '',
    docTipo: 'V',
    docNumero: '',
    telCodigo: tel.codigo,
    telNumero: tel.numero,
    nacimiento: (datos.profile?.birthdate || '').slice(0, 10),
    genero: datos.profile?.gender === 'prefer_not_to_say' ? '' : datos.profile?.gender || '',
    ciudad: datos.profile?.city || '',
    estado: datos.profile?.state || '',
  };
}

export default function DatosPersonales({ datos, onGuardado }: { datos: DatosPerfil; onGuardado: () => Promise<void> }) {
  const [inicial, setInicial] = useState(() => desdeDatos(datos));
  const [form, setForm] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Partial<Record<keyof Formulario, string>>>({});
  const [reenviando, setReenviando] = useState(false);

  const nombreFijo = Boolean(datos.user.name);
  const cedulaGuardada = datos.profile?.idNumber || '';
  const cambios = (Object.keys(form) as (keyof Formulario)[]).some((k) => form[k] !== inicial[k]);
  const poner = (campo: keyof Formulario, valor: string) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const nuevos: typeof errores = {};
    if (!nombreFijo && form.nombre.trim().split(/\s+/).length < 2) nuevos.nombre = 'Escribe tu nombre y apellido';
    const cedula = !cedulaGuardada && form.docNumero ? leerDocumento(`${form.docTipo}-${form.docNumero}`) : null;
    if (cedula && !cedula.ok) nuevos.docNumero = cedula.error;
    const telefono = form.telNumero.trim() ? leerTelefono(`${form.telCodigo} ${form.telNumero}`) : null;
    if (telefono && !telefono.ok) nuevos.telNumero = telefono.error;
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setGuardando(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(nombreFijo ? {} : { name: form.nombre }),
          profile: {
            ...(cedula?.ok ? { idNumber: cedula.valor } : {}),
            phone: telefono?.ok ? telefono.valor : '',
            birthdate: form.nacimiento,
            gender: form.genero,
            city: form.ciudad.trim(),
            state: form.estado,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.error || 'No se pudieron guardar tus datos');
        return;
      }
      toast.success('Datos guardados');
      setInicial(form);
      await onGuardado();
    } catch {
      toast.error('No se pudieron guardar tus datos. Revisa tu conexión.');
    } finally {
      setGuardando(false);
    }
  };

  const reenviarVerificacion = async () => {
    setReenviando(true);
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) toast.success(data.message || 'Te enviamos el correo de verificación');
      else toast.error(data.error || 'No se pudo enviar el correo');
    } catch {
      toast.error('No se pudo enviar el correo');
    } finally {
      setReenviando(false);
    }
  };

  return (
    <form onSubmit={guardar} className="space-y-4 pb-20 lg:pb-0" noValidate>
      <Seccion titulo="Tus datos" descripcion="Los usamos en tus pedidos, recibos y garantías.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="perfil-nombre" className={adminLabel}>Nombre y apellido</label>
            <input
              id="perfil-nombre"
              value={form.nombre}
              onChange={(e) => poner('nombre', e.target.value)}
              disabled={nombreFijo}
              autoComplete="name"
              className={adminInput(Boolean(errores.nombre))}
              placeholder="Ej: María Pérez"
            />
            {errores.nombre ? <p className={adminError}>{errores.nombre}</p> : nombreFijo && (
              <p className={`${adminHint} flex items-center gap-1`}><FiLock className="h-3 w-3" aria-hidden="true" /> Para corregirlo, escríbenos: es el nombre de tus recibos.</p>
            )}
          </div>

          <div>
            <label htmlFor="perfil-cedula" className={adminLabel}>Cédula</label>
            {cedulaGuardada ? (
              <>
                <input id="perfil-cedula" value={cedulaGuardada} disabled className={adminInput()} />
                <p className={`${adminHint} flex items-center gap-1`}><FiLock className="h-3 w-3" aria-hidden="true" /> Para corregirla, escríbenos.</p>
              </>
            ) : (
              <>
                <ControlDocumento
                  id="perfil-cedula"
                  tipo={form.docTipo}
                  numero={form.docNumero}
                  onTipo={(v) => poner('docTipo', v)}
                  onNumero={(v) => poner('docNumero', v)}
                  error={Boolean(errores.docNumero)}
                />
                {errores.docNumero ? <p className={adminError}>{errores.docNumero}</p> : <p className={adminHint}>{AYUDA_DOCUMENTO}</p>}
              </>
            )}
          </div>

          <div>
            <label htmlFor="perfil-telefono" className={adminLabel}>Teléfono</label>
            <ControlTelefono
              id="perfil-telefono"
              codigo={form.telCodigo}
              numero={form.telNumero}
              onCodigo={(v) => poner('telCodigo', v)}
              onNumero={(v) => poner('telNumero', v)}
              error={Boolean(errores.telNumero)}
            />
            {errores.telNumero ? <p className={adminError}>{errores.telNumero}</p> : <p className={adminHint}>Para coordinar tus envíos y el Pago Móvil.</p>}
          </div>

          <div className="sm:col-span-2">
            <span className={adminLabel}>Correo</span>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5">
              <FiMail className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{datos.user.email}</span>
              {datos.user.emailVerified ? (
                <span className={adminBadge('success')}><FiCheckCircle className="h-3.5 w-3.5" aria-hidden="true" /> Verificado</span>
              ) : (
                <span className={adminBadge('warning')}>Sin verificar</span>
              )}
            </div>
            {!datos.user.emailVerified && (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-soft">Verifícalo para poder comprar y recuperar tu cuenta.</p>
                <button type="button" onClick={reenviarVerificacion} disabled={reenviando} className={`${adminSecondaryButton} shrink-0`}>
                  <FiSend className="h-4 w-4" aria-hidden="true" /> {reenviando ? 'Enviando…' : 'Reenviar correo'}
                </button>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="perfil-nacimiento" className={adminLabel}>Fecha de nacimiento <span className="font-normal text-muted">(opcional)</span></label>
            <input id="perfil-nacimiento" type="date" value={form.nacimiento} onChange={(e) => poner('nacimiento', e.target.value)} max={new Date().toISOString().slice(0, 10)} className={adminInput()} />
          </div>

          <div>
            <label htmlFor="perfil-genero" className={adminLabel}>Género <span className="font-normal text-muted">(opcional)</span></label>
            <select id="perfil-genero" value={form.genero} onChange={(e) => poner('genero', e.target.value)} className={adminInput()}>
              {GENEROS.map((g) => <option key={g.valor} value={g.valor}>{g.texto}</option>)}
            </select>
          </div>
        </div>
      </Seccion>

      <Seccion
        titulo="Dónde vives"
        descripcion={<>Para tus recibos. Las agencias y direcciones de envío están en <Link href="/customer/addresses" className="font-semibold text-brand-600 hover:underline">Direcciones</Link>.</>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="perfil-estado" className={adminLabel}>Estado</label>
            <select id="perfil-estado" value={form.estado} onChange={(e) => poner('estado', e.target.value)} className={adminInput()}>
              <option value="">Elige tu estado</option>
              {ESTADOS_VENEZUELA.map((e) => <option key={e} value={e}>{e}</option>)}
              {form.estado && !(ESTADOS_VENEZUELA as readonly string[]).includes(form.estado) && <option value={form.estado}>{form.estado}</option>}
            </select>
          </div>
          <div>
            <label htmlFor="perfil-ciudad" className={adminLabel}>Ciudad</label>
            <input id="perfil-ciudad" value={form.ciudad} onChange={(e) => poner('ciudad', e.target.value)} maxLength={80} autoComplete="address-level2" className={adminInput()} placeholder="Ej: Guanare" />
          </div>
        </div>
      </Seccion>

      {/* En el teléfono el botón queda fijo sobre la barra inferior mientras haya cambios */}
      <div className={`${cambios ? 'fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[var(--z-sticky)] rounded-2xl border border-line bg-white p-2 shadow-lg' : 'hidden'} lg:static lg:flex lg:justify-end lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}>
        <button type="submit" disabled={guardando || !cambios} className={`${adminPrimaryButton} w-full lg:w-auto`}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
