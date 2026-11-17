// C-279: los íconos del Dashboard por su nombre (el catálogo de lib/dashboard es un módulo puro y los nombra con texto).
// Solo los del pack de Electro Shop (components/iconos). Sirve en el servidor y en el navegador.
import {
  IconoAdministrador, IconoAdvertencia, IconoBandeja, IconoBaseDeDatos, IconoBillete, IconoCalendario, IconoChat, IconoClaqueta,
  IconoClientes, IconoCompartir, IconoConfiguracion, IconoCuadricula, IconoCupon, IconoDocumento, IconoEnvio, IconoEnVivo,
  IconoEstrella, IconoFiltro, IconoGarantia, IconoMaletin, IconoMas, IconoObjetivo, IconoOrdenes, IconoPaquete, IconoPorcentaje,
  IconoPremio, IconoPuntero, IconoRecargarPuntos, IconoReportes, IconoSalvavidas, IconoServicioTecnico, IconoSubir, IconoTienda,
  IconoVariantes, IconoVentas,
} from '@/components/iconos';
import { createElement } from 'react';
import type { IconType, IconoProps } from '@/components/iconos/base';

const ICONOS: Record<string, IconType> = {
  Administrador: IconoAdministrador, Advertencia: IconoAdvertencia, Bandeja: IconoBandeja, BaseDeDatos: IconoBaseDeDatos, Billete: IconoBillete,
  Calendario: IconoCalendario, Chat: IconoChat, Claqueta: IconoClaqueta, Clientes: IconoClientes, Compartir: IconoCompartir,
  Configuracion: IconoConfiguracion, Cuadricula: IconoCuadricula, Cupon: IconoCupon, Documento: IconoDocumento, Envio: IconoEnvio,
  EnVivo: IconoEnVivo, Estrella: IconoEstrella, Filtro: IconoFiltro, Garantia: IconoGarantia, Maletin: IconoMaletin, Mas: IconoMas,
  Objetivo: IconoObjetivo, Ordenes: IconoOrdenes, Paquete: IconoPaquete, Porcentaje: IconoPorcentaje, Premio: IconoPremio, Puntero: IconoPuntero,
  RecargarPuntos: IconoRecargarPuntos, Reportes: IconoReportes, Salvavidas: IconoSalvavidas, ServicioTecnico: IconoServicioTecnico,
  Subir: IconoSubir, Tienda: IconoTienda, Variantes: IconoVariantes, Ventas: IconoVentas,
};

export const iconoDe = (nombre: string): IconType => ICONOS[nombre] ?? IconoCuadricula;

/** Un ícono del pack por su nombre (`<IconoPor nombre="Ventas" />`) */
export function IconoPor({ nombre, ...props }: IconoProps & { nombre: string }) {
  return createElement(iconoDe(nombre), props);
}

/** Los accesos rápidos, por su id (lib/dashboard/widgets.ts) */
export const ICONO_ACCESO: Record<string, string> = {
  'nuevo-producto': 'Mas', ordenes: 'Ordenes', 'nueva-cotizacion': 'Documento', 'consultar-pago': 'Billete', oferta: 'Porcentaje',
  'nueva-historia': 'Claqueta', importar: 'Subir', categorias: 'Variantes', 'relacion-ventas': 'Reportes', configuracion: 'Configuracion',
  productos: 'Paquete', clientes: 'Clientes', mensajes: 'Chat', promotores: 'Compartir', resenas: 'Estrella', garantias: 'Salvavidas',
};
