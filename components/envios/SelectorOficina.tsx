'use client';

import { useEffect, useState } from 'react';
import { adminHint, adminInput, adminLabel } from '@/lib/admin-ui';
import { capitalizarNombre } from '@/lib/envios/empresas';

// C-137: Estado → Ciudad → Oficina, con la lista real de ZOOM (su API) y las agencias de MRW. Lo mismo que elige el
// checkout (C-100), para guardar la agencia en "Mis direcciones" sin escribirla a mano (el cliente escribía
// "zoom de barquisimeto" y la oficina no se podía usar). El servidor vuelve a validar la oficina al crear la orden.

export type EmpresaEnvio = 'ZOOM' | 'MRW';

export interface OficinaElegida {
  state: string;
  cityCode: string;
  city: string;
  officeCode: string;
  officeName: string;
  officeAddress: string;
}

export const OFICINA_VACIA: OficinaElegida = { state: '', cityCode: '', city: '', officeCode: '', officeName: '', officeAddress: '' };

interface Oficina { codigo: string; nombre: string; direccion: string }
interface DestinosZoom { estados: string[]; ciudades: Array<{ codigo: string; nombre: string; estado: string }> }
interface DestinosMrw { estados: string[]; agencias: Array<Oficina & { estado: string }> }

// Se piden una vez por visita: la lista de ZOOM tarda y no cambia en el día
const cache: { ZOOM?: DestinosZoom; MRW?: DestinosMrw; oficinas: Record<string, Oficina[]> } = { oficinas: {} };

async function pedir<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'No pudimos cargar las oficinas. Intenta de nuevo.');
  return data as T;
}

