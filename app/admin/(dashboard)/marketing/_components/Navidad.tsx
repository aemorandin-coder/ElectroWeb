'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { IconoCheck, IconoGuardar, IconoRestablecer } from '@/components/iconos';
import GorroSanta from '@/components/navidad/GorroSanta';
import SelloNavidad from '@/components/navidad/SelloNavidad';
import SaludoNavidad from '@/components/navidad/SaludoNavidad';
import { VistaFranjaNavidad } from '@/components/navidad/FechaLimiteNavidad';
import { Field, SettingsCard, SwitchRow, TextAreaField, TextField } from '@/app/admin/(dashboard)/settings/_components/fields';
import { adminBadge, adminHint, adminInput, adminLabel, adminPrimaryButton, adminSecondaryButton, adminSpinner, type AdminTone } from '@/lib/admin-ui';
import { safeHotAdLink } from '@/lib/hot-ad';
import {
  comoDia, corteValido, diaEnCaracas, estadoNavidad, franjaNavidad, GORRO_RECOMENDADO, TARJETA_NAVIDAD, temporadaSugerida, varianteGorro,
  type EstadoNavidad, type FormasDeEntrega, type VarianteGorro,
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
  /** C-190: el último día para pedir y que llegue antes del 24 ('AAAA-MM-DD' o ''), por ZOOM o MRW y en Guanare */
  christmasCutoffShipping: string;
  christmasCutoffLocal: string;
}

const INICIAL: NavidadForm = {
  christmasTheme: false, christmasThemeFrom: '', christmasThemeUntil: '', christmasHat: GORRO_RECOMENDADO, christmasPopup: true,
  christmasPopupTitle: '', christmasPopupText: '', christmasPopupButton: '', christmasPopupLink: '',
  christmasCutoffShipping: '', christmasCutoffLocal: '',
};

const CORTE_INVALIDO = 'Elige un día de noviembre o de diciembre hasta el 24';

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
    christmasCutoffShipping: comoDia(texto(data.christmasCutoffShipping)) ?? '',
    christmasCutoffLocal: comoDia(texto(data.christmasCutoffLocal)) ?? '',
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
 * Marketing → Navidad (C-186): el tema navideño de la tienda, el gorro y el saludo navideño del inicio (C-207: una franja
 * dentro de la página; antes, la tarjeta del popup). Se guarda en Configuración con el permiso de contenido, como el
 * popup, y la tienda cambia sin deploy (la API revalida las páginas).
 */
