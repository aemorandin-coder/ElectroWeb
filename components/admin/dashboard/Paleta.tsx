'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { IconoBuscar, IconoChevronDerecha } from '@/components/iconos';
import { formatUSD } from '@/lib/currency';
import { normalizar, type AccionPaleta } from '@/lib/dashboard/paleta';
import type { PasoDelDia } from '@/lib/dashboard/recepcion';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { IconoPor } from './iconos';
import { entra } from './movimiento';
import s from './tablero.module.css';

// C-279: el buscador del Dashboard (Ctrl K o el botón de la recepción). Busca acciones y pantallas del panel (aquí mismo) y
// productos y órdenes (en /api/admin/buscar, con los permisos de cada uno). Sin texto, muestra lo de hoy y las acciones de
// siempre. Teclado: flechas, Enter y Escape. Sin Claude por ahora (decisión del equipo del 17/11).

interface ProductoEncontrado { id: string; nombre: string; stock: number; precioUSD: number; foto: string | null; publicado: boolean; digital: boolean }
interface OrdenEncontrada { id: string; numero: string; totalUSD: number; estado: string; cliente: string }

interface Opcion {
  clave: string;
  grupo: string;
  titulo: string;
  detalle?: string;
  icono?: string;
  foto?: string | null;
  derecha?: string;
  href?: string;
  hacer?: () => void;
}

interface Props {
  abierta: boolean;
  onCerrar: () => void;
  acciones: AccionPaleta[];
  pasos: PasoDelDia[];
  onPersonalizar: () => void;
}

