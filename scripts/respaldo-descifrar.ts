// Abre un respaldo cifrado de ElectroShop (C-165). Se corre en cualquier computadora con Node, sin la base ni la tienda:
//   npx tsx scripts/respaldo-descifrar.ts <respaldo.enc> <clave-privada.pem> [salida]
// La clave privada es la que el panel mostró UNA vez al crear la clave de respaldos (Configuración → Respaldos).
// El resultado es el volcado de la base (.dump, para pg_restore) o el paquete de fotos y constancias (.tar.gz).
import path from 'path';
import { descifrarArchivo } from '../lib/respaldos/formato';
import { readFileSync, existsSync } from 'fs';

async function main() {
  const [entrada, clave, salidaArg] = process.argv.slice(2);
  if (!entrada || !clave) {
    console.error('Uso: npx tsx scripts/respaldo-descifrar.ts <respaldo.enc> <clave-privada.pem> [salida]');
    process.exit(2);
  }
  for (const archivo of [entrada, clave]) {
    if (!existsSync(archivo)) {
      console.error(`No existe: ${archivo}`);
      process.exit(2);
    }
  }
  const salida = salidaArg ?? (entrada.endsWith('.enc') ? entrada.slice(0, -4) : `${entrada}.descifrado`);
  if (existsSync(salida)) {
    console.error(`Ya existe ${salida}. Elige otro nombre o bórralo.`);
    process.exit(2);
  }
  await descifrarArchivo(entrada, salida, readFileSync(clave, 'utf8'));
  console.log(`Listo: ${path.resolve(salida)}`);
  if (/\.dump$/.test(salida)) {
    console.log('Es un volcado de la base. Para restaurarlo en una base NUEVA y vacía:');
    console.log(`  pg_restore --no-owner --no-acl -d <base_nueva> "${salida}"`);
  } else if (/\.tar\.gz$/.test(salida)) {
    console.log('Es el paquete de fotos y constancias. Para ver qué trae: tar -tzf "' + salida + '"');
    console.log('Para devolverlo a la tienda: tar -xzf "' + salida + '" -C /var/www/electroshopve');
  }
}

main().catch((error: Error) => {
  console.error(`No se pudo abrir el respaldo: ${error.message}`);
  process.exit(1);
});
