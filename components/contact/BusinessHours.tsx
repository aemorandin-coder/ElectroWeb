'use client';

import { useState } from 'react';

interface BusinessHoursProps {
    businessHours?: string | null;
}

interface DaySchedule {
    enabled: boolean;
    open: string;
    close: string;
}

const daysMap: Record<string, { name: string; abbr: string }> = {
    monday: { name: 'Lunes', abbr: 'LUN' },
    tuesday: { name: 'Martes', abbr: 'MAR' },
    wednesday: { name: 'Miércoles', abbr: 'MIÉ' },
    thursday: { name: 'Jueves', abbr: 'JUE' },
    friday: { name: 'Viernes', abbr: 'VIE' },
    saturday: { name: 'Sábado', abbr: 'SÁB' },
    sunday: { name: 'Domingo', abbr: 'DOM' }
};

const fallbackHours = [
    { abbr: 'LUN', name: 'Lunes', time: '9:00 AM - 6:00 PM', isOpen: true },
    { abbr: 'MAR', name: 'Martes', time: '9:00 AM - 6:00 PM', isOpen: true },
    { abbr: 'MIÉ', name: 'Miércoles', time: '9:00 AM - 6:00 PM', isOpen: true },
    { abbr: 'JUE', name: 'Jueves', time: '9:00 AM - 6:00 PM', isOpen: true },
    { abbr: 'VIE', name: 'Viernes', time: '9:00 AM - 6:00 PM', isOpen: true },
    { abbr: 'SÁB', name: 'Sábado', time: '10:00 AM - 2:00 PM', isOpen: true },
    { abbr: 'DOM', name: 'Domingo', time: '', isOpen: false },
];

export default function BusinessHours({ businessHours }: BusinessHoursProps) {
    const [isOpen, setIsOpen] = useState(false);

    const parseHours = () => {
        try {
            if (businessHours) {
                const hours = JSON.parse(businessHours);
                if (hours && typeof hours === 'object') {
                    return Object.entries(hours).map(([day, schedule]: [string, any]) => {
                        const dayInfo = daysMap[day] || { name: day, abbr: day.substring(0, 3).toUpperCase() };
                        return {
                            abbr: dayInfo.abbr,
                            name: dayInfo.name,
                            time: schedule?.enabled ? `${schedule.open} - ${schedule.close}` : '',
                            isOpen: schedule?.enabled || false
                        };
                    });
                }
            }
        } catch (e) {
            console.error('Error parsing businessHours:', e);
        }
        return fallbackHours;
    };

    const hours = parseHours();

    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] rounded-2xl shadow-2xl">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-300/10 rounded-full blur-xl pointer-events-none"></div>

            {/* Clickable Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-full flex items-center justify-between p-5 cursor-pointer select-none"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <h3 className="text-base font-bold text-white">Horario de Atención</h3>
                        <div className="flex items-center gap-2 text-xs text-white/70">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                            </span>
                            Click para ver horarios
                        </div>
                    </div>
                </div>
                <div className={`w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {/* Schedule Grid - Collapsible */}
            <div
                className={`relative px-5 space-y-1.5 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 pb-5 opacity-100' : 'max-h-0 pb-0 opacity-0'
                    }`}
            >
                {hours.map((day) => (
                    <div
                        key={day.abbr}
                        className={`flex items-center justify-between p-2 rounded-lg ${day.isOpen ? 'bg-white/10' : 'bg-red-500/20'}`}
                    >
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-black ${day.isOpen ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                {day.abbr}
                            </span>
                            <span className="text-white text-sm font-medium">{day.name}</span>
                        </div>
                        {day.isOpen ? (
                            <span className="text-emerald-300 font-semibold text-xs">{day.time}</span>
                        ) : (
                            <span className="text-red-300 font-semibold text-xs">CERRADO</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
