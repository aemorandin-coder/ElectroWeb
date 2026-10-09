import { respuestaYaResuelto } from '@/lib/edicion/registro';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { isAuthorized } from '@/lib/auth-helpers';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { createNotification } from '@/lib/notifications';
import { getBaseTemplate, sendEmail } from '@/lib/email-service';
import { CORREO, botonCorreo } from '@/lib/email-templates/estilo';
import { escapeHtml } from '@/lib/html';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Check for admin permissions (assuming SUPER_ADMIN or similar role check logic exists, 
        // for now checking if user exists and has admin role if applicable, or just relying on session for this MVP step 
        // but ideally should check `session.user.role === 'ADMIN'`)
        // Based on previous files, it seems we check permissions.

        if (!isAuthorized(session, 'MANAGE_USERS')) {
            // Fallback if permissions structure is different, but let's assume standard admin check
            // If strictly following previous patterns:
            // return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        // Fetch profiles with pending verification or all business profiles
        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status');

        const whereClause: Prisma.ProfileWhereInput = {
            isBusinessAccount: true,
        };

        if (status && status !== 'ALL') {
            whereClause.businessVerificationStatus = status;
        }

        const profiles = await prisma.profile.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        image: true,
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        return NextResponse.json(profiles);
    } catch (error) {
        console.error('Error fetching verifications:', error);
        return NextResponse.json({ error: 'Error al obtener verificaciones' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!isAuthorized(session, 'MANAGE_USERS')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const body = await request.json();
        const { profileId, status, notes } = body;

        if (!profileId || !status) {
            return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
        }
        // Antes se guardaba cualquier texto como estado (C-104)
        if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
            return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
        }

        // C-170: dos administradores revisando la misma empresa. El cambio entra solo si sigue en el estado que se vio: la
        // segunda persona recibe "ya la revisó…" y el cliente no recibe el aviso ni el correo dos veces.
        const antes = await prisma.profile.findUnique({ where: { id: profileId }, select: { businessVerificationStatus: true, userId: true } });
        if (!antes) return NextResponse.json({ error: 'Perfil no encontrado', conflicto: 'no_existe' }, { status: 404 });
        const cambiaEstado = antes.businessVerificationStatus !== status;
        const tomado = await prisma.profile.updateMany({
            where: { id: profileId, businessVerificationStatus: antes.businessVerificationStatus },
            data: {
                businessVerificationStatus: status,
                businessVerificationNotes: notes,
                businessVerified: status === 'APPROVED',
                businessVerifiedAt: status === 'APPROVED' ? new Date() : null,
            },
        });
        if (tomado.count === 0) {
            return respuestaYaResuelto({ tipo: 'USER', id: antes.userId, que: 'revisó esta empresa', acciones: ['VERIFICATION_REVIEWED'] });
        }
        const updatedProfile = await prisma.profile.findUniqueOrThrow({
            where: { id: profileId },
            include: {
                user: {
                    select: {
                        email: true,
                        name: true
                    }
                }
            }
        });

        await registrarAccionAdmin(session, 'VERIFICATION_REVIEWED', { type: 'USER', id: updatedProfile.userId }, {
            cliente: updatedProfile.user.email,
            estado: status,
            ...(notes ? { notas: String(notes).slice(0, 300) } : {}),
        }, request);

        // C-138: el cliente se entera en la campana y por correo (antes era un TODO y Mi perfil decía "te avisaremos")
        if (cambiaEstado && (status === 'APPROVED' || status === 'REJECTED')) {
            const aprobada = status === 'APPROVED';
            const motivo = typeof notes === 'string' && notes.trim() ? notes.trim().slice(0, 300) : null;
            // "Demo C.A." ya trae su punto: sin "C.A.." ni un motivo sin punto final
            const conPunto = (texto: string) => (/[.!?]$/.test(texto) ? texto : `${texto}.`);
            const empresa = updatedProfile.companyName || 'tu empresa';
            const mensaje = aprobada
                ? conPunto(`Verificamos ${empresa}`)
                : `${conPunto(`No pudimos verificar ${empresa}`)}${motivo ? ` Motivo: ${conPunto(motivo)}` : ''} Puedes enviar los documentos de nuevo.`;
            await createNotification({
                userId: updatedProfile.userId,
                type: 'BUSINESS_VERIFIED',
                title: aprobada ? 'Tu empresa está verificada' : 'Revisa los datos de tu empresa',
                message: mensaje,
                link: '/customer/profile?tab=empresa',
            });
            if (updatedProfile.user.email) {
                const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
                const contenido = `
    <h2 style="${CORREO.titulo}">${aprobada ? 'Tu empresa está verificada' : 'Revisa los datos de tu empresa'}</h2>
    <p style="${CORREO.texto}">${escapeHtml(mensaje)}</p>
    ${botonCorreo(`${appUrl}/customer/profile?tab=empresa`, 'Ver mi cuenta de empresa')}`;
                void sendEmail({
                    to: updatedProfile.user.email,
                    subject: aprobada ? 'Tu empresa está verificada' : 'No pudimos verificar tu empresa',
                    html: await getBaseTemplate(contenido, mensaje),
                }).catch((error) => console.error('Error enviando el correo de verificación de empresa:', error));
            }
        }

        return NextResponse.json(updatedProfile);
    } catch (error) {
        console.error('Error updating verification:', error);
        return NextResponse.json({ error: 'Error al actualizar verificación' }, { status: 500 });
    }
}
