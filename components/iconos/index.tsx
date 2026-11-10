// GENERADO: no editar a mano. Íconos propios de Electro Shop, pack v1.2 (166 íconos, C-188).
// Fuente: ~/.cache/electroshop-iconos/pack.py (los dibujos en la cuadrícula de 24, trazo de 2) y la entrega para Luis,
// "ElectroShop Brand/Pack de íconos/iconos-electro-shop-v1.2.html" (sus dibujos también van en el JSON DATOS).
// Para cambiar o agregar un ícono: editar pack.py y correr `python3 -I ~/.cache/electroshop-iconos/componentes.py <raíz del repo>`.
// La base (medida, título, aria-hidden, `lleno` y los colores del acento) está a mano en ./base.tsx.
// Devuelven ReactNode, como el IconType de react-icons: así una lista puede mezclar estos íconos con logos de marca.
import type { ReactNode } from 'react';
import { Icono, LIN, SOL, SOL_LIN, SUP, type IconoProps } from './base';

export type { IconoProps, IconType } from './base';

/** Digital (código que llega). Grupo: Tienda y compra. */
export function IconoDigital(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="3" y="3" width="18" height="12" rx="2.5" /><path d="M7 7.5h3M12.5 7.5h4.5M7 10.5h5M14.5 10.5h2.5" /><path d="M9 18h6l-3 3.5z" strokeWidth="1.5" style={SOL_LIN} /></Icono>;
}

/** Carrito. Grupo: Tienda y compra. */
export function IconoCarrito(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M5.6 6.5h14.8a.8.8 0 0 1 .78.98L20 12.8a2 2 0 0 1-1.95 1.55H7.6z" style={SUP} /><path d="M2.5 3H4a1 1 0 0 1 .97.76L8 16.5h11" /><circle cx="9.5" cy="20" r="1.25" /><circle cx="17.5" cy="20" r="1.25" /></Icono>;
}

/** Buscar. Grupo: Tienda y compra. */
export function IconoBuscar(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="10.5" cy="10.5" r="6.5" style={SUP} /><path d="M15.4 15.4l5.1 5.1" /></Icono>;
}

/** Bolsa de compras. Grupo: Tienda y compra. */
export function IconoBolsa(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M5.2 8h13.6l1.2 11.2a1.6 1.6 0 0 1-1.6 1.8H5.6A1.6 1.6 0 0 1 4 19.2z" /><path d="M8.5 10.5V7a3.5 3.5 0 0 1 7 0v3.5" style={LIN} /></Icono>;
}

/** Favoritos. Grupo: Tienda y compra. */
export function IconoFavoritos(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M20.4 4.9a5.2 5.2 0 0 0-7.35 0L12 5.95l-1.05-1.05a5.2 5.2 0 0 0-7.35 7.35L12 20.65l8.4-8.4a5.2 5.2 0 0 0 0-7.35z" style={SUP} /></Icono>;
}

/** Oferta. Grupo: Tienda y compra. */
export function IconoOferta(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M4.5 3H11l9.5 9.5a1.8 1.8 0 0 1 0 2.55l-5.45 5.45a1.8 1.8 0 0 1-2.55 0L3 11V4.5A1.5 1.5 0 0 1 4.5 3z" /><circle cx="7.5" cy="7.5" r="1.3" /><path d="M10.4 14.9l4.5-4.5" style={LIN} /><circle cx="11" cy="11" r="1.1" stroke="none" style={SOL} /><circle cx="14.4" cy="14.4" r="1.1" stroke="none" style={SOL} /></Icono>;
}

/** Descuento. Grupo: Tienda y compra. */
export function IconoPorcentaje(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M18.5 5.5l-13 13" /><circle cx="7.25" cy="7.25" r="2.75" style={SUP} /><circle cx="16.75" cy="16.75" r="2.75" style={SUP} /></Icono>;
}

/** Cupón. Grupo: Tienda y compra. */
export function IconoCupon(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M4 5.5h16A1.5 1.5 0 0 1 21.5 7v2.5a2.5 2.5 0 0 0 0 5V17a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 17v-2.5a2.5 2.5 0 0 0 0-5V7A1.5 1.5 0 0 1 4 5.5z" /><path d="M15.5 7.8v1.4M15.5 11.3v1.4M15.5 14.8v1.4" style={LIN} /></Icono>;
}

/** Regalo. Grupo: Tienda y compra. */
export function IconoRegalo(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M12 8C10.4 4.6 6.9 4.9 7.2 6.9 7.4 8 9.4 8 12 8zM12 8c1.6-3.4 5.1-3.1 4.8-1.1C16.6 8 14.6 8 12 8z" style={SUP} /><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7M12 8v13" /></Icono>;
}

/** Estrella (reseñas y destacados). Grupo: Tienda y compra. */
export function IconoEstrella(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M12 2.8l2.75 5.6 6.2.9-4.5 4.35 1.05 6.15L12 16.9l-5.5 2.9 1.05-6.15L3.05 9.3l6.2-.9z" style={SUP} /></Icono>;
}

/** Estrella llena (calificación). Grupo: Tienda y compra. */
export function IconoEstrellaLlena(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M12 2.8l2.75 5.6 6.2.9-4.5 4.35 1.05 6.15L12 16.9l-5.5 2.9 1.05-6.15L3.05 9.3l6.2-.9z" style={SOL_LIN} /></Icono>;
}

/** Novedad. Grupo: Tienda y compra. */
export function IconoNovedad(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M10 6.5c.6 4.1 1.4 4.9 5.5 5.5-4.1.6-4.9 1.4-5.5 5.5-.6-4.1-1.4-4.9-5.5-5.5 4.1-.6 4.9-1.4 5.5-5.5z" strokeWidth="1" style={SOL_LIN} /><path d="M17.5 3.5c.25 1.7.8 2.25 2.5 2.5-1.7.25-2.25.8-2.5 2.5-.25-1.7-.8-2.25-2.5-2.5 1.7-.25 2.25-.8 2.5-2.5zM18 15c.2 1.4.6 1.8 2 2-1.4.2-1.8.6-2 2-.2-1.4-.6-1.8-2-2 1.4-.2 1.8-.6 2-2z" fill="currentColor" stroke="currentColor" strokeWidth=".8" /></Icono>;
}

/** Variantes. Grupo: Tienda y compra. */
export function IconoVariantes(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M12 3l9 4.5-9 4.5-9-4.5z" style={SUP} /><path d="M3 12l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5" /></Icono>;
}

/** Pedir un producto. Grupo: Tienda y compra. */
export function IconoPedirProducto(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="3" y="4" width="18" height="16" rx="2" style={SUP} /><path d="M3 9h18" /><path d="M10.1 12.6a1.95 1.95 0 1 1 2.7 1.8c-.5.2-.8.6-.8 1.1v.3M12 18.1v.01" /></Icono>;
}

/** Tienda (retiro). Grupo: Tienda y compra. */
export function IconoTienda(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M3.5 9L5 4h14l1.5 5a2.125 2.125 0 0 1-4.25 0 2.125 2.125 0 0 1-4.25 0 2.125 2.125 0 0 1-4.25 0A2.125 2.125 0 0 1 3.5 9z" style={SUP} /><path d="M5 11.2V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7.8M10 20.5v-5h4v5" /></Icono>;
}

