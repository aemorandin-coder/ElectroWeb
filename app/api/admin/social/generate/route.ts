import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';

// Initialize Gemini AI
let genAI: any = null;

async function getGeminiAI() {
    if (!genAI) {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!isAuthorized(session, 'VIEW_DASHBOARD')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const body = await request.json();
        const { action, productName, productPrice, category, template, language = 'es' } = body;

        const ai = await getGeminiAI();
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

        if (action === 'generate_caption') {
            const prompt = `Eres un experto en marketing de redes sociales. Genera contenido para una publicación de Instagram Story para el siguiente producto:

Producto: ${productName}
Precio: $${productPrice} USD
Categoría: ${category}
Estilo del template: ${template}
Idioma: ${language === 'es' ? 'Español' : 'English'}

Genera un objeto JSON con exactamente esta estructura (sin markdown, solo JSON puro):
{
    "headline": "Texto corto y llamativo de máximo 15 caracteres para el badge principal",
    "subheadline": "Frase complementaria de máximo 25 caracteres",
    "caption": "Caption completo para Instagram de máximo 150 caracteres incluyendo emojis relevantes",
    "hashtags": ["5 hashtags relevantes sin el símbolo #"],
    "cta": "Llamado a la acción de máximo 20 caracteres",
    "urgency": "Frase de urgencia corta de máximo 20 caracteres (ej: Solo hoy, Últimas unidades)"
}

Sé creativo, usa el tono del template (${template}) y genera contenido que convierta. No uses comillas dobles dentro de los textos.`;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            // Parse JSON from response
            let parsed;
            try {
                // Extract JSON from response (in case it has markdown)
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No JSON found');
                }
            } catch (e) {
                // Default fallback
                parsed = {
                    headline: 'OFERTA',
                    subheadline: 'Precio especial',
                    caption: `${productName} disponible ahora`,
                    hashtags: ['tecnologia', 'ofertas', 'electronica', 'tienda', 'compras'],
                    cta: 'Comprar Ahora',
                    urgency: 'Stock limitado'
                };
            }

            return NextResponse.json({
                success: true,
                content: parsed
            });
        }

        if (action === 'generate_variations') {
            const prompt = `Genera 5 variaciones diferentes de textos promocionales cortos para este producto:

Producto: ${productName}
Precio: $${productPrice} USD
Categoría: ${category}
Idioma: ${language === 'es' ? 'Español' : 'English'}

Responde con un JSON array así (sin markdown, solo JSON puro):
[
    {"text": "Variación 1 máximo 20 caracteres", "style": "urgente"},
    {"text": "Variación 2 máximo 20 caracteres", "style": "elegante"},
    {"text": "Variación 3 máximo 20 caracteres", "style": "divertido"},
    {"text": "Variación 4 máximo 20 caracteres", "style": "profesional"},
    {"text": "Variación 5 máximo 20 caracteres", "style": "exclusivo"}
]`;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            let parsed;
            try {
                const jsonMatch = text.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No JSON found');
                }
            } catch (e) {
                parsed = [
                    { text: 'SUPER OFERTA', style: 'urgente' },
                    { text: 'Diseño Premium', style: 'elegante' },
                    { text: 'Lo Quieres!', style: 'divertido' },
                    { text: 'Calidad Garantizada', style: 'profesional' },
                    { text: 'Edición Limitada', style: 'exclusivo' },
                ];
            }

            return NextResponse.json({
                success: true,
                variations: parsed
            });
        }

        if (action === 'suggest_colors') {
            const prompt = `Sugiere una paleta de colores para promocionar este producto en Instagram:

Producto: ${productName}
Categoría: ${category}

Responde con un JSON así (sin markdown):
{
    "primary": "#hexcolor",
    "secondary": "#hexcolor", 
    "accent": "#hexcolor",
    "text": "#hexcolor",
    "gradient": "from-color-500 via-color-500 to-color-500 (formato Tailwind)"
}

Los colores deben ser vibrantes y atractivos para redes sociales.`;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            let parsed;
            try {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[0]);
                }
            } catch (e) {
                parsed = {
                    primary: '#2a63cd',
                    secondary: '#1e4ba3',
                    accent: '#fbbf24',
                    text: '#ffffff',
                    gradient: 'from-blue-600 via-indigo-600 to-purple-600'
                };
            }

            return NextResponse.json({
                success: true,
                colors: parsed
            });
        }

        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

    } catch (error: any) {
        console.error('Gemini API error:', error);
        return NextResponse.json({
            error: error.message || 'Error al generar contenido',
            details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
        }, { status: 500 });
    }
}
