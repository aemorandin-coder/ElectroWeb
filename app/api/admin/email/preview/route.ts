import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import {
    capturarCorreo, sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail, sendOrderPendingPaymentEmail,
    sendOrderShippedEmail, sendOrderDeliveredEmail, sendDigitalCodeEmail, sendGiftCardEmail, sendTestEmail,
} from '@/lib/email-service';
import { generateOrderConfirmationEmail } from '@/lib/email-templates/OrderConfirmation';
import { generateReviewReminderEmail } from '@/lib/email-templates/ReviewReminder';
import { sendCourseEnrollmentEmail, sendCourseCertificateEmail, sendCreatorStatusEmail } from '@/lib/email-templates/CourseCertificate';
import { renderCampana } from '@/lib/email-campaigns';

/**
 * Vista previa de los correos (C-75). Antes esta ruta tenía su propia copia de las plantillas (471 líneas):
 * lo que se veía aquí podía no parecerse a lo que recibía el cliente. Ahora llama a las funciones reales
 * dentro de capturarCorreo, que no envía nada.
 */

const DESTINO = 'cliente@ejemplo.com';

const PLANTILLAS: { id: string; name: string; description: string; render: () => Promise<{ subject?: string; html?: string }> }[] = [
    { id: 'welcome', name: 'Bienvenida', description: 'Al crear la cuenta', render: () => capturarCorreo(() => sendWelcomeEmail(DESTINO, 'María')) },
    { id: 'verification', name: 'Verificar correo', description: 'Enlace para activar la cuenta', render: () => capturarCorreo(() => sendVerificationEmail(DESTINO, 'token-de-ejemplo', 'María')) },
    { id: 'password_reset', name: 'Recuperar contraseña', description: 'Enlace para restablecerla', render: () => capturarCorreo(() => sendPasswordResetEmail(DESTINO, 'token-de-ejemplo', 'María')) },
    {
        id: 'order_confirmation', name: 'Pedido recibido', description: 'Cuando el cliente hace una compra',
        render: async () => {
            const ajustes = await prisma.companySettings.findFirst({ select: { companyName: true, logo: true } });
            return {
                subject: 'Confirmación de pedido ORD-2026-0001',
                html: generateOrderConfirmationEmail({
                    companyName: ajustes?.companyName || 'Electro Shop', companyLogo: ajustes?.logo || undefined,
                    orderNumber: 'ORD-2026-0001', customerName: 'María', orderDate: new Date().toLocaleDateString('es-VE'),
                    items: [{ name: 'Audífonos inalámbricos', quantity: 1, price: '49.90' }, { name: 'Cable USB-C', quantity: 2, price: '7.50' }],
                    subtotal: '64.90', shipping: '5.00', tax: '0.00', total: '69.90', currency: 'USD',
                    paymentMethod: 'Pago Móvil', deliveryMethod: 'Delivery', deliveryAddress: 'Av. Principal, Guanare',
                }),
            };
        },
    },
    { id: 'order_pending_payment', name: 'Pago en revisión', description: 'Mientras se verifica el pago', render: () => capturarCorreo(() => sendOrderPendingPaymentEmail(DESTINO, { orderNumber: 'ORD-2026-0001', total: 69.9, customerName: 'María' })) },
    { id: 'order_shipped', name: 'Pedido enviado', description: 'Con transportista y guía', render: () => capturarCorreo(() => sendOrderShippedEmail(DESTINO, { orderNumber: 'ORD-2026-0001', customerName: 'María', trackingNumber: '123456789', shippingCarrier: 'MRW' })) },
    { id: 'order_delivered', name: 'Pedido entregado', description: 'Al marcarlo entregado', render: () => capturarCorreo(() => sendOrderDeliveredEmail(DESTINO, { orderNumber: 'ORD-2026-0001', customerName: 'María' })) },
    {
        id: 'review_reminder', name: 'Reseña del pedido', description: 'Recordatorio tras la entrega',
        render: async () => {
            const ajustes = await prisma.companySettings.findFirst({ select: { companyName: true, logo: true } });
            return {
                subject: '¿Qué te pareció tu compra? - ORD-2026-0001',
                html: generateReviewReminderEmail({
                    companyName: ajustes?.companyName || 'Electro Shop', companyLogo: ajustes?.logo || undefined,
                    customerName: 'María', orderNumber: 'ORD-2026-0001', productName: 'Audífonos inalámbricos', reviewUrl: '#',
                }),
            };
        },
    },
    { id: 'digital_code', name: 'Código digital', description: 'Entrega de un código', render: () => capturarCorreo(() => sendDigitalCodeEmail(DESTINO, { orderNumber: 'ORD-2026-0001', customerName: 'María', productName: 'PlayStation Store $25', code: 'XXXX-XXXX-XXXX', platform: 'PlayStation' })) },
    { id: 'gift_card', name: 'Gift card', description: 'Regalo por correo', render: () => capturarCorreo(() => sendGiftCardEmail(DESTINO, { code: 'GIFT-XXXX-XXXX', amount: 50, senderName: 'José', recipientName: 'María', personalMessage: '¡Feliz cumpleaños!' })) },
    { id: 'course_enrollment', name: 'Inscripción a curso', description: 'Al inscribirse', render: () => capturarCorreo(() => sendCourseEnrollmentEmail(DESTINO, { studentName: 'María', courseTitle: 'Redes desde cero', instructorName: 'Ana', courseSlug: 'redes-desde-cero' })) },
    { id: 'course_certificate', name: 'Certificado de curso', description: 'Al completar un curso', render: () => capturarCorreo(() => sendCourseCertificateEmail(DESTINO, { studentName: 'María', courseTitle: 'Redes desde cero', instructorName: 'Ana', certificateId: 'ejemplo', completedAt: new Date() })) },
    { id: 'creator_status', name: 'Solicitud de creador', description: 'Aprobada, rechazada o suspendida', render: () => capturarCorreo(() => sendCreatorStatusEmail(DESTINO, { creatorName: 'Ana', status: 'APPROVED' })) },
    {
        id: 'campaign', name: 'Campaña de marketing', description: 'Ejemplo con imagen y botón',
        render: async () => ({
            subject: 'Ofertas de la semana',
            html: await renderCampana(
                { subject: 'Ofertas de la semana', bloques: [
                    { tipo: 'titulo', texto: 'Hola {nombre}, llegaron las ofertas' },
                    { tipo: 'texto', texto: 'Esta semana tenemos descuentos en audio y accesorios.\n\nHasta agotar existencias.' },
                    { tipo: 'boton', texto: 'Ver ofertas', url: '/productos' },
                ] },
                { nombre: 'María', enlaceBaja: '#' }
            ),
        }),
    },
    { id: 'test', name: 'Correo de prueba', description: 'Verifica la configuración', render: () => capturarCorreo(() => sendTestEmail(DESTINO)) },
];

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_CONTENT')) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const id = request.nextUrl.searchParams.get('template');
    if (!id) {
        return NextResponse.json({ templates: PLANTILLAS.map(({ id: pid, name, description }) => ({ id: pid, name, description })) });
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
