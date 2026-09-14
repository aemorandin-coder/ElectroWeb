import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
    addressInputSchema,
    createSavedAddress,
    firstIssue,
    MAX_SAVED_ADDRESSES,
    updateSavedAddresses,
} from '@/lib/saved-addresses';

// El checkout guarda aquí la dirección de envío usada. Misma libreta que /api/customer/addresses (C-24).
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json().catch(() => null);
        const parsed = addressInputSchema.safeParse({
            addressLine1: body?.address,
            city: body?.city,
            state: body?.state,
        });

        if (!parsed.success) {
            return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
        }

        const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
        const outcome = await updateSavedAddresses<string>(userId, (list) => {
            const exists = list.some(
                (entry) =>
                    same(entry.addressLine1, parsed.data.addressLine1) &&
                    same(entry.city, parsed.data.city) &&
                    same(entry.state, parsed.data.state)
            );
            if (exists) return { list, result: 'Dirección ya guardada' };
            // Al llegar al límite no se agrega, pero la compra sigue su curso
            if (list.length >= MAX_SAVED_ADDRESSES) return { list, result: 'Límite de direcciones guardadas alcanzado' };
            const created = createSavedAddress({ ...parsed.data, isDefault: list.length === 0 });
            return { list: [...list, created], result: 'Dirección guardada exitosamente' };
        });

        if ('error' in outcome) {
            return NextResponse.json({ error: outcome.error }, { status: outcome.status });
        }

        return NextResponse.json({ message: outcome.result, savedAddresses: outcome.list });
    } catch (error) {
        console.error('Error saving address:', error);
        return NextResponse.json(
            { error: 'Error al guardar la dirección' },
            { status: 500 }
        );
    }
}