export default function Navidad() {
  const [form, setForm] = useState<NavidadForm>(INICIAL);
  const [guardado, setGuardado] = useState<NavidadForm>(INICIAL);
  const [logo, setLogo] = useState<string | null>(null);
  const [nombre, setNombre] = useState('Electro Shop');
  // C-190: qué formas de entrega tiene encendidas la tienda (Configuración → Envíos): la franja solo nombra esas
  const [formas, setFormas] = useState<FormasDeEntrega>({ envio: true, delivery: false, retiro: true });
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
        setFormas({ envio: data.deliveryEnabled !== false, delivery: data.localDeliveryEnabled === true, retiro: data.pickupEnabled !== false });
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
    const cortes = (['christmasCutoffShipping', 'christmasCutoffLocal'] as const).filter((clave) => form[clave] && !corteValido(form[clave]));
    if (cortes.length > 0) {
      setErrores(Object.fromEntries(cortes.map((clave) => [clave, CORTE_INVALIDO])));
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          christmasThemeFrom: form.christmasThemeFrom || null,
          christmasThemeUntil: form.christmasThemeUntil || null,
          christmasCutoffShipping: form.christmasCutoffShipping || null,
          christmasCutoffLocal: form.christmasCutoffLocal || null,
        }),
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
  // C-190: la franja como la vería hoy un cliente con el tema encendido (sin las fechas vencidas ni las que no sirven)
  const corteDe = (dia: string) => (dia && corteValido(dia) ? dia : null);
  const franja = franjaNavidad({ envio: corteDe(form.christmasCutoffShipping), local: corteDe(form.christmasCutoffLocal) }, formas, diaEnCaracas());
  const conCortes = Boolean(form.christmasCutoffShipping || form.christmasCutoffLocal);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="min-w-0 space-y-5">
        <SettingsCard
          title="Tema navideño"
          description="El gorro de Santa en el logo de toda la tienda y el saludo navideño en el inicio. Apagado, la tienda se ve como siempre."
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

        <SettingsCard title="El gorro" description="Va sobre el logo del encabezado y del pie de página, en toda la tienda, y en la franja navideña.">
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
          title="El saludo en el inicio"
          description="Mientras el tema se ve en la tienda. La franja va dentro del inicio, después de los destacados: se ve sin tapar nada."
        >
          <fieldset>
            <legend className="sr-only">Qué sale en el inicio</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Opcion name="navidad-popup" checked={form.christmasPopup} onChange={() => set('christmasPopup', true)}>
                <span>
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                    La franja navideña
                    <span className={adminBadge('brand')}>Recomendada</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">Tu saludo y un botón, con el sello y el gorro. Mientras sale, la imagen del popup no sale.</span>
                </span>
              </Opcion>
              <Opcion name="navidad-popup" checked={!form.christmasPopup} onChange={() => set('christmasPopup', false)}>
                <span>
                  <span className="block text-sm font-semibold text-ink">La imagen del popup</span>
                  <span className="mt-0.5 block text-xs text-muted">La de la pestaña Popup del home, como siempre (si está activa). Tapa la tienda hasta que se cierra.</span>
                </span>
              </Opcion>
            </div>
          </fieldset>

          {form.christmasPopup && (
            <div className="mt-5 space-y-4 border-t border-line pt-5">
              <TextField label="Título" value={form.christmasPopupTitle} onChange={(v) => set('christmasPopupTitle', v)} placeholder={TARJETA_NAVIDAD.titulo} maxLength={40} error={errores.christmasPopupTitle} hint="La última palabra sale en rojo." />
              <TextAreaField label="Mensaje" value={form.christmasPopupText} onChange={(v) => set('christmasPopupText', v)} placeholder={TARJETA_NAVIDAD.mensaje} maxLength={180} counter error={errores.christmasPopupText} hint="En la computadora, hasta dos líneas. En el teléfono la franja lleva solo el título y el botón." />
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
                Lo que dejes vacío usa el texto de la tienda. Que la franja no prometa lo que la tienda no cumple: descuentos, precios ni plazos de entrega.
              </p>
            </div>
          )}
        </SettingsCard>

        <SettingsCard
          title="Para que llegue antes del 24"
          description="La franja con el último día para pedir: en la ficha de los productos físicos, en el carrito y en Ideas para regalar, mientras el tema se ve en la tienda. Sin fecha no sale nada."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Último día por ZOOM o MRW"
              htmlFor="navidad-corte-envio"
              error={errores.christmasCutoffShipping}
              hint={formas.envio ? 'Envío nacional.' : 'El envío nacional está apagado en Configuración: esta fecha no sale.'}
            >
              <input
                id="navidad-corte-envio"
                type="date"
                value={form.christmasCutoffShipping}
                onChange={(e) => set('christmasCutoffShipping', e.target.value)}
                aria-invalid={errores.christmasCutoffShipping ? true : undefined}
                className={adminInput(Boolean(errores.christmasCutoffShipping))}
              />
            </Field>
            <Field
              label="Último día en Guanare"
              htmlFor="navidad-corte-local"
              error={errores.christmasCutoffLocal}
              hint={
                formas.delivery && formas.retiro ? 'Delivery o retiro en la tienda.'
                  : formas.delivery ? 'Delivery en Guanare.'
                    : formas.retiro ? 'Retiro en la tienda.'
                      : 'El delivery y el retiro están apagados en Configuración: esta fecha no sale.'
              }
            >
              <input
                id="navidad-corte-local"
                type="date"
                value={form.christmasCutoffLocal}
                onChange={(e) => set('christmasCutoffLocal', e.target.value)}
                aria-invalid={errores.christmasCutoffLocal ? true : undefined}
                className={adminInput(Boolean(errores.christmasCutoffLocal))}
              />
            </Field>
          </div>
          <p className={adminHint}>
            El día que pongas se incluye; al siguiente, la franja se va sola. Pon solo fechas confirmadas con ZOOM, MRW y el delivery: la franja promete que llega antes del 24.
          </p>
          {conCortes && (
            <button
              type="button"
              onClick={() => {
                set('christmasCutoffShipping', '');
                set('christmasCutoffLocal', '');
              }}
              className={`${adminSecondaryButton} mt-3 h-9 px-3 text-xs`}
            >
              Quitar las fechas de entrega
            </button>
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
            // C-207: la franja del inicio. La columna es angosta, como un teléfono grande: el mensaje sale desde sm
            <SaludoNavidad
              key={vuelta}
              titulo={form.christmasPopupTitle.trim() || TARJETA_NAVIDAD.titulo}
              mensaje={form.christmasPopupText.trim() || TARJETA_NAVIDAD.mensaje}
              boton={form.christmasPopupButton.trim() || TARJETA_NAVIDAD.boton}
              enlace={safeHotAdLink(form.christmasPopupLink.trim() || TARJETA_NAVIDAD.enlace)}
              gorro={form.christmasHat}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted">
              Al entrar sale la imagen de la pestaña Popup del home, como siempre. El gorro va en el logo.
            </p>
          )}
          {/* C-190: la franja de la ficha y del carrito, con las formas de entrega que tiene encendidas la tienda */}
          {franja ? (
            <VistaFranjaNavidad franja={franja} />
          ) : (
            <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted">
              {conCortes ? 'Las fechas de entrega ya pasaron o no sirven: la franja no sale.' : 'Sin fechas de entrega, la ficha y el carrito no dicen hasta cuándo pedir.'}
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
