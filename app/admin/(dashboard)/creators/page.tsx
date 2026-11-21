import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** Fusión F1 (G-73): Creadores vive en la pestaña correspondiente de Cursos y Creadores. */
export default function CreatorsRedirectPage() {
  redirect('/admin/cursos?vista=creadores');
}
