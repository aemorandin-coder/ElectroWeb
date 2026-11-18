'use client';

import { useState } from 'react';
import { IconoAdvertencia, IconoAyuda, IconoCandado, IconoChip, IconoClave, IconoLista, IconoReportes } from '@/components/iconos';
import Plegable, { abrirPlegable } from '@/components/admin/Plegable';
import { adminBadge, adminDato, adminNotice, adminPrimaryButton, adminSecondaryButton, adminSpinner } from '@/lib/admin-ui';
import { PROVEEDORES } from '@/lib/ia/proveedores/catalogo';
import { REGLAS_IA, USOS_IA, type UsoIa } from '@/lib/ia/reglas';
import Consumo from './Consumo';
import EditarInstrucciones from './EditarInstrucciones';
import Estado from './Estado';
import Guia from './Guia';
import Motor from './Motor';
import Proveedores from './Proveedores';
import Reglas from './Reglas';
import Usos from './Usos';
import { claveDe, miles, usd } from './tipos';
import { useIa } from './useIa';

// C-288 · Configuración → IA · Claude (la variante B que eligió el equipo el 17/11: una sección más del menú de Configuración, con los
// bloques uno debajo del otro). Tiene sus propios guardados (no usa la barra de guardado de Configuración).
// C-292 · Ajustes → IA: la IA es de la tienda, no de un proveedor. El motor (quién responde, el modelo y el respaldo) y
// "Proveedores y claves" (Claude, Gemini, Grok y Groq) van aparte; cada uso puede tener el suyo.
// C-298 · Por prioridad (el equipo, 18/11: "priorizar motores y métricas arriba … trabajar con items colapsables"):
// el estado con las cifras del mes, El motor y Consumo abiertos; Proveedores, Usos, Reglas y Guía plegados, cada uno con lo
// esencial en su cabecera. Adentro, los proveedores, los usos y las listas largas también se pliegan.

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

  const { consumo } = datos;
  const mes = consumo.mes.split(' de ')[0];
  const conClave = PROVEEDORES.filter((p) => claveDe(datos, p.id).hay).length;
  const delEquipo = datos.usos.filter((u) => u.delEquipo).length;
  const propios = Object.keys(datos.porUso).length;
  const fallas = consumo.total.fallas;
  const sello = (n: number, una: string, varias: string) => <span className={adminBadge('warning')}>{n} {n === 1 ? una : varias}</span>;

  return (
    <>
      {/* El ancho de la sección decide las columnas (@container). El cajón va fuera: un contenedor con layout encierra a lo que es fixed */}
      <div className="@container space-y-4">
        <Estado datos={datos} />

        {datos.clave.claveRota && (
          <div className={`${adminNotice('warning')} flex flex-wrap items-center gap-3`} role="alert">
            <IconoAdvertencia aria-hidden="true" />
            <span className="min-w-0 flex-1"><b>La clave de Claude que se guardó en el panel no se pudo leer.</b> {datos.clave.hay ? 'Sigue con la del servidor.' : 'Claude está sin clave.'} Pégala otra vez en &quot;Proveedores y claves&quot;.</span>
            <a href="#ia-proveedores" onClick={(e) => { e.preventDefault(); abrirPlegable('ia-proveedores'); }} className={`${adminPrimaryButton} h-9! px-3! text-[13px]`}>Ir a Proveedores y claves</a>
          </div>
        )}

        <Plegable id="ia-motor" nivel="bloque" abierto icono={IconoChip} titulo="El motor" resumen="Quién responde en todo el panel y quién lo cubre si falla.">
          {/* Con cada guardado cambia la versión: el formulario vuelve a empezar con lo que quedó publicado */}
          <Motor key={`${datos.updatedAt ?? 'sin-guardar'}-${datos.proveedores.map((p) => `${p.hay}${p.modelo}`).join('')}`} datos={datos} alGuardar={recargar} />
        </Plegable>

        <Plegable
          id="ia-consumo"
          nivel="bloque"
          abierto
          icono={IconoReportes}
          titulo="Consumo y fallas"
          resumen={`${usd(consumo.total.costoUsd)} en ${mes}, en ${miles(consumo.total.pedidos)} ${consumo.total.pedidos === 1 ? 'pedido' : 'pedidos'}.`}
          extra={fallas > 0 ? sello(fallas, 'falla', 'fallas') : <span className={adminDato}>Sin fallas</span>}
        >
          <Consumo datos={datos} />
        </Plegable>

        <Plegable
          id="ia-proveedores"
          nivel="bloque"
          icono={IconoClave}
          titulo="Proveedores y claves"
          resumen="Claude, Gemini, Grok y Groq: la clave de cada uno, cifrada."
          extra={conClave === 0 ? <span className={adminBadge('warning')}>Sin claves</span> : <span className={adminDato}>{conClave} de {PROVEEDORES.length} con clave</span>}
        >
          <Proveedores datos={datos} alGuardar={recargar} />
        </Plegable>

        <Plegable
          id="ia-usos"
          nivel="bloque"
          icono={IconoLista}
          titulo="Los usos de la IA"
          resumen="Dónde trabaja en el panel, con sus instrucciones y su motor."
          extra={(
            <>
              <span className={adminDato}>{USOS_IA.length} usos</span>
              {delEquipo > 0 && <span className={adminDato}>{delEquipo} con instrucciones del equipo</span>}
              {propios > 0 && <span className={adminDato}>{propios} con su motor</span>}
            </>
          )}
        >
          <Usos datos={datos} onEditar={(uso, paso) => setEditando({ uso, paso })} alGuardar={recargar} />
        </Plegable>

        <Plegable
          id="ia-reglas"
          nivel="bloque"
          icono={IconoCandado}
          titulo="Reglas"
          resumen="Lo que la tienda comprueba en cada respuesta, antes de publicarla."
          extra={<span className={adminDato}>{REGLAS_IA.length} reglas · {datos.frases.lista.length} frases</span>}
        >
          <Reglas datos={datos} alGuardar={recargar} />
        </Plegable>

        <Plegable id="ia-guia" nivel="bloque" icono={IconoAyuda} titulo="Guía" resumen="Cómo pedirle las cosas a la IA para que acierte.">
          <Guia />
        </Plegable>
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
