// C-202: cómo se escribe cada marca. Las de la tienda (Productos → marca) mandan sobre estas; esta lista cubre las que
// todavía no se cargaron: las de la lista de la ferretería aliada y las de tecnología más comunes.

export const MARCAS: readonly string[] = [
  // Ferretería
  'Daewoo', 'Tolsen', 'Emtop', 'Zasc', 'Isonic', 'Genpar', 'Gladiator', 'Bellota', 'Titan', 'Brufer', 'Stanley', 'Gavilán',
  'RUN', 'Griven', 'Brickell', 'Resinca', 'Aquafina', 'Hunter', 'Reinco', 'Metco', 'Herragro', 'Pavco', 'Wolfgang',
  'Grimax', 'Protonic', 'Bituplas', 'Vinko', 'BTicino', 'Kobatex', 'Rotoking', 'Crownman', 'Ingralub', 'Duratex',
  'Doberman', 'Ferco', 'Cisa', 'Veneluz', 'Tubrica', 'Cebra', 'Luxven', 'Propaint', 'Coflex', 'Imsa', 'Maxi Tools',
  'Diesel Tools', 'Clever', 'Pretul', 'Truper', 'Black+Decker', 'Lincoln', 'Furius', 'Manpica', 'Jappy', 'Rockwell',
  'Imper-Tek', 'Genius', 'Makita', 'DeWalt', 'Bosch', 'Total', 'Ingco', 'Uyustools', 'Sika', 'Montana', 'Pintuco', 'Sherwin-Williams',
  'Tigre', 'Plastigama', 'Exceline', 'Thor', 'Cooper', 'Leviton', 'Schneider', 'Siemens', 'Philips', 'Sylvania', 'Osram',
  // Tecnología
  'HP', 'AOAS', 'Xiaomi', 'Hiksemi', 'Nexus', 'PlayStation', 'Nintendo', 'Xbox', 'Steam', 'Roblox', 'Samsung', 'LG', 'Sony',
  'Apple', 'JBL', 'Logitech', 'Redragon', 'Kingston', 'ADATA', 'TP-Link', 'Lenovo', 'Asus', 'Dell', 'Huawei',
  'Motorola', 'Epson', 'Canon', 'Corsair', 'Razer', 'HyperX', 'Seagate', 'Western Digital', 'SanDisk', 'Hikvision',
];

/** Cómo lo abrevia su sistema → la marca */
export const ALIAS_MARCA: Readonly<Record<string, string>> = {
  BRF: 'Brufer', BRUF: 'Brufer', TIT: 'Titan', BELL: 'Bellota', GENP: 'Genpar', TUBRIC: 'Tubrica', TUBRI: 'Tubrica',
  TUBR: 'Tubrica', PAV: 'Pavco', AGUAFINA: 'Aquafina', TICI: 'BTicino', 'BLACK+DECKER': 'Black+Decker',
};
