import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buscarUsuarioPorCorreo, normalizarCorreo } from '@/lib/correo';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

// Lo usa Gift Cards para avisar si quien recibe todavía no tiene cuenta.
// C-87: antes devolvía el nombre del dueño del correo y no tenía límite: cualquier cliente podía recorrer correos
// y saber quién está registrado y cómo se llama. Ahora solo responde sí/no y con tope por cliente.
const LIMITE = { maxRequests: 30, windowSeconds: 10 * 60 };

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const limite = checkRateLimit(session.user.id, 'users:check', LIMITE);
        if (!limite.success) {
            return NextResponse.json(
                { error: 'Demasiadas consultas. Espera unos minutos.' },
                { status: 429, headers: getRateLimitHeaders(limite, LIMITE) }
            );
        }

        const email = normalizarCorreo(new URL(request.url).searchParams.get('email'));
        if (!email || email.length > 255) {
            return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
        }

        const user = await buscarUsuarioPorCorreo(email);
        return NextResponse.json({ exists: Boolean(user) });
    } catch (error) {
        console.error('Error checking user:', error);
        return NextResponse.json({ error: 'Error al verificar usuario' }, { status: 500 });
    }
}
