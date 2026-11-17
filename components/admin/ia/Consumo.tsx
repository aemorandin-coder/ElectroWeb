import { IconoAdvertencia, IconoCheck } from '@/components/iconos';
import { adminCard } from '@/lib/admin-ui';
import { ETIQUETA_FALLA, PLANTILLA_IMPORTAR, USOS_IA, infoDeUso } from '@/lib/ia/reglas';
import { ICONOS_DE_USO } from './iconos';
import { cuando, miles, segundos, usd, type DatosIa } from './tipos';

// C-288 · Lo que gasta cada uso de Claude este mes, los pedidos por día y lo que falló. Todo sale de lo que anota cada pedido
// (modelo, tokens, búsquedas, costo, tiempo y fallas): ni lo que se mandó ni lo que respondió Claude.

export default function Consumo({ datos }: { datos: DatosIa }) {
  const { consumo } = datos;
  const filas = USOS_IA.map((u) => ({ uso: u, fila: consumo.porUso.find((f) => f.uso === u.id) }));
  const topeDia = Math.max(1, ...consumo.porDia.map((d) => d.pedidos));
  const en30 = consumo.porDia.reduce((s, d) => s + d.pedidos, 0);
  const celda = 'py-2.5 pr-2 text-right tabular-nums';

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-start">
        <div className="min-w-0 space-y-4">
          <section className={adminCard}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-base font-semibold text-ink">Lo que gastó cada uso, en {consumo.mes.split(' de ')[0]}</h4>
              <span className="text-xs text-muted">Precios de Anthropic</span>
            </div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-xs font-semibold text-muted">
                    <th scope="col" className="py-2 pr-2 text-left">Uso</th>
                    <th scope="col" className="py-2 pr-2 text-right">Pedidos</th>
                    <th scope="col" className="hidden py-2 pr-2 text-right sm:table-cell">Tokens (entra / sale)</th>
                    <th scope="col" className="py-2 pr-2 text-right">Costo</th>
                    <th scope="col" className="hidden py-2 pr-2 text-right sm:table-cell">Tarda</th>
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
                        <td className={`${celda} hidden sm:table-cell`}>{fila ? `${miles(fila.entrada)} / ${miles(fila.salida)}` : '—'}</td>
                        <td className={celda}>
                          {usd(fila?.costoUsd ?? 0)}
                          {fila && fila.busquedas > 0 && <span className="block text-xs text-muted">{fila.busquedas} {fila.busquedas === 1 ? 'búsqueda' : 'búsquedas'} web</span>}
                        </td>
                        <td className={`${celda} hidden sm:table-cell`}>{fila && fila.pedidos > 0 ? segundos(fila.ms) : '—'}</td>
                        <td className="py-2.5 text-right tabular-nums">{fila?.fallas ?? 0}</td>
                      </tr>
                    );
                  })}
                  {consumo.prueba && (
                    <tr className="border-b border-line text-muted">
                      <td className="py-2.5 pr-2">Pruebas desde aquí</td>
                      <td className={celda}>{consumo.prueba.pedidos}</td>
                      <td className={`${celda} hidden sm:table-cell`}>{miles(consumo.prueba.entrada)} / {miles(consumo.prueba.salida)}</td>
                      <td className={celda}>{usd(consumo.prueba.costoUsd)}</td>
                      <td className={`${celda} hidden sm:table-cell`}>{segundos(consumo.prueba.ms)}</td>
                      <td className="py-2.5 text-right tabular-nums">{consumo.prueba.fallas}</td>
                    </tr>
                  )}
                  <tr className="font-bold text-ink">
                    <td className="py-2.5 pr-2">Total</td>
                    <td className={celda}>{consumo.total.pedidos}</td>
                    <td className={`${celda} hidden sm:table-cell`} />
                    <td className={celda}>{usd(consumo.total.costoUsd)}</td>
                    <td className={`${celda} hidden sm:table-cell`} />
                    <td className="py-2.5 text-right tabular-nums">{consumo.total.fallas}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 max-w-prose text-xs text-muted">
              &quot;{USOS_IA[0].nombre}&quot; suma las búsquedas de Anthropic ($0,01 cada una). El consumo se registra desde esta versión: antes de ella no hay cifras.
            </p>
          </section>

          <section className={adminCard}>
            <h4 className="text-base font-semibold text-ink">Pedidos por día</h4>
            <div className="mt-3 flex h-24 items-end gap-1" role="img" aria-label={`Pedidos a Claude por día, los últimos 30 días: ${en30} en total`}>
              {consumo.porDia.map((d) => (
                <span
                  key={d.dia}
                  title={`${d.dia}: ${d.pedidos} ${d.pedidos === 1 ? 'pedido' : 'pedidos'}`}
                  style={{ height: `${Math.max(3, Math.round((d.pedidos / topeDia) * 100))}%` }}
                  className={`min-w-0 flex-1 rounded-t transition-[height] duration-500 starting:h-0 motion-reduce:transition-none ${d.pedidos > 0 ? 'bg-brand-500' : 'bg-line'}`}
                />
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-muted">
              <span>hace 29 días</span>
              <span>{en30} en los últimos 30 días</span>
              <span>hoy</span>
            </div>
          </section>
        </div>

        <section className={adminCard}>
          <h4 className="text-base font-semibold text-ink">Lo que falló</h4>
          {consumo.fallas.length === 0 ? (
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success-strong text-white"><IconoCheck className="h-[18px] w-[18px]" aria-hidden="true" /></span>
              <div>
                <p className="text-sm font-semibold text-ink">Sin fallas registradas</p>
                <p className="text-xs text-muted">Aquí sale cada falla, con el uso, la hora y qué pasó.</p>
              </div>
            </div>
          ) : (
            <ul className="mt-1">
              {consumo.fallas.map((f) => {
                const uso = infoDeUso(f.uso);
                const detalle = [ETIQUETA_FALLA[f.falla] ?? f.falla, f.detalle, f.reintento ? 'al repetirlo' : null].filter(Boolean).join(' · ');
                return (
                  <li key={f.id} className="flex items-start gap-3 border-t border-line py-3 first:border-t-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-muted"><IconoAdvertencia className="h-4 w-4" aria-hidden="true" /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{uso?.nombre ?? (f.uso === 'prueba' ? 'Una prueba desde aquí' : PLANTILLA_IMPORTAR.nombre)} · {cuando(f.cuando)}</p>
                      <p className="text-xs text-muted">
                        {f.proveedor === 'groq' ? 'Groq: ' : ''}{detalle}
                        {f.siguioGroq === true && '. Siguió Groq.'}
                        {f.siguioGroq === false && '. Groq no tomó el relevo.'}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
