import type { Metadata } from 'next';

// C-258: la pestaña decía el título de la portada. Fuera de los buscadores, como el login y el registro (C-149).
export const metadata: Metadata = { title: 'Recuperar contraseña', robots: { index: false, follow: false } };

export default function RecuperarContrasenaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
