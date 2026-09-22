// Modo mantenimiento (decisión D3). Lo aplica proxy.ts con los campos que ya configura el admin:
// interruptor, mensaje, ventana de inicio/fin e IPs permitidas. Los admins logueados siempre pasan.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// El proxy corre en cada petición: se lee la base de datos como mucho cada 15 s.
// Al activarlo o desactivarlo en el admin, el cambio tarda hasta 15 s en aplicarse.
const CACHE_MS = 15_000;

type MaintenanceRow = {
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  maintenanceStartTime: Date | null;
  maintenanceEndTime: Date | null;
  maintenanceAllowedIPs: string | null;
  companyName: string;
} | null;

export interface MaintenanceState {
  active: boolean;
  message: string | null;
  endsAt: Date | null;
  allowedIPs: string[];
  companyName: string;
}

let cachedRow: { row: MaintenanceRow; expires: number } | null = null;

async function readRow(now: number): Promise<MaintenanceRow> {
  if (cachedRow && cachedRow.expires > now) return cachedRow.row;

  let row: MaintenanceRow = null;
  try {
    row = await prisma.companySettings.findUnique({
      where: { id: 'default' },
      select: {
        maintenanceMode: true,
        maintenanceMessage: true,
        maintenanceStartTime: true,
        maintenanceEndTime: true,
        maintenanceAllowedIPs: true,
        companyName: true,
      },
    });
  } catch (error) {
    // Si la base de datos falla, la tienda sigue abierta (no se bloquea a nadie por un error)
    console.error('Error reading maintenance settings:', error);
  }

  cachedRow = { row, expires: now + CACHE_MS };
  return row;
}

export function parseAllowedIPs(value: string | null): string[] {
  if (!value) return [];
  return value.split(/[,\s]+/).map((ip) => ip.trim()).filter(Boolean);
}

export async function getMaintenanceState(now: Date = new Date()): Promise<MaintenanceState> {
  const row = await readRow(now.getTime());
  const inactive: MaintenanceState = {
    active: false,
    message: null,
    endsAt: null,
    allowedIPs: [],
    companyName: row?.companyName || 'Electro Shop',
  };

  if (!row?.maintenanceMode) return inactive;
  // Ventana programada: antes del inicio o después del fin, la tienda funciona normal
  if (row.maintenanceStartTime && now < row.maintenanceStartTime) return inactive;
  if (row.maintenanceEndTime && now > row.maintenanceEndTime) return inactive;

  return {
    active: true,
    message: row.maintenanceMessage,
    endsAt: row.maintenanceEndTime,
    allowedIPs: parseAllowedIPs(row.maintenanceAllowedIPs),
    companyName: row.companyName || 'Electro Shop',
  };
}

// Rutas que siguen funcionando durante el mantenimiento: login (para que un admin pueda entrar),
// el panel (tiene su propia protección), autenticación y webhooks de pagos.
export function isMaintenanceExemptPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/api/cron/')
  );
}

export function getRequestIP(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim() || null;
  return headers.get('x-real-ip');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function maintenanceResponse(state: MaintenanceState, isApi: boolean, now: Date = new Date()): NextResponse {
  const retryAfter = state.endsAt
    ? Math.max(60, Math.ceil((state.endsAt.getTime() - now.getTime()) / 1000))
    : 3600;
  const headers = { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' };
  const message = state.message || 'Estamos realizando mejoras en la tienda. Volveremos pronto.';

  if (isApi) {
    return NextResponse.json({ error: 'Tienda en mantenimiento', message }, { status: 503, headers });
  }

  const endsAt = state.endsAt
    ? new Intl.DateTimeFormat('es-VE', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Caracas' }).format(state.endsAt)
    : null;
  const company = escapeHtml(state.companyName);

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>En mantenimiento | ${company}</title>
<style>
  body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#f8f9fa;color:#212529;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;padding:24px;box-sizing:border-box}
  main{max-width:480px;background:#fff;border:1px solid #e9ecef;border-radius:16px;padding:32px 24px;text-align:center}
  h1{margin:0 0 4px;font-size:1.5rem;color:#2a63cd}
  h2{margin:0 0 16px;font-size:1.125rem;font-weight:600}
  p{margin:0 0 12px;line-height:1.6;color:#495057;white-space:pre-line}
  small{color:#6a6c6b}
</style>
</head>
<body>
<main>
  <h1>${company}</h1>
  <h2>Estamos en mantenimiento</h2>
  <p>${escapeHtml(message)}</p>
  ${endsAt ? `<small>Volvemos aproximadamente el ${escapeHtml(endsAt)}.</small>` : ''}
</main>
</body>
</html>`;

  return new NextResponse(html, {
    status: 503,
    headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
  });
}
