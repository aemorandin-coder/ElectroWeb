'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { IconoCheck, IconoGuardar, IconoRestablecer } from '@/components/iconos';
import GorroSanta from '@/components/navidad/GorroSanta';
import SelloNavidad from '@/components/navidad/SelloNavidad';
import TarjetaNavidad from '@/components/navidad/TarjetaNavidad';
import { Field, SettingsCard, SwitchRow, TextAreaField, TextField } from '@/app/admin/(dashboard)/settings/_components/fields';
import { adminBadge, adminHint, adminInput, adminLabel, adminPrimaryButton, adminSecondaryButton, adminSpinner, type AdminTone } from '@/lib/admin-ui';
import { safeHotAdLink } from '@/lib/hot-ad';
import {
  comoDia, diaEnCaracas, estadoNavidad, GORRO_RECOMENDADO, TARJETA_NAVIDAD, temporadaSugerida, varianteGorro,
  type EstadoNavidad, type VarianteGorro,
} from '@/lib/navidad';

interface NavidadForm {
  christmasTheme: boolean;
  /** 'AAAA-MM-DD' o '' */
  christmasThemeFrom: string;
  christmasThemeUntil: string;
  christmasHat: VarianteGorro;
  christmasPopup: boolean;
  christmasPopupTitle: string;
  christmasPopupText: string;
  christmasPopupButton: string;
  christmasPopupLink: string;
}

const INICIAL: NavidadForm = {
  christmasTheme: false, christmasThemeFrom: '', christmasThemeUntil: '', christmasHat: GORRO_RECOMENDADO, christmasPopup: true,
  christmasPopupTitle: '', christmasPopupText: '', christmasPopupButton: '', christmasPopupLink: '',
};

const texto = (valor: unknown) => (typeof valor === 'string' ? valor : '');

/** Respuesta de GET o PUT /api/settings → formulario (las fechas llegan como ISO de las 00:00 UTC de ese día). */
function leer(data: Record<string, unknown>): NavidadForm {
  return {
    christmasTheme: data.christmasTheme === true,
    christmasThemeFrom: comoDia(texto(data.christmasThemeFrom)) ?? '',
    christmasThemeUntil: comoDia(texto(data.christmasThemeUntil)) ?? '',
    christmasHat: varianteGorro(data.christmasHat),
    christmasPopup: data.christmasPopup !== false,
    christmasPopupTitle: texto(data.christmasPopupTitle),
    christmasPopupText: texto(data.christmasPopupText),
    christmasPopupButton: texto(data.christmasPopupButton),
    christmasPopupLink: texto(data.christmasPopupLink),
  };
}

/** "1 de diciembre", con el año si no es el de hoy */
function fechaLarga(dia: string): string {
  const otroAno = dia.slice(0, 4) !== diaEnCaracas().slice(0, 4);
  return new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'long', ...(otroAno ? { year: 'numeric' } : {}), timeZone: 'UTC' })
    .format(new Date(`${dia}T12:00:00Z`));
}

const ESTADO: Record<EstadoNavidad, { etiqueta: string; tono: AdminTone }> = {
  activo: { etiqueta: 'En la tienda', tono: 'success' },
  programado: { etiqueta: 'Programado', tono: 'brand' },
  terminado: { etiqueta: 'Terminó', tono: 'neutral' },
  apagado: { etiqueta: 'Apagado', tono: 'neutral' },
};

/** Qué pasa hoy con lo guardado, en una frase */
function resumen(estado: EstadoNavidad, desde: string, hasta: string): string {
  switch (estado) {
    case 'apagado':
      return 'Apagado: la tienda se ve como siempre.';
    case 'programado':
      return `Se enciende solo el ${fechaLarga(desde)}${hasta ? ` y se apaga solo al terminar el ${fechaLarga(hasta)}` : ''}.`;
    case 'terminado':
      return `Terminó el ${fechaLarga(hasta)}. Para la próxima temporada, cambia las fechas.`;
    case 'activo':
      return hasta ? `Se ve en la tienda hasta el ${fechaLarga(hasta)} incluido; luego se apaga solo.` : 'Se ve en la tienda hasta que lo apagues.';
  }
}

