// G-72: Tarjeta unificada de Descripción, De un vistazo, ¿Cómo se canjea? y Especificaciones.
// Organiza automáticamente textos con saltos de línea, subtítulos y "Etiqueta: detalle" en un grid
// equilibrado que elimina huecos vacíos en escritorio y mantiene lectura cómoda en móvil.

import { IconoCheck, IconoDigital } from '@/components/iconos';
import { estructurarDescripcion, parsearPasosCanje } from '@/lib/productos/descripcion';

interface ProductDescriptionCardProps {
  description: string | null;
  features: string[];
  instructions: string;
  vistazo: Array<[string, string]>;
  specs: Array<[string, string]>;
}

export default function ProductDescriptionCard({
  description,
  features,
  instructions,
  vistazo,
  specs,
}: ProductDescriptionCardProps) {
  const estructurada = estructurarDescripcion(description);
  const canje = parsearPasosCanje(instructions);
  const conVistazo = vistazo.length >= 2;
  const conCanje = canje.pasos.length > 0 || canje.parrafos.length > 0;
  const conLateral = conVistazo || conCanje;
  const sinTexto = !description?.trim() && features.length === 0;

  return (
    <div className="rounded-2xl border border-line bg-white p-4 lg:p-8">
      <div className={conLateral ? 'grid items-start gap-6 lg:grid-cols-12 lg:gap-10' : ''}>
        <section aria-labelledby="descripcion-title" className={conLateral ? 'min-w-0 lg:col-span-7' : 'min-w-0'}>
          <h2 id="descripcion-title" className="text-lg font-bold text-ink lg:text-xl">
            Descripción
          </h2>

          {sinTexto ? (
            <p className="mt-3 text-sm text-muted">Pronto agregaremos la descripción de este producto.</p>
          ) : (
            <div className="mt-3 space-y-5">
              {estructurada.intro.length > 0 && (
                <div className="space-y-2.5">
                  {estructurada.intro.map((parrafo, idx) => (
                    <p key={idx} className="max-w-[68ch] text-[15px] leading-relaxed text-ink-soft">
                      {parrafo}
                    </p>
                  ))}
                </div>
              )}

              {estructurada.secciones.map((sec, sIdx) => (
                <div key={sIdx} className="space-y-2.5 border-t border-line pt-4">
                  {sec.titulo && (
                    <h3 className="flex items-center gap-2 text-sm font-bold text-ink lg:text-base">
                      <span className="h-4 w-1 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                      {sec.titulo}
                    </h3>
                  )}

                  {sec.parrafos.map((p, pIdx) => (
                    <p key={pIdx} className="max-w-[68ch] text-[15px] leading-relaxed text-ink-soft">
                      {p}
                    </p>
                  ))}

                  {sec.items.length > 0 && (
                    <ul className={`grid gap-2.5 ${!conLateral && sec.items.length > 1 ? 'md:grid-cols-2' : sec.items.length >= 4 ? 'sm:grid-cols-2' : ''}`}>
                      {sec.items.map((item, iIdx) => (
                        <li key={iIdx} className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm leading-relaxed text-ink-soft">
                          <span className="flex items-start gap-2.5">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                            <span className="min-w-0">
                              {item.etiqueta && (
                                <strong className="mr-1 font-semibold text-ink">{item.etiqueta}:</strong>
                              )}
                              {item.texto}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}

              {features.length > 0 && (
                <div className="border-t border-line pt-4">
                  <h3 className="mb-2.5 text-sm font-bold text-ink">Lo que incluye</h3>
                  <ul className={`grid gap-2 ${conLateral ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 rounded-lg bg-surface px-3 py-2 text-sm text-ink-soft">
                        <IconoCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                        <span className="min-w-0">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {conLateral && (
          <aside className="min-w-0 space-y-4 lg:col-span-5">
            {conVistazo && (
              <dl aria-label="De un vistazo" className="grid grid-cols-2 gap-3">
                {vistazo.map(([label, value]) => (
                  <div key={label} className="min-w-0 rounded-xl border border-line bg-surface px-4 py-3">
                    <dt className="text-xs font-medium text-muted">{label}</dt>
                    <dd className="mt-0.5 break-words text-sm font-semibold text-ink lg:text-base">{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {conCanje && (
              <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 lg:p-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
                    <IconoDigital className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h3 className="text-sm font-bold text-brand-700 lg:text-base">¿Cómo se canjea?</h3>
                </div>

                {canje.pasos.length > 0 && (
                  <ol className="mt-3.5 space-y-2.5">
                    {canje.pasos.map((paso, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                          {idx + 1}
                        </span>
                        <span className="min-w-0">{paso}</span>
                      </li>
                    ))}
                  </ol>
                )}

                {canje.parrafos.length > 0 && (
                  <div className="mt-3 space-y-1.5 text-sm leading-relaxed text-ink-soft">
                    {canje.parrafos.map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      {specs.length > 0 && (
        <section aria-labelledby="specs-title" className="mt-6 border-t border-line pt-6 lg:mt-8 lg:pt-8">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="specs-title" className="text-lg font-bold text-ink lg:text-xl">Especificaciones</h2>
            <span className="text-xs text-muted">{specs.length} {specs.length === 1 ? 'dato' : 'datos'}</span>
          </div>
          <dl className="mt-2 lg:columns-2 lg:gap-x-12">
            {specs.map(([key, value]) => (
              <div key={key} className="grid break-inside-avoid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 border-b border-line py-2.5 text-sm">
                <dt className="text-muted">{key}</dt>
                <dd className="break-words font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
