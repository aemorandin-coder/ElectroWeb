import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const response = await fetch('https://ve.dolarapi.com/v1/dolares', {
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!response.ok) {
            throw new Error('Failed to fetch from external API');
        }

        const data = await response.json();

        // Find the official rate (BCV)
        const officialRate = data.find((rate: any) => rate.fuente === 'oficial' || rate.nombre === 'Oficial');

        if (officialRate && officialRate.promedio) {
            return NextResponse.json({
                VES: officialRate.promedio,
                lastUpdated: officialRate.fechaActualizacion
            });
        }

        throw new Error('Official rate not found in external API response');

    } catch (error) {
        console.error('Error fetching exchange rates from DolarAPI, attempting fallback:', error);
        
        try {
            // Attempt to load fallback from CompanySettings
            const settings = await prisma.companySettings.findFirst({
                where: { id: 'default' }
            }) || await prisma.companySettings.findFirst();

            if (settings && settings.exchangeRateVES) {
                return NextResponse.json({
                    VES: Number(settings.exchangeRateVES),
                    lastUpdated: settings.lastRateUpdate || new Date().toISOString(),
                    isFallback: true
                });
            }
        } catch (dbError) {
            console.error('Database fallback also failed:', dbError);
        }

        // Hard fallback if DB is not available or doesn't have exchangeRateVES
        return NextResponse.json({
            VES: 36.50,
            lastUpdated: new Date().toISOString(),
            isHardFallback: true
        });
    }
}
