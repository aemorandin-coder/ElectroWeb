/**
 * C-219: el catálogo de todos los correos que envía la tienda, con datos de ejemplo, para la vista previa del panel
 * (Marketing → Correos → Plantillas) y para revisarlos a mano. Llama a las funciones reales: lo que se ve es lo que sale.
 * Nada aquí envía: los `send*` van dentro de capturarCorreo.
 */
import {
    capturarCorreo, sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail, sendOrderShippedEmail,
    sendShipmentUpdateEmail, sendOrderDeliveredEmail, sendDigitalCodeEmail, sendGiftCardEmail, sendTestEmail,
    sendWarrantyUpdateEmail,
} from '@/lib/email-service';
import { asuntoConfirmacion, generateOrderConfirmationEmail } from '@/lib/email-templates/OrderConfirmation';
import { generateReviewApprovedEmail } from '@/lib/email-templates/ReviewApproved';
import { sendCourseEnrollmentEmail, sendCourseCertificateEmail, sendCreatorStatusEmail } from '@/lib/email-templates/CourseCertificate';
import { correoListoParaRetirar, correoOrdenCancelada } from '@/lib/email-templates/pedidos';
import { correoComisionAcreditada, correoPagoAPuntos, correoRecargaAprobada, correoRecargaRechazada } from '@/lib/email-templates/puntos';
import { correoContrasenaCambiada, correoEliminarCuenta, correoInvitacionEquipo, correoSesionNueva } from '@/lib/email-templates/cuenta';
import {
    correoContactoRecibido, correoGarantiaRecibida, correoPresupuestoAprobado, correoPresupuestoPedido, correoRespuestaContacto,
    correoSolicitudLista, correoSolicitudRecibida,
} from '@/lib/email-templates/servicio';
import {
    correoBoletoSorteo, correoCursoAprobado, correoDescuentoAprobado, correoEmpresaVerificada, correoGanadorSorteo,
    correoGiftCardCanjeada, correoGiftCardEntregada, correoPromotorAprobado, correoPromotorNoAprobado, correoRecordatorioSorteo,
    correoResultadoSorteo, correoVentaPromotor, type DatosSorteo,
} from '@/lib/email-templates/comunidad';
import { correoPedirResenas } from '@/lib/resenas-avisos';
import { correoFavoritos } from '@/lib/favoritos-avisos';
import { correoCotizacion } from '@/lib/cotizaciones/correo';
import { buildAlertEmailHtml } from '@/lib/admin-alerts';
import { renderCampana } from '@/lib/email-campaigns';
import type { CotizacionAdmin } from '@/lib/cotizaciones';
import {
    correoBienvenidaProveedor, correoCancelacionProveedor, correoRecordatorioProveedor, correoVentaProveedor, type DespachoCorreo,
} from '@/lib/email-templates/proveedores';
import { fotoCorreo } from '@/lib/email-templates/marco';


const DESTINO = 'cliente@ejemplo.com';
const ORDEN = 'ORD-2026-0142';

/** Dos productos publicados (14/11), con sus fotos de la tienda */
const PS5 = { nombre: 'Assassins creed mirage PlayStation 5 launch edition', slug: 'assassins-creed-mirage-playstation-5-launch-edition', imagen: '/api/uploads/products/product-1790966781452-r6oql1.webp', precioUSD: 52.78 };
const PROTECTOR = { nombre: 'Protector de voltaje Protektor PAR-110V', slug: 'protector-de-voltaje-protektor-par-110v', imagen: '/api/uploads/products/product-1794581452490-dvs0t7.webp', precioUSD: 33.55 };

const SORTEO: DatosSorteo = { titulo: 'Sorteo de Navidad', premio: 'una PlayStation 4', imagen: null, resultadoEl: new Date('2026-12-20T16:00:00-04:00') };

