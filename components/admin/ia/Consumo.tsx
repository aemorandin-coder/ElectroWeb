import { IconoAdvertencia, IconoCandado, IconoCheck, IconoRechazado } from '@/components/iconos';
import Plegable from '@/components/admin/Plegable';
import { adminBadge, adminCard, adminDato } from '@/lib/admin-ui';
import { ETIQUETA_FALLA, PLANTILLA_IMPORTAR, USOS_IA, infoDeUso, reglaPorId } from '@/lib/ia/reglas';
import Atajadas from './Atajadas';
import { ICONOS_DE_USO } from './iconos';
import { cuando, miles, segundos, usd, type DatosIa } from './tipos';
import { esProveedor, infoProveedor, MOTIVOS_NO_SIRVIO, nombreDelMotor } from '@/lib/ia/proveedores/catalogo';

// C-288 · Lo que gasta cada uso de Claude este mes, los pedidos por día y lo que falló. Todo sale de lo que anota cada pedido
// (modelo, tokens, búsquedas, costo, tiempo y fallas): ni lo que se mandó ni lo que respondió Claude.
// C-298: por prioridad. Lo que gastó cada uso, con los pedidos por día y por proveedor al lado; debajo, las tres listas
// (lo que falló, lo que no sirvió y lo que atajaron las reglas, que estaba en Reglas), plegadas con su cuenta del mes.

