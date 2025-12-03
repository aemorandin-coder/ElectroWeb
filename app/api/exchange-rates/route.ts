import { NextResponse } from 'next/server';

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

        return NextResponse.json(
            { error: 'Official rate not found in API response' },
            { status: 404 }
        );

    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        return NextResponse.json(
            { error: 'Failed to fetch exchange rates' },
            { status: 500 }
        );
    }
}
