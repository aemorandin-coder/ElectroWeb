// C-288 · Los íconos propios de Electro Shop de cada uso de Claude: lib/ia/reglas.ts los nombra y aquí se resuelven.

import { IconoBandeja, IconoBuscar, IconoChat, IconoClientes, IconoCorreo, IconoLista, IconoSubir, type IconType } from '@/components/iconos';
import type { NombreIcono } from '@/lib/ia/reglas';

export const ICONOS_DE_USO: Record<NombreIcono, IconType> = {
  IconoBuscar, IconoLista, IconoChat, IconoBandeja, IconoClientes, IconoCorreo, IconoSubir,
};
