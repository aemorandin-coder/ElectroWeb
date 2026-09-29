import type { EstadoConexion } from '@/lib/realtime/cliente';

/** "En vivo" (C-127): la pantalla se actualiza sola. Sin conexión dice que se reintenta (y la pantalla consulta de a ratos). */
export function EnVivo({ estado }: { estado: EstadoConexion }) {
  const conectado = estado === 'conectado';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted" role="status" aria-live="polite">
      <span className={`h-2 w-2 rounded-full ${conectado ? 'bg-success' : 'bg-subtle'}`} aria-hidden="true" />
      {conectado ? 'En vivo' : estado === 'conectando' ? 'Conectando…' : 'Reconectando…'}
    </span>
  );
}
