'use client';

import { useState } from 'react';
import { IconoActualizar, IconoCelular, IconoLaptop, IconoGarantia, IconoLlave } from '@/components/iconos';
import { adminBadge, adminCard, adminIconChip, adminLabel, adminPrimaryButton, adminSecondaryButton, adminSectionTitle } from '@/lib/admin-ui';
import Trabado from '@/components/admin/dos-pasos/Trabado';
import { CaminoDeEntrada, CampoNumero } from './piezas';

// C-290: Mi seguridad con la verificación ya activa: cómo es cada entrada (dibujado), las llaves de repuesto que quedan y
// qué hacer si cambia de teléfono, con a quién escribir (skill herramientas-claras, reglas 3 y 9).

export interface Dispositivo {
  id: string;
  dispositivo: string;
  createdAt: string;
  ultimoUsoAt: string | null;
  venceAt: string;
  actual: boolean;
}

const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'short' });
const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'long', year: 'numeric' });

export default function Activa({ activadoAt, llavesRestantes, dispositivos, esSuperAdmin, ocupado, error, onRegenerar, onQuitar, onLimpiarError }: {
  activadoAt: string | null;
  llavesRestantes: number;
  dispositivos: Dispositivo[];
  /** null: todos */
  onQuitar: (id: string | null) => Promise<boolean>;
  esSuperAdmin: boolean;
  ocupado: boolean;
  error: string;
  onRegenerar: (codigo: string) => Promise<boolean>;
  onLimpiarError: () => void;
}) {
  const [regenerando, setRegenerando] = useState(false);
  const [codigo, setCodigo] = useState('');
  const pocas = llavesRestantes <= 2;

  const regenerar = async () => {
    if (await onRegenerar(codigo)) {
      setCodigo('');
      setRegenerando(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className={adminCard} aria-labelledby="titulo-activa">
        <div className="flex items-start gap-4">
          <span className={adminIconChip('success')}><IconoGarantia className="h-5 w-5" aria-hidden="true" /></span>
          <div className="min-w-0">
            <h2 id="titulo-activa" className={adminSectionTitle}>Tu cuenta está protegida</h2>
            <p className="mt-1 text-sm text-muted">{activadoAt ? `Desde el ${fecha(activadoAt)}. ` : ''}Así entras cada vez:</p>
          </div>
        </div>
        <CaminoDeEntrada className="mt-4" />
      </section>

      <section className={adminCard} aria-labelledby="titulo-dispositivos">
        <div className="flex items-start gap-4">
          <span className={adminIconChip('neutral')}><IconoLaptop className="h-5 w-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <h2 id="titulo-dispositivos" className={adminSectionTitle}>Dispositivos de confianza</h2>
            <p className="mt-1 text-sm text-muted">
              {dispositivos.length === 0
                ? 'Ninguno. Al entrar, marca «No pedir el número por 30 días» en tu computadora.'
                : 'En estos no te pedimos el número por 30 días. La contraseña, sí.'}
            </p>
            {dispositivos.length > 0 && (
              <>
                <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
                  {dispositivos.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                          {d.dispositivo}
                          {d.actual && <span className={adminBadge('brand')}>Este</span>}
                        </span>
                        <span className="block text-xs text-muted">
                          Desde el {fechaCorta(d.createdAt)}{d.ultimoUsoAt ? ` · usado el ${fechaCorta(d.ultimoUsoAt)}` : ''} · hasta el {fechaCorta(d.venceAt)}
                        </span>
                      </span>
                      <button type="button" onClick={() => void onQuitar(d.id)} disabled={ocupado} className={`${adminSecondaryButton} shrink-0`}>Quitar</button>
                    </li>
                  ))}
                </ul>
                {dispositivos.length > 1 && (
                  <button type="button" onClick={() => void onQuitar(null)} disabled={ocupado} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-deal hover:underline">
                    Quitar todos
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <section className={adminCard} aria-labelledby="titulo-llaves">
        <div className="flex items-start gap-4">
          <span className={adminIconChip(pocas ? 'warning' : 'neutral')}><IconoLlave className="h-5 w-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <h2 id="titulo-llaves" className={adminSectionTitle}>Llaves de repuesto</h2>
            <p className="mt-1 text-sm text-muted">
              {llavesRestantes === 0 ? 'No te queda ninguna.' : llavesRestantes === 1 ? 'Te queda 1.' : `Te quedan ${llavesRestantes}.`}
              {' '}Cada una abre una vez si no tienes el teléfono.
            </p>
            {regenerando ? (
              <form className="mt-4 space-y-2" onSubmit={(e) => { e.preventDefault(); void regenerar(); }} noValidate>
                <label htmlFor="codigo-regenerar" className={adminLabel}>El número de tu app</label>
                <CampoNumero id="codigo-regenerar" valor={codigo} onChange={(v) => { setCodigo(v); onLimpiarError(); }} deshabilitado={ocupado} invalido={Boolean(error)} />
                {error && <p className="text-sm font-semibold text-deal" role="alert">{error}</p>}
                <p className="text-sm text-muted">Las llaves de antes dejan de servir.</p>
                <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                  <button type="submit" disabled={ocupado} className={adminPrimaryButton}>Crear llaves nuevas</button>
                  <button type="button" onClick={() => { setRegenerando(false); setCodigo(''); onLimpiarError(); }} className={adminSecondaryButton}>Cancelar</button>
                </div>
              </form>
            ) : (
              <button type="button" onClick={() => setRegenerando(true)} className={`${pocas ? adminPrimaryButton : adminSecondaryButton} mt-4`}>
                <IconoActualizar className="h-4 w-4" aria-hidden="true" />
                Crear llaves nuevas
              </button>
            )}
          </div>
        </div>
      </section>

      <section className={adminCard} aria-labelledby="titulo-telefono">
        <div className="flex items-start gap-4">
          <span className={adminIconChip('neutral')}><IconoCelular className="h-5 w-5" aria-hidden="true" /></span>
          <div className="min-w-0">
            <h2 id="titulo-telefono" className={adminSectionTitle}>¿Cambiaste de teléfono?</h2>
            <p className="mt-1 text-sm text-muted">
              {esSuperAdmin
                ? 'Otro super admin reinicia tus dos pasos desde Equipo. Si eres el único, se hace desde el servidor.'
                : 'El dueño reinicia tus dos pasos desde Equipo y los activas otra vez aquí.'}
            </p>
            {!esSuperAdmin && <Trabado mensaje="Hola, cambié de teléfono y necesito que reinicien mis dos pasos del panel." texto="Pedirlo por WhatsApp" />}
          </div>
        </div>
      </section>
    </div>
  );
}
