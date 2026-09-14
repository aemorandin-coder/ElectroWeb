import Link from 'next/link';
import { FaScrewdriverWrench } from 'react-icons/fa6';
import { FiUsers } from 'react-icons/fi';
import { PiStudentDuotone } from 'react-icons/pi';
import Container from '@/components/ui/Container';

const BANNERS = [
  { href: '/servicios', title: 'Servicio técnico', text: 'PC gaming, CCTV, redes y reparaciones con garantía.', Icon: FaScrewdriverWrench },
  { href: '/cursos', title: 'Academia de cursos', text: 'Aprende con instructores expertos o publica tu propio curso.', Icon: PiStudentDuotone },
  { href: '/creator', title: 'Programa de creadores', text: 'Comparte productos con tus seguidores y gana comisiones.', Icon: FiUsers },
];

/** "Más de ElectroShop": 3 banners compactos (reemplaza Servicios y la promo de cursos/creadores). */
export default function MoreFromElectroShop() {
  return (
    <section aria-labelledby="mas-title" className="bg-white py-6 lg:py-8">
      <Container>
        <h2 id="mas-title" className="mb-4 text-xl font-bold text-ink lg:text-2xl">Más de ElectroShop</h2>
        <ul className="grid gap-3 lg:grid-cols-3 lg:gap-4">
          {BANNERS.map(({ href, title, text, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex h-full items-center gap-4 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white hover:from-brand-500 hover:to-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-lg font-semibold">{title}</span>
                  <span className="block text-sm text-white/80">{text}</span>
                  <span className="mt-1 block text-sm font-semibold text-accent">Ver más <span aria-hidden="true">→</span></span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