/** Paquete / mis pedidos. Grupo: Tienda y compra. */
export function IconoPaquete(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="3" y="4" width="18" height="16.5" rx="2" /><path d="M3 9h18" /><path d="M9.5 4h5v7.5l-2.5-1.3-2.5 1.3z" style={SUP} /></Icono>;
}

/** Entregado. Grupo: Tienda y compra. */
export function IconoEntregado(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="2.5" y="4" width="15" height="14" rx="2" /><path d="M2.5 8.5h15M8 4v5.5l2-1 2 1V4" /><circle cx="17.4" cy="17" r="4.2" style={SUP} /><path d="M15.5 17.1l1.3 1.3 2.5-2.6" /></Icono>;
}

/** Envío. Grupo: Tienda y compra. */
export function IconoEnvio(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M3.5 4.5H13a1.5 1.5 0 0 1 1.5 1.5V16H3.5A1.5 1.5 0 0 1 2 14.5V6a1.5 1.5 0 0 1 1.5-1.5z" style={SUP} /><path d="M14.5 8.5h3.7l3.3 3.6V16h-7" /><circle cx="6.5" cy="18" r="2" /><circle cx="17.5" cy="18" r="2" /></Icono>;
}

/** Ubicación. Grupo: Tienda y compra. */
export function IconoUbicacion(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M12 21.5s7-6.2 7-11.5a7 7 0 0 0-14 0c0 5.3 7 11.5 7 11.5z" /><circle cx="12" cy="10" r="2.6" style={SUP} /></Icono>;
}

/** Garantía. Grupo: Tienda y compra. */
export function IconoGarantia(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M12 2.8l7.5 2.7V11c0 4.6-3.1 8.3-7.5 10-4.4-1.7-7.5-5.4-7.5-10V5.5z" /><path d="M8.6 11.8l2.4 2.4 4.6-4.6" style={LIN} /></Icono>;
}

/** Sin protección. Grupo: Tienda y compra. */
export function IconoSinProteccion(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M7.31 4.49L12 2.8l7.5 2.7V11c0 1.6-.37 3.08-1.05 4.42M15.72 18.83C14.65 19.73 13.39 20.46 12 21c-4.4-1.7-7.5-5.4-7.5-10V6.92" /><path d="M3 3l18 18" style={LIN} /></Icono>;
}

/** Pago seguro. Grupo: Tienda y compra. */
export function IconoCandado(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M7.5 10.5v-3a4.5 4.5 0 0 1 9 0v3" /><rect x="4.5" y="10.5" width="15" height="10.5" rx="2" /><circle cx="12" cy="14.8" r="1.5" stroke="none" style={SOL} /><path d="M12 16v2" style={LIN} /></Icono>;
}

/** Desbloquear. Grupo: Tienda y compra. */
export function IconoAbrirCandado(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M7.5 10.5v-3a4.5 4.5 0 0 1 8.7-1.6" /><rect x="4.5" y="10.5" width="15" height="10.5" rx="2" /><circle cx="12" cy="14.8" r="1.5" stroke="none" style={SOL} /><path d="M12 16v2" style={LIN} /></Icono>;
}

/** Puntos ES. Grupo: Pagos y Puntos ES. */
export function IconoPuntosEs(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="6" /><path d="M12 8.2l1.2 2.6 2.6 1.2-2.6 1.2-1.2 2.6-1.2-2.6-2.6-1.2 2.6-1.2z" strokeWidth="1" style={SOL_LIN} /></Icono>;
}

/** Recargar Puntos ES. Grupo: Pagos y Puntos ES. */
export function IconoRecargarPuntos(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="10.5" cy="10.5" r="7.5" /><circle cx="10.5" cy="10.5" r="4.8" /><path d="M10.5 7.6l.95 2 2 .95-2 .95-.95 2-.95-2-2-.95 2-.95z" fill="currentColor" stroke="currentColor" strokeWidth=".8" /><circle cx="17.6" cy="17.6" r="3.9" style={SUP} /><path d="M17.6 15.9v3.4M15.9 17.6h3.4" /></Icono>;
}

/** Entrada de Puntos ES. Grupo: Pagos y Puntos ES. */
export function IconoEntradaPuntos(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="10.5" cy="10.5" r="7.5" /><circle cx="10.5" cy="10.5" r="4.8" /><path d="M10.5 7.6l.95 2 2 .95-2 .95-.95 2-.95-2-2-.95 2-.95z" fill="currentColor" stroke="currentColor" strokeWidth=".8" /><circle cx="17.6" cy="17.6" r="3.9" style={SUP} /><path d="M19 19l-2.7-2.7M16.3 18.4v-2.1h2.1" /></Icono>;
}

/** Salida de Puntos ES. Grupo: Pagos y Puntos ES. */
export function IconoSalidaPuntos(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="10.5" cy="10.5" r="7.5" /><circle cx="10.5" cy="10.5" r="4.8" /><path d="M10.5 7.6l.95 2 2 .95-2 .95-.95 2-.95-2-2-.95 2-.95z" fill="currentColor" stroke="currentColor" strokeWidth=".8" /><circle cx="17.6" cy="17.6" r="3.9" style={SUP} /><path d="M16.3 16.3L19 19M19 16.9V19h-2.1" /></Icono>;
}

/** Tarjeta / método de pago. Grupo: Pagos y Puntos ES. */
export function IconoTarjeta(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="2" y="8.5" width="20" height="3" stroke="none" style={SOL} /><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M5.5 15.5h4" /></Icono>;
}

/** Pago móvil. Grupo: Pagos y Puntos ES. */
export function IconoPagoMovil(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><g strokeWidth="1.6" style={LIN}><rect x="8.3" y="6.3" width="3" height="3" rx=".5" /><rect x="12.7" y="6.3" width="3" height="3" rx=".5" /><rect x="8.3" y="10.7" width="3" height="3" rx=".5" /></g><circle cx="13.5" cy="11.4" r=".75" stroke="none" style={SOL} /><circle cx="15.2" cy="13.1" r=".75" stroke="none" style={SOL} /><circle cx="13.5" cy="13.4" r=".75" stroke="none" style={SOL} /><path d="M10.5 18h3" /></Icono>;
}

/** Código QR. Grupo: Pagos y Puntos ES. */
export function IconoQr(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><g stroke="none" style={SOL}><rect x="5.5" y="5.5" width="2.5" height="2.5" rx=".5" /><rect x="16" y="5.5" width="2.5" height="2.5" rx=".5" /><rect x="5.5" y="16" width="2.5" height="2.5" rx=".5" /></g><path d="M14 14h3.5v3.5M20.75 14v.01M14 20.75h.01M17.5 20.75h3.25v-3.25" /></Icono>;
}

/** Billete / precio. Grupo: Pagos y Puntos ES. */
export function IconoBillete(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.8" style={SUP} /><path d="M5.5 9.5h.01M18.5 14.5h.01" /></Icono>;
}

