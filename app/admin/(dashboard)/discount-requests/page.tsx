'use client';

import { useState } from 'react';
import { FiPercent, FiScissors, FiUsers } from 'react-icons/fi';
import { adminIconChip, adminPageHeader, adminPageSubtitle, adminPageTitle, adminTab } from '@/lib/admin-ui';
import Promociones from './_components/Promociones';
import Solicitudes from './_components/Solicitudes';

// Descuentos (C-102): ofertas y cupones de la tienda, y el historial de las solicitudes de los clientes.
export default function DescuentosPage() {
    const [tab, setTab] = useState<'promos' | 'solicitudes'>('promos');
    return (
        <div className="min-w-0 space-y-4">
            <div className={adminPageHeader}>
                <div className="flex items-center gap-3">
                    <span className={adminIconChip('brand')}><FiPercent className="h-5 w-5" aria-hidden="true" /></span>
                    <div>
                        <h1 className={adminPageTitle}>Descuentos</h1>
                        <p className={adminPageSubtitle}>Ofertas con precio tachado y cupones para campañas</p>
                    </div>
                </div>
            </div>
            <div className="flex gap-1 border-b border-line pb-2" role="tablist" aria-label="Secciones de descuentos">
                <button type="button" role="tab" aria-selected={tab === 'promos'} onClick={() => setTab('promos')} className={adminTab(tab === 'promos')}>
                    <FiScissors className="h-4 w-4" aria-hidden="true" /> Ofertas y cupones
                </button>
                <button type="button" role="tab" aria-selected={tab === 'solicitudes'} onClick={() => setTab('solicitudes')} className={adminTab(tab === 'solicitudes')}>
                    <FiUsers className="h-4 w-4" aria-hidden="true" /> Solicitudes de clientes
                </button>
            </div>
            {tab === 'promos' ? <Promociones /> : <Solicitudes />}
        </div>
    );
}
