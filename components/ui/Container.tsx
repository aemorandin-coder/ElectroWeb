import type { ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'main';
}

/** Ancho máximo y márgenes laterales de la tienda (max-w-7xl). */
export default function Container({ children, className = '', as: Tag = 'div' }: ContainerProps) {
  return <Tag className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`.trim()}>{children}</Tag>;
}