/** Premio / comisión. Grupo: Pagos y Puntos ES. */
export function IconoPremio(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M7 2.5l3 6.8M17 2.5l-3 6.8" /><circle cx="12" cy="15" r="5.5" style={SUP} /></Icono>;
}

/** Gift Cards y Recargas. Grupo: Categorías. */
export function IconoGiftCard(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="2" y="5" width="20" height="14" rx="2.5" style={SUP} /><path d="M2 10.5h20M8.5 5v14" /><path d="M8.5 10.5c-1.2-2.4-3.6-2.2-3.4-.6.1.9 1.6.6 3.4.6zM8.5 10.5c1.2-2.4 3.6-2.2 3.4-.6-.1.9-1.6.6-3.4.6z" /></Icono>;
}

/** Videojuegos. Grupo: Categorías. */
export function IconoVideojuegos(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M14 6.71A5.5 5.5 0 1 1 14 17.29z" style={SUP} /><circle cx="16.3" cy="12" r="1.3" /><rect x="2.5" y="3" width="11.5" height="18" rx="2" /><path d="M5.5 3.5v17" /></Icono>;
}

/** Consolas. Grupo: Categorías. */
export function IconoConsola(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="5.5" y="2.5" width="13" height="19" rx="2.5" /><rect x="8" y="5" width="8" height="6" rx="1" style={SUP} /><path d="M9.5 13.8v3.4M7.8 15.5h3.4" /><circle cx="14.2" cy="16.6" r="1" fill="currentColor" stroke="none" /><circle cx="15.9" cy="14.8" r="1" fill="currentColor" stroke="none" /></Icono>;
}

/** Controles y mandos. Grupo: Categorías. */
export function IconoControl(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M7.5 7h9a4.5 4.5 0 0 1 4.4 3.6l.6 4.2a2.7 2.7 0 0 1-4.7 2.2L15 15H9l-1.8 2a2.7 2.7 0 0 1-4.7-2.2l.6-4.2A4.5 4.5 0 0 1 7.5 7z" style={SUP} /><path d="M7.5 9.6v3.2M5.9 11.2h3.2" /><circle cx="15.8" cy="10.3" r=".95" fill="currentColor" stroke="none" /><circle cx="17.6" cy="12.1" r=".95" fill="currentColor" stroke="none" /></Icono>;
}

/** Accesorios gaming. Grupo: Categorías. */
export function IconoMouse(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="6.5" y="6.5" width="11" height="14.5" rx="5.5" /><rect x="11" y="9" width="2" height="3.6" rx="1" stroke="none" style={SOL} /><path d="M12 6.5V5c0-1.4-1.1-2-2.4-2H8.5" /></Icono>;
}

/** Audio. Grupo: Categorías. */
export function IconoAudifonos(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="13.5" width="4.5" height="7" rx="2" style={SUP} /><rect x="16.5" y="13.5" width="4.5" height="7" rx="2" style={SUP} /></Icono>;
}

/** Fuentes de poder y energía. Grupo: Categorías. */
export function IconoBateria(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="10" y="2.3" width="4" height="2.2" rx=".6" fill="currentColor" stroke="none" /><rect x="7" y="4.5" width="10" height="17" rx="2" /><g stroke="none" style={SOL}><rect x="9.3" y="7" width="5.4" height="3.2" rx=".6" /><rect x="9.3" y="11.4" width="5.4" height="3.2" rx=".6" /><rect x="9.3" y="15.8" width="5.4" height="3.2" rx=".6" /></g></Icono>;
}

/** Misceláneos y adaptadores. Grupo: Categorías. */
export function IconoCableUsb(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="13.5" y="2.5" width="5" height="4.5" rx=".6" /><path d="M15 4.6h.01M17 4.6h.01" strokeWidth="1.4" /><rect x="12.5" y="7" width="7" height="7.5" rx="1.8" style={SUP} /><path d="M16 14.5v2a3.5 3.5 0 0 1-3.5 3.5H4.5" /></Icono>;
}

/** Componentes de PC. Grupo: Categorías. */
export function IconoChip(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="5" y="5" width="14" height="14" rx="2" /><rect x="8.5" y="8.5" width="7" height="7" rx="1" style={SUP} /><path d="M9 2.5V5M12 2.5V5M15 2.5V5M9 19v2.5M12 19v2.5M15 19v2.5M2.5 9H5M2.5 12H5M2.5 15H5M19 9h2.5M19 12h2.5M19 15h2.5" /></Icono>;
}

/** Celulares y tablets. Grupo: Categorías. */
export function IconoCelularTableta(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="8" y="3" width="13.5" height="17" rx="2" /><rect x="2.5" y="8" width="8" height="13" rx="1.8" style={SUP} /></Icono>;
}

/** Laptops. Grupo: Categorías. */
export function IconoLaptop(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="4.5" y="4.5" width="15" height="10.5" rx="1.5" style={SUP} /><path d="M4.3 15l-2 3.6a.9.9 0 0 0 .8 1.4h17.8a.9.9 0 0 0 .8-1.4l-2-3.6" /></Icono>;
}

/** PC de escritorio. Grupo: Categorías. */
export function IconoPcEscritorio(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="2" y="4" width="12" height="9.5" rx="1.5" style={SUP} /><path d="M8 13.5V18M5 18h6" /><rect x="16" y="4" width="5.5" height="14" rx="1.2" /><path d="M17.8 7h1.9" /><circle cx="18.75" cy="14.5" r=".9" fill="currentColor" stroke="none" /></Icono>;
}

/** PC gaming. Grupo: Categorías. */
export function IconoPcGaming(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="5" y="2.5" width="14" height="19" rx="2" /><rect x="7.5" y="5" width="9" height="11" rx="1" style={SUP} /><circle cx="12" cy="10.5" r="2.8" /><circle cx="12" cy="10.5" r=".8" fill="currentColor" stroke="none" /><path d="M12 18.8h.01" /></Icono>;
}

/** Software. Grupo: Categorías. */
export function IconoSoftware(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="2.5" y="3.5" width="19" height="17" rx="2" /><path d="M2.5 7.5h19" /><circle cx="5.2" cy="5.5" r=".7" fill="currentColor" stroke="none" /><circle cx="7.4" cy="5.5" r=".7" fill="currentColor" stroke="none" /><circle cx="8.5" cy="14" r="2.7" style={SUP} /><path d="M11.2 14h7M15.7 14v2.2M17.7 14v1.6" /></Icono>;
}

/** CCTV y redes. Grupo: Categorías. */
export function IconoCamaraSeguridad(props: IconoProps): ReactNode {
  return <Icono {...props}><g transform="rotate(-16 15.5 8.5)"><rect x="2.5" y="5.5" width="13" height="6" rx="2" style={SUP} /><circle cx="5.8" cy="8.5" r="1.1" fill="currentColor" stroke="none" /></g><path d="M13.5 11.6v3.4H21M21 11v8" /></Icono>;
}

