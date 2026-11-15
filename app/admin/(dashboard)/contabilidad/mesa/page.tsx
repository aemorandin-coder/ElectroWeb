import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { contadoraConFirma, firmaDe, notasDelMes, resumenDelMes } from '@/lib/contabilidad/mesa';
import { periodoDe } from '@/lib/contabilidad/montos';
import { datosEmpresa, talonarioActivo } from '@/lib/contabilidad/servidor';
import { talonarioDTO } from '@/lib/dto/contabilidad';
import MesaContadora from './_components/MesaContadora';

// C-235: la mesa de la contadora (la maqueta 4 del 14/11, docs/plan/CONTABILIDAD.md §13.1). La ven ella y el dueño
// (VER_CONTABILIDAD). Lo que todavía no existe (el libro, el calendario, el cierre) va en "Lo que viene", sin inventar datos.
export const dynamic = 'force-dynamic';

const ZONA = 'America/Caracas';

export default async function PaginaMesa() {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'VER_CONTABILIDAD')) redirect('/admin/contabilidad/facturas');
  const yo = session!.user as { id: string; name?: string | null; role?: string };
  const ahora = new Date();
  const periodo = periodoDe(ahora);
  const esContadora = yo.role === 'ACCOUNTANT';

  const [resumen, mia, contadora, notas, empresa, activo] = await Promise.all([
    resumenDelMes(periodo),
    firmaDe(yo.id),
    esContadora ? Promise.resolve(null) : contadoraConFirma(),
    notasDelMes(periodo, yo.id),
    datosEmpresa(),
    talonarioActivo(),
  ]);
  const hora = Number(new Intl.DateTimeFormat('en-US', { timeZone: ZONA, hour: 'numeric', hourCycle: 'h23' }).format(ahora));
  const saludo = hora >= 5 && hora < 12 ? 'Buenos días' : hora >= 12 && hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  const hoy = new Intl.DateTimeFormat('es-VE', { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(ahora);

  return (
    <MesaContadora
      yo={{ nombre: (mia?.nombre || yo.name || '').trim(), esContadora, puedeDeclarar: hasPermission(session, 'DECLARAR') }}
      saludo={saludo}
      hoy={hoy}
      periodo={periodo}
      empresa={{ nombre: empresa.nombre, rif: empresa.rif }}
      resumen={resumen}
      firma={esContadora ? mia : contadora?.firma ?? null}
      contadora={esContadora ? null : contadora ? { nombre: contadora.nombre } : null}
      notas={notas}
      talonario={activo ? (({ serie, proximoTexto, quedan }) => ({ serie, proximoTexto, quedan }))(talonarioDTO(activo)) : null}
    />
  );
}
