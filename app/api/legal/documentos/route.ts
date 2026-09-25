import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { documentosDelCliente } from '@/lib/legal-docs';

// Mis documentos (C-103): los vigentes con su estado de firma y las firmas de versiones anteriores
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  return NextResponse.json(await documentosDelCliente(session.user.id));
}