/** Redes. Grupo: Categorías. */
export function IconoRouter(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="2.5" y="13" width="19" height="7" rx="2" /><path d="M7 13L5.5 4.5M17 13l1.5-8.5" style={LIN} /><path d="M6.5 16.5h.01M9.5 16.5h.01M12.5 16.5h.01" /></Icono>;
}

/** Electrónica y repuestos. Grupo: Categorías. */
export function IconoCircuito(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="3" y="3" width="18" height="18" rx="2.5" /><rect x="9" y="9" width="6" height="6" rx="1" style={SUP} /><path d="M15 12h2.5V8M9 12H6.5v4M12 15v6" /><circle cx="17.5" cy="6.8" r="1.2" /><circle cx="6.5" cy="17.2" r="1.2" /></Icono>;
}

/** Almacenamiento. Grupo: Categorías. */
export function IconoDiscoDuro(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="4" y="2.5" width="16" height="19" rx="2" /><circle cx="12" cy="10" r="4.5" style={SUP} /><circle cx="12" cy="10" r="1.2" /><path d="M8 18h3M16 18h.01" /></Icono>;
}

/** Micrófonos. Grupo: Categorías. */
export function IconoMicrofono(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="9" y="2.5" width="6" height="11" rx="3" style={SUP} /><path d="M5.5 10.5a6.5 6.5 0 0 0 13 0M12 17v4.5M8.5 21.5h7" /></Icono>;
}

/** Parlantes. Grupo: Categorías. */
export function IconoParlante(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="5" y="2.5" width="14" height="19" rx="2" /><circle cx="12" cy="14.5" r="3.8" style={SUP} /><circle cx="12" cy="14.5" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="7" r="1.5" /></Icono>;
}

/** Wearables. Grupo: Categorías. */
export function IconoRelojInteligente(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M8.5 6.5l.8-4h5.4l.8 4M8.5 17.5l.8 4h5.4l.8-4" /><rect x="6" y="6.5" width="12" height="11" rx="2.5" /><rect x="8.5" y="9" width="7" height="6" rx="1" style={SUP} /></Icono>;
}

/** Fotografía. Grupo: Categorías. */
export function IconoCamaraFotos(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M4.5 7h2.8l1.6-2.5h6.2L16.7 7h2.8A1.5 1.5 0 0 1 21 8.5v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-10A1.5 1.5 0 0 1 4.5 7z" /><circle cx="12" cy="13.2" r="3.8" style={SUP} /><path d="M17.8 10h.01" /></Icono>;
}

/** Impresoras / imprimir. Grupo: Categorías. */
export function IconoImpresora(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M7 9V3.5h10V9" /><rect x="3" y="9" width="18" height="8" rx="2" /><rect x="7" y="14" width="10" height="7" rx="1" style={SUP} /><path d="M17.5 12h.01" /></Icono>;
}

/** Monitor. Grupo: Categorías. */
export function IconoMonitor(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="2.5" y="3.5" width="19" height="13" rx="2" style={SUP} /><path d="M12 16.5v4M8 20.5h8" /></Icono>;
}

/** Celular. Grupo: Categorías. */
export function IconoCelular(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="6" y="2.5" width="12" height="19" rx="2.5" style={SUP} /><path d="M10.5 18.5h3" /></Icono>;
}

/** Tableta. Grupo: Categorías. */
export function IconoTableta(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="4" y="2.5" width="16" height="19" rx="2.5" style={SUP} /><path d="M10.5 18.5h3" /></Icono>;
}

/** Ferretería. Grupo: Ferretería. */
export function IconoFerreteria(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="3" y="8" width="18" height="12.5" rx="2" /><path d="M3 12.5h7.5M13.5 12.5H21" /><path d="M9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8" /><rect x="10.5" y="10.5" width="3" height="4.5" rx="1" style={SUP} /></Icono>;
}

/** Pinturas. Grupo: Ferretería. */
export function IconoPintura(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="3" y="3" width="14" height="5" rx="1.5" style={SUP} /><path d="M17 5.5h1.5A1.5 1.5 0 0 1 20 7v2.1a1.5 1.5 0 0 1-1.1 1.45l-6.3 1.8a1.5 1.5 0 0 0-1.1 1.45V15" /><rect x="10" y="15" width="3" height="6.5" rx="1.5" /></Icono>;
}

/** Herramientas eléctricas. Grupo: Ferretería. */
export function IconoTaladro(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M2.5 8.5H5" /><rect x="5" y="6.5" width="3" height="4" rx="1" /><path d="M8 5.5l2-1h8a2.5 2.5 0 0 1 2.5 2.5v2.5a2.5 2.5 0 0 1-2.5 2.5h-8l-2-1z" /><path d="M12.5 12l1 6M18 12l-1 6" /><rect x="11.5" y="18" width="7.5" height="3.5" rx="1" style={SUP} /></Icono>;
}

/** Electricidad. Grupo: Ferretería. */
export function IconoEnchufe(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="3" y="3" width="18" height="18" rx="3.5" /><circle cx="12" cy="12" r="6" /><path d="M10 9.4v2.4M14 9.4v2.4" /><circle cx="12" cy="14.7" r="1.3" stroke="none" style={SOL} /></Icono>;
}

/** Jardín y agro. Grupo: Ferretería. */
export function IconoJardin(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M5.5 2.5h3M7 2.5v10" /><path d="M4.5 12.5h5V17l-2.5 3.5L4.5 17z" /><path d="M16.5 21.5v-6.5" /><path d="M16.5 15c0-2.2-1.6-3.8-3.8-3.8 0 2.2 1.6 3.8 3.8 3.8zM16.5 15c0-2.5 1.8-4.3 4.3-4.3 0 2.5-1.8 4.3-4.3 4.3z" style={SUP} /><path d="M13 21.5h7" /></Icono>;
}

/** Bombas y agua. Grupo: Ferretería. */
export function IconoAgua(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M3 6.5v7.5" /><path d="M3 8.5h9a4 4 0 0 1 4 4V15h-3v-2a1 1 0 0 0-1-1H3" /><path d="M8 8.5V5.5M5.5 5h5" /><path d="M14.5 17.3c-.9 1.1-1.4 1.9-1.4 2.6a1.4 1.4 0 0 0 2.8 0c0-.7-.5-1.5-1.4-2.6z" strokeWidth="1" style={SOL_LIN} /></Icono>;
}

/** Cerrajería. Grupo: Ferretería. */
export function IconoLlave(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="15.5" cy="8.5" r="5" /><circle cx="16.6" cy="7.4" r="1.4" stroke="none" style={SOL} /><path d="M11.9 12.1L3.5 20.5" /><path d="M6 18l2 2M8.5 15.5l1.6 1.6" /></Icono>;
}

/** Iluminación. Grupo: Ferretería. */
export function IconoBombillo(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M9 17v-1.3c0-1-.5-1.8-1.3-2.6A6.5 6.5 0 1 1 16.3 13.1c-.8.8-1.3 1.6-1.3 2.6V17z" /><path d="M9.5 19.5h5M10.5 22h3" /><path d="M10.2 14.4v-2.6l.95-1 .85 1 .85-1 .95 1v2.6" strokeWidth="1.6" style={LIN} /></Icono>;
}

