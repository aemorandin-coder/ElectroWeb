// C-276: los datos que cambia "Editar", como están ahora. Solo servidor (la página del asistente y PUT /api/customers/[id]).
import { prisma } from '@/lib/prisma';
import type { DatosEditables } from './edicion';

export async function datosEditablesDe(id: string): Promise<DatosEditables | null> {
  const u = await prisma.user.findFirst({
    where: { id, role: 'USER' },
    select: { name: true, email: true, profile: { select: { phone: true, whatsapp: true, customerType: true, companyName: true, taxId: true } } },
  });
  if (!u) return null;
  const p = u.profile;
  return {
    nombre: u.name ?? '', correo: u.email ?? '', telefono: p?.phone ?? '', whatsapp: p?.whatsapp ?? '',
    tipo: p?.customerType === 'COMPANY' ? 'COMPANY' : 'PERSON', empresa: p?.companyName ?? '', rif: p?.taxId ?? '',
  };
}

export type EstadoVerificacion = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

/** La verificación de su empresa: el estado, la nota que tiene y si mandó documentos (para cambiarla desde "Editar") */
export async function verificacionDe(id: string): Promise<{ perfilId: string; estado: EstadoVerificacion; notas: string; documentos: boolean } | null> {
  const p = await prisma.profile.findFirst({
    where: { userId: id, user: { role: 'USER' } },
    select: { id: true, businessVerificationStatus: true, businessVerificationNotes: true, businessConstitutiveAct: true, businessRIFDocument: true },
  });
  if (!p) return null;
  const estado = (['PENDING', 'APPROVED', 'REJECTED'] as const).find((e) => e === p.businessVerificationStatus) ?? 'NONE';
  return { perfilId: p.id, estado, notas: p.businessVerificationNotes ?? '', documentos: Boolean(p.businessConstitutiveAct || p.businessRIFDocument) };
}
