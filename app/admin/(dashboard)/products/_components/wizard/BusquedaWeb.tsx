'use client';

import { useId, useState, type ReactNode } from 'react';
import { FiAlertTriangle, FiCheck, FiGlobe, FiSearch, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminBadge, adminNotice } from '@/lib/admin-ui';
import { claveNombre } from '@/lib/spec-sugerencias';
import type { ResultadoBusquedaWeb } from '@/lib/busqueda-web/tipos';
import { wizardInput, wizardPrimaryButton, wizardSecondaryButton } from './ui';
import type { WizardData } from './types';

// C-155: buscar el producto en la web desde el primer paso del asistente (pedido de Andrés del 01/10).
// - Trae sugerencias; no llena nada solo. Cada dato lleva su casilla y de dónde salió.
// - Lo que ya está escrito en el producto no viene marcado: no se pisa sin querer.
// - Lo estimado o sin confirmar tampoco viene marcado: el peso y las medidas deciden el embalaje y el flete (C-153),
//   y un código de barras equivocado es peor que ninguno.
// - Si la búsqueda falla o no encuentra nada, lo dice y el asistente sigue igual.

interface Props {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
}

type Estado = { tipo: 'cerrado' } | { tipo: 'buscando' } | { tipo: 'error'; mensaje: string } | { tipo: 'listo'; resultado: ResultadoBusquedaWeb };

const conComa = (n: number) => String(n).replace('.', ',');
const esPeso = (kg: number) => (kg < 1 ? `${conComa(Math.round(kg * 1000))} g` : `${conComa(kg)} kg`);