const GORROS_PANEL: { id: VarianteGorro; nombre: string; detalle: string }[] = [
  { id: 'ajustado', nombre: 'Ajustado al sello', detalle: 'Se calza en el sello: el aro blanco del logo se vuelve la piel del gorro y la punta cae hacia atrás.' },
  { id: 'clasico', nombre: 'Clásico', detalle: 'Un gorro de Santa puesto encima del sello, inclinado.' },
];

/** Opción de un grupo de radios con forma de tarjeta: el borde azul marca la elegida. El foco del teclado se ve en el borde. */
function Opcion({ name, checked, onChange, children }: { name: string; checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-3 transition-colors hover:border-brand-200 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500/30">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1 h-4 w-4 shrink-0 accent-brand-500" />
      {children}
    </label>
  );
}

/** El logo de la tienda con el gorro, como en el encabezado. Sin logo, el sello del pack de íconos. */
function LogoConGorro({ logo, gorro, className }: { logo: string | null; gorro: VarianteGorro; className: string }) {
  if (!logo) return <SelloNavidad gorro={gorro} animado={false} className={className} />;
  return (
    <span className={`relative block shrink-0 ${className}`}>
      <Image src={logo} alt="" fill sizes="64px" className="object-contain" />
      <GorroSanta variante={gorro} />
    </span>
  );
}

/**
 * Marketing → Navidad (C-186): el tema navideño de la tienda, el gorro y la tarjeta navideña del popup. Se guarda en
 * Configuración con el permiso de contenido, como el popup, y la tienda cambia sin deploy (la API revalida las páginas).
 */
