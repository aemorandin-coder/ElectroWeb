import { escapeHtml } from '@/lib/html';
import { botonCorreo } from './estilo';
import { marcoCorreo } from './marco';

interface ReviewApprovedData {
    customerName: string;
    productName: string;
    productUrl: string;
    rating: number;
}

/** El HTML completo del correo (C-219: el marco nuevo). El nombre del cliente y del producto van escapados. */
export async function generateReviewApprovedEmail(data: ReviewApprovedData): Promise<string> {
    const { customerName, productName, productUrl, rating } = data;
    const nombre = escapeHtml((customerName || '').trim().split(/\s+/)[0] || '');
    // Las estrellas de calificación son la excepción con nombre del ámbar (PLAN.md §1.1)
    const estrellas = [...Array(5)]
        .map((_, i) => `<span style="color:${i < rating ? '#f59e0b' : '#d5dbe5'};">&#9733;</span>`)
        .join('');

    return marcoCorreo({
        preheader: `Tu reseña de ${productName} ya la ven todos en la tienda.`,
        encabezado: {
            sello: 'RESEÑA PUBLICADA',
            titulo: `¡Gracias por tu opinión${nombre ? `, ${nombre}` : ''}!`,
            texto: `Tu reseña de <strong style="color:#212529;">${escapeHtml(productName)}</strong> ya está publicada y la ven todos en la tienda.`,
        },
        cuerpo: `
            <p style="margin:0;font-size:34px;line-height:1;letter-spacing:6px;text-align:center;">${estrellas}</p>
            ${botonCorreo(escapeHtml(productUrl), 'Ver mi reseña')}`,
        chispa: { pose: 'celebra', texto: 'Las reseñas de quienes compraron son las que más ayudan a otros a decidir. ¡Gracias por ser parte!' },
    });
}
