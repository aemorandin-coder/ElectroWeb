// C-202: las palabras de los nombres de producto. Salen de las 3.113 líneas de la lista de la ferretería aliada (10/11).
// Lo que se lee siempre igual se completa ("P/" es "para"). Lo que tiene dos lecturas ("CAB" es cabo o cabeza; "MULT",
// multiuso o multímetro) no está aquí: queda como viene y se marca para revisar. Las claves van en mayúsculas y sin
// acentos, como las escribe su sistema.

/** Palabra que cambia con el sustantivo: [masculino, femenino]. */
export type Forma = string | readonly [string, string];

/** Lo que es: cambian el género de lo que sigue ("ducha" → "eléctrica") */
export const SUSTANTIVOS: Readonly<Record<string, string>> = {
  MAQ: 'máquina', JGO: 'juego de', CAUC: 'caucho', ESM: 'esmalte', TORN: 'tornillo', BOMB: 'bombillo', TANQ: 'tanque',
  TQUE: 'tanque', CERR: 'cerradura', CERRD: 'cerradura', CAND: 'candado', CANDA: 'candado', DESMZ: 'desmalezadora',
  DESM: 'desmalezadora', DEMZ: 'desmalezadora', ABRAZ: 'abrazadera', ABRAZD: 'abrazadera', VALV: 'válvula',
  ADAPT: 'adaptador', ADAP: 'adaptador', MANG: 'manguera', LL: 'llave', DEST: 'destornillador', ARAND: 'arandela',
  TUERC: 'tuerca', INTERRUP: 'interruptor', INTERRUPT: 'interruptor', INTERR: 'interruptor', CAPACIT: 'capacitor',
  CONEX: 'conexión', PROTECT: 'protector', PROT: 'protector', LAMP: 'lámpara', FLOT: 'flotante', ALICAT: 'alicate',
  TAB: 'tablero', PIST: 'pistola', MEMB: 'membrana', SOPORT: 'soporte', CEP: 'cepillo', EXTENS: 'extensión',
  ROD: 'rodillo', BOL: 'bolsa', PAQ: 'paquete', TBO: 'tubo', SILIC: 'silicón', GF: 'grifería', GRIF: 'grifería',
  FGD: 'fregadero', FREG: 'fregadero', LVM: 'lavamanos', DESAG: 'desagüe', ALAMB: 'alambre', CEMENT: 'cemento',
  ASF: 'asfalto', HTAS: 'herramientas', HTS: 'herramientas', TALD: 'taladro', TERMOST: 'termostato', FOND: 'fondo',
  NIQ: 'níquel', CALAD: 'caladora', PERC: 'percutor', PERCUT: 'percutor', ROZ: 'rozador', KIT: 'kit de',
  NEVER: 'nevera', APAR: 'aparatos', EQ: 'equipos', CISN: 'cisne', MOTOBOMB: 'motobomba', GASLN: 'gasolina',
  MACHET: 'machete', TREB: 'trébol', OCEA: 'océano', BREAK: 'breaker', REGAD: 'regadera', SEGUET: 'segueta',
  ESMALT: 'esmalte', BISAG: 'bisagra', CUN: 'cuñete',
  // Materiales: después de otro sustantivo llevan "de" ("bota de goma", "candado de bronce")
  BCE: 'bronce', BRCE: 'bronce', MAD: 'madera', ALUM: 'aluminio', ACER: 'acero',
};

