import Link from 'next/link';
import { FiShield, FiCreditCard, FiTruck, FiPackage, FiDollarSign, FiAlertCircle, FiFileText, FiEdit3 } from 'react-icons/fi';
import PublicHeader from '@/components/public/PublicHeader';
import Footer from '@/components/Footer';
import { CONDITION_HELP, DEFAULT_WARRANTY_DAYS, GRADE_DEFINITION, GRADE_LABEL } from '@/lib/product-condition';
import Container from '@/components/ui/Container';
import PageHeader from '@/components/ui/PageHeader';

export default function TermsPage() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-dvh bg-surface">
        <PageHeader
          breadcrumbs={[{ label: 'Términos y condiciones' }]}
          icon={<FiFileText />}
          eyebrow="Legal"
          title="Términos y condiciones"
          description="Última actualización: septiembre 2026 · Versión 3.0"
        />
        <Container className="py-6 lg:py-10">
          <article className="mx-auto max-w-3xl space-y-8 rounded-2xl border border-line bg-white p-5 leading-relaxed text-ink-soft sm:p-8 lg:p-10">


            {/* Acceptance */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FiShield className="w-5 h-5 text-brand-600" />
                <h2 className="text-xl font-bold text-ink">1. Aceptación de los Términos</h2>
              </div>
              <p>
                Al acceder y utilizar los servicios de <strong>Electro Shop Morandin C.A.</strong> (en adelante &ldquo;la Empresa&rdquo;),
                usted acepta estar legalmente vinculado por estos términos y condiciones. Si no está de acuerdo con alguno
                de estos términos, por favor no utilice nuestros servicios. La Empresa se reserva el derecho de modificar
                estos términos en cualquier momento, siendo responsabilidad del usuario revisar periódicamente los cambios.
              </p>
            </section>

            {/* Account */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FiShield className="w-5 h-5 text-brand-600" />
                <h2 className="text-xl font-bold text-ink">2. Registro y Seguridad de la Cuenta</h2>
              </div>
              <p className="mb-3">
                Para acceder a ciertas funciones, deberá registrarse y crear una cuenta proporcionando información veraz y actualizada.
                Usted es responsable de:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-ink-soft">
                <li>Mantener la confidencialidad de su contraseña y credenciales de acceso</li>
                <li>Todas las actividades que ocurran bajo su cuenta</li>
                <li>Notificar inmediatamente cualquier uso no autorizado de su cuenta</li>
                <li>Proporcionar documentación de identidad cuando se solicite para verificación</li>
              </ul>
              <p className="mt-3">
                La Empresa puede requerir verificación de identidad mediante cédula y firma digital para ciertas operaciones,
                especialmente relacionadas con el sistema de saldo y transacciones financieras.
              </p>
            </section>

            {/* Balance System */}
            <section className="bg-surface rounded-xl p-6 border border-line">
              <div className="flex items-center gap-2 mb-3">
                <FiDollarSign className="w-5 h-5 text-warning-strong" />
                <h2 className="text-xl font-bold text-ink">3. Sistema de Saldo y Recargas</h2>
              </div>
              <p className="mb-3">
                Electro Shop ofrece un sistema de saldo interno que permite a los usuarios recargar fondos para realizar compras.
                Al utilizar este servicio, el usuario acepta las siguientes condiciones:
              </p>

              <div className="space-y-4 mt-4">
                <div className="bg-deal-bg border border-deal/30 rounded-lg p-4">
                  <h3 className="font-bold text-deal mb-2">3.1 Política de No Reembolso</h3>
                  <p className="text-ink-soft">
                    <strong className="text-deal">EL SALDO RECARGADO NO ES REEMBOLSABLE BAJO NINGUNA CIRCUNSTANCIA.</strong> Una vez
                    acreditado, el saldo no podrá ser retirado, transferido a terceros, ni convertido en dinero en efectivo.
                    El saldo únicamente puede utilizarse para compras dentro de la plataforma.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-ink mb-2">3.2 Origen Lícito de Fondos</h3>
                  <p className="text-ink-soft">
                    El usuario declara bajo juramento que todos los fondos utilizados para recargar saldo provienen de
                    actividades lícitas y legales. Queda estrictamente prohibido el uso de fondos provenientes de:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1 text-ink-soft">
                    <li>Lavado de dinero o financiamiento del terrorismo</li>
                    <li>Narcotráfico o actividades ilícitas</li>
                    <li>Fraude, estafa o cualquier actividad criminal</li>
                    <li>Evasión fiscal o fondos no declarados</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-ink mb-2">3.3 Verificación de Transacciones</h3>
                  <p className="text-ink-soft">
                    Las solicitudes de recarga están sujetas a verificación por parte del equipo de administración.
                    Las transacciones pueden ser rechazadas por:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1 text-ink-soft">
                    <li>Número de referencia inválido o incorrecto</li>
                    <li>Monto transferido diferente al declarado</li>
                    <li>Datos inconsistentes o sospechosos</li>
                    <li>Múltiples intentos fallidos consecutivos</li>
                    <li>Sospecha de actividad fraudulenta</li>
                    <li>Comprobante de pago vencido o ilegible</li>
                  </ul>
                  <p className="text-ink-soft mt-2">
                    El usuario será notificado con el motivo específico del rechazo para su transparencia.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-ink mb-2">3.4 Aceptación de Términos de Recarga</h3>
                  <p className="text-ink-soft">
                    Antes de realizar su primera recarga, el usuario debe aceptar los términos específicos del sistema
                    de saldo mediante firma digital. Esta aceptación incluye:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1 text-ink-soft">
                    <li>Lectura completa de los términos y condiciones de recarga</li>
                    <li>Provisión de número de cédula de identidad</li>
                    <li>Firma digital como constancia de aceptación</li>
                    <li>Registro de fecha, hora y dirección IP para fines legales</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Payments */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FiCreditCard className="w-5 h-5 text-brand-600" />
                <h2 className="text-xl font-bold text-ink">4. Métodos de Pago y Facturación</h2>
              </div>
              <p className="mb-3">
                Aceptamos diversos métodos de pago, incluyendo:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-ink-soft mb-3">
                <li>Transferencias bancarias nacionales (Banesco, Mercantil, Provincial, Venezuela, etc.)</li>
                <li>Pago Móvil</li>
                <li>Zelle (pagos internacionales)</li>
                <li>Binance Pay y criptomonedas seleccionadas</li>
                <li>Efectivo en tienda</li>
                <li>Saldo de cuenta (previamente recargado)</li>
              </ul>
              <p>
                Todos los precios están expresados en <strong>Dólares Americanos (USD)</strong> y pueden ser pagados
                en Bolívares a la tasa de cambio oficial del BCV vigente al momento del pago. La Empresa se reserva
                el derecho de actualizar los precios sin previo aviso.
              </p>
            </section>

            {/* Shipping */}
            <section id="envios" className="scroll-mt-28">
              <div className="flex items-center gap-2 mb-3">
                <FiTruck className="w-5 h-5 text-brand-600" />
                <h2 className="text-xl font-bold text-ink">5. Envíos y Entregas</h2>
              </div>
              <p className="mb-3">
                Realizamos envíos dentro de la <strong>República Bolivariana de Venezuela</strong>. Condiciones:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-ink-soft">
                <li>Los pedidos se procesan dentro de las 24-48 horas hábiles posteriores a la confirmación del pago</li>
                <li>
                  Envíos nacionales por ZOOM o MRW con <strong>cobro a destino</strong>: la tienda cobra el embalaje y el
                  flete lo paga el cliente a la empresa de envíos al retirar. Los productos marcados con envío gratis viajan sin costo para el cliente
                </li>
                <li>Los tiempos de entrega dependen de la empresa de envíos y del destino (en general, 2 a 7 días hábiles)</li>
                <li>El cliente puede optar por retiro en tienda sin costo adicional, o por delivery en Guanare cuando esté disponible</li>
                <li>Para retiro en tienda, solo el titular de la cuenta o persona autorizada puede retirar el producto presentando cédula de identidad</li>
                <li>
                  El monto mínimo de compra, si la tienda lo establece, cuenta solo el valor de los productos: el embalaje y el
                  envío van aparte. El carrito y el pago lo indican antes de pagar
                </li>
              </ul>
            </section>

            {/* Warranty */}
            <section id="garantia" className="scroll-mt-28">
              <div className="flex items-center gap-2 mb-3">
                <FiPackage className="w-5 h-5 text-brand-600" />
                <h2 className="text-xl font-bold text-ink">6. Garantía y Devoluciones</h2>
              </div>
              <p className="mb-3">
                La garantía la presta <strong>la Empresa</strong> y cubre las <strong>fallas de funcionamiento</strong> del
                producto. El plazo de cada producto aparece en su ficha antes de comprar y queda guardado en el pedido; cuenta
                desde la entrega. Si la ficha no indica otro plazo: productos nuevos y de caja abierta, {DEFAULT_WARRANTY_DAYS.NEW} días;
                reacondicionados, {DEFAULT_WARRANTY_DAYS.REFURBISHED} días; usados, {DEFAULT_WARRANTY_DAYS.USED} días. La garantía del
                fabricante, cuando exista, se suma a la de la Empresa y se tramita según sus condiciones.
              </p>
              <h3 className="font-semibold text-ink mb-2">6.1 Qué no cubre la garantía</h3>
              <ul className="list-disc pl-6 space-y-2 text-ink-soft mb-4">
                <li>Golpes, caídas, humedad, líquidos, fallas eléctricas externas (bajones o picos de voltaje) o mal uso</li>
                <li>Aperturas, reparaciones o modificaciones hechas por terceros, o sellos de garantía rotos</li>
                <li>El desgaste normal y el estado estético descrito en la ficha de un producto usado, reacondicionado o de caja abierta</li>
                <li>Consumibles y accesorios con vida útil propia, salvo que lleguen defectuosos</li>
                <li>Daños posteriores a la entrega</li>
              </ul>
              <h3 className="font-semibold text-ink mb-2">6.2 Cómo pedir la garantía</h3>
              <ul className="list-disc pl-6 space-y-2 text-ink-soft mb-4">
                <li>Desde &ldquo;Garantía&rdquo; en tu cuenta, dentro del plazo del producto, indicando el pedido y describiendo la falla</li>
                <li>La Empresa puede pedir fotos, un video o revisar el equipo en la tienda. El cliente entrega el producto con sus accesorios</li>
                <li>La evaluación tarda de 5 a 10 días hábiles desde que la Empresa recibe el producto</li>
              </ul>
              <h3 className="font-semibold text-ink mb-2">6.3 Qué hace la Empresa si procede</h3>
              <p className="mb-4 text-ink-soft">
                Repara el producto; si no es posible, lo cambia por uno igual o equivalente; si tampoco es posible, devuelve el
                monto pagado por ese producto al saldo de la cuenta del cliente en la tienda, en dólares.
              </p>
              <h3 className="font-semibold text-ink mb-2">6.4 Devoluciones</h3>
              <p className="mb-4 text-ink-soft">
                <strong>No se aceptan devoluciones por cambio de opinión.</strong> Si el producto llega con una falla, dañado o
                distinto a lo publicado (modelo, condición o lo que dice incluir), se atiende como garantía según el punto 6.3.
                Por eso cada ficha describe el producto, y la de un usado muestra fotos reales de la unidad.
              </p>
              <h3 className="font-semibold text-ink mb-2">6.5 Daños en el envío</h3>
              <p className="text-ink-soft">
                Revisa el paquete al recibirlo o retirarlo en la agencia. Si llega dañado, avísanos dentro de las <strong>48 horas</strong>
                siguientes con fotos del empaque y del producto, para reclamar a la empresa de envíos.
              </p>
            </section>

            {/* Used */}
            <section id="usados" className="scroll-mt-28">
              <div className="flex items-center gap-2 mb-3">
                <FiPackage className="w-5 h-5 text-brand-600" />
                <h2 className="text-xl font-bold text-ink">7. Productos Usados, Reacondicionados y de Caja Abierta</h2>
              </div>
              <ul className="list-disc pl-6 space-y-2 text-ink-soft">
                <li>
                  <strong>Caja abierta:</strong> {CONDITION_HELP.OPEN_BOX} <strong>Reacondicionado:</strong> {CONDITION_HELP.REFURBISHED}{' '}
                  <strong>Usado:</strong> {CONDITION_HELP.USED}
                </li>
                <li>
                  Estado estético: <strong>{GRADE_LABEL.EXCELLENT}</strong>: {GRADE_DEFINITION.EXCELLENT} <strong>{GRADE_LABEL.VERY_GOOD}</strong>:{' '}
                  {GRADE_DEFINITION.VERY_GOOD} <strong>{GRADE_LABEL.GOOD}</strong>: {GRADE_DEFINITION.GOOD}
                </li>
                <li>
                  La ficha de cada uno indica su condición, estado estético, empaque (caja original, genérica o sin caja), qué
                  incluye y qué no, y cuando aplica, horas de uso, salud de la batería, detalles y pruebas hechas. Las fotos son de
                  la unidad que se vende. <strong>Al comprarlo, el cliente acepta ese estado.</strong>
                </li>
                <li>Los accesorios que incluya pueden no ser originales: son compatibles y funcionan</li>
                <li>La garantía es la de la Empresa por el plazo que indica la ficha (punto 6), por fallas de funcionamiento; no cubre el desgaste descrito</li>
                <li>Los cupones de descuento no aplican a estos productos. Las ofertas de la tienda sí</li>
              </ul>
            </section>

            {/* Digital */}
            <section id="digitales" className="scroll-mt-28">
              <div className="flex items-center gap-2 mb-3">
                <FiPackage className="w-5 h-5 text-brand-600" />
                <h2 className="text-xl font-bold text-ink">8. Productos Digitales</h2>
              </div>
              <ul className="list-disc pl-6 space-y-2 text-ink-soft">
                <li>Gift cards, códigos y recargas se entregan por la cuenta del cliente o en la cuenta que indique al comprar</li>
                <li>Una vez entregado el código o hecha la recarga, <strong>no tiene devolución</strong>. Si un código no funciona, avísanos y lo revisamos con el proveedor</li>
                <li>El cliente es responsable de indicar bien la cuenta, la región y la plataforma: una recarga hecha a los datos indicados no se puede revertir</li>
              </ul>
            </section>

            {/* Legal Responsibility */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FiAlertCircle className="w-5 h-5 text-brand-600" />
                <h2 className="text-xl font-bold text-ink">9. Responsabilidad Legal</h2>
              </div>
              <p className="mb-3">
                El usuario acepta total responsabilidad legal por cualquier violación de estos términos y exime a la Empresa
                de cualquier responsabilidad derivada del uso indebido de la plataforma. La Empresa se reserva el derecho de:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-ink-soft">
                <li>Verificar la identidad del usuario en cualquier momento</li>
                <li>Solicitar documentación adicional para validar transacciones</li>
                <li>Reportar actividades sospechosas a las autoridades competentes</li>
                <li>Retener fondos durante investigaciones de fraude</li>
                <li>Suspender o cancelar cuentas que violen estos términos sin derecho a reembolso</li>
              </ul>
              <p className="mt-3">
                En caso de disputas legales, el usuario acepta someterse a la jurisdicción de los tribunales competentes
                de la <strong>República Bolivariana de Venezuela</strong>.
              </p>
            </section>

            {/* Digital Signature */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FiEdit3 className="w-5 h-5 text-brand-600" />
                <h2 className="text-xl font-bold text-ink">10. Firma Digital y Documentos Electrónicos</h2>
              </div>
              <p>
                La firma digital proporcionada por el usuario mediante nuestro sistema de canvas electrónico tiene plena
                validez legal según la legislación venezolana vigente. Los documentos firmados digitalmente, incluyendo
                la aceptación de términos de recarga, constituyen prueba legal vinculante y pueden ser utilizados como
                evidencia en procedimientos judiciales.
              </p>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-xl font-bold text-ink mb-3">11. Propiedad Intelectual</h2>
              <p>
                Todo el contenido incluido en este sitio, como texto, gráficos, logotipos, iconos, imágenes, clips de
                audio, descargas digitales, compilaciones de datos y software, es propiedad de Electro Shop Morandin C.A.
                o de sus proveedores de contenido y está protegido por las leyes de propiedad intelectual nacionales e
                internacionales. Queda prohibida la reproducción, distribución o modificación sin autorización expresa.
              </p>
            </section>

            {/* Contact */}
            <section className="bg-surface rounded-xl p-6 border border-line">
              <h2 className="text-xl font-bold text-ink mb-3">12. Contacto</h2>
              <p>
                Para consultas sobre estos términos y condiciones, puede contactarnos a través de:
              </p>
              <ul className="mt-3 space-y-2 text-ink-soft">
                <li><strong>Email:</strong> electroshopgre@gmail.com</li>
                <li><strong>WhatsApp:</strong> +58 257-251-1282</li>
                <li><strong>Horario de atención:</strong> Lunes a Viernes 9:00 AM - 6:00 PM</li>
              </ul>
            </section>
          </article>
          <div className="mx-auto mt-6 flex max-w-3xl justify-end">
            <Link href="/" className="inline-flex h-11 items-center rounded-lg border border-line bg-white px-5 text-sm font-semibold text-ink hover:bg-surface">
              Volver al inicio
            </Link>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
