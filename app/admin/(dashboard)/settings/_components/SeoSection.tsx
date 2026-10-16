'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FiGlobe } from 'react-icons/fi';
import { adminTab } from '@/lib/admin-ui';
import type { SectionProps, SettingsKey } from './settings-form';
import { ImageField, SettingsCard, TextAreaField, TextField } from './fields';

type SeoPage = 'home' | 'products' | 'services' | 'courses';

/** Un número corto que cambia con el texto: la vista previa vuelve a pedir la imagen cuando se guarda otro */
const huella = (texto: string) => [...texto].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);

const PAGES: {
  id: SeoPage;
  label: string;
  path: string;
  /** La imagen que arma la tienda si no se sube una (C-178, app/og) */
  og: 'inicio' | 'productos' | 'servicios' | 'cursos';
  keys: { title: SettingsKey; description: SettingsKey; keywords: SettingsKey; image: SettingsKey };
  uploadType: 'homeMetaImage' | 'productsMetaImage' | 'servicesMetaImage' | 'coursesMetaImage';
}[] = [
  { id: 'home', label: 'Inicio', path: '/', og: 'inicio', uploadType: 'homeMetaImage', keys: { title: 'metaTitle', description: 'metaDescription', keywords: 'metaKeywords', image: 'homeMetaImage' } },
  { id: 'products', label: 'Productos', path: '/productos', og: 'productos', uploadType: 'productsMetaImage', keys: { title: 'productsMetaTitle', description: 'productsMetaDescription', keywords: 'productsMetaKeywords', image: 'productsMetaImage' } },
  { id: 'services', label: 'Servicios', path: '/servicios', og: 'servicios', uploadType: 'servicesMetaImage', keys: { title: 'servicesMetaTitle', description: 'servicesMetaDescription', keywords: 'servicesMetaKeywords', image: 'servicesMetaImage' } },
  { id: 'courses', label: 'Cursos', path: '/cursos', og: 'cursos', uploadType: 'coursesMetaImage', keys: { title: 'coursesMetaTitle', description: 'coursesMetaDescription', keywords: 'coursesMetaKeywords', image: 'coursesMetaImage' } },
];

export default function SeoSection({ form, set, errors }: SectionProps) {
  const [pageId, setPageId] = useState<SeoPage>('home');
  const page = PAGES.find((item) => item.id === pageId) ?? PAGES[0];
  const value = (key: SettingsKey) => String(form[key] ?? '');
  const setText = (key: SettingsKey) => (next: string) => set(key, next as never);

  const title = value(page.keys.title) || form.companyName || 'Electro Shop';
  const description = value(page.keys.description) || form.tagline || 'Sin descripción: Google elegirá un texto de la página.';
  // Sin imagen subida se ve la que arma la tienda con lo guardado (C-178); antes, el logo o nada
  const subida = value(page.keys.image);
  const image = subida || `/og/pagina/${page.og}?vista=${huella(`${title}|${description}|${form.tagline ?? ''}`)}`;
  const dirtyTabs = PAGES.filter((item) => Object.values(item.keys).some((key) => errors[key]));

  return (
    <>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex w-max gap-1 rounded-xl border border-line bg-white p-1" role="tablist" aria-label="Página">
          {PAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === pageId}
              onClick={() => setPageId(item.id)}
              className={adminTab(item.id === pageId)}
            >
              {item.label}
              {dirtyTabs.includes(item) && <span className="h-2 w-2 rounded-full bg-deal" aria-label="con errores" />}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <SettingsCard title={`Página ${page.label}`} description={`electroshopve.com${page.path === '/' ? '' : page.path}`}>
          <div className="space-y-4">
            <TextField label="Título" value={value(page.keys.title)} onChange={setText(page.keys.title)} error={errors[page.keys.title]} maxLength={70} counter placeholder="Electro Shop | Tecnología en Guanare con envíos a toda Venezuela" />
            <TextAreaField label="Descripción" value={value(page.keys.description)} onChange={setText(page.keys.description)} error={errors[page.keys.description]} maxLength={170} counter rows={3} placeholder="Laptops, consolas, gift cards y servicio técnico. Precios en dólares y bolívares." />
            <TextField label="Palabras clave" value={value(page.keys.keywords)} onChange={setText(page.keys.keywords)} error={errors[page.keys.keywords]} maxLength={300} hint="Separadas por coma. Google casi no las usa; sirven para otros buscadores." />
            <ImageField
              label="Imagen al compartir"
              uploadType={page.uploadType}
              aspect="wide"
              value={value(page.keys.image)}
              onChange={setText(page.keys.image)}
              error={errors[page.keys.image]}
              hint="1200 × 630 px. Opcional: si no subes una, la tienda arma la de la derecha con el título, la descripción y tus productos."
            />
          </div>
        </SettingsCard>

        <div className="space-y-5">
          <SettingsCard title="Así se ve en Google">
            <div className="min-w-0 rounded-xl border border-line p-4">
              <p className="truncate text-xs text-muted">electroshopve.com{page.path === '/' ? '' : ` › ${page.path.slice(1)}`}</p>
              <p className="mt-1 line-clamp-2 text-lg leading-snug text-brand-700">{title}</p>
              <p className="mt-1 line-clamp-3 text-sm text-ink-soft">{description}</p>
            </div>
          </SettingsCard>

          <SettingsCard title="Así se ve en WhatsApp" description={subida ? undefined : 'La arma la tienda. Cambia al guardar.'}>
            <div className="overflow-hidden rounded-xl border border-line bg-surface">
              <div className="relative flex aspect-[1200/630] items-center justify-center bg-white">
                {image ? (
                  // La generada ya sale del tamaño justo y cambia al guardar: sin optimizar (la optimización la guarda 30 días)
                  <Image src={image} alt="" fill sizes="352px" className="object-cover" unoptimized={!subida || !image.startsWith('/')} />
                ) : (
                  <FiGlobe className="h-10 w-10 text-subtle" aria-hidden="true" />
                )}
              </div>
              <div className="space-y-0.5 p-3">
                <p className="line-clamp-1 text-sm font-semibold text-ink">{title}</p>
                <p className="line-clamp-2 text-xs text-muted">{description}</p>
                <p className="text-xs uppercase tracking-wide text-subtle">electroshopve.com</p>
              </div>
            </div>
          </SettingsCard>
        </div>
      </div>
    </>
  );
}
