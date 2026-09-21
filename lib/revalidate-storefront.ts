import { revalidatePath } from 'next/cache';

/**
 * Después de guardar algo que la tienda muestra (productos, categorías, métodos de pago): C-95.
 * El home y las páginas estáticas se regeneran cada 60 s (ISR), así que sin esto el primer visitante
 * después de un cambio seguía viendo la versión vieja. Marca todo lo que cuelga del layout raíz, como
 * ya hace Configuración; en un Route Handler cada página se regenera en su próxima visita, no aquí.
 * Llamarla solo con la escritura confirmada. Si falla, el cambio ya está guardado: no se propaga el error.
 */
export function revalidateStorefront(): void {
  try {
    revalidatePath('/', 'layout');
  } catch (error) {
    console.error('[revalidateStorefront]', error);
  }
}
