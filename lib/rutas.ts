/**
 * Destino después de entrar o registrarse, leído de ?callbackUrl= o ?redirect=.
 * Solo rutas internas: "//otro-sitio.com" y "/\otro-sitio.com" el navegador los trata como otro dominio,
 * y quita tabs y saltos de línea antes de leer la URL ("/\t/otro-sitio.com" termina siendo "//otro-sitio.com").
 * El panel admin no se ofrece desde el acceso de clientes.
 */
export function rutaInternaSegura(valor: string | null | undefined): string | null {
  if (!valor || !valor.startsWith('/')) return null;
  if (/[\s\u0000-\u001f]/.test(valor)) return null;
  if (valor.startsWith('//') || valor.startsWith('/\\')) return null;
  if (valor.startsWith('/admin')) return null;
  return valor;
}

/** Páginas de acceso: formulario a pantalla completa, sin la barra inferior de la tienda. */
export function esRutaDeAcceso(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return ['/login', '/registro', '/recuperar-contrasena', '/verificar-email'].some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`)
  );
}
