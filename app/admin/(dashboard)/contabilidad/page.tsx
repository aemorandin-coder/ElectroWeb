import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import {
  calcularHojaIva, listarCompras, obtenerConfigContable, obtenerMovimientosMes, sincronizarObligacionesMes,
} from '@/lib/contabilidad/hub';
import { contadoraConFirma, firmaDe, notasDelMes, resumenDelMes } from '@/lib/contabilidad/mesa';
import { hoyVe, periodoDe, ultimosMeses, venceIva } from '@/lib/contabilidad/montos';
import {
  comprasSinFactura, datosEmpresa, facturasDelMes, libroDeVentas, talonarioActivo, talonarios, tasaYAlicuota, ventasDe30Dias,
} from '@/lib/contabilidad/servidor';
import { talonarioDTO } from '@/lib/dto/contabilidad';
import { rangoMes } from '@/lib/relacion-ventas';
import HubContabilidad from './_components/HubContabilidad';
import type { SubTabLibro, TabHubId } from './_components/tipos';

export const dynamic = 'force-dynamic';

const ZONA = 'America/Caracas';

const TABS_VALIDOS: TabHubId[] = ['resumen', 'facturacion', 'libros', 'movimientos', 'ajustes'];
const SUBTABS_LIBRO: SubTabLibro[] = ['ventas', 'compras', 'iva'];

export default async function PaginaContabilidad({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; tab?: string; libro?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'VER_CONTABILIDAD')) {
    if (hasPermission(session, 'FACTURAR')) redirect('/admin/contabilidad/facturas');
    redirect('/admin');
  }

  const yoUser = session!.user as { id: string; name?: string | null; role?: string };
  const esContadora = yoUser.role === 'ACCOUNTANT';
  const esDueno = hasPermission(session, 'CONFIG_CONTABLE');
  const puedeFacturar = hasPermission(session, 'FACTURAR');
  const puedeDeclarar = hasPermission(session, 'DECLARAR');

  const sp = await searchParams;
  const ahora = new Date();
  const actual = periodoDe(ahora);
  const mes = sp.mes && rangoMes(sp.mes) && sp.mes <= actual ? sp.mes : actual;
  const meses = ultimosMeses(actual);
  if (!meses.includes(mes)) meses.push(mes);

  let tabInicial: TabHubId = TABS_VALIDOS.includes(sp.tab as TabHubId) ? (sp.tab as TabHubId) : 'resumen';
  if (tabInicial === 'ajustes' && !esDueno) tabInicial = 'resumen';
  const subTabLibroInicial: SubTabLibro = SUBTABS_LIBRO.includes(sp.libro as SubTabLibro) ? (sp.libro as SubTabLibro) : 'ventas';

  const [
    empresa,
    { tasa, alicuota },
    resumen,
    periodo,
    obligaciones,
    firmaPropia,
    contadora,
    notas,
    tNormal,
    tContingencia,
    talonariosTodos,
    facturas,
    comprasPendientes,
    comprasGastos,
    libro,
    movimientos,
    ventas30,
    configCompleta,
  ] = await Promise.all([
    datosEmpresa(),
    tasaYAlicuota(),
    resumenDelMes(mes),
    calcularHojaIva(mes),
    sincronizarObligacionesMes(mes),
    firmaDe(yoUser.id),
    esContadora ? Promise.resolve(null) : contadoraConFirma(),
    notasDelMes(mes, yoUser.id),
    talonarioActivo(undefined, 'NORMAL'),
    talonarioActivo(undefined, 'CONTINGENCIA'),
    talonarios(),
    facturasDelMes(mes),
    comprasSinFactura(mes),
    listarCompras(mes),
    libroDeVentas(mes),
    obtenerMovimientosMes(mes, esDueno),
    ventasDe30Dias(ahora),
    obtenerConfigContable(),
  ]);

  const hora = Number(new Intl.DateTimeFormat('en-US', { timeZone: ZONA, hour: 'numeric', hourCycle: 'h23' }).format(ahora));
  const saludo = hora >= 5 && hora < 12 ? 'Buenos días' : hora >= 12 && hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  const hoyLargo = new Intl.DateTimeFormat('es-VE', {
    timeZone: ZONA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(ahora);

  const firma = esContadora ? firmaPropia : (contadora?.firma ?? null);

  return (
    <HubContabilidad
      datos={{
        tabInicial,
        subTabLibroInicial,
        mes,
        meses,
        hoy: hoyVe(ahora),
        venceIvaMes: venceIva(mes, configCompleta.ivaDiaLimite),
        saludo,
        hoyLargo,
        yo: {
          id: yoUser.id,
          nombre: (firmaPropia?.nombre || yoUser.name || '').trim(),
          esContadora,
          esDueno,
          puedeFacturar,
          puedeDeclarar,
        },
        empresa,
        tasaHoy: tasa,
        alicuota,
        resumen,
        periodo,
        obligaciones,
        firma,
        contadora: esContadora ? null : contadora ? { nombre: contadora.nombre } : null,
        notas,
        talonarioNormal: tNormal ? talonarioDTO(tNormal) : null,
        talonarioContingencia: tContingencia ? talonarioDTO(tContingencia) : null,
        talonariosTodos,
        facturas,
        comprasPendientes,
        comprasGastos,
        libro,
        movimientos,
        ventas30,
        config: esDueno ? configCompleta : null,
        canalPublico: configCompleta.canalEmision,
        imprentaAmbientePublico: configCompleta.imprentaAmbiente,
        checklistTotal: configCompleta.checklist2027.length,
        checklistHechos: configCompleta.checklist2027.filter((h) => h.hecho).length,
      }}
    />
  );
}