export default function SelectorOficina({
  empresa,
  value,
  onChange,
  idBase = 'oficina',
}: {
  empresa: EmpresaEnvio;
  value: OficinaElegida;
  onChange: (v: OficinaElegida) => void;
  idBase?: string;
}) {
  const [zoom, setZoom] = useState<DestinosZoom | null>(cache.ZOOM ?? null);
  const [mrw, setMrw] = useState<DestinosMrw | null>(cache.MRW ?? null);
  const [oficinasZoom, setOficinasZoom] = useState<Record<string, Oficina[]>>(cache.oficinas);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Destinos de la empresa elegida (y, al editar, las oficinas de la ciudad guardada)
  useEffect(() => {
    let vigente = true;
    const cargar = async () => {
      try {
        if (empresa === 'ZOOM' && !cache.ZOOM) {
          setCargando(true);
          cache.ZOOM = await pedir<DestinosZoom>('/api/envios/destinos?empresa=ZOOM');
          if (vigente) setZoom(cache.ZOOM);
        }
        if (empresa === 'MRW' && !cache.MRW) {
          setCargando(true);
          cache.MRW = await pedir<DestinosMrw>('/api/envios/destinos?empresa=MRW');
          if (vigente) setMrw(cache.MRW);
        }
        if (empresa === 'ZOOM' && value.cityCode && !cache.oficinas[value.cityCode]) {
          setCargando(true);
          const { oficinas } = await pedir<{ oficinas: Oficina[] }>(`/api/envios/oficinas?ciudad=${value.cityCode}`);
          cache.oficinas[value.cityCode] = oficinas;
          if (vigente) setOficinasZoom({ ...cache.oficinas });
        }
        if (vigente) setError('');
      } catch (e) {
        if (vigente) setError(e instanceof Error ? e.message : 'No pudimos cargar las oficinas.');
      } finally {
        if (vigente) setCargando(false);
      }
    };
    void cargar();
    return () => { vigente = false; };
  }, [empresa, value.cityCode]);

  const estados = empresa === 'ZOOM' ? zoom?.estados ?? [] : mrw?.estados ?? [];
  const ciudades = empresa === 'ZOOM' ? (zoom?.ciudades ?? []).filter((c) => c.estado === value.state) : [];
  const oficinas: Oficina[] = empresa === 'MRW'
    ? (mrw?.agencias ?? []).filter((a) => a.estado === value.state)
    : oficinasZoom[value.cityCode] ?? [];
  const nombreOficina = empresa === 'MRW' ? 'Agencia MRW' : 'Oficina ZOOM';

  const elegirEstado = (state: string) => onChange({ ...OFICINA_VACIA, state });
  const elegirCiudad = (cityCode: string) => {
    const ciudad = ciudades.find((c) => c.codigo === cityCode);
    onChange({ ...OFICINA_VACIA, state: value.state, cityCode, city: ciudad?.nombre ?? '' });
  };
  const elegirOficina = (officeCode: string) => {
    const o = oficinas.find((x) => x.codigo === officeCode);
    onChange({
      ...value,
      officeCode,
      officeName: o?.nombre ?? '',
      officeAddress: o?.direccion ?? '',
      // MRW no tiene lista de ciudades: sus agencias se llaman como la ciudad ("ANACO", "PUERTO AYACUCHO")
      city: empresa === 'MRW' ? capitalizarNombre(o?.nombre ?? '') || value.state : value.city,
    });
  };

  return (
    <div className="space-y-3">
      <div className={`grid grid-cols-1 gap-3 ${empresa === 'ZOOM' ? 'sm:grid-cols-2' : ''}`}>
        <div>
          <label htmlFor={`${idBase}-estado`} className={adminLabel}>Estado</label>
          <select id={`${idBase}-estado`} value={value.state} onChange={(e) => elegirEstado(e.target.value)} className={adminInput()} disabled={estados.length === 0}>
            <option value="">{cargando && estados.length === 0 ? 'Cargando…' : 'Elige el estado'}</option>
            {estados.map((e) => <option key={e} value={e}>{e}</option>)}
            {value.state && !estados.includes(value.state) && <option value={value.state}>{value.state}</option>}
          </select>
        </div>
        {empresa === 'ZOOM' && (
          <div>
            <label htmlFor={`${idBase}-ciudad`} className={adminLabel}>Ciudad</label>
            <select id={`${idBase}-ciudad`} value={value.cityCode} onChange={(e) => elegirCiudad(e.target.value)} className={adminInput()} disabled={!value.state}>
              <option value="">Elige la ciudad</option>
              {ciudades.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
              {value.cityCode && !ciudades.some((c) => c.codigo === value.cityCode) && <option value={value.cityCode}>{value.city || value.cityCode}</option>}
            </select>
          </div>
        )}
      </div>

      <div>
        <label htmlFor={`${idBase}-oficina`} className={adminLabel}>{nombreOficina}</label>
        <select
          id={`${idBase}-oficina`}
          value={value.officeCode}
          onChange={(e) => elegirOficina(e.target.value)}
          className={adminInput()}
          disabled={empresa === 'ZOOM' ? !value.cityCode : !value.state}
        >
          <option value="">{cargando && value.cityCode ? 'Cargando oficinas…' : `Elige la ${empresa === 'MRW' ? 'agencia' : 'oficina'}`}</option>
          {oficinas.map((o) => <option key={o.codigo} value={o.codigo}>{o.nombre} · {o.codigo}</option>)}
          {value.officeCode && !oficinas.some((o) => o.codigo === value.officeCode) && <option value={value.officeCode}>{value.officeName || value.officeCode}</option>}
        </select>
        {value.officeAddress ? (
          <p className={adminHint}>{value.officeAddress}</p>
        ) : value.state && (empresa === 'MRW' || value.cityCode) && !cargando && oficinas.length === 0 ? (
          <p className={adminHint}>{empresa === 'MRW' ? 'MRW no tiene agencias en ese estado.' : 'ZOOM no tiene oficinas con cobro a destino en esa ciudad.'}</p>
        ) : null}
      </div>
      {error && <p className="text-sm font-medium text-deal" role="alert">{error}</p>}
    </div>
  );
}