/** Cómo es: concuerdan con el sustantivo de antes */
export const ADJETIVOS: Readonly<Record<string, Forma>> = {
  ELEC: ['eléctrico', 'eléctrica'], ELECT: ['eléctrico', 'eléctrica'], ELECTRON: ['electrónico', 'electrónica'],
  PLAST: ['plástico', 'plástica'], MET: ['metálico', 'metálica'], GALV: ['galvanizado', 'galvanizada'],
  INALAMB: ['inalámbrico', 'inalámbrica'], INALAM: ['inalámbrico', 'inalámbrica'], INLAM: ['inalámbrico', 'inalámbrica'],
  PERIF: ['periférico', 'periférica'], CROM: ['cromado', 'cromada'], CR: ['cromado', 'cromada'],
  RAP: ['rápido', 'rápida'], RAPID: ['rápido', 'rápida'], SENC: ['sencillo', 'sencilla'], ECON: ['económico', 'económica'],
  DIAMANT: ['diamantado', 'diamantada'], ROSC: ['roscado', 'roscada'], CORRUG: ['corrugado', 'corrugada'],
  DOMEST: ['doméstico', 'doméstica'], CUAD: ['cuadrado', 'cuadrada'], IZQ: ['izquierdo', 'izquierda'],
  DER: ['derecho', 'derecha'], DERCH: ['derecho', 'derecha'], LARG: ['largo', 'larga'], SANIT: ['sanitario', 'sanitaria'],
  SAT: ['satinado', 'satinada'], SATIN: ['satinado', 'satinada'], DOR: ['dorado', 'dorada'], ACRIL: ['acrílico', 'acrílica'],
  IND: 'industrial', DOB: 'doble', STD: 'estándar', UNIV: 'universal', PROF: 'profesional', DIG: 'digital', DIGIT: 'digital',
  HEX: 'hexagonal', OCT: 'octogonal', RECT: 'rectangular', TRIANG: 'triangular', ANG: 'angular', AJUST: 'ajustable',
  RECARG: 'recargable', MV: 'multivoltaje', BTE: 'brillante', INOX: 'inoxidable', TPTE: 'transparente', NAT: 'natural',
  INVERT: 'inverter', AMP: ['amperimétrico', 'amperimétrica'], ERGO: ['ergonómico', 'ergonómica'], CIRC: 'circular',
  MECAN: ['mecánico', 'mecánica'], PEQ: ['pequeño', 'pequeña'], GDE: 'grande', CAOB: 'caoba',
  // Colores
  BCO: ['blanco', 'blanca'], BL: ['blanco', 'blanca'], BCA: 'blanca', NG: ['negro', 'negra'], NEG: ['negro', 'negra'],
  NGRO: ['negro', 'negra'], NGR: ['negro', 'negra'], ROJ: ['rojo', 'roja'], AMA: ['amarillo', 'amarilla'],
  AM: ['amarillo', 'amarilla'], AMARILL: ['amarillo', 'amarilla'], AZ: 'azul', VERD: 'verde', VER: 'verde', NJA: 'naranja',
  NAR: 'naranja', MARF: 'marfil', TURQ: 'turquesa', BEIG: 'beige', OST: 'ostra', AVELL: 'avellana',
};

/** Frases que no cambian el género: "panel LED de empotrar". Después de "para" se dice sin el "de". */
export const FRASES: Readonly<Record<string, string>> = {
  EMP: 'de empotrar', EMB: 'de embutir', EMBT: 'de embutir', IMPACT: 'de impacto', BAND: 'de banda',
  EMERG: 'de emergencia', MANILL: 'de manilla', AF: 'para agua fría',
};

/** Se completan, pero se avisa "se leyó así" para que alguien lo mire */
export const CON_DUDA: Readonly<Record<string, { forma: Forma; sustantivo: boolean }>> = {
  RED: { forma: ['redondo', 'redonda'], sustantivo: false },
  GFG: { forma: 'grifería de fregadero', sustantivo: true },
  BRO: { forma: 'brocha', sustantivo: true },
  HIDROC: { forma: 'hidrocompacto', sustantivo: true },
};

/** "P/SOLDAR", "C/LIMA": lo que va antes de la barra. Los que no están ("A/C", "U/F") quedan como vienen. */
export const PREFIJOS: Readonly<Record<string, string>> = { P: 'para', C: 'con', S: 'sin', T: 'tipo', M: 'mango' };

