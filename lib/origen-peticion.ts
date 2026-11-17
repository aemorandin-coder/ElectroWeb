// C-285: de dónde viene un pedido que cambia algo. Segunda capa sobre la cookie SameSite=Lax de la sesión: una escritura a /api
// (POST, PUT, PATCH o DELETE) que trae un Origin de otro sitio se rechaza (proxy.ts). Sin Prisma ni Next: se usa en el proxy y
// se prueba solo. (lib/origen.ts es otra cosa: de dónde sale un producto.)

/** El host (con el puerto, si lo trae) de una dirección o de un host suelto, en minúsculas; null si no se puede leer. */
function hostDeDireccion(valor: string | null | undefined): string | null {
  // En una lista de hosts puede venir más de uno ("a.com, b.com"): el primero es el que pidió el navegador
  const texto = (valor ?? '').split(',')[0].trim();
  if (!texto) return null;
  try {
    const host = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(texto) ? texto : `https://${texto}`).host.toLowerCase();
    return host || null;
  } catch {
    return null;
  }
}

/** "www.tienda.com" y "tienda.com" son la misma tienda. */
const sinWww = (host: string) => (host.startsWith('www.') ? host.slice(4) : host);

/**
 * ¿Puede seguir un pedido que cambia algo? Sí si no trae Origin (las llamadas de servidor a servidor no lo traen), si es "null"
 * (lo mandan los formularios que vienen de una redirección o de un marco aislado) o si su host es el del pedido o uno de los
 * permitidos, con o sin "www.". No si es una dirección de otro sitio o algo que no se puede leer como dirección.
 *
 * - `origin`: la cabecera Origin tal como llegó.
 * - `host`: el host que pidió el navegador (x-forwarded-host o host), con su puerto si lo trae.
 * - `permitidos`: hosts o direcciones propias de la tienda (NEXTAUTH_URL y compañía); lo vacío o ilegible se salta.
 */
export function origenPermitido({ origin, host, permitidos = [] }: {
  origin?: string | null;
  host?: string | null;
  permitidos?: ReadonlyArray<string | null | undefined>;
}): boolean {
  const crudo = (origin ?? '').trim();
  if (!crudo || crudo.toLowerCase() === 'null') return true;

  let hostDelOrigen: string;
  try {
    // Sin completar nada: un Origin es siempre una dirección con su esquema
    hostDelOrigen = new URL(crudo).host.toLowerCase();
  } catch {
    return false;
  }
  if (!hostDelOrigen) return false;

  const propios = [host, ...permitidos].map(hostDeDireccion).filter((h): h is string => h !== null);
  return propios.some((propio) => sinWww(propio) === sinWww(hostDelOrigen));
}
