'use client';

import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import {
  IconoCamaraFotos, IconoCheck, IconoChevronDerecha, IconoCerrar, IconoChat, IconoClientes, IconoCopiar, IconoCorreo, IconoLista,
  IconoObjetivo, IconoPaquete, IconoVer, type IconType,
} from '@/components/iconos';
import { adminCard, adminSecondaryButton } from '@/lib/admin-ui';

// C-288 · La guía: cómo pedirle las cosas a la IA para que acierte. Cuatro reglas de oro y, por cada lugar donde se usa, un pedido
// para copiar y un "Así sí" / "Así no". El pedido de Importar tiene que decir lo mismo que la plantilla que se descarga
// (lib/product-import-server.ts → buildImportTemplate): el modelo exacto, confirmado en la web, un solo resultado.

const PEDIDO_IMPORTAR = 'Llena la plantilla con estos productos. Para cada uno: lee el modelo exacto en la etiqueta o la caja, confírmalo en la página del fabricante y usa los datos de ese modelo. Dame un solo resultado, sin "posibles modelos". El peso y las medidas son del paquete. En "notas", de dónde sacaste cada dato.';
const PEDIDO_CAMPANA = 'Gift cards para regalar en Navidad a quien no sabe qué regalar, con entrega inmediata por correo.';

function Regla({ icono: Icono, titulo, children }: { icono: IconType; titulo: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-3.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white"><Icono className="h-4 w-4" aria-hidden="true" /></span>
      <p className="mt-2.5 text-sm font-semibold text-ink">{titulo}</p>
      <p className="mt-1 text-xs text-muted">{children}</p>
    </div>
  );
}

function Pedido({ texto }: { texto: string }) {
  const copiar = () => { void navigator.clipboard.writeText(texto).then(() => toast.success('Copiado'), () => toast.error('No se pudo copiar')); };
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3 @md:flex-row @md:items-start @md:gap-3">
      <p className="min-w-0 flex-1 text-sm text-brand-700">{texto}</p>
      <button type="button" onClick={copiar} className={`${adminSecondaryButton} h-9! shrink-0 px-3! text-[13px]`}>
        <IconoCopiar className="h-4 w-4" aria-hidden="true" />Copiar
      </button>
    </div>
  );
}

function AsiSiAsiNo({ si, no }: { si: string; no: string }) {
  return (
    <div className="grid gap-2.5 @md:grid-cols-2">
      <div className="rounded-xl border border-line p-3 text-sm text-ink-soft">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-success-strong"><IconoCheck className="h-3.5 w-3.5" aria-hidden="true" />Así sí</p>
        {si}
      </div>
      <div className="rounded-xl border border-line p-3 text-sm text-ink-soft">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-deal"><IconoCerrar className="h-3.5 w-3.5" aria-hidden="true" />Así no</p>
        {no}
      </div>
    </div>
  );
}

function Lugar({ icono: Icono, titulo, sub, abierto, children }: { icono: IconType; titulo: string; sub: string; abierto?: boolean; children: ReactNode }) {
  return (
    <details open={abierto} className={`${adminCard} group p-0!`}>
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white"><Icono className="h-[18px] w-[18px]" aria-hidden="true" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink">{titulo}</span>
          <span className="block text-xs text-muted">{sub}</span>
        </span>
        <IconoChevronDerecha className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
      </summary>
      <div className="grid gap-3 px-4 pb-4 text-sm text-ink-soft @md:pl-16">{children}</div>
    </details>
  );
}

export default function Guia() {
  return (
    <div className="space-y-3">
      <section className={adminCard}>
        <h4 className="text-base font-semibold text-ink">La IA trabaja con lo que le das</h4>
        <p className="mt-0.5 text-sm text-muted">Cuanto más exacto el pedido, mejor el resultado. Cuatro reglas para todo el panel:</p>
        <div className="mt-3 grid gap-2.5 @lg:grid-cols-2 @3xl:grid-cols-4">
          <Regla icono={IconoLista} titulo="El nombre completo">Marca y modelo exactos, como en la caja: &quot;Emtop ETID65&quot;, no &quot;taladro Emtop&quot;.</Regla>
          <Regla icono={IconoCamaraFotos} titulo="La foto de la etiqueta">La de abajo del producto o la caja: ahí está el modelo. Con ella no adivina.</Regla>
          <Regla icono={IconoObjetivo} titulo="Un pedido, un resultado">Pide que confirme el modelo en la web y entregue uno solo, con de dónde sacó cada dato.</Regla>
          <Regla icono={IconoVer} titulo="Revisa antes de publicar">La IA propone; publica quien revisó. Si algo salió mal, cambia sus instrucciones y pruébalas.</Regla>
        </div>
      </section>

      <div id="ia-guia-lugares" className="space-y-2.5">
        <Lugar icono={IconoPaquete} titulo="Productos: el modelo exacto, las medidas y la descripción" sub="Buscar en la web y la plantilla de Importar con claude.ai" abierto>
          <p>En la ficha, <b>Buscar en la web</b> funciona mejor con el nombre completo (marca y modelo). En <b>Importar</b>, pásale a claude.ai la plantilla y las fotos, una de ellas de la etiqueta, y pídele así:</p>
          <Pedido texto={PEDIDO_IMPORTAR} />
          <AsiSiAsiNo si={'"Taladro percutor Emtop ETID65 de 650 W" más la foto de la etiqueta.'} no={'"Taladro Emtop" y una foto de lejos: da varios modelos posibles.'} />
        </Lugar>
        <Lugar icono={IconoChat} titulo="Consultas: la respuesta a un cliente" sub="Redactar con IA, en cada mensaje">
          <p>La IA ya trae las órdenes del cliente, los productos que nombra con su precio y existencia y el flete de ZOOM a su ciudad. Revisa el borrador y cámbialo lo que haga falta antes de enviarlo.</p>
          <AsiSiAsiNo si="Revisar que el precio y el flete sean los de hoy y enviar." no="Enviar sin leer: si el cliente escribió mal el modelo, la IA no lo inventa, pero puede quedar corto." />
        </Lugar>
        <Lugar icono={IconoClientes} titulo="Clientes: el resumen antes de atender" sub="Resumir con IA, en la ficha">
          <p>Úsalo antes de escribirle a un cliente: dice qué tipo de cliente es, qué ofrecerle (solo productos de la tienda) y el siguiente paso. Las cifras las calcula la tienda, no la IA.</p>
        </Lugar>
        <Lugar icono={IconoCorreo} titulo="Campañas: el objetivo bien escrito" sub="Armar con IA, en Marketing → Campañas">
          <p>El objetivo es lo único que escribe el equipo. Di qué, para quién y por qué ahora:</p>
          <Pedido texto={PEDIDO_CAMPANA} />
          <AsiSiAsiNo si="Un objetivo concreto: producto, público y motivo." no={'"Vender más": la IA elige al azar.'} />
        </Lugar>
        <Lugar icono={IconoLista} titulo="Proveedor: categoría y nombre de la lista" sub="Productos → Proveedor → Proponer con IA">
          <p>Propone el nombre de la tienda y la categoría de cada código. Lo que no entiende lo marca en &quot;duda&quot;: revisa esos primero en &quot;Nombres para revisar&quot;.</p>
        </Lugar>
      </div>
    </div>
  );
}