/** Juntas con barra que se leen enteras */
export const COMPUESTAS: Readonly<Record<string, string>> = {
  'M/P': 'mango plástico', 'M/M': 'mango de madera', 'AC/INOX': 'acero inoxidable', 'TERMO/ENC': 'termoencogible',
  'SATIN/NIQ': 'níquel satinado', 'ANTIQ/BRASS': 'bronce antiguo',
};

/** Unidades después de un número: "1050W" → "1050 W". "G" (galón o gramos) y "P" (pulgadas) se leen aparte. */
export const UNIDADES: Readonly<Record<string, string>> = {
  W: 'W', KW: 'kW', V: 'V', A: 'A', AMP: 'A', AMPS: 'A', HP: 'HP', CC: 'cc', ML: 'ml', LT: 'L', LTS: 'L', L: 'L',
  LITROS: 'L', MM: 'mm', CM: 'cm', M: 'm', MT: 'm', MTS: 'm', KG: 'kg', KGS: 'kg', LBS: 'lb', LB: 'lb', LUM: 'lm',
  LM: 'lm', PSI: 'psi', GB: 'GB', TB: 'TB', MAH: 'mAh', HZ: 'Hz', BTU: 'BTU', OZ: 'oz', GR: 'g', GRS: 'g', WATTS: 'W',
  WATT: 'W', VATIOS: 'W', VOLTIOS: 'V', VOLTS: 'V', AMPERIOS: 'A', MTRS: 'm', METROS: 'm', PULG: '"',
};

/** Unidades que se cuentan: "3PZA" → "3 piezas", "1 UND" → "1 unidad". */
export const CONTABLES: Readonly<Record<string, readonly [string, string]>> = {
  PZA: ['pieza', 'piezas'], PZAS: ['pieza', 'piezas'], PIEZAS: ['pieza', 'piezas'], UND: ['unidad', 'unidades'],
  UN: ['unidad', 'unidades'], UNID: ['unidad', 'unidades'], UNIDADES: ['unidad', 'unidades'], CIRC: ['circuito', 'circuitos'],
};

/** Siglas que se escriben en mayúsculas */
export const SIGLAS = new Set([
  'LED', 'RGB', 'USB', 'HDMI', 'RAM', 'SSD', 'HDD', 'CPU', 'GPU', 'PC', 'TV', 'DPI', 'IP', 'BT', 'NFC', 'VGA', 'DC', 'AC',
  'LCD', 'OLED', 'IPS', 'HD', 'FHD', 'UHD', 'PSU', 'ATX', 'BTU', 'HP', 'THW', 'THHN', 'TW', 'PVC', 'CPVC', 'ABS', 'HSS',
  'EMT', 'UV', 'WC', 'GLP', 'RCA', 'UTP', 'POE', 'SMD', 'MDF', 'PPR', 'NPT', 'AWG', 'USA', 'CRV', 'AAA', 'AA', 'SDS',
  'XL', 'XXL', 'GPS', 'SIM', 'SD', 'LAN', 'WIFI', 'BG', 'MNP', 'PPL',
]);

/** Las cortas que son palabras: no se marcan para revisar */
export const PALABRAS_CORTAS = new Set([
  'DE', 'LA', 'EL', 'LOS', 'LAS', 'Y', 'O', 'E', 'U', 'A', 'X', 'EN', 'CON', 'SIN', 'POR', 'AL', 'DEL', 'UN', 'UNA', 'SU',
  'KIT', 'SET', 'GAS', 'PAR', 'TEE', 'YEE', 'CAL', 'SAL', 'LUZ', 'OJO', 'PIE', 'ORO', 'ASA', 'ARO', 'SOL', 'MAR', 'RIO',
  'DOS', 'UNO', 'VIA', 'PRO', 'MAS', 'PEZ', 'TIO', 'FIN', 'MIL', 'TAN', 'HOY', 'RED', 'FAZ', 'TIE', 'BOX', 'MIX',
]);

