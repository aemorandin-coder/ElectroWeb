import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import {
    capturarCorreo, sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail, sendOrderPendingPaymentEmail,
    sendOrderShippedEmail, sendOrderDeliveredEmail, sendDigitalCodeEmail, sendGiftCardEmail, sendTestEmail,
} from '@/lib/email-service';
import { generateOrderConfirmationEmail } from '@/lib/email-templates/OrderConfirmation';
import { generateReviewApprovedEmail } from '@/lib/email-templates/ReviewApproved';
import { correoPedirResenas } from '@/lib/resenas-avisos';
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
            return {
                subject: 'Confirmación de pedido ORD-2026-0001',
                html: await generateOrderConfirmationEmail({
                    orderNumber: 'ORD-2026-0001', customerName: 'María', orderDate: new Date().toLocaleDateString('es-VE'),
                    items: [
                        { name: 'Audífonos inalámbricos', quantity: 1, price: '49.90' },
                        { name: 'Control DualSense PS5', quantity: 1, price: '45.00', condition: 'Usado · Muy bueno', warrantyDays: 30 },
                    ],
                    subtotal: '94.90', discount: '5.00', shipping: '3.00', tax: '12.81', total: '92.90', currency: 'USD',
                    paymentMethod: 'Pago Móvil', paid: true, deliveryMethod: 'Delivery en Guanare', deliveryAddress: 'Av. Principal, Guanare',
                }),
            };
        },
    },
    { id: 'order_pending_payment', name: 'Pago en revisión', description: 'Mientras se verifica el pago', render: () => capturarCorreo(() => sendOrderPendingPaymentEmail(DESTINO, { orderNumber: 'ORD-2026-0001', total: 69.9, customerName: 'María' })) },
    { id: 'order_shipped', name: 'Pedido enviado', description: 'Con transportista y guía', render: () => capturarCorreo(() => sendOrderShippedEmail(DESTINO, { orderNumber: 'ORD-2026-0001', customerName: 'María', trackingNumber: '123456789', shippingCarrier: 'MRW' })) },
    { id: 'order_delivered', name: 'Pedido entregado', description: 'Al marcarlo entregado', render: () => capturarCorreo(() => sendOrderDeliveredEmail(DESTINO, { orderNumber: 'ORD-2026-0001', customerName: 'María' })) },
    {
        id: 'review_reminder', name: 'Pedir la reseña', description: 'Cinco días después de la entrega (dos si es digital)',
        render: async () => {
            const { asunto, html } = await correoPedirResenas('ejemplo', 'María', [
                { nombre: 'Audífonos inalámbricos', slug: 'audifonos-inalambricos', imagen: null, precioUSD: 25 },
                { nombre: 'Teclado mecánico', slug: 'teclado-mecanico', imagen: null, precioUSD: 18 },
            ]);
            return { subject: asunto, html };
        },
    },
    {
        id: 'review_approved', name: 'Reseña publicada', description: 'Cuando el equipo aprueba una reseña',
        render: async () => ({
            subject: 'Tu reseña ya está publicada - Audífonos inalámbricos',
            html: await generateReviewApprovedEmail({ customerName: 'María', productName: 'Audífonos inalámbricos', productUrl: `${process.env.NEXTAUTH_URL || ''}/productos/audifonos-inalambricos#resenas`, rating: 5 }),
        }),
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
