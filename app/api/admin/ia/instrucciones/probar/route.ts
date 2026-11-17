import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { esRespuesta, exigirPersonaDeIa } from '@/lib/ia/acceso';
import { probarInstrucciones } from '@/lib/ia/probar';
import { INSTRUCCIONES_MAX, INSTRUCCIONES_MIN, USOS_IA } from '@/lib/ia/reglas';
import { prisma } from '@/lib/prisma';

// C-288 · Probar unas instrucciones antes de publicarlas.
//   GET  → los casos que se pueden elegir: las últimas 10 consultas (su id, el primer nombre y el asunto)
//   POST { uso, texto, caso } → corre ese uso con esas instrucciones (sin guardarlas) y un caso real y devuelve el resultado en
//          texto, qué reglas de la tienda pasó y lo que atajó. No guarda nada. Cuesta lo mismo que un pedido de verdad: queda
//          anotado como "prueba" y no cuenta en lo del mes.
//   El caso: busqueda, el nombre del producto · campana, el objetivo · respuesta, el id de una consulta · urgencia, un texto de
//   mensaje · proveedor, "CÓDIGO · NOMBRE DEL PROVEEDOR" · cliente, el correo de un cliente.
export const dynamic = 'force-dynamic';

const cuerpo = z.object({
  uso: z.enum(USOS_IA.map((u) => u.id) as [string, ...string[]]),
  texto: z.string().trim().min(INSTRUCCIONES_MIN, 'Las instrucciones llevan al menos 50 caracteres').max(INSTRUCCIONES_MAX),
  caso: z.string().trim().min(2, 'Escribe el caso para probar').max(1000),
});

export async function GET() {
  const persona = await exigirPersonaDeIa('leer-casos', null);
  if (esRespuesta(persona)) return persona;
  const consultas = await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, name: true, subject: true } });
  return NextResponse.json({
    consultas: consultas.map((c) => ({ id: c.id, nombre: c.name.trim().split(/\s+/)[0] || 'Cliente', asunto: c.subject.slice(0, 80) })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  // Seis por minuto: cada prueba es un pedido de verdad a Claude
  const persona = await exigirPersonaDeIa('probar-instrucciones', { maxRequests: 6, windowSeconds: 60 });
  if (esRespuesta(persona)) return persona;
  const datos = cuerpo.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: datos.error.issues[0]?.message ?? 'Datos no válidos' }, { status: 400 });
  const r = await probarInstrucciones({ uso: datos.data.uso as Parameters<typeof probarInstrucciones>[0]['uso'], texto: datos.data.texto, caso: datos.data.caso, usuarioId: persona.id });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.estado });
  return NextResponse.json(r);
}
