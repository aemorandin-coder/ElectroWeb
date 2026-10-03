'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';

// C-169: borrador automático en el navegador. Quien edita un formulario largo no pierde su trabajo si la pestaña se recarga, se
// cierra o el recurso desaparece (otro administrador lo borró). Vive en `localStorage` de ESTE navegador y de esta persona
// (la clave lleva su id); nunca sale a la red. Todo con try/catch: en modo privado o con el almacenamiento lleno, simplemente no hay borrador.

const PREFIJO = 'es:borrador:';
const ESPERA_MS = 2_000;
const CADUCA_MS = 7 * 24 * 3_600_000;

export interface BorradorGuardado<T> {
  /** Lo que la persona tenía escrito */
  datos: T;
  /** El formulario tal como estaba cuando lo abrió (para combinar si otra persona cambió algo mientras tanto) */
  base: T;
  /** `updatedAt` del recurso cuando lo abrió */
  baseVersion: string | null;
  guardadoEn: string;
}

function leer<T>(clave: string): BorradorGuardado<T> | null {
  try {
    const crudo = localStorage.getItem(PREFIJO + clave);
    if (!crudo) return null;
    const borrador = JSON.parse(crudo) as BorradorGuardado<T>;
    if (!borrador?.datos || !borrador.guardadoEn || Date.now() - new Date(borrador.guardadoEn).getTime() > CADUCA_MS) {
      localStorage.removeItem(PREFIJO + clave);
      return null;
    }
    return borrador;
  } catch {
    return null;
  }
}

interface Opciones<T> {
  /** `product:<id>`, `product:nuevo`… con la persona al final. Null = apagado (todavía no se sabe quién es o qué se edita) */
  clave: string | null;
  /** El formulario como está ahora */
  datos: T | null;
  /** El formulario como se abrió */
  base: T | null;
  baseVersion: string | null;
  /** Hay cambios sin guardar. Solo entonces se guarda el borrador y se avisa al cerrar la pestaña */
  sucio: boolean;
}

export function useBorradorLocal<T>({ clave, datos, base, baseVersion, sucio }: Opciones<T>) {
  const [guardado, setGuardado] = useState<BorradorGuardado<T> | null>(null);
  // El que había al abrir: solo se ofrece, no se aplica solo
  useCargarAlMontar(() => {
    setGuardado(clave ? leer<T>(clave) : null);
  }, [clave]);
  // Mientras haya uno viejo por decidir (recuperar o descartar) distinto de lo que hay en pantalla, no se escribe encima
  const borrador = guardado !== null && JSON.stringify(guardado.datos) !== JSON.stringify(datos) ? guardado : null;
  const pendiente = borrador !== null;

  const ultimo = useRef({ datos, base, baseVersion });
  useEffect(() => {
    ultimo.current = { datos, base, baseVersion };
  });

  // Guardar 2 s después del último cambio
  useEffect(() => {
    if (!clave || !sucio || pendiente || !datos || !base) return;
    const temporizador = setTimeout(() => {
      try {
        const nuevo: BorradorGuardado<T> = { datos, base, baseVersion, guardadoEn: new Date().toISOString() };
        localStorage.setItem(PREFIJO + clave, JSON.stringify(nuevo));
      } catch {
        // Sin almacenamiento: no hay borrador
      }
    }, ESPERA_MS);
    return () => clearTimeout(temporizador);
  }, [clave, sucio, pendiente, datos, base, baseVersion]);

  // Cerrar o recargar la pestaña con cambios sin guardar: el navegador pregunta
  useEffect(() => {
    if (!sucio) return;
    const aviso = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
    };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [sucio]);

  const quitar = useCallback(() => {
    if (!clave) return;
    try {
      localStorage.removeItem(PREFIJO + clave);
    } catch {
      // Nada que quitar
    }
  }, [clave]);

  /** Se guardó con éxito (o se descartó): el borrador ya no sirve */
  const limpiar = useCallback(() => {
    quitar();
    setGuardado(null);
  }, [quitar]);

  /** `borrador` solo viene lleno cuando hay uno guardado distinto de lo que se ve: es el que se ofrece recuperar */
  return { borrador, limpiar };
}