/** Herramientas manuales. Grupo: Ferretería. */
export function IconoHerramientas(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M6.21 3.45A3.4 3.4 0 1 1 3.45 6.21L5.01 7.77L7.77 5.01z" /><path d="M9.20 9.20L19.5 19.5" /><path d="M11.6 12.1L19 4.7M18 3.7l2 2" /><path d="M12.8 13.4l-6.4 6.4a1.8 1.8 0 0 1-2.55-2.55l6.4-6.4z" style={SUP} /></Icono>;
}

/** Soldadura. Grupo: Ferretería. */
export function IconoSoldadura(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M6 4.6C7.8 3.6 9.8 3 12 3s4.2.6 6 1.6V15a6 6 0 0 1-12 0z" /><path d="M3.5 9.5v3M20.5 9.5v3" /><rect x="8" y="7" width="8" height="4.5" rx="1" style={SUP} /></Icono>;
}

/** Servicio técnico. Grupo: Servicios y cursos. */
export function IconoServicioTecnico(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M14.5 14.5L19 19" strokeWidth="4.5" style={LIN} /><path d="M13 13L4 4M5 19l8.5-8.5" /><path d="M16.608 4.553A3.5 3.5 0 1 0 19.447 7.392" /></Icono>;
}

/** Cursos. Grupo: Servicios y cursos. */
export function IconoCursos(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M12 4l9 4.5-9 4.5-9-4.5z" style={SUP} /><path d="M6.5 10.8V16c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3v-5.2M19.5 9.25V15" /></Icono>;
}

/** Video. Grupo: Servicios y cursos. */
export function IconoVideo(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="2.5" y="6" width="13" height="12" rx="2" style={SUP} /><path d="M15.5 10.5l6-3.5v10l-6-3.5" /></Icono>;
}

/** Mi cuenta. Grupo: Cuenta y avisos. */
export function IconoCuenta(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="12" cy="7.5" r="4" style={SUP} /><path d="M4.5 21v-.6C4.5 16.8 7.9 14 12 14s7.5 2.8 7.5 6.4v.6z" /></Icono>;
}

/** Clientes / equipo. Grupo: Cuenta y avisos. */
export function IconoClientes(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="16.5" cy="7.5" r="3" /><path d="M15 13.3a5.6 5.6 0 0 1 1.5-.2c3 0 5.3 2.2 5.3 5.2v.8h-3" /><circle cx="9" cy="8" r="3.6" style={SUP} /><path d="M2.5 20.5v-.7c0-3.4 2.9-5.8 6.5-5.8s6.5 2.4 6.5 5.8v.7z" style={SUP} /></Icono>;
}

/** Verificado. Grupo: Cuenta y avisos. */
export function IconoVerificado(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="10" cy="7.5" r="4" /><path d="M3 20.5v-.6c0-3.6 3.1-6 7-6 1.2 0 2.3.2 3.3.6" /><circle cx="17.2" cy="17" r="4.2" style={SUP} /><path d="M15.3 17.1l1.3 1.3 2.5-2.6" /></Icono>;
}

/** Registrarse / invitar. Grupo: Cuenta y avisos. */
export function IconoRegistrarse(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="10" cy="7.5" r="4" /><path d="M3 20.5v-.6c0-3.6 3.1-6 7-6 1.2 0 2.3.2 3.3.6" /><circle cx="17.2" cy="17" r="4.2" style={SUP} /><path d="M17.2 15.1v3.8M15.3 17h3.8" /></Icono>;
}

/** Administrador. Grupo: Cuenta y avisos. */
export function IconoAdministrador(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="10" cy="7.5" r="4" /><path d="M3 20.5v-.6c0-3.6 3.1-6 7-6 1.2 0 2.3.2 3.3.6" /><circle cx="17.2" cy="17" r="4.2" style={SUP} /><circle cx="17.2" cy="17" r="1.3" /><path d="M17.2 14.2v.9M17.2 18.9v.9M14.4 17h.9M19.1 17h.9" /></Icono>;
}

/** Cliente eliminado. Grupo: Cuenta y avisos. */
export function IconoCuentaBorrada(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="10" cy="7.5" r="4" /><path d="M3 20.5v-.6c0-3.6 3.1-6 7-6 1.2 0 2.3.2 3.3.6" /><circle cx="17.2" cy="17" r="4.2" style={SUP} /><path d="M15.8 15.6l2.8 2.8M18.6 15.6l-2.8 2.8" /></Icono>;
}

/** Inicio. Grupo: Cuenta y avisos. */
export function IconoInicio(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M12 3.5l8 6.6V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.9z" style={SUP} /><path d="M10 20.5v-5h4v5" /></Icono>;
}

/** Correo. Grupo: Cuenta y avisos. */
export function IconoCorreo(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="2.5" y="5" width="19" height="14" rx="2" style={SUP} /><path d="M3 6.5l9 6.5 9-6.5" /></Icono>;
}

/** Teléfono. Grupo: Cuenta y avisos. */
export function IconoTelefono(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M8.2 3.5H5.6A1.6 1.6 0 0 0 4 5.3C4.8 13.6 10.4 19.2 18.7 20a1.6 1.6 0 0 0 1.8-1.6v-2.6a1.5 1.5 0 0 0-1.1-1.45l-3-.8a1.5 1.5 0 0 0-1.5.45l-1.2 1.3a12 12 0 0 1-5.5-5.5l1.3-1.2a1.5 1.5 0 0 0 .45-1.5l-.8-3A1.5 1.5 0 0 0 8.2 3.5z" style={SUP} /></Icono>;
}

/** Chat / soporte. Grupo: Cuenta y avisos. */
export function IconoChat(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M12 3.5c5 0 9 3.4 9 7.6s-4 7.6-9 7.6c-1 0-2-.1-2.9-.4L4.5 20.5l1.2-3.9C4 15.2 3 13.3 3 11.1 3 6.9 7 3.5 12 3.5z" /><path d="M8 11.2h.01M12 11.2h.01M16 11.2h.01" strokeWidth="2.6" style={LIN} /></Icono>;
}

/** Notificaciones. Grupo: Cuenta y avisos. */
export function IconoNotificaciones(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M5 17.5h14l-1.5-2.2V11a5.5 5.5 0 0 0-11 0v4.3zM12 3.5v2" /><path d="M9.8 20a2.3 2.3 0 0 0 4.4 0" style={LIN} /></Icono>;
}

/** Enviar. Grupo: Cuenta y avisos. */
export function IconoEnviar(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M10.5 13.5L21 3l-7 18z" style={SUP} /><path d="M21 3L3 10l7.5 3.5L14 21zM21 3L10.5 13.5" /></Icono>;
}

/** Compartir. Grupo: Cuenta y avisos. */
export function IconoCompartir(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="18" cy="5.5" r="2.5" style={SUP} /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18.5" r="2.5" /><path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1" /></Icono>;
}