/** Materiales: "bota de goma", "candado de bronce" */
export const MATERIALES = new Set([
  'goma', 'madera', 'bronce', 'aluminio', 'acero', 'hierro', 'cobre', 'cuero', 'tela', 'vidrio', 'porcelana', 'latón',
  'plomo', 'zinc', 'carnaza', 'acero inoxidable',
]);

/** Palabras que pierden el acento o la Ñ en su sistema y no siguen las reglas de `producto.ts` */
export const CON_ACENTO: Readonly<Record<string, string>> = {
  BANO: 'baño', CANA: 'caña', CUNETE: 'cuñete', CIGUENAL: 'cigüeñal', DESAGUE: 'desagüe', GALON: 'galón',
  JARDIN: 'jardín', CAUTIN: 'cautín', PATIN: 'patín', COJIN: 'cojín', BOTIN: 'botín', CALCETIN: 'calcetín', IMAN: 'imán',
  AREA: 'área', VIAS: 'vías', VIA: 'vía', ANGULO: 'ángulo', CIRCULO: 'círculo', VEHICULO: 'vehículo', TAMANO: 'tamaño',
  SENAL: 'señal', ESTANO: 'estaño', ALBANIL: 'albañil', NUMERO: 'número', ENERGIA: 'energía', LINEA: 'línea',
  MAQUINA: 'máquina', LAMPARA: 'lámpara', CAMARA: 'cámara', CARRETILLA: 'carretilla', PULGADAS: 'pulgadas',
  TELEFONO: 'teléfono', MASCARA: 'máscara', DIAMETRO: 'diámetro', PERIMETRO: 'perímetro', PAJARO: 'pájaro',
  MUNECA: 'muñeca', PINA: 'piña', ARANA: 'araña', PANO: 'paño', LENA: 'leña', CANERIA: 'cañería', ESPANOL: 'español',
  PEQUENO: 'pequeño', PEQUENA: 'pequeña', SUPERFICIE: 'superficie', AUTOMOVIL: 'automóvil', MOVIL: 'móvil',
  FACIL: 'fácil', UTIL: 'útil', DEBIL: 'débil', AGIL: 'ágil', LAPIZ: 'lápiz', CESPED: 'césped', ULTIMO: 'último',
  TRIPODE: 'trípode', CUBETA: 'cubeta', TUNEL: 'túnel', NAILON: 'nailon', BOMBILLO: 'bombillo', NIQUEL: 'níquel',
  FRIO: 'frío', FRIA: 'fría', PALIN: 'palín', COMUN: 'común', ALMACEN: 'almacén', OCEANO: 'océano', TREBOL: 'trébol',
  GASOLINA: 'gasolina', PURPURA: 'púrpura', LILA: 'lila', MAGICO: 'mágico', BORICO: 'bórico', LEON: 'león',
  BALANCIN: 'balancín', RAPIDO: 'rápido', RAPIDA: 'rápida', RAPIDOS: 'rápidos', SOLIDO: 'sólido', SOLIDA: 'sólida',
  LIQUIDO: 'líquido', LIQUIDA: 'líquida', HUMEDO: 'húmedo', ACIDO: 'ácido', SIFON: 'sifón', CAMARAS: 'cámaras',
};

/** Sin acento aunque parezcan esdrújulas o agudas */
export const SIN_ACENTO = new Set(['ABANICO', 'PERICO', 'BORRICO', 'BOTICA', 'NYLON', 'CANON', 'ORIGAN', 'ION', 'IONES']);

/** Terminan en "a" y son masculinas */
export const MASCULINOS_EN_A = new Set(['sistema', 'problema', 'mapa', 'día', 'tema', 'programa', 'esquema', 'clima', 'aroma', 'planeta']);

/** Femeninas que no terminan en "a" */
export const FEMENINOS = new Set([
  'llave', 'base', 'fuente', 'red', 'pared', 'luz', 'cruz', 'torre', 'nave', 'cal', 'sal', 'hoz', 'mano', 'foto', 'moto',
  'radio', 'clave', 'serie', 'superficie', 'lente', 'nieve', 'gente', 'flor', 'piel', 'miel', 'tenaz', 'llaves',
]);

