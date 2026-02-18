import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

// Tipos basados en la documentación
export interface SadesProduct {
    sku: string;
    nombre: string;
    descripcion: string;
    categoria: string;
    precioUSD: number;
    stock: number;
    stockDisponible: number;
    activo: boolean;
    imagen: string;     // URL completa o parcial según doc
    imagenApiUrl: string; // /api/eweb/imagen/{sku}
    updatedAt: string;
}

export interface SyncResult {
    created: number;
    updated: number;
    errors: string[];
}

const API_URL = process.env.SADES_API_URL || '';
const API_KEY = process.env.SADES_API_KEY || '';

if (!API_URL || !API_KEY) {
    console.warn('⚠️ SADES_API_URL o SADES_API_KEY no están configuradas en las variables de entorno.');
}

export class SadesClient {
    private headers: HeadersInit;

    constructor() {
        this.headers = {
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Verificar estado del servicio
     */
    async checkHealth(): Promise<boolean> {
        try {
            const res = await fetch(`${API_URL}/health`); // El endpoint health es público según doc, pero usaremos base url
            return res.ok;
        } catch (error) {
            console.error('Sades Health Check Failed:', error);
            return false;
        }
    }

    /**
     * Obtener catálogo completo (o paginado)
     */
    async getCatalog(page = 1, pageSize = 100): Promise<{ data: SadesProduct[]; hasMore: boolean }> {
        try {
            // Usamos el endpoint de catalogo
            const res = await fetch(`${API_URL}/catalogo?page=${page}&pageSize=${pageSize}`, {
                headers: this.headers,
            });

            if (!res.ok) {
                throw new Error(`Error fetching catalog: ${res.statusText}`);
            }

            const json = await res.json();
            return {
                data: json.data,
                hasMore: json.pagination.hasMore,
            };
        } catch (error) {
            console.error('Sades Catalog Error:', error);
            throw error;
        }
    }

    /**
     * Descargar imagen del producto desde el endpoint dedicado
     * /api/eweb/imagen/:sku
     */
    async downloadImage(sku: string): Promise<string | null> {
        try {
            const imageUrl = `${API_URL}/imagen/${sku}?type=original`;
            const res = await fetch(imageUrl, { headers: this.headers });

            if (!res.ok) {
                if (res.status === 404) return null; // No tiene imagen
                throw new Error(`Error downloading image for SKU ${sku}: ${res.status}`);
            }

            // Determinar extensión del content-type
            const contentType = res.headers.get('content-type');
            let ext = 'jpg';
            if (contentType?.includes('png')) ext = 'png';
            else if (contentType?.includes('webp')) ext = 'webp';

            // Directorio de destino: public/uploads/products
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filename = `${sku}.${ext}`;
            const filepath = path.join(uploadDir, filename);

            // Guardar archivo (stream)
            // @ts-ignore - fetch response body compatibility with node streams
            if (res.body) {
                // @ts-ignore
                await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(filepath));
            }

            // Retornar la ruta relativa para guardar en DB
            return `/uploads/products/${filename}`;

        } catch (error) {
            console.error(`Failed to download image for ${sku}:`, error);
            return null;
        }
    }
}

export const sadesClient = new SadesClient();
