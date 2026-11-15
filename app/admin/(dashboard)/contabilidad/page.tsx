import { redirect } from 'next/navigation';

// C-229: Contabilidad empieza en Facturas. El Resumen del mes llega con C-230 (docs/plan/CONTABILIDAD.md §8).
export default function PaginaContabilidad() {
  redirect('/admin/contabilidad/facturas');
}
