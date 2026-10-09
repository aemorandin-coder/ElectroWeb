// C-169: nombres en lenguaje del equipo de lo que se edita en un producto. Módulo puro (lo usan el servidor y la pantalla).

/** Campos del formulario del asistente (WizardData) → cómo se llaman en un aviso o en el cuadro de conflicto */
export const ETIQUETA_CAMPO_FORMULARIO: Record<string, string> = {
  name: 'Nombre',
  sku: 'SKU',
  description: 'Descripción',
  categoryId: 'Categoría',
  brand: 'Marca',
  tags: 'Etiquetas',
  images: 'Fotos',
  isFeatured: 'Destacado en el inicio',
  isActive: 'Publicado',
  seoTitle: 'Título para buscadores',
  seoDescription: 'Descripción para buscadores',
  priceUSD: 'Precio',
  compareAtPriceUSD: 'Precio anterior (tachado)',
  costPerItem: 'Costo',
  stock: 'Stock',
  barcode: 'Código de barras',
  weightKg: 'Peso',
  dimensionLength: 'Largo',
  dimensionWidth: 'Ancho',
  dimensionHeight: 'Alto',
  medidasEstimadas: 'Medidas estimadas',
  isConsolidable: 'Envío con otros productos',
  shippingCost: 'Costo de envío',
  freeShipping: 'Envío gratis',
  specifications: 'Especificaciones',
  condition: 'Condición',
  conditionGrade: 'Grado',
  packaging: 'Empaque',
  includedItems: 'Qué incluye',
  missingItems: 'Qué le falta',
  usageHours: 'Horas de uso',
  batteryHealth: 'Batería',
  cosmeticNotes: 'Detalles estéticos',
  testNotes: 'Pruebas',
  warrantyDays: 'Garantía',
  serialNumber: 'Serial',
  digitalPlatform: 'Plataforma',
  digitalRegion: 'Región',
  deliveryMethod: 'Entrega',
  digitalVariants: 'Montos',
  marginPercent: 'Margen',
  accountFieldLabel: 'Dato que se pide al cliente',
  accountFieldHint: 'Ayuda del dato que se pide',
  redemptionInstructions: 'Instrucciones de canje',
};

/** Columnas de `products` → cómo se nombran en la bitácora y en "Luis guardó cambios: precio y stock" */
const ETIQUETA_COLUMNA: Record<string, string> = {
  name: 'nombre', description: 'descripción', priceUSD: 'precio', stock: 'stock', sku: 'SKU', categoryId: 'categoría',
  images: 'fotos', mainImage: 'fotos', specs: 'especificaciones', status: 'estado', isFeatured: 'destacado',
  compareAtPriceUSD: 'precio anterior', costPerItem: 'costo', barcode: 'código de barras', tags: 'etiquetas',
  seoTitle: 'datos para buscadores', seoDescription: 'datos para buscadores', seoImage: 'datos para buscadores',
  slug: 'dirección de la página', brandId: 'marca', productType: 'tipo', digitalPlatform: 'datos digitales',
  digitalRegion: 'datos digitales', deliveryMethod: 'datos digitales', redemptionInstructions: 'datos digitales',
  accountFieldLabel: 'datos digitales', accountFieldHint: 'datos digitales', weightKg: 'peso', dimensions: 'medidas',
  isConsolidable: 'envío', freeShipping: 'envío', shippingCost: 'envío', condition: 'condición', conditionGrade: 'condición',
  packaging: 'condición', includedItems: 'condición', missingItems: 'condición', usageHours: 'condición',
  batteryHealth: 'condición', cosmeticNotes: 'condición', testNotes: 'condición', warrantyDays: 'condición', serialNumber: 'condición',
  digitalVariants: 'montos',
};

/** Nombres humanos, sin repetir y en el orden en que aparecen (las columnas desconocidas se omiten) */
export function nombresDeColumnas(columnas: string[]): string[] {
  return [...new Set(columnas.map((c) => ETIQUETA_COLUMNA[c]).filter((n): n is string => Boolean(n)))];
}

/** "precio y stock", "nombre, precio y stock" */
export function listaEnTexto(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? '';
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}