/** C-227: una venta de ejemplo del aliado comercial (la ferretería despacha desde La Victoria) */
const DESPACHO: DespachoCorreo = {
    proveedor: 'Ferretería La Victoria', contacto: 'Carlos', numero: 'ORD-2026-0143', pagadaEl: '2026-11-13', plazo: '2026-11-16',
    empresa: 'ZOOM', modo: 'OFFICE', oficina: { nombre: 'Barquisimeto Centro', codigo: '1205', direccion: 'Av. 20 entre calles 25 y 26' },
    ciudad: 'Barquisimeto', estado: 'Lara', direccion: null,
    destinatario: { nombre: 'María González', cedula: 'V-18.456.789', telefono: '0414-555-1234' }, cobroADestino: true,
    productos: [{ nombre: 'PROTECTOR VOLTAJE NEVERA 110V PROTEKTOR', codigo: 'R016087', cantidad: 2, costo: 9.86, foto: fotoCorreo(PROTECTOR.imagen) }],
    ivaIncluido: true,
    empaque: { piezas: 1, pesoKg: 1.2, renglones: ['1 × Caja pequeña (30 × 20 × 15 cm): 2 × PROTECTOR VOLTAJE NEVERA 110V PROTEKTOR, 1,2 kg'] },
    url: 'https://electroshopve.com/proveedor/despacho/enlace-de-ejemplo',
};

export type Vista = { subject?: string; html?: string };
const deCorreo = async (p: Promise<{ asunto: string; html: string }>): Promise<Vista> => {
    const { asunto, html } = await p;
    return { subject: asunto, html };
};

const compra = (pagado: boolean, entrega: 'SHIPPING' | 'LOCAL_DELIVERY' | 'DIGITAL' = 'SHIPPING') => async (): Promise<Vista> => ({
    subject: asuntoConfirmacion({ orderNumber: ORDEN, paid: pagado }),
    html: await generateOrderConfirmationEmail({
        orderNumber: ORDEN, customerName: 'María González', orderDate: '14 de noviembre de 2026',
        items: entrega === 'DIGITAL'
            ? [{ name: 'Gift card PlayStation Store $25', quantity: 1, price: '27.50', image: null }]
            : [
                { name: PS5.nombre, quantity: 1, price: String(PS5.precioUSD), image: PS5.imagen },
                { name: PROTECTOR.nombre, quantity: 1, price: String(PROTECTOR.precioUSD), image: PROTECTOR.imagen },
            ],
        subtotal: entrega === 'DIGITAL' ? '27.50' : '86.33', discount: '0', shipping: entrega === 'LOCAL_DELIVERY' ? '2.50' : entrega === 'SHIPPING' ? '1.00' : '0',
        tax: entrega === 'DIGITAL' ? '0' : '12.05', total: entrega === 'DIGITAL' ? '27.50' : entrega === 'LOCAL_DELIVERY' ? '88.83' : '87.33', currency: 'USD',
        paymentMethod: 'Pago Móvil', paid: pagado, deliveryCode: entrega, deliveryMethod: entrega,
        deliveryAddress: entrega === 'SHIPPING' ? 'Oficina ZOOM Barquisimeto Centro, Lara' : entrega === 'LOCAL_DELIVERY' ? 'Av. Principal, Guanare' : undefined,
        totalVES: entrega === 'DIGITAL' ? 25069.67 : 79612.15, exchangeRate: 911.62,
        salida: !pagado ? null : entrega === 'DIGITAL' ? 'Te llega en minutos' : 'Sale el lunes 16 de noviembre',
    }),
});