/** Entrar. Grupo: Cuenta y avisos. */
export function IconoEntrar(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M13 3.5h5.5A1.5 1.5 0 0 1 20 5v14a1.5 1.5 0 0 1-1.5 1.5H13" /><path d="M3.5 12h10M10 8.5l3.5 3.5-3.5 3.5" style={LIN} /></Icono>;
}

/** Cerrar sesión. Grupo: Cuenta y avisos. */
export function IconoSalir(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M11 3.5H5.5A1.5 1.5 0 0 0 4 5v14a1.5 1.5 0 0 0 1.5 1.5H11" /><path d="M10 12h10.5M17 8.5l3.5 3.5-3.5 3.5" style={LIN} /></Icono>;
}

/** Pendiente / hora. Grupo: Cuenta y avisos. */
export function IconoReloj(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2.5" style={LIN} /></Icono>;
}

/** Fecha. Grupo: Cuenta y avisos. */
export function IconoCalendario(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M5 4.5h14a2 2 0 0 1 2 2v3H3v-3a2 2 0 0 1 2-2z" style={SUP} /><rect x="3" y="4.5" width="18" height="16.5" rx="2" /><path d="M8 2.5v4M16 2.5v4" /></Icono>;
}

/** Confirmado. Grupo: Cuenta y avisos. */
export function IconoConfirmado(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="12" cy="12" r="9" /><path d="M7.8 12.3l2.9 2.9 5.6-5.6" style={LIN} /></Icono>;
}

/** Rechazado. Grupo: Cuenta y avisos. */
export function IconoRechazado(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" style={LIN} /></Icono>;
}

/** Bloqueado / no completado. Grupo: Cuenta y avisos. */
export function IconoBloqueado(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="12" cy="12" r="9" /><path d="M5.7 5.7l12.6 12.6" style={LIN} /></Icono>;
}

/** Advertencia. Grupo: Cuenta y avisos. */
export function IconoAdvertencia(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M10.3 4.1L2.6 17.6a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.1a2 2 0 0 0-3.4 0z" /><path d="M12 9.5V14" style={LIN} /><path d="M12 17.3h.01" strokeWidth="2.4" style={LIN} /></Icono>;
}

/** Error / atención. Grupo: Cuenta y avisos. */
export function IconoError(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5" style={LIN} /><path d="M12 16.3h.01" strokeWidth="2.4" style={LIN} /></Icono>;
}

/** Información. Grupo: Cuenta y avisos. */
export function IconoInfo(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5" style={LIN} /><path d="M12 7.7h.01" strokeWidth="2.4" style={LIN} /></Icono>;
}

/** Ayuda. Grupo: Cuenta y avisos. */
export function IconoAyuda(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="12" cy="12" r="9" /><path d="M9.6 9.4a2.5 2.5 0 0 1 4.85.85c0 1.65-2.45 2.3-2.45 3.6" style={LIN} /><path d="M12 17h.01" strokeWidth="2.4" style={LIN} /></Icono>;
}

/** Documento / factura. Grupo: Cuenta y avisos. */
export function IconoDocumento(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M14 2.5H6.5A1.5 1.5 0 0 0 5 4v16a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 20V7.5zM14 2.5v5h5" /><path d="M8.5 12h7M8.5 15h7M8.5 18h4.5" style={LIN} /></Icono>;
}

/** Archivo. Grupo: Cuenta y avisos. */
export function IconoArchivo(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M14 2.5H6.5A1.5 1.5 0 0 0 5 4v16a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 20V7.5z" style={SUP} /><path d="M14 2.5v5h5" /></Icono>;
}

/** Página no encontrada. Grupo: Cuenta y avisos. */
export function IconoDesconectado(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="3.5" y="8.5" width="6.5" height="6" rx="1.5" style={SUP} /><path d="M10 10.3h2.5M10 12.7h2.5M6.75 14.5v3a2 2 0 0 1-2 2H3" /><rect x="15.5" y="6" width="6" height="12" rx="2" /><path d="M17.6 12h.01M19.4 12h.01" /></Icono>;
}

/** Eliminar. Grupo: Acciones. */
export function IconoEliminar(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M5.5 6.5l1.1 13a1.6 1.6 0 0 0 1.6 1.5h7.6a1.6 1.6 0 0 0 1.6-1.5l1.1-13z" style={SUP} /><path d="M3.5 6.5h17M9 6.5v-2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M10 10.5V17M14 10.5V17" /></Icono>;
}

/** Editar. Grupo: Acciones. */
export function IconoEditar(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M16.2 3.6a2 2 0 0 1 2.85 0l1.35 1.35a2 2 0 0 1 0 2.85L8.5 19.7l-4.9 1.2 1.2-4.9z" style={SUP} /><path d="M14 5.8l4.2 4.2M4.8 16l3.7 3.7" /></Icono>;
}

/** Copiar / duplicar. Grupo: Acciones. */
export function IconoCopiar(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M15.5 4.5V4A1.5 1.5 0 0 0 14 2.5H5A1.5 1.5 0 0 0 3.5 4v11A1.5 1.5 0 0 0 5 16.5h.5" /><rect x="8" y="7" width="13" height="14.5" rx="1.8" style={SUP} /></Icono>;
}

/** Descargar. Grupo: Acciones. */
export function IconoDescargar(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M3.5 14.5v4a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4" /><path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5" style={LIN} /></Icono>;
}

/** Subir. Grupo: Acciones. */
export function IconoSubir(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M3.5 14.5v4a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4" /><path d="M12 14.5v-11M7.5 8L12 3.5 16.5 8" style={LIN} /></Icono>;
}

/** Guardar. Grupo: Acciones. */
export function IconoGuardar(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M5 3.5h11.5l4 4V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5z" /><path d="M7.5 3.5V8h7V3.5" /><rect x="6.5" y="12" width="11" height="8.5" rx="1" style={SUP} /></Icono>;
}

/** Archivar. Grupo: Acciones. */
export function IconoArchivar(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="2.5" y="4" width="19" height="4.5" rx="1.2" style={SUP} /><path d="M4.5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V8.5M10 12.5h4" /></Icono>;
}

/** Ver. Grupo: Acciones. */
export function IconoVer(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3.2" style={SUP} /></Icono>;
}

/** Ocultar. Grupo: Acciones. */
export function IconoOcultar(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M9.9 5.3A9.5 9.5 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.6 3.4M6.6 6.6C3.6 8.4 2 12 2 12s3.6 7 10 7a9.4 9.4 0 0 0 5.4-1.6" /><path d="M3 3l18 18" style={LIN} /></Icono>;
}

/** Configuración. Grupo: Acciones. */
export function IconoConfiguracion(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M9.87 5.44L10.59 3.11L13.41 3.11L14.13 5.44L15.13 5.85L17.29 4.72L19.28 6.71L18.15 8.87L18.56 9.87L20.89 10.59L20.89 13.41L18.56 14.13L18.15 15.13L19.28 17.29L17.29 19.28L15.13 18.15L14.13 18.56L13.41 20.89L10.59 20.89L9.87 18.56L8.87 18.15L6.71 19.28L4.72 17.29L5.85 15.13L5.44 14.13L3.11 13.41L3.11 10.59L5.44 9.87L5.85 8.87L4.72 6.71L6.71 4.72L8.87 5.85Z" /><circle cx="12" cy="12" r="3.2" style={SUP} /></Icono>;
}

