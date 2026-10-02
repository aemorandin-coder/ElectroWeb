// zod con el ajuste que necesita la Content-Security-Policy (C-166).
//
// Zod 4 prueba si puede generar código (`new Function("")`) para acelerar la validación. Si la política no permite `eval`
// la prueba falla sin consecuencias, pero el navegador la cuenta como una violación: decenas de avisos falsos en cada
// pantalla con formularios. En el navegador se apaga esa optimización (`jitless`, que zod ofrece para esto); en el
// servidor sigue encendida. Todo archivo que arma esquemas importa `z` de aquí y no de 'zod': así el ajuste corre antes
// de que se cree el primer esquema.
import { z } from 'zod';

if (typeof window !== 'undefined') z.config({ jitless: true });

export { z };
