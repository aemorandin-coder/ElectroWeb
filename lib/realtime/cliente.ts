'use client';

// Conexión de tiempo real del navegador (C-127). Una sola EventSource por pestaña, compartida por todos los
// componentes que escuchan; se abre con el primero y se cierra cuando se va el último.
// El navegador reconecta solo (el servidor pide 5 s). Al volver, se avisa a quien escucha para que recargue lo que
// pudo perderse mientras tanto: los eventos no se guardan.

import { TIPOS_EVENTO, type EventoTiempoReal } from './eventos';

export type EstadoConexion = 'conectando' | 'conectado' | 'desconectado';

type Oyente = (evento: EventoTiempoReal) => void;

const oyentes = new Set<Oyente>();
const alReconectar = new Set<() => void>();
const alCambiarEstado = new Set<() => void>();
let fuente: EventSource | null = null;
let estado: EstadoConexion = 'desconectado';
let yaConecto = false;
let reintento: ReturnType<typeof setTimeout> | null = null;

function fijarEstado(nuevo: EstadoConexion) {
  if (estado === nuevo) return;
  estado = nuevo;
  alCambiarEstado.forEach((f) => f());
}

function abrir() {
  if (fuente || typeof window === 'undefined' || typeof EventSource === 'undefined') return;
  fuente = new EventSource('/api/realtime');
  fijarEstado('conectando');
  fuente.addEventListener('ready', () => {
    fijarEstado('conectado');
    if (yaConecto) alReconectar.forEach((f) => f());
    yaConecto = true;
  });
  for (const tipo of TIPOS_EVENTO) {
    fuente.addEventListener(tipo, (mensaje) => {
      try {
        const evento = JSON.parse((mensaje as MessageEvent<string>).data) as EventoTiempoReal;
        oyentes.forEach((f) => f(evento));
      } catch {
        // Mensaje roto: se ignora
      }
    });
  }
  fuente.onerror = () => {
    fijarEstado('desconectado');
    // CLOSED: el servidor respondió con error (429, 503) y el navegador no reintenta. Se reabre en 15 s
    if (fuente?.readyState === EventSource.CLOSED) {
      fuente = null;
      if (!reintento) reintento = setTimeout(() => { reintento = null; if (oyentes.size > 0) abrir(); }, 15_000);
    }
  };
}

function cerrarSiNadieEscucha() {
  if (oyentes.size > 0) return;
  fuente?.close();
  fuente = null;
  if (reintento) clearTimeout(reintento);
  reintento = null;
  yaConecto = false;
  fijarEstado('desconectado');
}

/** Escucha los eventos. Devuelve la función para dejar de escuchar. */
export function escuchar(oyente: Oyente, reconectar?: () => void): () => void {
  oyentes.add(oyente);
  if (reconectar) alReconectar.add(reconectar);
  abrir();
  return () => {
    oyentes.delete(oyente);
    if (reconectar) alReconectar.delete(reconectar);
    cerrarSiNadieEscucha();
  };
}

export function estadoConexion(): EstadoConexion {
  return estado;
}

export function alCambiarConexion(f: () => void): () => void {
  alCambiarEstado.add(f);
  return () => {
    alCambiarEstado.delete(f);
  };
}