export default function Navidad() {
  const [form, setForm] = useState<NavidadForm>(INICIAL);
  const [guardado, setGuardado] = useState<NavidadForm>(INICIAL);
  const [logo, setLogo] = useState<string | null>(null);
  const [nombre, setNombre] = useState('Electro Shop');
  const [fondo, setFondo] = useState({ color: '#000000', opacidad: 70 });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  // Cambiarla vuelve a montar la tarjeta de la vista previa: así se ve otra vez cómo se enciende
  const [vuelta, setVuelta] = useState(0);

  const hayCambios = JSON.stringify(form) !== JSON.stringify(guardado);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Record<string, unknown>) => {
        const leido = leer(data);
        setForm(leido);
        setGuardado(leido);
        setLogo(texto(data.logo) || null);
        // Como el encabezado de la tienda: el nombre corto
        if (texto(data.companyName)) setNombre(texto(data.companyName).split(/\s+/).slice(0, 2).join(' '));
        const opacidad = typeof data.hotAdBackdropOpacity === 'number' ? data.hotAdBackdropOpacity : 70;
        setFondo({ color: texto(data.hotAdBackdropColor) || '#000000', opacidad });
      })
      .catch(() => toast.error('No se pudo cargar el tema navideño'))
      .finally(() => setCargando(false));
  }, []);

  const set = <K extends keyof NavidadForm>(clave: K, valor: NavidadForm[K]) => {
    setForm((prev) => ({ ...prev, [clave]: valor }));
    setErrores((prev) => {
      if (!prev[clave]) return prev;
      const resto = { ...prev };
      delete resto[clave];
      return resto;
    });
  };

  const guardar = async () => {
    if (form.christmasThemeFrom && form.christmasThemeUntil && form.christmasThemeUntil < form.christmasThemeFrom) {
      setErrores({ christmasThemeUntil: 'El último día no puede ser antes del primero' });
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, christmasThemeFrom: form.christmasThemeFrom || null, christmasThemeUntil: form.christmasThemeUntil || null }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.fields) setErrores(data.fields);
        toast.error(data?.error || 'No se pudo guardar');
        return;
      }
      const leido = leer(data);
      setForm(leido);
      setGuardado(leido);
      setErrores({});
      toast.success('Tema navideño guardado');
    } catch {
      toast.error('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <div className="flex justify-center py-16"><span className={adminSpinner} aria-label="Cargando" /></div>;

  const estado = estadoNavidad({
    christmasTheme: guardado.christmasTheme,
    christmasThemeFrom: guardado.christmasThemeFrom || null,
    christmasThemeUntil: guardado.christmasThemeUntil || null,
  });
  const sugerida = temporadaSugerida();
  const conFechas = Boolean(form.christmasThemeFrom || form.christmasThemeUntil);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="min-w-0 space-y-5">
        <SettingsCard
          title="Tema navideño"
          description="El gorro de Santa en el logo de toda la tienda y la tarjeta navideña al entrar. Apagado, la tienda se ve como siempre."
          action={<span className={adminBadge(ESTADO[estado].tono)}>{ESTADO[estado].etiqueta}</span>}
        >
          <div className="space-y-5">
            <SwitchRow
              label="Encender el tema navideño"
              description={resumen(estado, guardado.christmasThemeFrom, guardado.christmasThemeUntil)}
              checked={form.christmasTheme}
              onChange={(valor) => set('christmasTheme', valor)}
            />
            <div className="border-t border-line pt-5">
              <p className={adminLabel}>Fechas (opcional)</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Primer día" htmlFor="navidad-desde">
                  <input id="navidad-desde" type="date" value={form.christmasThemeFrom} onChange={(e) => set('christmasThemeFrom', e.target.value)} className={adminInput()} />
                </Field>
                <Field label="Último día" htmlFor="navidad-hasta" error={errores.christmasThemeUntil}>
                  <input
                    id="navidad-hasta"
                    type="date"
                    min={form.christmasThemeFrom || undefined}
                    value={form.christmasThemeUntil}
                    onChange={(e) => set('christmasThemeUntil', e.target.value)}
                    aria-invalid={errores.christmasThemeUntil ? true : undefined}
                    className={adminInput(Boolean(errores.christmasThemeUntil))}
                  />
                </Field>
              </div>
              <p className={adminHint}>
                Con fechas, se enciende y se apaga solo a la medianoche de Venezuela, y los dos días se incluyen. Sin fechas, queda encendido hasta que lo apagues.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    set('christmasThemeFrom', sugerida.desde);
                    set('christmasThemeUntil', sugerida.hasta);
                  }}
                  className={`${adminSecondaryButton} h-9 px-3 text-xs`}
                >
                  Del {fechaLarga(sugerida.desde)} al {fechaLarga(sugerida.hasta)}
                </button>
                {conFechas && (
                  <button
                    type="button"
                    onClick={() => {
                      set('christmasThemeFrom', '');
                      set('christmasThemeUntil', '');
                    }}
                    className={`${adminSecondaryButton} h-9 px-3 text-xs`}
                  >
                    Quitar las fechas
                  </button>
                )}
              </div>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard title="El gorro" description="Va sobre el logo del encabezado y del pie de página, en toda la tienda, y en la tarjeta navideña.">
          <fieldset>
            <legend className="sr-only">Elige el gorro</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {GORROS_PANEL.map((g) => (
                <Opcion key={g.id} name="navidad-gorro" checked={form.christmasHat === g.id} onChange={() => set('christmasHat', g.id)}>
                  <span className="min-w-0 flex-1">
                    <span className="flex h-24 items-end justify-center rounded-lg border border-line bg-white pb-3">
                      <LogoConGorro logo={logo} gorro={g.id} className="h-14 w-14" />
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                      {g.nombre}
                      {g.id === GORRO_RECOMENDADO && <span className={adminBadge('brand')}>Recomendado</span>}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">{g.detalle}</span>
                  </span>
                </Opcion>
              ))}
            </div>
          </fieldset>
        </SettingsCard>

        <SettingsCard
          title="Popup al entrar"
          description="Mientras el tema se ve en la tienda. Sale igual que el popup: como mucho una vez cada 24 horas por visitante, y se cierra al primer toque."
        >
          <fieldset>
            <legend className="sr-only">Qué sale al entrar</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Opcion name="navidad-popup" checked={form.christmasPopup} onChange={() => set('christmasPopup', true)}>
                <span>
                  <span className="block text-sm font-semibold text-ink">La tarjeta navideña</span>
                  <span className="mt-0.5 block text-xs text-muted">El sello con el gorro, tu saludo y un botón.</span>
                </span>
              </Opcion>
              <Opcion name="navidad-popup" checked={!form.christmasPopup} onChange={() => set('christmasPopup', false)}>
                <span>
                  <span className="block text-sm font-semibold text-ink">La imagen del popup</span>
                  <span className="mt-0.5 block text-xs text-muted">La de la pestaña Popup del home, como siempre (si está activa).</span>
                </span>
              </Opcion>
            </div>
          </fieldset>

          {form.christmasPopup && (
            <div className="mt-5 space-y-4 border-t border-line pt-5">
              <TextField label="Título" value={form.christmasPopupTitle} onChange={(v) => set('christmasPopupTitle', v)} placeholder={TARJETA_NAVIDAD.titulo} maxLength={40} error={errores.christmasPopupTitle} hint="La última palabra sale en azul." />
              <TextAreaField label="Mensaje" value={form.christmasPopupText} onChange={(v) => set('christmasPopupText', v)} placeholder={TARJETA_NAVIDAD.mensaje} maxLength={180} counter error={errores.christmasPopupText} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Texto del botón" value={form.christmasPopupButton} onChange={(v) => set('christmasPopupButton', v)} placeholder={TARJETA_NAVIDAD.boton} maxLength={30} error={errores.christmasPopupButton} />
                <TextField
                  label="Enlace del botón"
                  value={form.christmasPopupLink}
                  onChange={(v) => set('christmasPopupLink', v)}
                  placeholder={TARJETA_NAVIDAD.enlace}
                  maxLength={300}
                  hint="Una página de la tienda, como /gift-cards, o un enlace https://"
                  error={errores.christmasPopupLink}
                />
              </div>
              <p className={adminHint}>
                Lo que dejes vacío usa el texto de la tienda. Que la tarjeta no prometa lo que la tienda no cumple: descuentos, precios ni plazos de entrega.
              </p>
            </div>
          )}
        </SettingsCard>
      </div>

      {/* Vista previa: así se ve con el tema encendido. Es solo para mirar (inert): sus enlaces no llevan a ningún lado */}
      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <p className={adminLabel}>Vista previa, con el tema encendido</p>
        <div inert className="space-y-3">
          <div className="flex h-14 items-center gap-2 rounded-2xl border border-line bg-white px-4">
            <LogoConGorro logo={logo} gorro={form.christmasHat} className="h-9 w-9" />
            <span className="font-brand min-w-0 truncate bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-base font-bold tracking-tight text-transparent">{nombre}</span>
          </div>
          {form.christmasPopup ? (
            <div className="relative overflow-hidden rounded-2xl p-4">
              {/* El fondo del popup, con el color y la oscuridad de la pestaña Popup del home */}
              <div className="absolute inset-0" style={{ backgroundColor: fondo.color, opacity: fondo.opacidad / 100 }} aria-hidden="true" />
              <TarjetaNavidad
                key={vuelta}
                titulo={form.christmasPopupTitle.trim() || TARJETA_NAVIDAD.titulo}
                mensaje={form.christmasPopupText.trim() || TARJETA_NAVIDAD.mensaje}
                boton={form.christmasPopupButton.trim() || TARJETA_NAVIDAD.boton}
                enlace={safeHotAdLink(form.christmasPopupLink.trim() || TARJETA_NAVIDAD.enlace)}
                gorro={form.christmasHat}
                className="relative mx-auto w-full max-w-[25rem]"
              />
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted">
              Al entrar sale la imagen de la pestaña Popup del home, como siempre. El gorro va en el logo.
            </p>
          )}
        </div>
        {form.christmasPopup && (
          <button type="button" onClick={() => setVuelta((n) => n + 1)} className={`${adminSecondaryButton} mt-3 h-9 w-full px-3 text-xs motion-reduce:hidden`}>
            <IconoRestablecer className="h-4 w-4" aria-hidden="true" /> Ver otra vez cómo se enciende
          </button>
        )}
        <button type="button" onClick={guardar} disabled={guardando || !hayCambios} className={`${adminPrimaryButton} mt-4 w-full`}>
          {guardando ? 'Guardando…' : hayCambios ? <><IconoGuardar className="h-4 w-4" aria-hidden="true" /> Guardar</> : <><IconoCheck className="h-4 w-4" aria-hidden="true" /> Sin cambios</>}
        </button>
      </aside>
    </div>
  );
}