export default function BusquedaWeb({ data, onChange }: Props) {
  const id = useId();
  const [consulta, setConsulta] = useState('');
  const [estado, setEstado] = useState<Estado>({ tipo: 'cerrado' });
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  // Mientras no se escriba otra cosa, se busca el nombre del producto
  const texto = consulta || data.name;

  const buscar = async () => {
    if (texto.trim().length < 3) {
      toast.error('Escribe primero el nombre del producto');
      return;
    }
    setEstado({ tipo: 'buscando' });
    try {
      const res = await fetch('/api/admin/products/buscar-web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: texto.trim(), categoryId: data.categoryId || undefined }),
      });
      const json = (await res.json().catch(() => null)) as (ResultadoBusquedaWeb & { error?: string }) | null;
      if (!res.ok || !json || json.error) {
        setEstado({ tipo: 'error', mensaje: json?.error || 'La búsqueda falló. El producto se puede llenar a mano.' });
        return;
      }
      // Marcado de entrada: lo leído de una página, y solo donde el producto todavía no tiene nada
      const inicial = new Set<string>();
      if (json.marca && !json.marca.estimado && !data.brand.trim()) inicial.add('marca');
      if (json.codigoBarras && !json.codigoBarras.estimado && !data.barcode.trim()) inicial.add('codigo');
      if (json.peso && !json.peso.estimado && !data.weightKg.trim()) inicial.add('peso');
      if (json.medidas && !json.medidas.estimado && !(data.dimensionLength || data.dimensionWidth || data.dimensionHeight)) inicial.add('medidas');
      if (json.descripcion && !data.description.trim()) inicial.add('descripcion');
      const yaEscritas = new Set(Object.keys(data.specifications).map(claveNombre));
      json.especificaciones.forEach((e, i) => { if (!yaEscritas.has(claveNombre(e.nombre))) inicial.add(`spec-${i}`); });
      setMarcados(inicial);
      setEstado({ tipo: 'listo', resultado: json });
    } catch {
      setEstado({ tipo: 'error', mensaje: 'No hubo conexión con la tienda. Vuelve a intentar.' });
    }
  };

  const alternar = (clave: string) => {
    setMarcados((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave); else next.add(clave);
      return next;
    });
  };

  const usar = (r: ResultadoBusquedaWeb) => {
    const cambios: Partial<WizardData> = {};
    if (marcados.has('marca') && r.marca) cambios.brand = r.marca.valor;
    if (marcados.has('codigo') && r.codigoBarras) cambios.barcode = r.codigoBarras.valor;
    if (marcados.has('descripcion') && r.descripcion) cambios.description = r.descripcion;
    if (marcados.has('peso') && r.peso) cambios.weightKg = conComa(r.peso.valor);
    if (marcados.has('medidas') && r.medidas) {
      cambios.dimensionLength = conComa(r.medidas.valor.largo);
      cambios.dimensionWidth = conComa(r.medidas.valor.ancho);
      cambios.dimensionHeight = conComa(r.medidas.valor.alto);
    }
    // El paso de precios recuerda que hay un estimado sin comprobar con la caja
    if ((marcados.has('peso') && r.peso?.estimado) || (marcados.has('medidas') && r.medidas?.estimado)) cambios.medidasEstimadas = true;
    const specs = { ...data.specifications };
    let nuevas = 0;
    r.especificaciones.forEach((e, i) => {
      if (!marcados.has(`spec-${i}`)) return;
      // Si ya existe con otra forma de escribir el nombre ("CONEXION"), se reemplaza esa y no se duplica
      const existente = Object.keys(specs).find((k) => claveNombre(k) === claveNombre(e.nombre));
      if (existente && existente !== e.nombre) delete specs[existente];
      specs[e.nombre] = e.valor;
      nuevas += 1;
    });
    if (nuevas > 0) cambios.specifications = specs;
    const total = Object.keys(cambios).filter((k) => !['dimensionWidth', 'dimensionHeight', 'medidasEstimadas', 'specifications'].includes(k)).length + nuevas;
    if (total === 0) {
      toast.error('Marca al menos un dato');
      return;
    }
    onChange(cambios);
    setEstado({ tipo: 'cerrado' });
    toast.success(total === 1 ? 'Dato puesto en el producto. Revísalo antes de guardar.' : `${total} datos puestos en el producto. Revísalos en cada paso antes de guardar.`, { duration: 6000 });
  };

  const fila = (clave: string, titulo: string, valor: ReactNode, opciones: { fuente?: string; nota?: string; aviso?: string; actual?: string } = {}) => (
    <li key={clave} className="flex items-start gap-3 py-2.5">
      <input
        id={`${id}-${clave}`}
        type="checkbox"
        checked={marcados.has(clave)}
        onChange={() => alternar(clave)}
        className="mt-1 h-4 w-4 shrink-0 rounded text-brand-600 focus:ring-brand-500"
      />
      <label htmlFor={`${id}-${clave}`} className="min-w-0 flex-1 cursor-pointer">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">{titulo}</span>
          {opciones.aviso && <span className={adminBadge('warning')}>{opciones.aviso}</span>}
        </span>
        <span className="mt-0.5 block whitespace-pre-line text-sm text-ink [overflow-wrap:anywhere]">{valor}</span>
        {(opciones.nota || opciones.fuente) && (
          <span className="mt-0.5 block text-xs text-muted">{opciones.nota || `Según ${opciones.fuente}`}</span>
        )}
        {opciones.actual && <span className="mt-0.5 block text-xs font-medium text-warning-strong">Reemplaza lo que ya tiene: {opciones.actual}</span>}
      </label>
    </li>
  );

  const r = estado.tipo === 'listo' ? estado.resultado : null;
  const medidasActuales = [data.dimensionLength, data.dimensionWidth, data.dimensionHeight].filter(Boolean).join(' × ');

  return (
    <section aria-labelledby={`${id}-titulo`} className="rounded-xl border border-brand-100 bg-brand-50/60 p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600">
          <FiGlobe className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={`${id}-titulo`} className="text-sm font-semibold text-ink">Buscar este producto en la web</h3>
          <p className="mt-0.5 text-xs text-muted">
            Trae la marca, el código de barras, el peso y las medidas de la caja, las especificaciones y un borrador de la descripción. Tú eliges qué usar.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Qué buscar: nombre y modelo</span>
          <input
            type="text"
            value={texto}
            maxLength={150}
            onChange={(e) => setConsulta(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void buscar(); } }}
            placeholder="Nombre y modelo, por ejemplo: Teclado Redragon Kumara K552"
            className={wizardInput()}
          />
        </label>
        <button type="button" onClick={() => void buscar()} disabled={estado.tipo === 'buscando' || texto.trim().length < 3} className={`${wizardPrimaryButton} shrink-0`}>
          <FiSearch className="h-4 w-4" aria-hidden="true" />
          {estado.tipo === 'buscando' ? 'Buscando…' : 'Buscar'}
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">Con la marca y el modelo exactos encuentra mejor.</p>

      <div aria-live="polite">
        {estado.tipo === 'buscando' && (
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" aria-hidden="true" />
            Buscando y leyendo las páginas. Puede tardar hasta medio minuto.
          </p>
        )}
        {estado.tipo === 'error' && (
          <p className={`${adminNotice('warning')} mt-3 flex items-start gap-2`} role="alert">
            <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{estado.mensaje}</span>
          </p>
        )}
      </div>

      {r && (
        <div className="mt-3 rounded-xl border border-line bg-white p-3 sm:p-4">
          {r.avisos.map((aviso) => (
            <p key={aviso} className={`${adminNotice('warning')} mb-3 flex items-start gap-2`}>
              <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{aviso}</span>
            </p>
          ))}

          {(r.marca || r.codigoBarras || r.peso || r.medidas || r.descripcion || r.especificaciones.length > 0) ? (
            <>
              <p className="text-sm font-semibold text-ink">Esto encontramos. Marca lo que quieres usar:</p>
              <ul className="mt-1 divide-y divide-line">
                {r.marca && fila('marca', 'Marca', r.marca.valor, {
                  fuente: r.marca.fuente, nota: r.marca.nota,
                  aviso: r.marca.estimado ? 'Sin confirmar' : undefined,
                  actual: data.brand.trim() && data.brand.trim() !== r.marca.valor ? data.brand : undefined,
                })}
                {r.codigoBarras && fila('codigo', 'Código de barras', <span className="font-mono">{r.codigoBarras.valor}</span>, {
                  nota: `${r.codigoBarras.fuente ? `Según ${r.codigoBarras.fuente}. ` : ''}${r.codigoBarras.nota}`,
                  aviso: r.codigoBarras.estimado ? 'Sin confirmar' : undefined,
                  actual: data.barcode.trim() && data.barcode.trim() !== r.codigoBarras.valor ? data.barcode : undefined,
                })}
                {r.peso && fila('peso', 'Peso de la caja', esPeso(r.peso.valor), {
                  nota: r.peso.nota,
                  aviso: r.peso.estimado ? 'Estimado' : undefined,
                  actual: data.weightKg.trim() ? `${data.weightKg} kg` : undefined,
                })}
                {r.medidas && fila('medidas', 'Medidas de la caja', `${conComa(r.medidas.valor.largo)} × ${conComa(r.medidas.valor.ancho)} × ${conComa(r.medidas.valor.alto)} cm`, {
                  nota: r.medidas.nota,
                  aviso: r.medidas.estimado ? 'Estimado' : undefined,
                  actual: medidasActuales ? `${medidasActuales} cm` : undefined,
                })}
                {r.descripcion && fila('descripcion', 'Descripción (borrador)', r.descripcion, {
                  nota: r.redaccion === 'ia'
                    ? 'Redactada por la IA con los datos encontrados, sin copiar de ninguna página. Léela y ajústala con tus palabras.'
                    : 'Armada con los datos encontrados. Complétala con tus palabras.',
                  actual: data.description.trim() ? `${data.description.trim().slice(0, 80)}${data.description.trim().length > 80 ? '…' : ''}` : undefined,
                })}
                {r.especificaciones.map((e, i) => {
                  const existente = Object.entries(data.specifications).find(([k]) => claveNombre(k) === claveNombre(e.nombre));
                  return fila(`spec-${i}`, e.nombre, e.valor, {
                    fuente: e.fuente || undefined,
                    nota: e.fuente ? undefined : 'Sin página para contrastar',
                    actual: existente && existente[1] !== e.valor ? existente[1] : undefined,
                  });
                })}
              </ul>
              <div className="mt-3 flex flex-col-reverse gap-2 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={() => setEstado({ tipo: 'cerrado' })} className={wizardSecondaryButton}>
                  <FiX className="h-4 w-4" aria-hidden="true" /> No usar nada
                </button>
                <button type="button" onClick={() => usar(r)} disabled={marcados.size === 0} className={wizardPrimaryButton}>
                  <FiCheck className="h-4 w-4" aria-hidden="true" /> Usar lo marcado ({marcados.size})
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-soft">No hay datos para proponer. Puedes llenar el producto a mano.</p>
          )}

          {r.fuentes.length > 0 && (
            <p className="mt-3 text-xs text-muted">
              Páginas consultadas:{' '}
              {r.fuentes.filter((f) => /^https?:\/\//i.test(f.url)).map((f, i) => (
                <span key={f.url}>
                  {i > 0 && ' · '}
                  <a href={f.url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-brand-600 underline hover:text-brand-700">{f.dominio}</a>
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
