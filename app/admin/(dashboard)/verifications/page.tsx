import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** Fusión F1 (G-73): Verificaciones vive en la pestaña correspondiente de Clientes. */
export default function VerificationsRedirectPage() {
  redirect('/admin/customers?vista=verificaciones');
}
