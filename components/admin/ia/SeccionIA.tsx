'use client';

import { useState, type ReactNode } from 'react';
import { IconoAdvertencia, IconoAjustes, IconoAyuda, IconoCandado, IconoClave, IconoLista, IconoReportes, type IconType } from '@/components/iconos';
import { adminNotice, adminPrimaryButton, adminSecondaryButton, adminSpinner } from '@/lib/admin-ui';
import type { UsoIa } from '@/lib/ia/reglas';
import Consumo from './Consumo';
import EditarInstrucciones from './EditarInstrucciones';
import Estado from './Estado';
import Guia from './Guia';
import Motor from './Motor';
import Proveedores from './Proveedores';
import Reglas from './Reglas';
import Usos from './Usos';
import { useIa } from './useIa';

// C-288 · Configuración → IA · Claude (la variante B que eligió el equipo el 17/11: una sección más del menú de Configuración, con los
// bloques uno debajo del otro). El estado, los usos de Claude, las reglas, lo que consume y lo que falla, el motor con su clave y la
// guía. Tiene sus propios guardados (no usa la barra de guardado de Configuración).
// C-292 · Ajustes → IA: la IA es de la tienda, no de un proveedor. El motor (quién responde, el modelo y el respaldo) y
// "Proveedores y claves" (Claude, Gemini, Grok y Groq) van aparte; cada uso puede tener el suyo.

function Bloque({ id, icono: Icono, titulo, children }: { id: string; icono: IconType; titulo: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="scroll-mt-24">
      <h3 id={`${id}-titulo`} className="mb-3 flex items-center gap-2 text-lg font-semibold text-ink">
        <Icono className="h-[18px] w-[18px] text-brand-600" aria-hidden="true" />{titulo}
      </h3>
      {children}
    </section>
  );
}

export default function SeccionIA() {
  const { datos, error, recargar } = useIa();
  const [editando, setEditando] = useState<{ uso: UsoIa; paso: number } | null>(null);

  if (!datos) {
    return error ? (
      <div className="space-y-3">
        <div className={adminNotice('danger')} role="alert">{error}</div>
        <button type="button" onClick={() => void recargar()} className={adminSecondaryButton}>Reintentar</button>
      </div>
    ) : (
      <div className="flex justify-center py-16"><div className={adminSpinner} role="status" aria-label="Cargando" /></div>
    );
  }

  return (
    <>
      {/* El ancho de la sección decide las columnas (@container). El cajón va fuera: un contenedor con layout encierra a lo que es fixed */}
      <div className="@container space-y-8">
      <Estado datos={datos} />

      {datos.clave.claveRota && (
        <div className={`${adminNotice('warning')} flex flex-wrap items-center gap-3`} role="alert">
          <IconoAdvertencia aria-hidden="true" />
          <span className="min-w-0 flex-1"><b>La clave de Claude que se guardó en el panel no se pudo leer.</b> {datos.clave.hay ? 'Sigue con la del servidor.' : 'Claude está sin clave.'} Pégala otra vez en &quot;Proveedores y claves&quot;.</span>
          <a href="#ia-proveedores" className={`${adminPrimaryButton} h-9! px-3! text-[13px]`}>Ir a Proveedores y claves</a>
        </div>
      )}

      <Bloque id="ia-usos" icono={IconoLista} titulo="Los usos de la IA">
        <Usos datos={datos} onEditar={(uso, paso) => setEditando({ uso, paso })} alGuardar={recargar} />
      </Bloque>

      <Bloque id="ia-reglas" icono={IconoCandado} titulo="Reglas">
        <Reglas datos={datos} alGuardar={recargar} />
      </Bloque>

      <Bloque id="ia-consumo" icono={IconoReportes} titulo="Consumo y fallas">
        <Consumo datos={datos} />
      </Bloque>

      <Bloque id="ia-motor" icono={IconoAjustes} titulo="El motor">
        {/* Con cada guardado cambia la versión: el formulario vuelve a empezar con lo que quedó publicado */}
        <Motor key={`${datos.updatedAt ?? 'sin-guardar'}-${datos.proveedores.map((p) => `${p.hay}${p.modelo}`).join('')}`} datos={datos} alGuardar={recargar} />
      </Bloque>
      <Bloque id="ia-proveedores" icono={IconoClave} titulo="Proveedores y claves">
        <Proveedores datos={datos} alGuardar={recargar} />
      </Bloque>

      <Bloque id="ia-guia" icono={IconoAyuda} titulo="Guía">
        <Guia />
      </Bloque>
      </div>

      {editando && (
        <EditarInstrucciones
          key={editando.uso}
          uso={editando.uso}
          datos={datos}
          pasoInicial={editando.paso}
          alCerrar={() => setEditando(null)}
          alPublicar={recargar}
        />
      )}
    </>
  );
}
