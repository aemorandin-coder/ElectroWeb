'use client';

import { useSession } from 'next-auth/react';
import { useEdicionEnVivo } from '@/lib/edicion/useEdicionEnVivo';
import AvisoCambioAjeno from './AvisoCambioAjeno';
import AvisoPresencia from './AvisoPresencia';

// C-170: lo que cualquier editor del panel necesita para saber de los demás: quién más lo tiene abierto y si alguien lo cambió, lo
// restauró o lo borró mientras tanto. Se monta dentro del editor (modal o pantalla): al abrirse anota la presencia, y al cerrarse
// la quita. `etiqueta` es lo que ve la marquesina del equipo ("editando «Código FINDE»").

export default function PresenciaEnEditor({ recurso, etiqueta, nombreRecurso, femenino }: { recurso: string; etiqueta?: string; nombreRecurso: string; femenino?: boolean }) {
  const { data: sesion } = useSession();
  const { otros, cambio, olvidarCambio } = useEdicionEnVivo(recurso, sesion?.user?.id, etiqueta);
  return (
    <>
      <AvisoPresencia otros={otros} recurso={`${femenino ? 'esta' : 'este'} ${nombreRecurso}`} />
      {cambio && <AvisoCambioAjeno cambio={cambio} recurso={nombreRecurso} femenino={femenino} onCerrar={olvidarCambio} />}
    </>
  );
}
