import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { sesionValida } from '@/lib/sesiones';
import { authOptions } from '@/lib/auth';
import { esAdminVerificado, esDelPanelVerificado, isAuthorized } from '@/lib/auth-helpers';
import { permisoDeRecurso } from '@/lib/realtime/recursos';
import { ipParaRegistro } from '@/lib/ip';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { conectados, suscribir } from '@/lib/realtime/bus';
import { TIPOS_EVENTO, type EventoTiempoReal, type TipoEvento } from '@/lib/realtime/eventos';

// GET /api/realtime (C-127): Server-Sent Events. Una conexión por pestaña (la abre lib/realtime/cliente.ts).
// - Cualquiera: `inventory:stock_changed` (el stock ya es público en la ficha).
// - Cliente con sesión: además, las órdenes y los pagos suyos.
// - Equipo con MANAGE_ORDERS: todas las órdenes y todos los pagos.
// Se eligió SSE y no WebSockets: todo va del servidor al navegador, pasa por nginx sin configuración nueva
// (con `X-Accel-Buffering: no`) y el navegador reconecta solo.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LATIDO_MS = 25_000; // nginx corta a los 60 s sin datos
const DURACION_MAX_MS = 30 * 60_000; // se reconecta y vuelve a leer la sesión (un permiso quitado deja de valer)
const MAX_CONEXIONES = 2_000;
// S-15: una sola IP no puede llenar el total y dejar sin tiempo real a todos (y al panel). Quien no es del panel tiene un
// tope por IP, y los últimos CUPOS_DEL_PANEL del total son solo del panel (con sus dos pasos). El tope por IP es holgado:
// con el CGNAT de las operadoras, muchos clientes de teléfono comparten una misma IP.
const MAX_POR_IP = 100;
const CUPOS_DEL_PANEL = 100;
// C-140: con sesión, se revisa cada 2 min que siga abierta (cerrada, otra sesión de admin, 1 h sin uso)
const REVISAR_SESION_MS = 2 * 60_000;

// Conexiones abiertas por IP (solo las de quien no es del panel). Como el bus, vive en globalThis: en desarrollo el módulo se recarga
const global = globalThis as unknown as { __electroshopConexionesPorIp?: Map<string, number> };
const conexionesPorIp = global.__electroshopConexionesPorIp ?? (global.__electroshopConexionesPorIp = new Map<string, number>());

function liberarIp(ip: string): void {
  const quedan = (conexionesPorIp.get(ip) ?? 0) - 1;
  if (quedan > 0) conexionesPorIp.set(ip, quedan);
  else conexionesPorIp.delete(ip);
}

const servidorOcupado = () => new Response('Servidor ocupado', { status: 503, headers: { 'Retry-After': '30' } });

export async function GET(request: NextRequest) {
  const ip = ipParaRegistro(request.headers);
  // Límite por IP holgado: con el CGNAT de las operadoras muchos clientes comparten IP
  if (!checkRateLimit(ip, 'realtime:connect', RATE_LIMITS.PUBLIC).success) {
    return new Response('Demasiadas conexiones', { status: 429 });
  }
  if (conectados() >= MAX_CONEXIONES) return servidorOcupado();

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const token = userId ? await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }) : null;
  const equipo = isAuthorized(session, 'MANAGE_ORDERS');

  // S-15: el panel verificado entra aunque su IP esté llena y usa los cupos reservados; los demás no pasan de
  // MAX_CONEXIONES - CUPOS_DEL_PANEL en total ni de MAX_POR_IP por IP. Sin IP conocida ('desconocida': nginx sin
  // X-Real-IP) no hay tope por IP: todos compartirían el mismo contador y una mala configuración dejaría sin tiempo real a la tienda.
  const delPanel = esDelPanelVerificado(session);
  const contarIp = !delPanel && ip !== 'desconocida';
  if (!delPanel) {
    if (conectados() >= MAX_CONEXIONES - CUPOS_DEL_PANEL) return servidorOcupado();
    if (contarIp && (conexionesPorIp.get(ip) ?? 0) >= MAX_POR_IP) return servidorOcupado();
  }

  const pedidos = new URL(request.url).searchParams.get('tipos')?.split(',').filter((t): t is TipoEvento => TIPOS_EVENTO.includes(t as TipoEvento));
  const tipos = new Set<TipoEvento>(pedidos?.length ? pedidos : TIPOS_EVENTO);

  const puedeVer = (evento: EventoTiempoReal): boolean => {
    if (!tipos.has(evento.tipo)) return false;
    switch (evento.tipo) {
      case 'inventory:stock_changed':
        return true;
      case 'order:status_updated':
      case 'payment:verified':
        return equipo || (userId !== null && evento.userId === userId);
      // C-169: solo el equipo con el permiso del recurso; nunca un cliente ni un administrador sin los dos pasos
      case 'admin:presencia':
      case 'admin:recurso_cambiado': {
        const permiso = permisoDeRecurso(evento.recurso);
        return permiso !== null && esAdminVerificado(session) && isAuthorized(session, permiso);
      }
    }
  };

  const encoder = new TextEncoder();
  let cerrar: () => void = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let abierto = true;
      const enviar = (texto: string) => {
        if (!abierto) return;
        try {
          controller.enqueue(encoder.encode(texto));
        } catch {
          cerrar();
        }
      };

      const quitar = suscribir((evento) => {
        if (puedeVer(evento)) enviar(`event: ${evento.tipo}\ndata: ${JSON.stringify(evento)}\n\n`);
      });
      if (contarIp) conexionesPorIp.set(ip, (conexionesPorIp.get(ip) ?? 0) + 1);
      const latido = setInterval(() => enviar(': ping\n\n'), LATIDO_MS);
      const limite = setTimeout(() => cerrar(), DURACION_MAX_MS);
      const revision = token
        ? setInterval(() => {
            void sesionValida(token).then((vale) => { if (!vale) cerrar(); }).catch(() => undefined);
          }, REVISAR_SESION_MS)
        : null;

      cerrar = () => {
        if (!abierto) return;
        abierto = false;
        quitar();
        if (contarIp) liberarIp(ip);
        clearInterval(latido);
        clearTimeout(limite);
        if (revision) clearInterval(revision);
        try {
          controller.close();
        } catch {
          // Ya cerrado por el navegador
        }
      };

      request.signal.addEventListener('abort', () => cerrar());
      // retry: el navegador espera 5 s antes de reconectar. `ready` le dice a la página a quién escucha
      enviar(`retry: 5000\nevent: ready\ndata: ${JSON.stringify({ sesion: userId !== null, equipo })}\n\n`);
    },
    cancel() {
      cerrar();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