/** Ajustes. Grupo: Acciones. */
export function IconoAjustes(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M3.5 6.5H7M11 6.5h9.5M3.5 12H13M17 12h3.5M3.5 17.5H6M10 17.5h10.5" /><circle cx="9" cy="6.5" r="2" /><circle cx="15" cy="12" r="2" style={SUP} /><circle cx="8" cy="17.5" r="2" /></Icono>;
}

/** Filtrar. Grupo: Acciones. */
export function IconoFiltro(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M3.5 4.5h17l-6.5 8v6l-4 2v-8z" style={SUP} /></Icono>;
}

/** Web / SEO. Grupo: Acciones. */
export function IconoWeb(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="12" cy="12" r="9" style={SUP} /><path d="M3 12h18M12 3c2.4 2.6 3.6 5.6 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.6-3.6-9S9.6 5.6 12 3z" /></Icono>;
}

/** Enlace. Grupo: Acciones. */
export function IconoEnlace(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M10 14a4.2 4.2 0 0 0 6 0l3-3a4.2 4.2 0 0 0-6-6l-.9.9" /><path d="M14 10a4.2 4.2 0 0 0-6 0l-3 3a4.2 4.2 0 0 0 6 6l.9-.9" style={LIN} /></Icono>;
}

/** Abrir aparte. Grupo: Acciones. */
export function IconoAbrirAparte(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M18 13.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6h5.5" /><path d="M14.5 3.5h6v6M20.5 3.5l-9 9" style={LIN} /></Icono>;
}

/** Actualizar. Grupo: Acciones. */
export function IconoActualizar(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M20 11.5A8 8 0 0 0 5.6 7M4 12.5A8 8 0 0 0 18.4 17" /><path d="M5.2 3.5v3.8H9M18.8 20.5v-3.8H15" style={LIN} /></Icono>;
}

/** Cargando. Grupo: Acciones. */
export function IconoCargando(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="12" cy="12" r="8.5" strokeOpacity=".22" /><path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" style={LIN} /></Icono>;
}

/** Activar / reproducir. Grupo: Acciones. */
export function IconoPlay(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M7 5.3v13.4a1 1 0 0 0 1.52.86l10.9-6.7a1 1 0 0 0 0-1.72L8.52 4.44A1 1 0 0 0 7 5.3z" style={SUP} /></Icono>;
}

/** Pausar. Grupo: Acciones. */
export function IconoPausa(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="5.5" y="4.5" width="4.5" height="15" rx="1.5" style={SUP} /><rect x="14" y="4.5" width="4.5" height="15" rx="1.5" style={SUP} /></Icono>;
}

/** Apagado. Grupo: Acciones. */
export function IconoInterruptorApagado(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="2" y="6" width="20" height="12" rx="6" /><circle cx="8" cy="12" r="2.8" style={SUP} /></Icono>;
}

/** Encendido. Grupo: Acciones. */
export function IconoInterruptorEncendido(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="2" y="6" width="20" height="12" rx="6" style={SUP} /><circle cx="16" cy="12" r="3.6" fill="currentColor" stroke="none" /></Icono>;
}

/** Deshacer. Grupo: Acciones. */
export function IconoDeshacer(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M20 20v-7a4 4 0 0 0-4-4H4.5" /><path d="M9 4.5L4.5 9 9 13.5" style={LIN} /></Icono>;
}

/** Rehacer. Grupo: Acciones. */
export function IconoRehacer(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M4 20v-7a4 4 0 0 1 4-4h11.5" /><path d="M15 4.5l4.5 4.5-4.5 4.5" style={LIN} /></Icono>;
}

/** Asignar a otro. Grupo: Acciones. */
export function IconoAsignar(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M4.5 4v7a4 4 0 0 0 4 4h11" /><path d="M15 10.5l4.5 4.5-4.5 4.5" style={LIN} /></Icono>;
}

/** Mover / arrastrar. Grupo: Acciones. */
export function IconoMover(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M12 3v18M3 12h18" /><path d="M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" style={LIN} /></Icono>;
}

/** Cambiar tamaño. Grupo: Acciones. */
export function IconoAgrandar(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M20.5 3.5L14 10M3.5 20.5L10 14" /><path d="M14.5 3.5h6v6M9.5 20.5h-6v-6" style={LIN} /></Icono>;
}

/** Repetir / reembolso. Grupo: Acciones. */
export function IconoRepetir(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M3.5 11.5V10a4 4 0 0 1 4-4h13M20.5 12.5V14a4 4 0 0 1-4 4h-13" /><path d="M17 2.5L20.5 6 17 9.5M7 14.5L3.5 18 7 21.5" style={LIN} /></Icono>;
}

/** Girar / reintentar. Grupo: Acciones. */
export function IconoGirar(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M18.4 17A8 8 0 1 1 18.4 7" /><path d="M18.8 3.5v3.8H15" style={LIN} /></Icono>;
}

/** Restablecer / restaurar. Grupo: Acciones. */
export function IconoRestablecer(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M5.6 17A8 8 0 1 0 5.6 7" /><path d="M5.2 3.5v3.8H9" style={LIN} /></Icono>;
}

/** Empresa. Grupo: Panel. */
export function IconoMaletin(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" style={LIN} /><rect x="2.5" y="7" width="19" height="13" rx="2" /><path d="M2.5 12.5h19M10.5 12.5V14h3v-1.5" /></Icono>;
}

/** Ventas / crecimiento. Grupo: Panel. */
export function IconoVentas(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M6.5 15l4-5 3 2.5 6-6.5v11.5h-13z" stroke="none" style={SOL} /><path d="M3.5 3.5v17h17M6.5 15l4-5 3 2.5 6-6.5M15.5 6h4v4" /></Icono>;
}

/** Reportes. Grupo: Panel. */
export function IconoReportes(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="4" y="12" width="4" height="8" rx="1" /><rect x="10" y="7" width="4" height="13" rx="1" style={SUP} /><rect x="16" y="3.5" width="4" height="16.5" rx="1" /><path d="M2.5 20.5h19" /></Icono>;
}

/** En vivo. Grupo: Panel. */
export function IconoEnVivo(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="12" cy="12" r="2" stroke="none" style={SOL} /><path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.2 5.2a9.6 9.6 0 0 0 0 13.6M18.8 5.2a9.6 9.6 0 0 1 0 13.6" /></Icono>;
}

/** Órdenes. Grupo: Panel. */
export function IconoOrdenes(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="4.5" y="4" width="15" height="17.5" rx="2" style={SUP} /><rect x="8.5" y="2.5" width="7" height="3.5" rx="1" fill="currentColor" stroke="currentColor" /><path d="M7.5 10.5l1 1 2-2M7.5 15.5l1 1 2-2M12.5 10.5H17M12.5 15.5H17" /></Icono>;
}

/** Clave / licencia. Grupo: Panel. */
export function IconoClave(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="7.5" cy="12" r="4.5" style={SUP} /><path d="M12 12h9M17.5 12v3M20.5 12v2.2" /></Icono>;
}

