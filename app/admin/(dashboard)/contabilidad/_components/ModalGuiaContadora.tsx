'use client';

import { useState } from 'react';
import { SiAppstore, SiGoogleplay } from 'react-icons/si';
import { APPS_DE_CODIGOS, type IdApp } from '@/components/admin/dos-pasos/apps';
import TelefonoDibujado from '@/components/admin/dos-pasos/TelefonoDibujado';
import Trabado from '@/components/admin/dos-pasos/Trabado';
import {
  IconoAyuda, IconoBillete, IconoCalendario, IconoCandado, IconoCerrar, IconoCheck, IconoCuadricula, IconoDescargar, IconoDocumento,
  IconoLlave, IconoReportes,
} from '@/components/iconos';
import ModalDialog from '@/components/ui/ModalDialog';
import {
  adminBadge, adminIconButton, adminNotice, adminPrimaryButton, adminTab, adminTabList, adminTabScroll,
} from '@/lib/admin-ui';

type TabGuia = 'entrada' | 'pestanas' | 'rutina';

const CASILLAS_99030 = [
  { bloque: 'Ventas', casilla: '40', detalle: 'Ventas internas exentas o no sujetas (renglones con (E)).' },
  { bloque: 'Ventas', casilla: '42 / 43', detalle: 'Base imponible ventas gravadas 16 % (42) y Débito Fiscal 16 % (43 / 49).' },
  { bloque: 'Compras', casilla: '30', detalle: 'Compras internas exentas o sin derecho a crédito fiscal.' },
  { bloque: 'Compras', casilla: '33 / 34', detalle: 'Base imponible compras gravadas 16 % (33) y Crédito Fiscal 16 % (34 / 36).' },
  { bloque: 'Liquidación', casilla: '20', detalle: 'Excedente de crédito fiscal del mes anterior.' },
  { bloque: 'Liquidación', casilla: '39', detalle: 'Total Crédito Fiscal deducible del período.' },
  { bloque: 'Retenciones', casilla: '66 / 55', detalle: 'Retenciones de IVA recibidas (75 % o 100 %) cargadas en Facturación.' },
  { bloque: 'Resultado', casilla: '60 · 90', detalle: '60: Excedente próximo mes · 90: Total IVA a pagar en planilla.' },
];

