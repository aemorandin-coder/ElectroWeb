import Image from 'next/image';
import Link from 'next/link';
import CategoryIconRenderer from '@/components/CategoryIconRenderer';
import { IconoCuadricula } from '@/components/iconos';
import Container from '@/components/ui/Container';
import SectionHeader from '@/components/ui/SectionHeader';
import { CUENTA_VISIBLE_DESDE } from '@/lib/inicio/reparto';
import type { CasillaCategoria, MasCategorias } from '@/lib/queries/home';

// Hasta 4 por fila; con 5 o 6, dos filas de 3 (Tailwind necesita las clases escritas enteras)
const COLUMNAS = ['grid-cols-1', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-3', 'grid-cols-3'];

const CASILLA =
  'group flex h-full overflow-hidden rounded-xl border border-line bg-white transition-colors hover:border-brand-300 focus-visible:outline-2 focus-visible:outline-brand-500';
const NOMBRE = 'line-clamp-2 text-base font-semibold text-ink group-hover:text-brand-600';
// La foto, cuadrada y pegada al borde derecho: la cinta "ES" de las fotos cae en la esquina, como en las tarjetas de producto
const FOTO = 'relative h-24 w-24 shrink-0 bg-white xl:h-28 xl:w-28';

/** "Audio, Accesorios gaming y Misceláneos" o, con más, "Audio, Accesorios gaming, Misceláneos y 2 más" */
function listaCorta(nombres: string[], max = 3): string {
  if (nombres.length <= 1) return nombres.join('');
  if (nombres.length <= max) return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
  return `${nombres.slice(0, max).join(', ')} y ${nombres.length - max} más`;
}

/**
 * "Compra por categoría" (computadora; en el teléfono van los chips de arriba). C-207: cada casilla con la foto de un
 * producto real en vez del ícono suelto, la cuenta solo desde 10 ("1 producto" se leía como una tienda vacía) y las
 * categorías chicas juntas en "Más categorías" (lib/inicio/reparto.ts).
 */
export default function CategoryRail({ casillas, mas }: { casillas: CasillaCategoria[]; mas: MasCategorias | null }) {
  const total = casillas.length + (mas ? 1 : 0);
  if (total === 0) return null;

  return (
    <section aria-labelledby="categorias-title" className="hidden bg-white py-8 lg:block">
      <Container>
        <SectionHeader id="categorias-title" title="Compra por categoría" href="/categorias" linkLabel="Ver todas" />
        <ul className={`grid gap-3 ${COLUMNAS[Math.min(total, 6)]}`}>
          {casillas.map((categoria) => (
            <li key={categoria.id}>
              <Link href={`/categorias/${categoria.slug}`} className={CASILLA}>
                <span className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
                  <span className={NOMBRE}>{categoria.name}</span>
                  {categoria.productCount >= CUENTA_VISIBLE_DESDE && <span className="mt-0.5 text-sm text-muted">{categoria.productCount} productos</span>}
                </span>
                <span className={FOTO}>
                  {categoria.foto ? (
                    <Image src={categoria.foto} alt="" fill sizes="112px" className="object-contain" />
                  ) : (
                    <span className="iconos-marca flex h-full items-center justify-center text-brand-950">
                      <CategoryIconRenderer iconName={categoria.icon} className="h-8 w-8" />
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
          {mas && (
            <li>
              <Link href="/categorias" className={CASILLA}>
                <span className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
                  <span className={NOMBRE}>Más categorías</span>
                  <span className="mt-0.5 line-clamp-2 text-sm text-muted">{listaCorta(mas.nombres)}</span>
                </span>
                {/* Una foto de cada una, en círculo (el círculo deja fuera la cinta de la esquina), hasta cuatro */}
                <span className={`${FOTO} grid grid-cols-2 place-items-center gap-1 p-2`}>
                  {mas.fotos.length > 0 ? (
                    mas.fotos.slice(0, 4).map((foto) => (
                      <span key={foto} className="relative aspect-square w-full overflow-hidden rounded-full border border-line bg-white">
                        <Image src={foto} alt="" fill sizes="56px" className="scale-110 object-cover" />
                      </span>
                    ))
                  ) : (
                    <span className="iconos-marca col-span-2 row-span-2 text-brand-950">
                      <IconoCuadricula className="h-8 w-8" aria-hidden="true" />
                    </span>
                  )}
                </span>
              </Link>
            </li>
          )}
        </ul>
      </Container>
    </section>
  );
}
