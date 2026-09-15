/**
 * Diseños de gift card (C-71). Los usan la tarjeta 3D (tienda, canje, panel y admin)
 * y scripts/seed-gift-card-designs.ts, que los guarda en gift_card_designs con el mismo slug.
 */
export type GiftCardDesignSlug = 'electro' | 'obsidiana' | 'aurora' | 'navidad';

export interface GiftCardDesign {
  slug: GiftCardDesignSlug;
  name: string;
  category: 'MARCA' | 'PREMIUM' | 'NAVIDAD';
  background: string;
  text: string;
  accent: string;
  muted: string;
  line: string;
  chip: string;
  /** Intensidad de la lámina holográfica (0-1). */
  foil: number;
}

export const GIFT_CARD_DESIGNS: GiftCardDesign[] = [
  { slug: 'electro', name: 'Electro', category: 'MARCA', background: 'linear-gradient(135deg, #0f347f 0%, #1e4ba3 40%, #2a63cd 72%, #4f86ea 100%)', text: '#ffffff', accent: '#cfe0ff', muted: 'rgba(255,255,255,.72)', line: 'rgba(255,255,255,.34)', chip: 'rgba(255,255,255,.14)', foil: 0.18 },
  { slug: 'obsidiana', name: 'Obsidiana', category: 'PREMIUM', background: 'linear-gradient(140deg, #0c0e13 0%, #1a1e28 55%, #2b303c 100%)', text: '#f5ecd2', accent: '#e2bf62', muted: 'rgba(245,236,210,.66)', line: 'rgba(226,191,98,.45)', chip: 'rgba(226,191,98,.16)', foil: 0.14 },
  { slug: 'aurora', name: 'Aurora', category: 'PREMIUM', background: 'linear-gradient(135deg, #05262f 0%, #0a4557 45%, #146b82 75%, #2a63cd 125%)', text: '#eafffb', accent: '#8ff0e0', muted: 'rgba(234,255,251,.7)', line: 'rgba(143,240,224,.4)', chip: 'rgba(143,240,224,.14)', foil: 0.2 },
  { slug: 'navidad', name: 'Navidad', category: 'NAVIDAD', background: 'linear-gradient(135deg, #0d3a29 0%, #15533b 52%, #6e1b1f 120%)', text: '#fdf6e3', accent: '#f1cf78', muted: 'rgba(253,246,227,.7)', line: 'rgba(241,207,120,.42)', chip: 'rgba(241,207,120,.15)', foil: 0.12 },
];

/** Diseños anteriores de la página de Gift Cards → diseño actual más parecido. */
const LEGACY_SLUGS: Record<string, GiftCardDesignSlug> = {
  'electro-premium': 'electro',
  'electro-dark': 'electro',
  'obsidian-gold': 'obsidiana',
  'cosmic-violet': 'obsidiana',
  'aurora-neon': 'aurora',
  'matrix-green': 'aurora',
  'christmas-classic': 'navidad',
  'winter-wonderland': 'navidad',
};

export function getGiftCardDesign(slug: string | null | undefined): GiftCardDesign {
  const key = (slug && LEGACY_SLUGS[slug]) || slug;
  return GIFT_CARD_DESIGNS.find((d) => d.slug === key) ?? GIFT_CARD_DESIGNS[0];
}

/** "ESMC7K2P9QXA4MTD" → "ESMC-7K2P-9QXA-4MTD" */
export function formatGiftCardCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{4})(?=.)/g, '$1-');
}