export default function ModalGuiaContadora({
  abierta,
  onCerrar,
  esDueno,
}: {
  abierta: boolean;
  onCerrar: () => void;
  esDueno: boolean;
}) {
  const [tab, setTab] = useState<TabGuia>('entrada');
  const [appId, setAppId] = useState<IdApp>('google');
  const app = APPS_DE_CODIGOS.find((a) => a.id === appId) ?? APPS_DE_CODIGOS[0];

  return (
    <ModalDialog open={abierta} onClose={onCerrar} ariaLabelledBy="guia-contadora-titulo" size="4xl">
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <IconoAyuda className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 id="guia-contadora-titulo" className="text-lg font-bold text-ink">
              Guía rápida de Contabilidad
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            {esDueno
              ? 'Vista y guía oficial en PDF lista para compartir por WhatsApp con la contadora.'
              : 'Tu paso a paso para entrar con dos pasos, usar tus 4 pestañas y cerrar el mes.'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href="/api/admin/contabilidad/guia-pdf?descargar=1"
            className={adminPrimaryButton}
          >
            <IconoDescargar className="h-4 w-4" aria-hidden="true" />
            <span>Descargar PDF (3 págs.)</span>
          </a>
          <button type="button" onClick={onCerrar} className={adminIconButton} aria-label="Cerrar guía">
            <IconoCerrar className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4">
        <div className={adminTabScroll}>
          <nav className={adminTabList} aria-label="Temas de la guía" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'entrada'} onClick={() => setTab('entrada')} className={adminTab(tab === 'entrada')}>
              <IconoCandado className="h-4 w-4" aria-hidden="true" />
              <span>Cómo entrar (2 pasos)</span>
            </button>
            <button type="button" role="tab" aria-selected={tab === 'pestanas'} onClick={() => setTab('pestanas')} className={adminTab(tab === 'pestanas')}>
              <IconoCuadricula className="h-4 w-4" aria-hidden="true" />
              <span>Tus 4 pestañas</span>
            </button>
            <button type="button" role="tab" aria-selected={tab === 'rutina'} onClick={() => setTab('rutina')} className={adminTab(tab === 'rutina')}>
              <IconoCalendario className="h-4 w-4" aria-hidden="true" />
              <span>Rutina y Forma 99030</span>
            </button>
          </nav>
        </div>

        {tab === 'entrada' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-sm font-semibold text-ink">1. Elige una app gratis de códigos para tu teléfono</p>
              <p className="mt-1 text-xs text-muted">
                Da un número nuevo de 6 cifras cada 30 segundos para proteger tu cuenta. Toca una opción para ver cómo conectarla:
              </p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                {APPS_DE_CODIGOS.map((item) => {
                  const Logo = item.logo;
                  const activa = item.id === app.id;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-3 transition-colors ${activa ? 'border-brand-500 bg-white shadow-sm' : 'border-line bg-white/70'}`}
                    >
                      <button
                        type="button"
                        onClick={() => setAppId(item.id)}
                        className="flex w-full items-center gap-2.5 text-left"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                          <Logo className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink">{item.nombre}</span>
                          <span className="block text-xs text-muted">{item.nota}</span>
                        </span>
                      </button>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <a href={item.play} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-ink hover:border-brand-300">
                          <SiGoogleplay className="h-3.5 w-3.5" aria-hidden="true" /> Play Store
                        </a>
                        <a href={item.appStore} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-ink hover:border-brand-300">
                          <SiAppstore className="h-3.5 w-3.5" aria-hidden="true" /> App Store
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex items-center gap-4 rounded-xl border border-line bg-white p-4">
                <TelefonoDibujado app={app} modo="agregar" />
                <div className="space-y-1.5 text-sm">
                  <p className="font-semibold text-ink">2. Agrega Electro Shop en tu app</p>
                  <p className="text-xs text-muted">Al entrar al enlace de invitación y crear tu contraseña, <strong>Mi seguridad</strong> te muestra el código QR:</p>
                  <ol className="list-decimal space-y-1 pl-4 text-xs text-ink">
                    {app.agregar.map((paso) => (
                      <li key={paso}>{paso}</li>
                    ))}
                  </ol>
                  <p className="text-xs text-muted">Si estás configurando desde el mismo teléfono, toca <strong>&ldquo;Abrir en la app&rdquo;</strong>.</p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-line bg-white p-4">
                <TelefonoDibujado app={app} modo="numero" />
                <div className="space-y-1.5 text-sm">
                  <p className="font-semibold text-ink">3. Escribe el número de 6 cifras</p>
                  <p className="text-xs text-muted">
                    Copia las 6 cifras antes de que cambie el círculo de 30 segundos.
                  </p>
                  <p className="text-xs text-muted">
                    En tu computadora de oficina puedes marcar <strong>&ldquo;No pedir el número en esta computadora por 30 días&rdquo;</strong> (la contraseña sí se pide siempre).
                  </p>
                </div>
              </div>
            </div>

            <div className={`flex items-start gap-3 ${adminNotice('warning')}`}>
              <IconoLlave aria-hidden="true" />
              <div className="min-w-0 flex-1 space-y-1 text-sm">
                <p className="font-semibold text-ink">Guarda tus llaves de repuesto fuera del teléfono</p>
                <p className="text-xs text-muted">
                  Si un día no tienes el celular cerca, usa <strong>&ldquo;¿Sin el teléfono? Usa una llave de repuesto&rdquo;</strong> al entrar. Si cambias o pierdes el teléfono, avísanos por WhatsApp para reiniciar tu acceso:
                </p>
                <Trabado mensaje="Hola, necesito ayuda para entrar a Contabilidad en Electro Shop." />
              </div>
            </div>
          </div>
        )}

        {tab === 'pestanas' && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-white p-4">
                <div className="flex items-center gap-2">
                  <IconoCuadricula className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-ink">1. Resumen y Cierre</h3>
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted">
                  <li>Ver el IVA estimado del mes y cambiar de período arriba.</li>
                  <li>Actualizar obligaciones (Alcaldía, IVA, Alquiler, Pensiones 9 %, nómina) y subir planilla y comprobante de pago.</li>
                  <li>Dibuja tu firma + C.P.C. una sola vez, escribe notas del mes, baja el <strong>Paquete Excel (.xlsx)</strong> de 5 hojas y cierra el mes con candado.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-line bg-white p-4">
                <div className="flex items-center gap-2">
                  <IconoDocumento className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-ink">2. Facturación</h3>
                  <span className={adminBadge('neutral')}>Solo lectura + Retenciones</span>
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted">
                  <li>Consultar facturas emitidas, Notas de Crédito, Notas de Débito y anuladas con tasa BCV del día y PDF.</li>
                  <li>Registrar <strong>retenciones de IVA (75 % o 100 %)</strong> recibidas de clientes con comprobante, fecha, monto en Bs. y foto o PDF.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-line bg-white p-4">
                <div className="flex items-center gap-2">
                  <IconoReportes className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-ink">3. Libros e IVA</h3>
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted">
                  <li><strong>Libro de ventas:</strong> tabla oficial en Excel e impresión apaisada.</li>
                  <li><strong>Compras y gastos:</strong> cargar facturas con foto/PDF privado y aprobar u observar las que subió el equipo.</li>
                  <li><strong>Hoja Forma 99030:</strong> casillas exactas del SENIAT para cargar excedente, declarar y subir planilla.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-line bg-white p-4">
                <div className="flex items-center gap-2">
                  <IconoBillete className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-ink">4. Movimientos</h3>
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted">
                  <li>Conciliar cobros web por método de pago (Pago Móvil, transferencia, Zelle, Binance, efectivo) y comisiones.</li>
                  <li>Consultar movimientos de <strong>Puntos ES</strong> y canjes de <strong>Gift Cards</strong> del mes.</li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-sm font-semibold text-ink">Qué NO te toca hacer (bloqueado por seguridad)</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-muted">
                <li>No emites ni anulas facturas, Notas de Crédito/Débito ni cargas talonarios.</li>
                <li>No ves Ajustes de contabilidad, Pedidos, Productos, Costos ni Márgenes (tu menú solo muestra Contabilidad, Mi seguridad y Versiones).</li>
                <li>Un mes cerrado con candado no se edita sola: si hace falta corregir algo luego, pídele a Andrés que reabra el período.</li>
              </ul>
            </div>
          </div>
        )}

        {tab === 'rutina' && (
          <div className="space-y-4">
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                '1. Selecciona el mes que vas a cerrar arriba a la derecha.',
                '2. Revisa Compras y gastos (aprueba u observa y sube faltantes).',
                '3. Registra retenciones de IVA recibidas en Facturación.',
                '4. Abre Hoja Forma 99030 y transcribe casillas al SENIAT.',
                '5. Sube planilla y comprobante de pago en IVA y Obligaciones.',
                '6. Descarga el Paquete Excel (.xlsx) y cierra con tu firma.',
              ].map((paso) => (
                <div key={paso} className="flex items-start gap-2 rounded-xl border border-line bg-white p-3 text-xs text-ink">
                  <IconoCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                  <span>{paso}</span>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-xl border border-line bg-white">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-surface text-ink">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Bloque</th>
                    <th className="px-3 py-2 font-semibold">Casilla SENIAT</th>
                    <th className="px-3 py-2 font-semibold">Dato en Electro Shop (Forma 99030)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {CASILLAS_99030.map((fila) => (
                    <tr key={fila.casilla}>
                      <td className="px-3 py-2 font-semibold text-ink">{fila.bloque}</td>
                      <td className="px-3 py-2 font-mono font-bold text-brand-700">{fila.casilla}</td>
                      <td className="px-3 py-2 text-muted">{fila.detalle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ModalDialog>
  );
}
