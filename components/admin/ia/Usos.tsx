import { IconoAyuda, IconoCandado, IconoChevronDerecha, IconoEditar, IconoPlay } from '@/components/iconos';
import { adminBadge, adminDato, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { infoModelo } from '@/lib/ia/precios';
import { PLANTILLA_IMPORTAR, reglasDe, USOS_IA, type UsoIa } from '@/lib/ia/reglas';
import { ICONOS_DE_USO } from './iconos';
import { usd, type DatosIa } from './tipos';

// C-288 · Los usos de Claude: una tarjeta por uso, con dónde está, qué hace, lo que consumió este mes, cuántas reglas tiene y
// si falla. "Instrucciones" y "Probar" abren el cajón por pasos. La plantilla de Importar con claude.ai va aparte: no usa la
// clave del panel, así que solo se ven sus reglas al importar.

const botonChico = 'h-9! px-3! text-[13px]';

export default function Usos({ datos, onEditar }: { datos: DatosIa; onEditar: (uso: UsoIa, paso: 0 | 2) => void }) {
  const modelo = infoModelo(datos.motor.modelo)?.corto ?? datos.motor.modelo;
  return (
    <div className="grid gap-3.5 @xl:grid-cols-2">
      {USOS_IA.map((uso) => {
        const Icono = ICONOS_DE_USO[uso.icono];
        const delServidor = datos.usos.find((u) => u.id === uso.id);
        const fila = datos.consumo.porUso.find((f) => f.uso === uso.id);
        const fallas = fila?.fallas ?? 0;
        return (
          <article key={uso.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-brand-200">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
                <Icono className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h4 className="text-[15px] font-semibold text-ink">{uso.nombre}</h4>
                <p className="mt-0.5 flex items-start gap-1 text-xs text-muted">
                  <IconoChevronDerecha className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{uso.donde}</span>
                </p>
              </div>
            </div>
            <p className="text-sm text-ink-soft">{uso.hace}</p>
            <div className="flex flex-wrap gap-1.5">
              <span className={adminDato}>{modelo} · el del panel</span>
              <span className={adminDato}>{fila ? `${fila.pedidos} ${fila.pedidos === 1 ? 'pedido' : 'pedidos'} · ${usd(fila.costoUsd)}` : 'Sin pedidos este mes'}</span>
              <span className={adminDato}><IconoCandado className="h-3 w-3" aria-hidden="true" />{reglasDe(uso.id).length} reglas</span>
              {fallas > 0 ? <span className={adminBadge('warning')}>{fallas} {fallas === 1 ? 'falla' : 'fallas'}</span> : <span className={adminDato}>Sin fallas</span>}
              {delServidor?.delEquipo ? <span className={adminBadge('brand')}>Instrucciones del equipo</span> : <span className={adminDato}>Instrucciones de fábrica</span>}
            </div>
            <div className="mt-auto flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={() => onEditar(uso.id, 0)} className={`${adminPrimaryButton} ${botonChico}`}>
                <IconoEditar className="h-4 w-4" aria-hidden="true" />Instrucciones
              </button>
              <button type="button" onClick={() => onEditar(uso.id, 2)} className={`${adminSecondaryButton} ${botonChico}`}>
                <IconoPlay className="h-4 w-4" aria-hidden="true" />Probar
              </button>
            </div>
          </article>
        );
      })}

      <article className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600">
            <ICONOS_DE_USO.IconoSubir className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h4 className="text-[15px] font-semibold text-ink">{PLANTILLA_IMPORTAR.nombre}</h4>
            <p className="mt-0.5 flex items-start gap-1 text-xs text-muted">
              <IconoChevronDerecha className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{PLANTILLA_IMPORTAR.donde}</span>
            </p>
          </div>
        </div>
        <p className="text-sm text-ink-soft">{PLANTILLA_IMPORTAR.hace}</p>
        <div className="flex flex-wrap gap-1.5">
          <span className={adminDato}>claude.ai · tu cuenta</span>
          <span className={adminDato}><IconoCandado className="h-3 w-3" aria-hidden="true" />{reglasDe('plantilla').length} reglas al importar</span>
        </div>
        <div className="mt-auto pt-1">
          <a href="#ia-guia" className={`${adminSecondaryButton} ${botonChico}`}>
            <IconoAyuda className="h-4 w-4" aria-hidden="true" />Cómo usarla
          </a>
        </div>
      </article>
    </div>
  );
}
