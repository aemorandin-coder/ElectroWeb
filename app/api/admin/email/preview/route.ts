import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { PLANTILLAS } from '@/lib/email-templates/catalogo';

/**
 * Vista previa de los correos (C-75). Llama a las funciones reales dentro de capturarCorreo, que no envía nada.
 * C-219: todos los correos que salen (antes 15 de 26), por grupo, del catálogo de lib/email-templates/catalogo.
 */

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_CONTENT')) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const id = request.nextUrl.searchParams.get('template');
    if (!id) {
        return NextResponse.json({ templates: PLANTILLAS.map(({ id: pid, grupo, name, description }) => ({ id: pid, grupo, name, description })) });
    }

    const plantilla = PLANTILLAS.find((p) => p.id === id);
    if (!plantilla) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });

    try {
        const { subject, html } = await plantilla.render();
        return NextResponse.json({ subject: subject ?? '', html: html ?? '' });
    } catch (error) {
        console.error('Error generando vista previa de correo:', error);
        return NextResponse.json({ error: 'No se pudo generar la vista previa' }, { status: 500 });
    }
}
