import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchOfficialRate } from '@/lib/exchange-rate';

/** Tasa oficial del BCV (DolarAPI). Si la fuente falla, la última tasa guardada en Configuración. */
export async function GET() {
    try {
        const official = await fetchOfficialRate();
        if (official) {
            return NextResponse.json({
                VES: official.rate,
                lastUpdated: official.publishedAt ?? new Date(),
            });
        }
        throw new Error('Official rate not found in external API response');
    } catch (error) {
        console.error('Error fetching exchange rates from DolarAPI, attempting fallback:', error);

        try {
            const settings = await prisma.companySettings.findUnique({
                where: { id: 'default' },
                select: { exchangeRateVES: true, lastRateUpdate: true },
            });

            if (settings?.exchangeRateVES) {
                return NextResponse.json({
                    VES: Number(settings.exchangeRateVES),
                    lastUpdated: settings.lastRateUpdate || new Date().toISOString(),
                    isFallback: true
                });
            }
        } catch (dbError) {
            console.error('Database fallback also failed:', dbError);
        }

        return NextResponse.json({ error: 'Tasa no disponible' }, { status: 503 });
    }
}