/** Imagen. Grupo: Panel. */
export function IconoImagen(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M3 18l5.5-6.5 4.5 5 2.5-2.5L21 19.5v-.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19z" style={SUP} /><rect x="3" y="3.5" width="18" height="17" rx="2" /><circle cx="15.5" cy="8.5" r="1.8" /></Icono>;
}

/** Clics. Grupo: Panel. */
export function IconoPuntero(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M4 3.5L19 10l-6.3 2.2 5.8 5.8-2 2-5.8-5.8-2.2 6.3z" style={SUP} /></Icono>;
}

/** Solicitudes. Grupo: Panel. */
export function IconoBandeja(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M3 13.5L5.6 5.6A1.5 1.5 0 0 1 7 4.5h10a1.5 1.5 0 0 1 1.4 1.1L21 13.5V19a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19z" /><path d="M3 13.5h5l1.5 2.5h5l1.5-2.5h5V19a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19z" style={SUP} /></Icono>;
}

/** Respaldo en la nube. Grupo: Panel. */
export function IconoNube(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M7 19.5a4.5 4.5 0 0 1-.6-8.95 6 6 0 0 1 11.5-1.5A4.8 4.8 0 0 1 17.5 19.5z" style={SUP} /></Icono>;
}

/** Servidor. Grupo: Panel. */
export function IconoServidor(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="3" y="3.5" width="18" height="7" rx="1.8" style={SUP} /><rect x="3" y="13.5" width="18" height="7" rx="1.8" /><path d="M7 7h.01M7 17h.01M11 7h6M11 17h6" /></Icono>;
}

/** Base de datos. Grupo: Panel. */
export function IconoBaseDeDatos(props: IconoProps): ReactNode {
  return <Icono {...props}><ellipse cx="12" cy="5.5" rx="8" ry="3" style={SUP} /><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></Icono>;
}

/** ElectroStudio. Grupo: Panel. */
export function IconoClaqueta(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="3" y="4" width="18" height="4.5" rx="1" style={SUP} /><path d="M7.5 4l-2 4.5M12 4l-2 4.5M16.5 4l-2 4.5M3 8.5V19a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 21 19V8.5" /></Icono>;
}

/** Versiones. Grupo: Panel. */
export function IconoVersiones(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="6.5" cy="5" r="2" /><circle cx="6.5" cy="19" r="2" /><circle cx="17.5" cy="8" r="2.2" style={SUP} /><path d="M6.5 7v10M17.5 10.2c0 5-6 5-9.6 7.4" /></Icono>;
}

/** Popup. Grupo: Panel. */
export function IconoPopup(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="2.5" y="3.5" width="14" height="11" rx="1.8" /><path d="M2.5 6.8h14" /><rect x="9.5" y="10.5" width="12" height="9.5" rx="1.8" style={SUP} /></Icono>;
}

/** Meta / objetivo. Grupo: Panel. */
export function IconoObjetivo(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1.3" stroke="none" style={SOL} /><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5" /></Icono>;
}

/** Soporte. Grupo: Panel. */
export function IconoSalvavidas(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" fillRule="evenodd" style={SUP} /><path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6" /></Icono>;
}

/** Lista. Grupo: Panel. */
export function IconoLista(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M9 6.5h11.5M9 12h11.5M9 17.5h11.5" /><path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" strokeWidth="2.6" style={LIN} /></Icono>;
}

/** Cuadrícula / todas. Grupo: Panel. */
export function IconoCuadricula(props: IconoProps): ReactNode {
  return <Icono {...props}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" style={SUP} /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></Icono>;
}

/** Listo. Grupo: Básicos. */
export function IconoCheck(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M4.5 12.5l5 5 10-10.5" /></Icono>;
}

/** Cerrar. Grupo: Básicos. */
export function IconoCerrar(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M6 6l12 12M18 6L6 18" /></Icono>;
}

/** Agregar. Grupo: Básicos. */
export function IconoMas(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M12 5v14M5 12h14" /></Icono>;
}

/** Quitar. Grupo: Básicos. */
export function IconoMenos(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M5 12h14" /></Icono>;
}

/** Volver. Grupo: Básicos. */
export function IconoFlechaIzquierda(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M19.5 12h-15M10.5 6l-6 6 6 6" /></Icono>;
}

/** Seguir. Grupo: Básicos. */
export function IconoFlechaDerecha(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M4.5 12h15M13.5 6l6 6-6 6" /></Icono>;
}

/** Subir en la lista. Grupo: Básicos. */
export function IconoFlechaArriba(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M12 19.5v-15M6 10.5l6-6 6 6" /></Icono>;
}

/** Bajar en la lista. Grupo: Básicos. */
export function IconoFlechaAbajo(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M12 4.5v15M6 13.5l6 6 6-6" /></Icono>;
}

/** Movimiento que sale. Grupo: Básicos. */
export function IconoFlechaArribaDerecha(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M6.5 17.5l11-11M8.5 6.5h9v9" /></Icono>;
}

/** Movimiento que entra. Grupo: Básicos. */
export function IconoFlechaAbajoIzquierda(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M17.5 6.5l-11 11M15.5 17.5h-9v-9" /></Icono>;
}

/** Siguiente. Grupo: Básicos. */
export function IconoChevronDerecha(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M9 5l7 7-7 7" /></Icono>;
}

/** Anterior. Grupo: Básicos. */
export function IconoChevronIzquierda(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M15 5l-7 7 7 7" /></Icono>;
}

/** Desplegar. Grupo: Básicos. */
export function IconoChevronAbajo(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M5 9l7 7 7-7" /></Icono>;
}

/** Plegar. Grupo: Básicos. */
export function IconoChevronArriba(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M5 15l7-7 7 7" /></Icono>;
}

/** Menú. Grupo: Básicos. */
export function IconoMenu(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M4 6.5h16M4 12h16M4 17.5h16" /></Icono>;
}

/** Más opciones. Grupo: Básicos. */
export function IconoMasOpciones(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M5.5 12h.01M12 12h.01M18.5 12h.01" strokeWidth="3" /></Icono>;
}

/** Sin cumplir. Grupo: Básicos. */
export function IconoCirculo(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="12" cy="12" r="8.5" /></Icono>;
}

/** Texto. Grupo: Básicos. */
export function IconoTexto(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M4.5 7V4.5h15V7M12 4.5v15M9 19.5h6" /></Icono>;
}

/** Número / total. Grupo: Básicos. */
export function IconoNumero(props: IconoProps): ReactNode {
  return <Icono {...props}><path d="M4.5 9h15M4.5 15h15M10 3.5L8 20.5M16 3.5l-2 17" /></Icono>;
}

/** Correo del remitente. Grupo: Básicos. */
export function IconoArroba(props: IconoProps): ReactNode {
  return <Icono {...props}><circle cx="12" cy="12" r="3.75" /><path d="M15.75 8.25V13a2.6 2.6 0 0 0 5.2 0v-1a8.95 8.95 0 1 0-3.5 7.1" /></Icono>;
}
