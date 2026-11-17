// C-276: los sellos de confianza de un cliente (lo que se sabe de verdad de su cuenta), en la lista y en la ficha.
// Lleno de verde fuerte: lo tiene. Azul oscuro del logo: le falta y alguien tiene que hacer algo. Gris: no lo dio.
import { IconoCorreo, IconoDocumento, IconoMaletin, IconoTarjeta, IconoTelefono, type IconType } from '@/components/iconos';
import type { SellosCliente } from '@/lib/dto/cliente';

type Estado = 'si' | 'falta' | 'no';
interface Sello { clave: string; Icono: IconType; estado: Estado; texto: string }

export function sellosDe(s: SellosCliente): Sello[] {
  const lista: Sello[] = [
    { clave: 'correo', Icono: IconoCorreo, estado: s.correo ? 'si' : 'falta', texto: s.correo ? 'Correo verificado' : 'Sin activar el correo' },
    { clave: 'telefono', Icono: IconoTelefono, estado: s.telefono ? 'si' : 'no', texto: s.telefono ? 'Teléfono' : 'Sin teléfono' },
    { clave: 'cedula', Icono: IconoTarjeta, estado: s.cedula ? 'si' : 'no', texto: s.cedula ? 'Cédula' : 'Sin cédula' },
    { clave: 'terminos', Icono: IconoDocumento, estado: s.terminos ? 'si' : 'no', texto: s.terminos ? 'Términos de Puntos ES firmados' : 'Términos de Puntos ES sin firmar' },
  ];
  if (s.empresa) {
    const texto = s.empresa === 'APPROVED' ? 'Empresa verificada' : s.empresa === 'PENDING' ? 'Empresa por verificar' : s.empresa === 'REJECTED' ? 'Empresa rechazada' : 'Empresa sin verificar';
    lista.push({ clave: 'empresa', Icono: IconoMaletin, estado: s.empresa === 'APPROVED' ? 'si' : s.empresa === 'PENDING' ? 'falta' : 'no', texto });
  }
  return lista;
}

const FONDO: Record<Estado, string> = {
  si: 'bg-success-strong text-white',
  falta: 'bg-brand-700 text-white',
  no: 'bg-surface text-muted ring-1 ring-inset ring-line',
};

/** En la lista: un cuadro por sello, con su nombre para el lector de pantalla */
export function SellosMini({ sellos }: { sellos: SellosCliente }) {
  return (
    <ul className="flex w-max gap-1" aria-label="Sellos de confianza">
      {sellosDe(sellos).map(({ clave, Icono, estado, texto }) => (
        <li key={clave} title={texto} className={`relative flex h-7 w-7 items-center justify-center rounded-lg ${FONDO[estado]}`}>
          <Icono className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">{texto}</span>
        </li>
      ))}
    </ul>
  );
}

/** En la ficha: las píldoras con su nombre */
export function SellosPildoras({ sellos }: { sellos: SellosCliente }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Sellos de confianza">
      {sellosDe(sellos).map(({ clave, Icono, estado, texto }) => (
        <li key={clave} className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${FONDO[estado]}`}>
          <Icono className="h-3.5 w-3.5" aria-hidden="true" />
          {texto}
        </li>
      ))}
    </ul>
  );
}
