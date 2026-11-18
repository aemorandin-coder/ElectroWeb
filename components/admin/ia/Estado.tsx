import type { ReactNode } from 'react';
import { IconoAdvertencia, IconoAjustes, IconoBillete, IconoClave, IconoRepetir, type IconType } from '@/components/iconos';
import { infoModelo, nombreDeEsfuerzo } from '@/lib/ia/precios';
import { infoProveedor, nombreDelMotor } from '@/lib/ia/proveedores/catalogo';
import { claveDe, miles, modeloDe, usd, type DatosIa } from './tipos';

// C-288 · El estado de Claude de un vistazo: la pieza fuerte de la pantalla, en el azul oscuro del logo (una por pantalla, PLAN.md
// §1.1). El modelo de ahora y si está conectado, de dónde sale la clave, el respaldo y el precio, y las cuatro cifras del mes.
// C-292: el motor de cualquier proveedor (Claude, Gemini, Grok o Groq) y el respaldo elegido.

function Chip({ icono: Icono, children }: { icono: IconType; children: ReactNode }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold">
      <Icono className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}

function Cifra({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div>
      <p className="text-2xl font-bold tabular-nums">{valor}</p>
      <p className="text-xs text-white/80">{rotulo}</p>
    </div>
  );
}

export default function Estado({ datos }: { datos: DatosIa }) {
  const { motor, consumo } = datos;
  const info = infoProveedor(datos.proveedor);
  const modelo = modeloDe(datos, datos.proveedor) ?? '';
  const clave = claveDe(datos, datos.proveedor);
  const esAnthropic = datos.proveedor === 'anthropic';
  const otro = datos.proveedores.find((p) => p.id === datos.proveedor);
  const deClaude = infoModelo(motor.modelo);
  const precio = esAnthropic
    ? deClaude ? `${usd(deClaude.entrada)} / ${usd(deClaude.salida)} el millón de tokens` : null
    : otro?.precioEntrada != null && otro.precioSalida != null ? `${usd(otro.precioEntrada)} / ${usd(otro.precioSalida)} el millón de tokens` : 'Sin precio: cuenta solo los tokens';
  const problema = !clave.hay ? 'Sin clave' : clave.claveRota ? 'La clave del panel no se pudo leer' : !modelo ? 'Sin modelo' : null;
  const fuente = clave.fuente === 'panel' ? 'Clave del panel' : clave.fuente === 'env' ? 'Clave en el servidor' : 'Sin clave';
  const respaldo = datos.respaldo
    ? `Respaldo: ${infoProveedor(datos.respaldo).motor}`
    : datos.groq ? 'Respaldo: Groq (solo Buscar en la web)' : 'Sin respaldo';

  return (
    <section aria-label="El motor de la IA" className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white sm:p-6">
      <div className="grid gap-5 @4xl:grid-cols-[minmax(0,1fr)_auto] @4xl:items-center @4xl:gap-8">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-300">
            {problema ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 normal-case tracking-normal text-brand-700">
                <IconoAdvertencia className="h-3.5 w-3.5" aria-hidden="true" />
                {problema}
              </span>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
                Conectado
              </>
            )}
            <span aria-hidden="true" className="hidden @md:inline">·</span>
            <span>{info.empresa} · el motor de todo el panel</span>
          </p>
          <h3 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{modelo ? nombreDelMotor(datos.proveedor, modelo) : info.motor}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {esAnthropic && <Chip icono={IconoAjustes}>Esfuerzo {nombreDeEsfuerzo(motor.esfuerzo)}</Chip>}
            <Chip icono={IconoClave}>{fuente}</Chip>
            <Chip icono={IconoRepetir}>{respaldo}</Chip>
            {precio && <Chip icono={IconoBillete}>{precio}</Chip>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/15 pt-4 @md:grid-cols-4 @4xl:flex @4xl:gap-8 @4xl:border-l @4xl:border-t-0 @4xl:pl-8 @4xl:pt-0">
          <Cifra valor={usd(consumo.total.costoUsd)} rotulo={`gastado en ${consumo.mes.split(' de ')[0]}`} />
          <Cifra valor={miles(consumo.total.pedidos)} rotulo="pedidos" />
          <Cifra valor={miles(consumo.atajadas.totalMes)} rotulo="atajadas por las reglas" />
          <Cifra valor={miles(consumo.total.fallas)} rotulo="fallas" />
        </div>
      </div>
    </section>
  );
}
