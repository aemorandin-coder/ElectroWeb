import { redirect } from 'next/navigation';

// C-293 (D5 del 18/11): Métodos de pago está en Ajustes → Vender. Esta dirección queda para los marcadores y los enlaces viejos.
// Crear y cambiar un método siguen en /admin/payments/nuevo y /admin/payments/<id>.
export default function PaymentsPage() {
  redirect('/admin/settings#pagos');
}
