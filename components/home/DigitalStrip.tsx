import Link from 'next/link';
import { FaXbox } from 'react-icons/fa6';
import { SiApple, SiGoogleplay, SiPlaystation, SiRoblox, SiSteam } from 'react-icons/si';
import Container from '@/components/ui/Container';

const PLATFORMS = [
  { name: 'PlayStation', Icon: SiPlaystation, href: '/productos?search=PlayStation' },
  { name: 'Xbox', Icon: FaXbox, href: '/productos?search=Xbox' },
  { name: 'Steam', Icon: SiSteam, href: '/productos?search=Steam' },
  { name: 'Roblox', Icon: SiRoblox, href: '/productos?search=Roblox' },
  { name: 'Google Play', Icon: SiGoogleplay, href: '/productos?search=Google' },
  { name: 'Apple', Icon: SiApple, href: '/productos?search=Apple' },
];

/** Franja compacta de saldo y gift cards digitales. */
export default function DigitalStrip() {
  return (
    <section aria-labelledby="digital-title" className="bg-white py-6 lg:py-8">
      <Container>
        {/* Mismos azules de la marca que la franja del header */}
        <div className="rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 p-4 lg:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <div>
              <h2 id="digital-title" className="text-xl font-bold text-white lg:text-2xl">Gift cards y saldo digital</h2>
              <p className="mt-1 text-sm text-white/80">Códigos para tus plataformas favoritas</p>
            </div>
            <Link href="/gift-cards" className="rounded-md text-sm font-semibold text-white underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-white">
              Ver gift cards <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ul className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:grid lg:grid-cols-6 lg:gap-3 lg:px-0">
            {PLATFORMS.map(({ name, Icon, href }) => (
              <li key={name} className="shrink-0">
                <Link
                  href={href}
                  className="flex h-12 items-center gap-2 whitespace-nowrap rounded-xl bg-white px-4 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:justify-center"
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