/** Colores y palabras que no cambian en plural: "botas beige" */
export const INVARIABLES = new Set(['beige', 'naranja', 'marfil', 'turquesa', 'rosa', 'violeta', 'lila', 'crema', 'multivoltaje', 'inverter', 'estándar', 'ostra', 'avellana']);

/** Las que no son sustantivos: no cambian el género de lo que sigue, y lo que va después de ellas tampoco */
export const PREPOSICIONES = new Set(['de', 'con', 'sin', 'para', 'tipo', 'por', 'en', 'al', 'del', 'a']);

/** Verbos que dicen para qué es: "máquina para soldar" */
export const VERBOS_DE_USO = new Set([
  'SOLDAR', 'PINTAR', 'CORTAR', 'PULIR', 'LIJAR', 'TALADRAR', 'ATORNILLAR', 'AMARRAR', 'CLAVAR', 'MEDIR', 'SELLAR',
  'PESCAR', 'LIMPIAR', 'BARRER', 'PODAR', 'CAVAR', 'PEGAR', 'GRAPAR', 'AISLAR', 'EMPOTRAR', 'EMBUTIR', 'SOBREPONER',
  'COLGAR', 'BOMBEAR', 'FUMIGAR', 'MEZCLAR', 'INFLAR', 'REMACHAR', 'DOBLAR', 'DESTAPAR', 'TRAPEAR', 'REGAR',
]);

/** Terminan en "s" y son singulares: "lavamanos", "paraguas" */
export const SINGULAR_EN_S = /^(lava|pasa|para|abre|saca|porta|corta|limpia|toca|quita|guarda|cubre|salva|cuenta|lanza|tapa|rompe)\p{L}+s$|^(gas|tenis|crisis|virus|bus|mes|país|compás|lunes|atlas|análisis|dosis|tórax|bíceps)$/u;

/** Adjetivos que vienen escritos enteros: tampoco cambian el género */
export const ADJETIVOS_ENTEROS = new Set([
  'grande', 'pequeño', 'pequeña', 'largo', 'larga', 'corto', 'corta', 'doble', 'simple', 'sencillo', 'sencilla', 'negro',
  'negra', 'blanco', 'blanca', 'rojo', 'roja', 'azul', 'verde', 'gris', 'amarillo', 'amarilla', 'nuevo', 'nueva',
  'universal', 'industrial', 'profesional', 'digital', 'manual', 'mini', 'maxi', 'super', 'extra', 'liso', 'lisa',
  'plano', 'plana', 'redondo', 'redonda', 'fijo', 'fija', 'mate', 'brillante', 'transparente', 'flexible', 'ajustable',
  'recargable', 'portátil', 'grueso', 'gruesa', 'fino', 'fina', 'alto', 'alta', 'bajo', 'baja', 'medio', 'media',
  'seda', 'satinado', 'satinada', 'brillo', 'frío', 'fría', 'oscuro', 'oscura', 'claro', 'clara', 'galvanizado',
  'galvanizada', 'cromado', 'cromada', 'pintado', 'pintada', 'esmaltado', 'esmaltada', 'laminado', 'laminada', 'reforzado',
  'reforzada', 'anodizado', 'anodizada', 'pulido', 'pulida', 'templado', 'templada', 'plateado', 'plateada', 'dorado',
  'dorada', 'niquelado', 'niquelada', 'roscado', 'roscada', 'giratorio', 'giratoria', 'plegable', 'desechable', 'lavable',
  'removible', 'inoxidable', 'antideslizante', 'impermeable', 'resistente', 'multiuso', 'reutilizable', 'eléctrico',
  'eléctrica', 'rápido', 'rápida', 'sólido', 'sólida', 'líquido', 'líquida', 'automático', 'automática', 'térmico',
  'térmica', 'blanco', 'beige', 'marfil', 'caoba', 'cobre', 'natural', 'liviano', 'liviana', 'pesado', 'pesada',
]);
