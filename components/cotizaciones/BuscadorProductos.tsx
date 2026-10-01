'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { FiCheck, FiPackage, FiPlus, FiSearch, FiX } from 'react-icons/fi';
import { adminBadge, adminHint, adminInput, adminLabel } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import type { ProductoParaCotizar } from '@/lib/cotizaciones/productos';

// Buscador del catálogo en el editor de cotizaciones (C-148b). Busca mientras se escribe (sin botón): nombre, marca,
// categoría o código, sin importar acentos ni el orden de las palabras. Agregar no borra la búsqueda, para poder
// sumar varios productos seguidos. Con el teclado: flechas para elegir, Enter para agregar y Esc para cerrar.

const ESPERA_MS = 220;

type Estado = 'inactivo' | 'buscando' | 'listo' | 'error';

export function BuscadorProductos({ enCotizacion, onAgregar, bloqueado = false }: {
  /** Unidades de cada producto que ya están en la cotización */
  enCotizacion: Map<string, number>;
  onAgregar: (producto: ProductoParaCotizar) => void;
  /** Mientras se guarda: no se agregan líneas que el guardado pisaría */
  bloqueado?: boolean;
}) {
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<Estado>('inactivo');
  const [resultados, setResultados] = useState<ProductoParaCotizar[]>([]);
  const [aproximado, setAproximado] = useState(false);
  const [activo, setActivo] = useState(0);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pedido = useRef<AbortController | null>(null);
  const campo = useRef<HTMLInputElement>(null);

  const cancelar = () => {
    if (espera.current) clearTimeout(espera.current);
    pedido.current?.abort();
  };
  useEffect(() => cancelar, []);

  const buscar = async (valor: string) => {
    const control = new AbortController();
    pedido.current = control;
    try {
      const res = await fetch(`/api/admin/cotizaciones/productos?q=${encodeURIComponent(valor)}`, { cache: 'no-store', signal: control.signal });
      if (!res.ok) throw new Error('respuesta');
      const datos = (await res.json()) as { productos: ProductoParaCotizar[]; aproximado: boolean };
      // Una respuesta vieja no pisa a la de lo último que se escribió
      if (control.signal.aborted) return;
      setResultados(datos.productos);
      setAproximado(datos.aproximado);
      setActivo(0);
      setEstado('listo');
    } catch {
      if (!control.signal.aborted) setEstado('error');
    }
  };

  const escribir = (valor: string) => {
    setTexto(valor);
    cancelar();
    const limpio = valor.trim();
    if (limpio.length < 2) {
      setEstado('inactivo');
      setResultados([]);
      return;
    }
    setEstado('buscando');
    espera.current = setTimeout(() => void buscar(limpio), ESPERA_MS);
  };

  const limpiar = () => {
    escribir('');
    campo.current?.focus();
  };

  const teclado = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && texto) {
      e.preventDefault();
      escribir('');
      return;
    }
    if (resultados.length === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActivo((i) => (i + (e.key === 'ArrowDown' ? 1 : resultados.length - 1)) % resultados.length);
    } else if (e.key === 'Enter' && estado === 'listo') {
      e.preventDefault();
      onAgregar(resultados[Math.min(activo, resultados.length - 1)]);
    }
  };

  const abierto = estado === 'listo' && resultados.length > 0;
  const sinNada = estado === 'listo' && resultados.length === 0;

  return (
    <div data-buscador>
      <label htmlFor="buscar-producto" className={adminLabel}>Agregar del catálogo</label>
      <div className="relative">
        <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          ref={campo}
          id="buscar-producto"
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={abierto}
          aria-controls="buscar-producto-lista"
          aria-autocomplete="list"
          aria-activedescendant={abierto ? `buscar-producto-${activo}` : undefined}
          aria-describedby="buscar-producto-ayuda"
          value={texto}
          onChange={(e) => escribir(e.target.value)}
          onKeyDown={teclado}
          maxLength={80}
          placeholder="Nombre, marca, categoría o código"
          className={`${adminInput()} pl-9 pr-11`}
        />
        {texto && (
          <button type="button" onClick={limpiar} aria-label="Borrar la búsqueda" className="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-muted hover:text-ink">
            <FiX className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <p id="buscar-producto-ayuda" className={adminHint}>
        Busca mientras escribes, sin importar acentos ni el orden de las palabras. Con el teclado: flechas para elegir y Enter para agregar.
      </p>

      <p className="sr-only" role="status" aria-live="polite">
        {estado === 'buscando' ? 'Buscando' : sinNada ? 'Sin resultados' : abierto ? `${resultados.length} ${resultados.length === 1 ? 'producto' : 'productos'}` : ''}
      </p>

      {estado === 'buscando' && resultados.length === 0 && <p className="mt-3 text-sm text-muted" aria-hidden="true">Buscando…</p>}
      {estado === 'error' && <p className="mt-3 text-sm font-semibold text-deal" role="alert">No se pudo buscar. Revisa la conexión y vuelve a escribir.</p>}
      {sinNada && (
        <p className="mt-3 rounded-xl border border-dashed border-line px-4 py-4 text-sm text-muted" data-sin-resultados>
          Ningún producto publicado responde a &quot;{texto.trim()}&quot;. Prueba con menos palabras o con el código, o agrega una línea libre.
        </p>
      )}

      {resultados.length > 0 && estado !== 'inactivo' && estado !== 'error' && (
        <>
          {aproximado && <p className="mt-3 text-xs font-semibold text-warning-strong" data-aproximado>Nada coincide con todo lo que escribiste. Lo más parecido:</p>}
          <ul
            id="buscar-producto-lista"
            role="listbox"
            aria-label="Productos del catálogo"
            aria-busy={estado === 'buscando'}
            className={`mt-2 max-h-96 divide-y divide-line overflow-y-auto rounded-xl border border-line ${estado === 'buscando' ? 'opacity-60' : ''}`}
          >
            {resultados.map((p, i) => {
              const yaVan = enCotizacion.get(p.id) ?? 0;
              const agotado = p.disponible !== null && p.disponible <= yaVan;
              const accion = (
                <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-brand-600">
                  <FiPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  {yaVan > 0 ? 'Uno más' : 'Agregar'}
                </span>
              );
              return (
                <li
                  key={p.id}
                  id={`buscar-producto-${i}`}
                  role="option"
                  aria-selected={i === activo}
                  // Sin perder el foco del campo: se puede seguir escribiendo o agregando con Enter
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { if (bloqueado) return; setActivo(i); onAgregar(p); }}
                  className={`flex min-h-16 cursor-pointer items-center gap-3 px-3 py-2 ${i === activo ? 'bg-brand-50' : 'bg-white hover:bg-surface'}`}
                  data-resultado
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-white text-muted">
                    {p.imagen ? <Image src={p.imagen} alt="" width={44} height={44} className="h-full w-full object-contain" /> : <FiPackage className="h-5 w-5" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink [overflow-wrap:anywhere]">{p.name}</span>
                    <span className="mt-0.5 block text-xs text-muted [overflow-wrap:anywhere]">{[p.sku, p.marca, p.categoria].filter(Boolean).join(' · ')}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      {p.disponible === null
                        ? <span className={adminBadge('neutral')}>Digital</span>
                        : p.disponible === 0
                          ? <span className={`${adminBadge('danger')} whitespace-nowrap`}>Sin existencias</span>
                          : <span className={`${adminBadge(agotado ? 'warning' : 'success')} whitespace-nowrap`}>{p.disponible} {p.disponible === 1 ? 'disponible' : 'disponibles'}</span>}
                      {yaVan > 0 && (
                        <span className={`${adminBadge('brand')} whitespace-nowrap`} data-ya-van>
                          <FiCheck className="h-3 w-3" aria-hidden="true" />
                          {yaVan} en la cotización
                        </span>
                      )}
                    </span>
                    {/* En el teléfono el precio va debajo: al lado dejaba el nombre en una columna angosta */}
                    <span className="mt-1.5 flex items-center justify-between gap-3 sm:hidden">
                      <span className="text-sm font-semibold tabular-nums text-ink">{formatUSD(p.priceUSD)}</span>
                      {accion}
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-right sm:block">
                    <span className="block text-sm font-semibold tabular-nums text-ink">{formatUSD(p.priceUSD)}</span>
                    <span className="mt-1 block">{accion}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
