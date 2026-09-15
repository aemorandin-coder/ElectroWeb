import Link from 'next/link';
import { FiShield, FiLock, FiDatabase, FiEye, FiUsers, FiSettings, FiServer, FiEdit3 } from 'react-icons/fi';
import PublicHeader from '@/components/public/PublicHeader';
import Footer from '@/components/Footer';
import Container from '@/components/ui/Container';
import PageHeader from '@/components/ui/PageHeader';

export default function PrivacyPage() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-dvh bg-surface">
        <PageHeader
          breadcrumbs={[{ label: 'Política de privacidad' }]}
          icon={<FiShield />}
          eyebrow="Legal"
          title="Política de privacidad"
          description="Última actualización: diciembre 2024 · Versión 2.0"
        />
        <Container className="py-6 lg:py-10">
          <article className="mx-auto max-w-3xl space-y-8 rounded-2xl border border-line bg-white p-5 leading-relaxed text-ink-soft sm:p-8 lg:p-10">


            {/* Introduction */}
            <section className="bg-surface rounded-xl p-6 border border-line">
              <p>
                En <strong>Electro Shop Morandin C.A.</strong> nos comprometemos a proteger su privacidad y datos personales.
                Esta política describe cómo recopilamos, utilizamos, almacenamos y protegemos su información cuando utiliza
                nuestra plataforma de comercio electrónico.
              </p>
            </section>

            {/* Data Collection */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FiDatabase className="w-5 h-5 text-brand-600" />
                <h2 className="text-xl font-bold text-ink">1. Recopilación de Información</h2>
              </div>
              <p className="mb-3">
                Recopilamos información personal que usted nos proporciona voluntariamente al:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-ink-soft">
                <li><strong>Registrarse:</strong> Nombre completo, correo electrónico, contraseña (encriptada)</li>
                <li><strong>Completar su perfil:</strong> Número de cédula, teléfono, dirección de envío</li>
                <li><strong>Realizar compras:</strong> Historial de pedidos, métodos de pago utilizados</li>
                <li><strong>Recargar saldo:</strong> Referencias de pago, montos, método de pago</li>
                <li><strong>Aceptar términos de recarga:</strong> Cédula de identidad, firma digital, fecha y hora de aceptación, dirección IP</li>
                <li><strong>Comunicarse con nosotros:</strong> Mensajes, solicitudes de soporte, comentarios</li>
              </ul>
            </section>

            {/* Automatic Data */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FiServer className="w-5 h-5 text-brand-600" />
                <h2 className="text-xl font-bold text-ink">2. Información Recopilada Automáticamente</h2>
              </div>
              <p className="mb-3">
                Cuando utiliza nuestra plataforma, recopilamos automáticamente cierta información técnica:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-ink-soft">
                <li><strong>Dirección IP:</strong> Registrada durante acciones críticas como aceptación de términos y transacciones</li>
                <li><strong>User Agent:</strong> Información del navegador y dispositivo utilizado</li>
                <li><strong>Cookies de sesión:</strong> Para mantener su sesión activa y preferencias</li>
                <li><strong>Registros de actividad:</strong> Notificaciones recibidas, acciones realizadas en la cuenta</li>
              </ul>
            </section>

            {/* Data Usage */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FiSettings className="w-5 h-5 text-brand-600" />
                <h2 className="text-xl font-bold text-ink">3. Uso de la Información</h2>
              </div>
              <p className="mb-3">
                Utilizamos la información recopilada para los siguientes propósitos:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-ink-soft">
                <li>Procesar y gestionar sus pedidos y transacciones</li>
                <li>Verificar su identidad para operaciones financieras</li>
                <li>Gestionar su saldo de cuenta y solicitudes de recarga</li>
                <li>Enviar notificaciones sobre el estado de sus pedidos y transacciones</li>
                <li>Prevenir fraudes y actividades sospechosas</li>
                <li>Generar documentos legales como constancias de aceptación de términos</li>
                <li>Mejorar nuestros servicios y experiencia de usuario</li>
                <li>Comunicarnos con usted sobre su cuenta, pedidos o consultas</li>
                <li>Cumplir con obligaciones legales y regulatorias</li>
              </ul>
            </section>

            {/* Digital Signature Data */}
            <section className="bg-warning/10 border border-warning/30 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <FiEdit3 className="w-5 h-5 text-warning-strong" />
                <h2 className="text-xl font-bold text-ink">4. Datos de Firma Digital</h2>
              </div>
              <p className="mb-3">
                Para cumplir con requisitos legales y anti-lavado de dinero, al aceptar los términos de recarga de saldo,
                almacenamos:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-ink-soft">
                <li>Imagen de su firma digital (formato Base64)</li>
                <li>Número de cédula de identidad</li>
                <li>Fecha y hora exacta de la aceptación</li>
                <li>Dirección IP desde donde se realizó la aceptación</li>
                <li>Información del navegador utilizado (User Agent)</li>
                <li>Versión de los términos aceptados</li>
              </ul>
              <p className="mt-3 text-warning-strong">
                <strong>Importante:</strong> Esta información se almacena como evidencia legal y puede ser utilizada en
                procedimientos judiciales o auditorías. El período de retención es indefinido para fines de cumplimiento
                legal.
              </p>
            </section>

            {/* Data Protection */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FiLock className="w-5 h-5 text-brand-600" />
                <h2 className="text-xl font-bold text-ink">5. Protección de Datos</h2>
              </div>
              <p className="mb-3">
                Implementamos medidas de seguridad técnicas y organizativas para proteger su información:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-ink-soft">
                <li><strong>Encriptación SSL/TLS:</strong> Todas las comunicaciones entre su navegador y nuestros servidores están encriptadas</li>
                <li><strong>Contraseñas hasheadas:</strong> Las contraseñas se almacenan utilizando algoritmos de hash seguros (bcrypt)</li>
                <li><strong>Sesiones seguras:</strong> Utilizamos tokens JWT con expiración para la autenticación</li>
                <li><strong>Acceso restringido:</strong> Solo el personal autorizado puede acceder a datos sensibles</li>
                <li><strong>Base de datos segura:</strong> Los datos se almacenan en servidores con medidas de seguridad avanzadas</li>
                <li><strong>Auditoría:</strong> Mantenemos registros de acceso y modificaciones a datos sensibles</li>
              </ul>
            </section>

            {/* Cookies */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FiEye className="w-5 h-5 text-brand-600" />
                <h2 className="text-xl font-bold text-ink">6. Cookies y Tecnologías Similares</h2>
              </div>
              <p className="mb-3">
                Utilizamos cookies para mejorar su experiencia en nuestra plataforma:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-ink-soft">
                <li><strong>Cookies esenciales:</strong> Necesarias para mantener su sesión activa y el funcionamiento del carrito de compras</li>
                <li><strong>Cookies de preferencias:</strong> Recuerdan sus configuraciones y preferencias</li>
                <li><strong>Cookies de autenticación:</strong> Mantienen su sesión segura entre visitas</li>
              </ul>
              <p className="mt-3 text-ink-soft">
                Puede configurar su navegador para rechazar las cookies, pero esto podría limitar algunas funcionalidades
                del sitio, como el inicio de sesión automático o el carrito de compras.
              </p>
            </section>

            {/* Data Sharing */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FiUsers className="w-5 h-5 text-brand-600" />
                <h2 className="text-xl font-bold text-ink">7. Compartir Información</h2>
              </div>
              <p className="mb-3">
                <strong>No vendemos ni alquilamos su información personal a terceros.</strong> Solo compartimos su
                información en las siguientes circunstancias:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-ink-soft">
                <li><strong>Proveedores de envío:</strong> Nombre, dirección y teléfono para entregas</li>
                <li><strong>Procesadores de pago:</strong> Información necesaria para validar transacciones</li>
                <li><strong>Autoridades competentes:</strong> Cuando sea requerido por ley o ante sospechas de actividades ilícitas</li>
                <li><strong>Cumplimiento legal:</strong> Para cumplir con obligaciones legales, regulatorias o procesos judiciales</li>
              </ul>
            </section>

            {/* User Rights */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FiShield className="w-5 h-5 text-brand-600" />
                <h2 className="text-xl font-bold text-ink">8. Sus Derechos</h2>
              </div>
              <p className="mb-3">
                Usted tiene los siguientes derechos sobre su información personal:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-ink-soft">
                <li><strong>Acceso:</strong> Puede solicitar una copia de los datos que tenemos sobre usted</li>
                <li><strong>Rectificación:</strong> Puede actualizar o corregir su información desde su perfil de usuario</li>
                <li><strong>Eliminación:</strong> Puede solicitar la eliminación de su cuenta y datos asociados</li>
                <li><strong>Portabilidad:</strong> Puede solicitar sus datos en un formato estructurado</li>
                <li><strong>Oposición:</strong> Puede oponerse al uso de sus datos para ciertos fines</li>
              </ul>
              <p className="mt-3 text-warning-strong">
                <strong>Nota:</strong> Los datos relacionados con transacciones financieras, aceptación de términos y
                firmas digitales no pueden ser eliminados debido a requisitos legales de auditoría y anti-lavado de dinero.
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-xl font-bold text-ink mb-3">9. Retención de Datos</h2>
              <p className="mb-3">
                Conservamos su información personal durante el tiempo necesario para cumplir con los propósitos
                descritos en esta política:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-ink-soft">
                <li><strong>Datos de cuenta:</strong> Mientras su cuenta esté activa, más 2 años adicionales tras la eliminación</li>
                <li><strong>Historial de pedidos:</strong> Mínimo 5 años por requisitos fiscales</li>
                <li><strong>Transacciones de saldo:</strong> Mínimo 10 años por requisitos anti-lavado</li>
                <li><strong>Documentos de aceptación de términos:</strong> Indefinidamente como evidencia legal</li>
                <li><strong>Firmas digitales:</strong> Indefinidamente como evidencia legal</li>
              </ul>
            </section>

            {/* Updates */}
            <section>
              <h2 className="text-xl font-bold text-ink mb-3">10. Cambios a Esta Política</h2>
              <p>
                Podemos actualizar esta política de privacidad periódicamente. Le notificaremos sobre cambios
                significativos mediante un aviso en nuestra plataforma o por correo electrónico. Le recomendamos
                revisar esta política regularmente para estar informado sobre cómo protegemos su información.
              </p>
            </section>

            {/* Contact */}
            <section className="bg-surface rounded-xl p-6 border border-line">
              <h2 className="text-xl font-bold text-ink mb-3">11. Contacto</h2>
              <p>
                Si tiene preguntas sobre esta política de privacidad o desea ejercer sus derechos, puede contactarnos:
              </p>
              <ul className="mt-3 space-y-2 text-ink-soft">
                <li><strong>Email:</strong> electroshopgre@gmail.com</li>
                <li><strong>WhatsApp:</strong> +58 257-251-1282</li>
                <li><strong>Dirección:</strong> Guanare, Estado Portuguesa, Venezuela</li>
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
