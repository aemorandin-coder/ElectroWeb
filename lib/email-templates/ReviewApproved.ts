import { getBaseTemplate } from '@/lib/email-service';
import { escapeHtml } from '@/lib/html';
import { CORREO, COLOR, botonCorreo, selloCorreo } from './estilo';

interface ReviewApprovedData {
    customerName: string;
    productName: string;
    productUrl: string;
    rating: number;
}

/** El HTML completo del correo, con el marco de todos los correos (C-175). El nombre del cliente y del producto van escapados. */
export async function generateReviewApprovedEmail(data: ReviewApprovedData): Promise<string> {
    const { customerName, productName, productUrl, rating } = data;
    const estrellas = [...Array(5)]
        .map((_, i) => `<span style="color:${i < rating ? '#f59e0b' : COLOR.linea};">&#9733;</span>`)
        .join('');

    const content = `
    <div style="text-align:center;">
      ${selloCorreo('exito')}
      <h2 style="${CORREO.titulo}">Tu reseña ya está publicada</h2>
      <p style="margin:0 0 20px;font-size:30px;line-height:1;letter-spacing:4px;">${estrellas}</p>
    </div>
    <p style="${CORREO.texto}">Hola <strong style="${CORREO.fuerte}">${escapeHtml(customerName)}</strong>,</p>
    <p style="${CORREO.texto}">Gracias por compartir tu experiencia con <strong style="${CORREO.fuerte}">${escapeHtml(productName)}</strong>. Aprobamos tu reseña y ya la ven los demás clientes.</p>
    ${botonCorreo(escapeHtml(productUrl), 'Ver tu reseña')}
    <div style="${CORREO.caja}">
      <p style="${CORREO.cajaTitulo}${CORREO.fuerte}">¿Sabías que?</p>
      <p style="${CORREO.cajaTexto}${CORREO.tonoNeutro}">Las reseñas de quienes compraron son las que más ayudan a otros clientes a decidir.</p>
    </div>`;

    return getBaseTemplate(content, `Tu reseña de ${productName} ya está publicada`);
}