export default function Paleta({ abierta, onCerrar, acciones, pasos, onPersonalizar }: Props) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [activa, setActiva] = useState(0);
  const [remoto, setRemoto] = useState<{ q: string; productos: ProductoEncontrado[]; ordenes: OrdenEncontrada[] } | null>(null);
  const [buscando, setBuscando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const antes = useRef<Element | null>(null);
  useBodyScrollLock(abierta);

  // Al abrir: el foco en el campo; al cerrar, vuelve a donde estaba
  useEffect(() => {
    if (!abierta) return;
    antes.current = document.activeElement;
    entra(caja.current, 'zoom', 0);
    const t = window.setTimeout(() => entrada.current?.focus(), 30);
    return () => {
      window.clearTimeout(t);
      if (antes.current instanceof HTMLElement) antes.current.focus();
    };
  }, [abierta]);

  // Productos y órdenes: se piden al dejar de teclear, y la búsqueda anterior se cancela
  const texto = q.trim();
  useEffect(() => {
    if (!abierta || texto.length < 2) return;
    const control = new AbortController();
    const t = window.setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await fetch(`/api/admin/buscar?q=${encodeURIComponent(texto)}`, { signal: control.signal, cache: 'no-store' });
        if (res.ok) setRemoto({ q: texto, ...(await res.json()) });
      } catch {
        // Cancelada o sin conexión: quedan las acciones
      } finally {
        if (!control.signal.aborted) setBuscando(false);
      }
    }, 200);
    return () => { window.clearTimeout(t); control.abort(); };
  }, [abierta, texto]);

  const opciones = useMemo<Opcion[]>(() => {
    const deAccion = (a: AccionPaleta): Opcion => ({ clave: a.id, grupo: a.grupo, titulo: a.titulo, icono: a.icono, href: a.href });
    const personalizar: Opcion = { clave: 'personalizar', grupo: 'Acciones', titulo: 'Personalizar el tablero', icono: 'Cuadricula', hacer: onPersonalizar };
    if (!texto) {
      return [
        ...pasos.map((p) => ({ clave: `paso-${p.id}`, grupo: 'Para hoy', titulo: p.texto, detalle: p.cuenta ? `${p.cuenta} ${p.cuenta === 1 ? 'pendiente' : 'pendientes'}` : undefined, icono: p.icono, href: p.href })),
        ...acciones.filter((a) => a.grupo === 'Acciones').slice(0, 5).map(deAccion),
        personalizar,
        ...acciones.filter((a) => a.grupo === 'Ir a').slice(0, 5).map(deAccion),
      ];
    }
    const palabras = normalizar(texto).split(/\s+/).filter(Boolean);
    const coincide = (t: string) => palabras.every((p) => normalizar(t).includes(p));
    const locales = [...acciones, { id: 'personalizar', titulo: personalizar.titulo, claves: 'editar widgets tamano plantilla', icono: 'Cuadricula', href: '', grupo: 'Acciones' as const, permisos: [] }]
      .filter((a) => coincide(`${a.titulo} ${a.claves}`))
      .map((a) => (a.id === 'personalizar' ? personalizar : deAccion(a)));
    const vigente = remoto && remoto.q === texto ? remoto : null;
    const productos: Opcion[] = (vigente?.productos ?? []).map((p) => ({
      clave: `p-${p.id}`, grupo: 'Productos', titulo: p.nombre, foto: p.foto, icono: 'Paquete', href: `/admin/products/${p.id}`,
      detalle: `${formatUSD(p.precioUSD)} · ${p.digital ? 'digital' : p.stock === 0 ? 'agotado' : p.stock === 1 ? 'queda 1' : `${p.stock} en existencia`}${p.publicado ? '' : ' · sin publicar'}`,
    }));
    const ordenes: Opcion[] = (vigente?.ordenes ?? []).map((o) => ({
      clave: `o-${o.id}`, grupo: 'Órdenes', titulo: `Orden ${o.numero}`, detalle: `${o.cliente} · ${o.estado}`, icono: 'Ordenes',
      derecha: formatUSD(o.totalUSD), href: `/admin/orders?orden=${encodeURIComponent(o.numero)}`,
    }));
    return [...locales.filter((o) => o.grupo === 'Acciones'), ...ordenes, ...productos, ...locales.filter((o) => o.grupo === 'Ir a')];
  }, [texto, acciones, pasos, remoto, onPersonalizar]);

  const elegir = (o: Opcion | undefined) => {
    if (!o) return;
    onCerrar();
    if (o.hacer) o.hacer();
    else if (o.href) router.push(o.href);
  };

  const teclas = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') { e.preventDefault(); onCerrar(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActiva((i) => Math.min(opciones.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiva((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); elegir(opciones[Math.min(activa, opciones.length - 1)]); }
    else if (e.key === 'Tab') e.preventDefault(); // el foco se queda en el campo: la lista se recorre con las flechas
  };

  // La opción marcada siempre a la vista
  useEffect(() => {
    document.getElementById(`paleta-op-${activa}`)?.scrollIntoView({ block: 'nearest' });
  }, [activa]);

  if (!abierta) return null;
  const actual = Math.min(activa, Math.max(0, opciones.length - 1));
  let grupoAnterior = '';
  return (
    <div className={s.paletaVelo} onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div ref={caja} className={s.paleta} role="dialog" aria-modal="true" aria-label="Buscar en el panel" onKeyDown={teclas}>
        <div className={s.paletaEntrada}>
          <IconoBuscar aria-hidden="true" />
          <input
            ref={entrada}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActiva(0); }}
            placeholder="Una acción, un producto o una orden (número, cliente o referencia)"
            role="combobox"
            aria-expanded="true"
            aria-controls="paleta-lista"
            aria-activedescendant={opciones.length ? `paleta-op-${actual}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className={s.kbd}>Esc</kbd>
        </div>
        <div id="paleta-lista" className={s.paletaLista} role="listbox" aria-label="Resultados">
          {opciones.length === 0 ? (
            <p className={s.paletaNada}>
              {buscando || (texto.length >= 2 && remoto?.q !== texto) ? 'Buscando…' : `Nada con «${texto}». Prueba con el nombre de un producto, una acción ("cupón", "cotización") o el número de una orden.`}
            </p>
          ) : opciones.map((o, i) => {
            const cabeza = o.grupo !== grupoAnterior ? <p key={`g-${o.grupo}`} className={s.paletaGrupo} role="presentation">{o.grupo}</p> : null;
            grupoAnterior = o.grupo;
            return [
              cabeza,
              <div
                key={o.clave}
                id={`paleta-op-${i}`}
                role="option"
                aria-selected={i === actual}
                className={`${s.opcion} ${i === actual ? s.opcionActiva : ''}`}
                onMouseMove={() => { if (i !== actual) setActiva(i); }}
                onClick={() => elegir(o)}
              >
                {o.foto
                  ? <span className={`${s.foto} relative overflow-hidden`}><Image src={o.foto} alt="" fill sizes="36px" className="object-contain" unoptimized={!o.foto.startsWith('/')} /></span>
                  : <span className={`${s.placa} ${o.grupo === 'Para hoy' ? s.placaAccion : o.grupo === 'Ir a' ? s.placaGris : s.placaClara}`} aria-hidden="true"><IconoPor nombre={o.icono ?? 'Cuadricula'} /></span>}
                <span className={s.filaTexto}><b>{o.titulo}</b>{o.detalle && <small>{o.detalle}</small>}</span>
                {o.derecha ? <span className={s.derecha}>{o.derecha}</span> : i === actual ? <IconoChevronDerecha className="ml-auto shrink-0 text-brand-600" aria-hidden="true" /> : null}
              </div>,
            ];
          })}
        </div>
        <div className={s.paletaPie} aria-hidden="true">
          <span><kbd>↑</kbd> <kbd>↓</kbd> para moverte</span><span><kbd>Enter</kbd> para abrir</span><span><kbd>Esc</kbd> para cerrar</span>
        </div>
      </div>
    </div>
  );
}