export default function Consumo({ datos }: { datos: DatosIa }) {
  const { consumo } = datos;
  const filas = USOS_IA.map((u) => ({ uso: u, fila: consumo.porUso.find((f) => f.uso === u.id) }));
  const topeDia = Math.max(1, ...consumo.porDia.map((d) => d.pedidos));
  const en30 = consumo.porDia.reduce((s, d) => s + d.pedidos, 0);
  const mes = consumo.mes.split(' de ')[0];
  const ultimaFalla = consumo.fallas[0];
  const nombreDelUso = (uso: string) => infoDeUso(uso)?.nombre ?? (uso === 'prueba' ? 'Una prueba desde aquí' : PLANTILLA_IMPORTAR.nombre);
  const celda = 'py-2.5 pr-2 text-right tabular-nums';
  // En una sección angosta (el teléfono, o la computadora con los dos menús al lado) se ocultan los tokens y lo que tarda
  const soloAncho = 'hidden @lg:table-cell';

  return (
    <div className="space-y-4">
      <div className="grid gap-4 @3xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @3xl:items-start">
      {/* @container: las columnas de la tabla se ocultan por el ancho de esta tarjeta, no por el de la pantalla */}
      <section className={`${adminCard} @container`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-base font-semibold text-ink">Lo que gastó cada uso, en {mes}</h4>
          <span className="text-xs text-muted">Precios de Anthropic</span>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-semibold text-muted">
                <th scope="col" className="py-2 pr-2 text-left">Uso</th>
                <th scope="col" className="py-2 pr-2 text-right">Pedidos</th>
                <th scope="col" className={`${soloAncho} py-2 pr-2 text-right`}>Tokens (entra / sale)</th>
                <th scope="col" className="py-2 pr-2 text-right">Costo</th>
                <th scope="col" className={`${soloAncho} py-2 pr-2 text-right`}>Tarda</th>
                <th scope="col" className="py-2 text-right">Fallas</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ uso, fila }) => {
                const Icono = ICONOS_DE_USO[uso.icono];
                return (
                  <tr key={uso.id} className="border-b border-line">
                    <td className="py-2.5 pr-2">
                      <span className="flex items-center gap-2.5 font-medium text-ink">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Icono className="h-3.5 w-3.5" aria-hidden="true" /></span>
                        {uso.nombre}
                      </span>
                    </td>
                    <td className={celda}>{fila?.pedidos ?? 0}</td>
                    <td className={`${celda} ${soloAncho}`}>{fila ? `${miles(fila.entrada)} / ${miles(fila.salida)}` : '—'}</td>
                    <td className={celda}>
                      {usd(fila?.costoUsd ?? 0)}
                      {fila && fila.busquedas > 0 && <span className="block text-xs text-muted">{fila.busquedas} {fila.busquedas === 1 ? 'búsqueda' : 'búsquedas'} web</span>}
                    </td>
                    <td className={`${celda} ${soloAncho}`}>{fila && fila.pedidos > 0 ? segundos(fila.ms) : '—'}</td>
                    <td className="py-2.5 text-right tabular-nums">{fila?.fallas ?? 0}</td>
                  </tr>
                );
              })}
              {consumo.prueba && (
                <tr className="border-b border-line text-muted">
                  <td className="py-2.5 pr-2">Pruebas desde aquí</td>
                  <td className={celda}>{consumo.prueba.pedidos}</td>
                  <td className={`${celda} ${soloAncho}`}>{miles(consumo.prueba.entrada)} / {miles(consumo.prueba.salida)}</td>
                  <td className={celda}>{usd(consumo.prueba.costoUsd)}</td>
                  <td className={`${celda} ${soloAncho}`}>{segundos(consumo.prueba.ms)}</td>
                  <td className="py-2.5 text-right tabular-nums">{consumo.prueba.fallas}</td>
                </tr>
              )}
              <tr className="font-bold text-ink">
                <td className="py-2.5 pr-2">Total</td>
                <td className={celda}>{consumo.total.pedidos}</td>
                <td className={`${celda} ${soloAncho}`} />
                <td className={celda}>{usd(consumo.total.costoUsd)}</td>
                <td className={`${celda} ${soloAncho}`} />
                <td className="py-2.5 text-right tabular-nums">{consumo.total.fallas}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-prose text-xs text-muted">
          &quot;{USOS_IA[0].nombre}&quot; suma las búsquedas de Anthropic ($0,01 cada una). El consumo se registra desde esta versión: antes de ella no hay cifras.
        </p>
      </section>

      <div className="min-w-0 space-y-4">
        <section className={adminCard}>
          <h4 className="text-base font-semibold text-ink">Pedidos por día</h4>
          <div className="mt-3 flex h-24 items-end gap-1" role="img" aria-label={`Pedidos a la IA por día, los últimos 30 días: ${en30} en total`}>
            {consumo.porDia.map((d) => (
              <span
                key={d.dia}
                title={`${d.dia}: ${d.pedidos} ${d.pedidos === 1 ? 'pedido' : 'pedidos'}`}
                style={{ height: `${Math.max(3, Math.round((d.pedidos / topeDia) * 100))}%` }}
                className={`min-w-0 flex-1 rounded-t transition-[height] duration-500 starting:h-0 motion-reduce:transition-none ${d.pedidos > 0 ? 'bg-brand-500' : 'bg-line'}`}
              />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between gap-2 text-xs text-muted">
            <span>hace 29 días</span>
            <span className="text-center">{en30} en 30 días</span>
            <span>hoy</span>
          </div>
        </section>

        {/* C-292: el mes por proveedor */}
        <section className={adminCard}>
          <h4 className="text-base font-semibold text-ink">Por proveedor</h4>
          {consumo.porProveedor.length === 0 ? (
            <p className="mt-1 text-sm text-muted">Todavía no hay pedidos este mes.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {consumo.porProveedor.map((p) => (
                <li key={p.proveedor} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="font-semibold text-ink">{esProveedor(p.proveedor) ? `${infoProveedor(p.proveedor).motor} · ${infoProveedor(p.proveedor).empresa}` : p.proveedor}</span>
                  <span className="text-right text-xs text-ink-soft tabular-nums">
                    {miles(p.pedidos)} {p.pedidos === 1 ? 'pedido' : 'pedidos'} · {usd(p.costoUsd)}{p.fallas > 0 ? ` · ${p.fallas} ${p.fallas === 1 ? 'falla' : 'fallas'}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      </div>

      <div className="space-y-2.5">
        <Plegable
          id="ia-fallas"
          icono={IconoAdvertencia}
          titulo="Lo que falló"
          resumen={ultimaFalla ? `La última: ${nombreDelUso(ultimaFalla.uso)}, ${cuando(ultimaFalla.cuando)}.` : 'Sin fallas registradas.'}
          extra={consumo.total.fallas > 0 ? <span className={adminBadge('warning')}>{consumo.total.fallas} en {mes}</span> : <span className={adminDato}>0 en {mes}</span>}
        >
          {consumo.fallas.length === 0 ? (
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success-strong text-white"><IconoCheck className="h-[18px] w-[18px]" aria-hidden="true" /></span>
              <div>
                <p className="text-sm font-semibold text-ink">Sin fallas registradas</p>
                <p className="text-xs text-muted">Aquí sale cada falla, con el uso, la hora y qué pasó.</p>
              </div>
            </div>
          ) : (
            <ul>
              {consumo.fallas.map((f) => {
                // Una regla rota dos veces dice cuál: con su nombre, no con su id
                const detalle = f.falla === 'regla'
                  ? [ETIQUETA_FALLA.regla, reglaPorId(f.detalle ?? '')?.texto ?? f.detalle]
                  : [ETIQUETA_FALLA[f.falla] ?? f.falla, f.detalle, f.reintento ? 'al repetirlo' : null];
                return (
                  <li key={f.id} className="flex items-start gap-3 border-t border-line py-3 first:border-t-0 first:pt-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-muted"><IconoAdvertencia className="h-4 w-4" aria-hidden="true" /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{nombreDelUso(f.uso)} · {cuando(f.cuando)}</p>
                      <p className="text-xs text-muted">
                        {f.proveedor === 'groq' ? 'Groq: ' : ''}{detalle.filter(Boolean).join(' · ')}
                        {f.siguioGroq === true && '. Siguió Groq.'}
                        {f.siguioGroq === false && '. Groq no tomó el relevo.'}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Plegable>

        <Plegable
          id="ia-no-sirvio"
          icono={IconoRechazado}
          titulo="Lo que no sirvió"
          resumen="Lo que el equipo marcó en cada resultado, con el motivo."
          extra={<span className={adminDato}>{consumo.noSirvio.totalMes} en {mes}</span>}
        >
          {consumo.noSirvio.ultimos.length === 0 ? (
            <p className="text-sm text-muted">Nada marcado todavía. Cada resultado de la IA tiene &quot;No sirvió&quot;.</p>
          ) : (
            <ul className="divide-y divide-line">
              {consumo.noSirvio.ultimos.map((n) => {
                const [motivo, ...detalle] = n.motivo.split(': ');
                return (
                  <li key={n.id} className="py-2 text-sm first:pt-0">
                    <span className="font-semibold text-ink">{infoDeUso(n.uso)?.nombre ?? n.uso}</span>
                    <span className="text-ink-soft"> · {MOTIVOS_NO_SIRVIO.find((m) => m.id === motivo)?.texto ?? motivo}{detalle.length ? `: ${detalle.join(': ')}` : ''}</span>
                    <span className="block text-xs text-muted">{esProveedor(n.proveedor) ? nombreDelMotor(n.proveedor, n.modelo) : `${n.proveedor} · ${n.modelo}`} · {cuando(n.cuando)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Plegable>

        <Plegable
          id="ia-atajadas"
          icono={IconoCandado}
          titulo="Lo que atajaron las reglas"
          resumen="Cada vez que una regla cambió o frenó una respuesta, con lo que traía."
          extra={<span className={adminDato}>{consumo.atajadas.totalMes} en {mes}</span>}
        >
          <div className="max-h-[32rem] overflow-y-auto">
            <Atajadas atajadas={consumo.atajadas.ultimas} />
          </div>
        </Plegable>
      </div>
    </div>
  );
}
