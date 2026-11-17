'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { IconoAjustes, IconoBillete, IconoBuscar, IconoCheck, IconoEnVivo, IconoReloj } from '@/components/iconos';
import type { DatosRecepcion } from '@/lib/dashboard/recepcion';
import CifraAnimada from './CifraAnimada';
import { IconoPor } from './iconos';
import { corriente, dibujar, entra, quieto } from './movimiento';
import s from './tablero.module.css';
import { useVisitantes } from './VisitantesAhora';

// C-279: la recepción del Dashboard (la "recepción A" que eligió el equipo el 17/11). En lugar del título "Dashboard": el
// saludo, la frase del día armada con los datos, el buscador (Ctrl K), los pasos del día en su columna y el pulso de la tienda
// (la tasa, el corte de despachos y quién está en la tienda). La banda en el azul oscuro del logo es la pieza fuerte de la
// pantalla. Al entrar, una sola vez: el destello la barre, el saludo sube palabra por palabra y la corriente enciende los pasos.

interface Props {
  datos: DatosRecepcion;
  editando: boolean;
  onBuscar: () => void;
  onPersonalizar: () => void;
  /** Baja hasta esa tarjeta del tablero; false si no está puesta */
  onIrA: (widget: string) => boolean;
}

export default function Recepcion({ datos, editando, onBuscar, onPersonalizar, onIrA }: Props) {
  const raiz = useRef<HTMLElement>(null);
  const pasos = useRef<HTMLDivElement>(null);
  const visitantes = useVisitantes(datos.verVisitantes);

  // La llegada, una vez al abrir el Dashboard
  useEffect(() => {
    const hero = raiz.current;
    if (!hero) return;
    if (quieto()) { corriente(pasos.current); return; }
    entra(hero, 'zoom', 0);
    hero.querySelector(`.${s.heroDestello}`)?.classList.add(s.destelloPasa);
    entra(hero.querySelector(`.${s.heroSobre}`), 'barrido', 150);
    hero.querySelectorAll(`.${s.palabra}`).forEach((p, i) => entra(p, 'sube', 260 + i * 70));
    entra(hero.querySelector(`.${s.heroFrase}`), 'nitido', 650);
    hero.querySelectorAll('[data-paso]').forEach((p, i) => { entra(p, 'sello', 850 + i * 110); dibujar(p.querySelector('svg'), 950 + i * 110, 600); });
    entra(hero.querySelector(`.${s.buscador}`), 'sube', 1000);
    hero.querySelectorAll(`.${s.pulsoFila}`).forEach((p, i) => { entra(p, 'sube', 700 + i * 110); dibujar(p.querySelector('svg'), 760 + i * 110, 650); });
    const reloj = window.setTimeout(() => corriente(pasos.current), 1350);
    return () => window.clearTimeout(reloj);
  }, []);

  const total = visitantes?.total ?? 0;
  return (
    <section ref={raiz} className={s.hero} aria-labelledby="saludo">
      <div className={s.heroTrama} aria-hidden="true" />
      <div className={s.heroDestello} aria-hidden="true" />
      <div className={s.heroMarca} aria-hidden="true">ELECTRO SHOP</div>
      <button type="button" onClick={onPersonalizar} className={s.personalizar} aria-label={editando ? 'Listo: guardar el tablero' : 'Personalizar el tablero'}>
        {editando ? <IconoCheck aria-hidden="true" /> : <IconoAjustes aria-hidden="true" />}
        <span>{editando ? 'Listo' : 'Personalizar'}</span>
      </button>

      <div className={s.heroRejilla}>
        <div className={s.heroTexto}>
          <p className={s.heroSobre}><span>Recepción</span><span className={s.punto} aria-hidden="true" /><span>{datos.fecha}</span></p>
          <h1 id="saludo">
            {datos.saludo.split(' ').map((palabra, i) => <span key={i} className={s.palabra}>{palabra} </span>)}
          </h1>
          <p className={s.heroFrase}>{datos.frase.map((p, i) => (p.fuerte ? <b key={i}>{p.texto}</b> : <span key={i}>{p.texto}</span>))}</p>
          <button type="button" className={s.buscador} onClick={onBuscar} aria-keyshortcuts="Control+K Meta+K">
            <IconoBuscar aria-hidden="true" />
            <span>Busca una acción, un producto o una orden…</span>
            <kbd className={s.kbd}>Ctrl K</kbd>
          </button>
        </div>

        <div ref={pasos} className={s.heroPasos} role="group" aria-label="Lo que toca hoy">
          <svg className={s.corriente} data-corriente aria-hidden="true"><path d="" /><circle r="3.5" cx="-20" cy="-20" /></svg>
          {datos.pasos.map((p, i) => (
              <Link
                key={p.id}
                href={p.href}
                data-paso={p.id}
                className={`${s.paso} ${i === 0 ? s.pasoPrimero : ''}`}
                onClick={(e) => { if (p.widget && onIrA(p.widget)) e.preventDefault(); }}
              >
                <span className={s.pasoIc} aria-hidden="true"><IconoPor nombre={p.icono} /></span>
                {p.texto}
                {p.cuenta ? <span className={s.cuenta}>{p.cuenta}</span> : null}
              </Link>
          ))}
        </div>

        <aside className={s.pulso} aria-label="El pulso de la tienda">
          <h2>El pulso de la tienda</h2>
          {datos.tasa && (
            <div className={s.pulsoFila}>
              <span className={s.placa} aria-hidden="true"><IconoBillete /></span>
              <div>
                <b><CifraAnimada valor={datos.tasa.valor} formato="ves" desde={datos.tasa.valor * 0.985} retraso={750} /></b>
                <small>por dólar{datos.tasa.automatica ? ' · se actualiza sola' : ''}</small>
              </div>
            </div>
          )}
          <div className={s.pulsoFila}>
            <span className={s.placa} aria-hidden="true"><IconoReloj /></span>
            <div><b>Corte: {datos.corte.hora}</b><small>{datos.corte.texto}</small></div>
          </div>
          {datos.verVisitantes && (
            <div className={s.pulsoFila}>
              <span className={s.placa} aria-hidden="true"><IconoEnVivo /></span>
              <div>
                <b><span className={`${s.vivo} ${s.vivoLate}`} aria-hidden="true" />{total} en la tienda</b>
                <small>{visitantes ? `${visitantes.conCuenta} con cuenta · ${visitantes.conCarrito} con carrito` : 'Mirando quién está…'}</small>
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