export const PLANTILLAS: { id: string; grupo: string; name: string; description: string; render: () => Promise<Vista> }[] = [
    // Cuenta
    { id: 'verification', grupo: 'Cuenta', name: 'Activar la cuenta', description: 'Al registrarse con correo', render: () => capturarCorreo(() => sendVerificationEmail(DESTINO, 'token-de-ejemplo', 'María')) },
    { id: 'welcome', grupo: 'Cuenta', name: 'Bienvenida', description: 'Al activar la cuenta o entrar con Google', render: () => capturarCorreo(() => sendWelcomeEmail(DESTINO, 'María')) },
    { id: 'password_reset', grupo: 'Cuenta', name: 'Recuperar la contraseña', description: 'El enlace para crear una nueva', render: () => capturarCorreo(() => sendPasswordResetEmail(DESTINO, 'token-de-ejemplo', 'María')) },
    { id: 'password_changed', grupo: 'Cuenta', name: 'Contraseña cambiada', description: 'Por si no fue el dueño', render: () => deCorreo(correoContrasenaCambiada({ nombre: 'María', sesionesCerradas: true })) },
    { id: 'new_login', grupo: 'Cuenta', name: 'Inicio de sesión nuevo', description: 'Desde un dispositivo que no había usado', render: () => deCorreo(correoSesionNueva({ nombre: 'María', dispositivo: 'Chrome en Android', cuando: '14 de noviembre, 3:20 p. m.', conGoogle: false })) },
    { id: 'account_deletion', grupo: 'Cuenta', name: 'Eliminar la cuenta', description: 'El acuse del pedido', render: () => deCorreo(correoEliminarCuenta({ nombre: 'María' })) },
    // Compra
    { id: 'order_paid', grupo: 'Compra', name: 'Pago confirmado', description: 'Al comprar ya pagado, o al confirmarse el pago', render: compra(true) },
    { id: 'order_pending', grupo: 'Compra', name: 'Pedido recibido', description: 'Con el pago en revisión', render: compra(false) },
    { id: 'order_digital', grupo: 'Compra', name: 'Compra digital', description: 'Gift cards, códigos y recargas', render: compra(true, 'DIGITAL') },
    { id: 'order_shipped', grupo: 'Compra', name: 'En camino', description: 'Por ZOOM o MRW, con la guía', render: () => capturarCorreo(() => sendOrderShippedEmail(DESTINO, { orderNumber: ORDEN, customerName: 'María', trackingNumber: '1234567890', shippingCarrier: 'ZOOM', destination: 'Oficina ZOOM Barquisimeto Centro, Lara', payOnDelivery: true })) },
    { id: 'order_local', grupo: 'Compra', name: 'Sale a tu puerta', description: 'El delivery en Guanare', render: () => capturarCorreo(() => sendOrderShippedEmail(DESTINO, { orderNumber: ORDEN, customerName: 'María', destination: 'Av. Principal, Guanare', local: true })) },
    { id: 'order_office', grupo: 'Compra', name: 'Llegó a la oficina', description: 'Lo dice el rastreo de ZOOM', render: () => capturarCorreo(() => sendShipmentUpdateEmail(DESTINO, { orderNumber: ORDEN, customerName: 'María', title: 'Tu pedido llegó a la oficina', detail: 'Tu paquete está en la oficina ZOOM Barquisimeto Centro. Puedes retirarlo de lunes a sábado.' })) },
    { id: 'order_pickup', grupo: 'Compra', name: 'Listo para retirar', description: 'En la tienda de Guanare', render: () => deCorreo(correoListoParaRetirar({ numero: ORDEN, nombre: 'María' })) },
    { id: 'order_delivered', grupo: 'Compra', name: 'Entregado', description: 'Al marcarlo entregado', render: () => capturarCorreo(() => sendOrderDeliveredEmail(DESTINO, { orderNumber: ORDEN, customerName: 'María' })) },
    { id: 'order_cancelled', grupo: 'Compra', name: 'Orden cancelada', description: 'Con el motivo y los Puntos ES devueltos', render: () => deCorreo(correoOrdenCancelada({ numero: ORDEN, nombre: 'María', motivo: 'El pago no llegó a la cuenta de la tienda.', total: 87.33, reintegro: 10 })) },
    { id: 'digital_code', grupo: 'Compra', name: 'Código digital', description: 'La entrega de un código', render: () => capturarCorreo(() => sendDigitalCodeEmail(DESTINO, { orderNumber: ORDEN, customerName: 'María', productName: 'PlayStation Store $25', code: 'XXXX-XXXX-XXXX', platform: 'PlayStation' })) },
    // Puntos ES
    { id: 'recharge_auto', grupo: 'Puntos ES', name: 'Recarga aprobada sola', description: 'Pago Móvil verificado por el BDV', render: () => deCorreo(correoRecargaAprobada({ nombre: 'María', monto: 20, automatica: true, referencia: '000123456789', banco: 'Banco de Venezuela' })) },
    { id: 'recharge_manual', grupo: 'Puntos ES', name: 'Recarga aprobada', description: 'La aprueba el equipo', render: () => deCorreo(correoRecargaAprobada({ nombre: 'María', monto: 20, automatica: false, referencia: '000123456789' })) },
    { id: 'recharge_rejected', grupo: 'Puntos ES', name: 'Recarga no aprobada', description: 'Con el motivo', render: () => deCorreo(correoRecargaRechazada({ nombre: 'María', monto: 20, motivo: 'La referencia no aparece en la cuenta de la tienda.' })) },
    { id: 'payment_to_points', grupo: 'Puntos ES', name: 'Pago que pasó a Puntos ES', description: 'Pagó y la orden no se pudo crear', render: () => deCorreo(correoPagoAPuntos({ nombre: 'María', monto: 87.33, referencia: '000123456789' })) },
    { id: 'commission_credited', grupo: 'Puntos ES', name: 'Comisión acreditada', description: 'Al promotor, 7 días después de la entrega', render: () => deCorreo(correoComisionAcreditada({ nombre: 'María', monto: 4.32 })) },
    // Gift cards
    { id: 'gift_card', grupo: 'Gift cards', name: 'Gift card recibida', description: 'A quien la recibe', render: () => capturarCorreo(() => sendGiftCardEmail(DESTINO, { code: 'GIFT-XXXX-XXXX', amount: 50, senderName: 'José', recipientName: 'María', personalMessage: '¡Feliz cumpleaños!' })) },
    { id: 'gift_delivered', grupo: 'Gift cards', name: 'Tu regalo llegó', description: 'A quien la compró', render: () => deCorreo(correoGiftCardEntregada({ nombre: 'José', para: 'María', correoPara: DESTINO, monto: 50 })) },
    { id: 'gift_redeemed', grupo: 'Gift cards', name: 'Ya la canjearon', description: 'A quien la compró', render: () => deCorreo(correoGiftCardCanjeada({ nombre: 'José', para: 'María', monto: 50 })) },
    // Servicio
    { id: 'warranty_received', grupo: 'Servicio', name: 'Garantía recibida', description: 'Al pedirla desde Mi panel', render: () => deCorreo(correoGarantiaRecibida({ nombre: 'María', codigo: 'GAR-0012', producto: PROTECTOR.nombre, numeroOrden: ORDEN })) },
    { id: 'warranty_update', grupo: 'Servicio', name: 'Novedades de la garantía', description: 'Cuando el equipo responde o cambia el estado', render: () => capturarCorreo(() => sendWarrantyUpdateEmail(DESTINO, { customerName: 'María', code: 'GAR-0012', productName: PROTECTOR.nombre, status: 'En revisión', statusHelp: 'El técnico está revisando el producto.', message: 'Recibimos el protector. Te escribimos apenas lo revise el técnico.' })) },
    { id: 'contact_received', grupo: 'Servicio', name: 'Mensaje recibido', description: 'El acuse del formulario de Contacto', render: () => deCorreo(correoContactoRecibido({ nombre: 'María', asunto: '¿Tienen el control de PS5?' })) },
    { id: 'contact_reply', grupo: 'Servicio', name: 'Respuesta del equipo', description: 'Enviada desde Mensajes', render: () => deCorreo(correoRespuestaContacto({ nombre: 'María', asunto: '¿Tienen el control de PS5?', respuesta: 'Hola, María. Sí lo tenemos: el DualSense blanco está en $69,90 y sale hoy si lo pagas antes de las 2:00 p. m.', firma: 'Luis' })) },
    { id: 'quote_requested', grupo: 'Servicio', name: 'Presupuesto pedido', description: 'El acuse de la solicitud', render: () => deCorreo(correoPresupuestoPedido({ nombre: 'María', numero: 'COT-2026-0031' })) },
    {
        id: 'quote_sent', grupo: 'Servicio', name: 'Presupuesto', description: 'El que envía el equipo',
        render: () => deCorreo(correoCotizacion({
            number: 'COT-2026-0031', contactName: 'María González', clientName: 'Inversiones Portuguesa C.A.', token: 'token-de-ejemplo', subject: '10 protectores de voltaje para la oficina',
            ivaRetentionPercent: 75, advancePercent: 50, venceEl: '2026-11-29T00:00:00.000Z',
            totales: { totalUSD: 335.5, retencionUSD: 34.7, netoUSD: 300.8, anticipoUSD: 167.75 },
        } as unknown as CotizacionAdmin, 'Te dejamos el presupuesto con los precios de hoy.')),
    },
    { id: 'quote_approved', grupo: 'Servicio', name: 'Presupuesto aprobado', description: 'Cuando el cliente lo aprueba', render: () => deCorreo(correoPresupuestoAprobado({ nombre: 'María', numero: 'COT-2026-0031', total: 335.5, enlace: `${process.env.NEXTAUTH_URL || ''}/cotizacion/token-de-ejemplo` })) },
    { id: 'request_received', grupo: 'Servicio', name: 'Lo estamos buscando', description: 'Al pedir un producto que no está', render: () => deCorreo(correoSolicitudRecibida({ nombre: 'María', producto: 'Control DualSense blanco' })) },
    { id: 'request_fulfilled', grupo: 'Servicio', name: '¡Ya llegó lo que pediste!', description: 'Al marcar la solicitud cumplida', render: () => deCorreo(correoSolicitudLista({ nombre: 'María', pedido: 'Assassins Creed Mirage', producto: { nombre: PS5.nombre, slug: PS5.slug, imagen: PS5.imagen, precioUSD: PS5.precioUSD } })) },
    // Después de comprar
    {
        id: 'review_reminder', grupo: 'Después de comprar', name: 'Pedir la reseña', description: 'Cinco días después de la entrega (dos si es digital)',
        render: async () => {
            const { asunto, html } = await correoPedirResenas('ejemplo', 'María', [
                { nombre: PS5.nombre, slug: PS5.slug, imagen: PS5.imagen, precioUSD: PS5.precioUSD },
                { nombre: PROTECTOR.nombre, slug: PROTECTOR.slug, imagen: PROTECTOR.imagen, precioUSD: PROTECTOR.precioUSD },
            ]);
            return { subject: asunto, html };
        },
    },
    {
        id: 'review_approved', grupo: 'Después de comprar', name: 'Reseña publicada', description: 'Cuando el equipo aprueba una reseña',
        render: async () => ({
            subject: `¡Tu reseña de ${PROTECTOR.nombre} ya está publicada!`,
            html: await generateReviewApprovedEmail({ customerName: 'María', productName: PROTECTOR.nombre, productUrl: `${process.env.NEXTAUTH_URL || ''}/productos/${PROTECTOR.slug}#resenas`, rating: 5 }),
        }),
    },
    {
        id: 'favorites', grupo: 'Después de comprar', name: 'Favoritos', description: 'Bajó de precio o volvió',
        render: async () => ({
            subject: 'Bajó de precio: ' + PS5.nombre,
            html: await correoFavoritos('ejemplo', 'María', [
                { tipo: 'precio', nombre: PS5.nombre, slug: PS5.slug, imagen: PS5.imagen, ahoraUSD: 52.78, antesUSD: 65, enOferta: true },
                { tipo: 'disponible', nombre: PROTECTOR.nombre, slug: PROTECTOR.slug, imagen: PROTECTOR.imagen, ahoraUSD: 33.55, antesUSD: null, enOferta: false },
            ]),
        }),
    },
    { id: 'discount_approved', grupo: 'Después de comprar', name: 'Descuento aprobado', description: 'El que pidió en su lista de deseos', render: () => deCorreo(correoDescuentoAprobado({ nombre: 'María', producto: { nombre: PS5.nombre, slug: PS5.slug, imagen: PS5.imagen }, precioAntes: 52.78, precioAhora: 47.5, vence: new Date(Date.now() + 24 * 3600 * 1000) })) },
    // Empresas y promotores
    { id: 'business_verified', grupo: 'Empresas y promotores', name: 'Empresa verificada', description: 'Al aprobar el acta y el RIF', render: () => deCorreo(correoEmpresaVerificada({ nombre: 'María', empresa: 'Inversiones Portuguesa C.A.', aprobada: true })) },
    { id: 'business_rejected', grupo: 'Empresas y promotores', name: 'Empresa por corregir', description: 'Con el motivo', render: () => deCorreo(correoEmpresaVerificada({ nombre: 'María', empresa: 'Inversiones Portuguesa C.A.', aprobada: false, motivo: 'El RIF del documento no coincide con el de la cuenta.' })) },
    { id: 'promoter_approved', grupo: 'Empresas y promotores', name: 'Ya eres promotor', description: 'Con su código', render: () => deCorreo(correoPromotorAprobado({ nombre: 'María', codigo: 'MARIA10', descuento: 5, comision: 5, diasParaAcreditar: 7 })) },
    { id: 'promoter_rejected', grupo: 'Empresas y promotores', name: 'Promotor no aprobado', description: 'Con la nota del equipo', render: () => deCorreo(correoPromotorNoAprobado({ nombre: 'María', nota: 'Por ahora buscamos cuentas con más de 2.000 seguidores.' })) },
    { id: 'promoter_sale', grupo: 'Empresas y promotores', name: 'Venta con tu código', description: 'Nace la comisión pendiente', render: () => deCorreo(correoVentaPromotor({ nombre: 'María', comision: 4.32, diasParaAcreditar: 7 })) },
    // Cursos
    { id: 'course_enrollment', grupo: 'Cursos', name: 'Inscripción a curso', description: 'Al inscribirse', render: () => capturarCorreo(() => sendCourseEnrollmentEmail(DESTINO, { studentName: 'María', courseTitle: 'Redes desde cero', instructorName: 'Ana', courseSlug: 'redes-desde-cero' })) },
    { id: 'course_certificate', grupo: 'Cursos', name: 'Certificado', description: 'Al completar un curso', render: () => capturarCorreo(() => sendCourseCertificateEmail(DESTINO, { studentName: 'María', courseTitle: 'Redes desde cero', instructorName: 'Ana', certificateId: 'ejemplo', completedAt: new Date() })) },
    { id: 'creator_status', grupo: 'Cursos', name: 'Solicitud de creador', description: 'Aprobada, rechazada o suspendida', render: () => capturarCorreo(() => sendCreatorStatusEmail(DESTINO, { creatorName: 'Ana', status: 'APPROVED' })) },
    { id: 'course_approved', grupo: 'Cursos', name: 'Curso aprobado', description: 'Al creador', render: () => deCorreo(correoCursoAprobado({ nombre: 'Ana', curso: 'Redes desde cero', slug: 'redes-desde-cero' })) },
    // Sorteo
    { id: 'raffle_ticket', grupo: 'Sorteo', name: 'Ganaste un boleto', description: 'Por una compra o por 2 amigos', render: () => deCorreo(correoBoletoSorteo({ nombre: 'María', sorteo: SORTEO, porque: 'compra', total: 2 })) },
    { id: 'raffle_reminder', grupo: 'Sorteo', name: 'Últimos días', description: 'Una vez, 3 días antes del cierre', render: () => deCorreo(correoRecordatorioSorteo({ nombre: 'María', sorteo: SORTEO, boletos: 2, cierre: new Date('2026-12-18T23:59:59-04:00') })) },
    { id: 'raffle_result', grupo: 'Sorteo', name: 'Resultado', description: 'A todos los que participaron', render: () => deCorreo(correoResultadoSorteo({ nombre: 'María', sorteo: SORTEO, ganadorTapado: 'jo***@gmail.com', boletos: 214 })) },
    { id: 'raffle_winner', grupo: 'Sorteo', name: '¡Ganaste!', description: 'Al ganador', render: () => deCorreo(correoGanadorSorteo({ nombre: 'María', sorteo: SORTEO, detalle: `Compra ${ORDEN} ($86,33)` })) },
    // Equipo y marketing
    {
        id: 'campaign', grupo: 'Equipo y marketing', name: 'Campaña', description: 'Ejemplo con un botón',
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
    { id: 'team_alert', grupo: 'Equipo y marketing', name: 'Aviso al equipo', description: 'Ventas, pagos, garantías y más', render: async () => ({ subject: `Nueva venta · ${ORDEN}`, html: await buildAlertEmailHtml({ title: `Nueva venta · ${ORDEN}`, lines: [{ label: 'Total', value: '$87,33' }, { label: 'Pago', value: 'Pago Móvil · confirmado' }, { label: 'Entrega', value: 'Envío nacional' }], actionUrl: `${process.env.NEXTAUTH_URL || ''}/admin/orders` }) }) },
    { id: 'team_invite', grupo: 'Equipo y marketing', name: 'Invitación al panel', description: 'Al invitar a alguien del equipo', render: () => deCorreo(correoInvitacionEquipo({ nombre: 'Luis', rol: 'Administrador', invitadoPor: 'Andrés', enlace: `${process.env.NEXTAUTH_URL || ''}/recuperar-contrasena/token-de-ejemplo?invitacion=1` })) },
    // C-227: el aliado comercial (el proveedor que despacha él mismo), de usted
    { id: 'supplier_welcome', grupo: 'Proveedores', name: 'Bienvenida de aliado comercial', description: 'Con un botón del panel, cuando su catálogo ya está publicado', render: () => deCorreo(correoBienvenidaProveedor({ proveedor: DESPACHO.proveedor, contacto: 'Carlos', publicados: 70, desde: '2026-11-14', enlaceCatalogo: 'https://electroshopve.com/productos?desde=aragua', estado: 'Aragua' })) },
    { id: 'supplier_sale', grupo: 'Proveedores', name: '¡Se vendió su producto!', description: 'Al confirmarse el pago, con copia al equipo', render: () => deCorreo(correoVentaProveedor(DESPACHO)) },
    { id: 'supplier_reminder', grupo: 'Proveedores', name: 'Recordatorio de la guía', description: 'El día del plazo, si no anotó la guía', render: () => deCorreo(correoRecordatorioProveedor(DESPACHO, DESPACHO.plazo)) },
    { id: 'supplier_cancelled', grupo: 'Proveedores', name: 'Se canceló: no lo despache', description: 'Si la orden se cancela antes de la guía', render: () => deCorreo(correoCancelacionProveedor({ ...DESPACHO, url: null })) },
    { id: 'test', grupo: 'Equipo y marketing', name: 'Correo de prueba', description: 'Configuración → Correo', render: () => capturarCorreo(() => sendTestEmail(DESTINO)) },
];

