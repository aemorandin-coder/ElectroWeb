'use client';

// C-249b: crear o cambiar una categoría en su propia página, por pasos (PLAN.md §1.9, la A que eligió el equipo el 15/11):
// qué es (el nombre, dónde va, si es un departamento aparte y la descripción), cómo se ve (el ícono del pack o uno propio,
// y el color del panel) y "Revisar y publicar", con la casilla y el chip de la tienda al lado. Al cambiar una, antes →
// después y cuántos productos y subcategorías van con ella. Conserva la edición entre dos personas (C-170): la versión con
// que se abrió, la combinación de cambios y quién más la tiene abierta. La API (/api/categories) no cambia.

import { createElement, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Asistente, { Afecta, Campo, FilaResumen, ListaCambios, VistaPrevia, type CambioCampo, type PasoAsistente } from '@/components/admin/Asistente';
import Ayuda from '@/components/admin/Ayuda';
import PresenciaEnEditor from '@/components/admin/edicion/PresenciaEnEditor';
import CategoryIconRenderer from '@/components/CategoryIconRenderer';
import {
  IconoCheck, IconoCuadricula, IconoEliminar, IconoEnlace, IconoGuardar, IconoImagen, IconoPaquete, IconoSubir, IconoVer, type IconType,
} from '@/components/iconos';
import { adminInput, adminSpinner } from '@/lib/admin-ui';
import { COLOR_OPTIONS, ICON_OPTIONS, getAutoIcon, getCategoryColor, getCategoryIcon, getCategoryIconOption } from '@/lib/category-icons';
import { enviarConVersion } from '@/lib/edicion/guardado';
import { useConflictoDeFormulario } from '@/lib/edicion/useConflictoDeFormulario';

export interface CategoriaPanel {
  id: string; name: string; slug: string; description: string | null; image: string | null; icon: string | null; color: string | null;
  parentId: string | null; isDepartment: boolean; updatedAt: string; productos: number; subcategorias: number;
}
export interface CategoriaRef { id: string; name: string; parentId: string | null }

interface Formulario { name: string; description: string; image: string; parentId: string | null; icon: string; color: string; isDepartment: boolean }

const PASOS: { titulo: string; queHacer: string; icono: IconType }[] = [
  { titulo: 'Qué es', queHacer: 'El nombre, dónde va y qué lleva.', icono: IconoCuadricula },
  { titulo: 'Cómo se ve', queHacer: 'El ícono y el color.', icono: IconoImagen },
  { titulo: 'Revisar y publicar', queHacer: 'Mira cómo queda antes de guardarla.', icono: IconoVer },
];
const ETIQUETAS: Record<keyof Formulario, string> = {
  name: 'Nombre', description: 'Descripción', image: 'Imagen', parentId: 'Categoría principal', icon: 'Ícono', color: 'Color', isDepartment: 'Departamento aparte',
};

const formularioDe = (c: CategoriaPanel | null, padre: string | null): Formulario => ({
  name: c?.name ?? '', description: c?.description ?? '', image: c?.image ?? '', parentId: c ? c.parentId : padre,
  icon: c?.icon ?? '', color: c?.color ?? '', isDepartment: Boolean(c?.isDepartment),
});

export default function AsistenteCategoria({ categoria, categorias, padre = null }: { categoria: CategoriaPanel | null; categorias: CategoriaRef[]; padre?: string | null }) {
  const router = useRouter();
  const [inicial] = useState(() => formularioDe(categoria, padre));
  const [form, setForm] = useState<Formulario>(inicial);
  // C-170: lo que había al abrir (para combinar si otra persona guardó antes) y la versión con que se abrió
  const [formBase, setFormBase] = useState<Formulario>(inicial);
  const [version, setVersion] = useState(categoria?.updatedAt);
  const [paso, setPaso] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);
  const nombreDe = (id: string | null) => (id ? categorias.find((c) => c.id === id)?.name ?? 'Otra categoría' : 'Ninguna (categoría principal)');
  const { resolver: resolverConflicto, dialogo: dialogoConflicto } = useConflictoDeFormulario(ETIQUETAS, (campo, valor) =>
    campo === 'parentId' ? nombreDe(valor as string | null) : typeof valor === 'boolean' ? (valor ? 'Sí' : 'No') : String(valor || '(vacío)'));

  const set = <K extends keyof Formulario>(k: K, v: Formulario[K]) => setForm((f) => ({ ...f, [k]: v }));

  // No puede ir dentro de sí misma ni de una de sus subcategorías (el servidor también lo revisa)
  const descendientes = new Set<string>();
  if (categoria) {
    const pendientes = [categoria.id];
    while (pendientes.length) {
      const id = pendientes.pop() as string;
      for (const c of categorias) if (c.parentId === id && !descendientes.has(c.id)) { descendientes.add(c.id); pendientes.push(c.id); }
    }
  }
  const opcionesPadre = categorias.filter((c) => c.id !== categoria?.id && !descendientes.has(c.id));

  const cuerpoDe = (f: Formulario) => ({
    ...f,
    parentId: f.parentId || null,
    icon: f.icon || null,
    color: f.color || null,
    // C-200: solo una categoría principal puede ser un departamento aparte
    isDepartment: !f.parentId && f.isDepartment,
  });

  const volver = () => { router.push('/admin/categories'); router.refresh(); };

  /** Crear, o editar con la versión con que se abrió (C-170): si otra persona guardó antes, se combina y solo se pregunta por lo que las dos tocaron */
  const guardar = async (formulario: Formulario = form, base: string | undefined = version) => {
    if (!formulario.name.trim()) return;
    setGuardando(true);
    try {
      if (!categoria) {
        const response = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpoDe(formulario)) });
        const data = await response.json().catch(() => ({}));
        if (response.ok) { toast.success('Categoría guardada'); volver(); }
        else toast.error(data.error || 'No se pudo guardar la categoría');
        return;
      }
      const r = await enviarConVersion<{ updatedAt: string }>('/api/categories', 'PATCH', { id: categoria.id, ...cuerpoDe(formulario) }, base);
      if (r.ok) { toast.success('Categoría guardada'); volver(); return; }
      if (r.conflicto?.tipo === 'cambiado') {
        const actual = r.conflicto.actual as { name: string; description?: string | null; image?: string | null; parentId?: string | null; icon?: string | null; color?: string | null; isDepartment?: boolean; updatedAt: string };
        const suyo: Formulario = { name: actual.name, description: actual.description || '', image: actual.image || '', parentId: actual.parentId || null, icon: actual.icon || '', color: actual.color || '', isDepartment: Boolean(actual.isDepartment) };
        resolverConflicto({
          base: formBase, mio: formulario, suyo, quien: r.conflicto.por?.nombre ?? 'Otra persona',
          continuar: (final) => { setForm(final); setFormBase(suyo); setVersion(actual.updatedAt); return guardar(final, actual.updatedAt); },
        });
        return;
      }
      toast.error(r.error);
      if (r.conflicto?.tipo === 'no_existe') volver();
    } finally {
      setGuardando(false);
    }
  };

  const subirIcono = async (file: File) => {
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setForm((f) => ({ ...f, image: data.url, icon: '' }));
      } else toast.error('No se pudo subir el ícono');
    } catch {
      toast.error('No se pudo subir el ícono');
    } finally {
      setSubiendo(false);
      if (archivo.current) archivo.current.value = '';
    }
  };

  const iconoElegido = getCategoryIconOption(form.icon);
  const iconoFinal = form.icon || (form.name ? getAutoIcon(form.name) : '');
  const color = getCategoryColor(form.color || null, 0);
  const dep = !form.parentId && form.isDepartment;

  const ver = (k: keyof Formulario, f: Formulario): string => {
    if (k === 'parentId') return nombreDe(f.parentId);
    if (k === 'isDepartment') return !f.parentId && f.isDepartment ? 'Sí' : 'No';
    if (k === 'icon') return getCategoryIconOption(f.icon)?.label ?? (f.icon ? 'Otros' : 'Automático por el nombre');
    if (k === 'image') return f.image ? 'Ícono propio' : 'Sin ícono propio';
    if (k === 'color') return COLOR_OPTIONS.find((c) => c.name === f.color)?.label ?? (f.color ? f.color : 'Automático');
    return f[k].trim() || '(vacío)';
  };
  const cambios: CambioCampo[] = categoria
    ? (Object.keys(ETIQUETAS) as (keyof Formulario)[])
      .filter((k) => (k === 'isDepartment' ? (!inicial.parentId && inicial.isDepartment) !== dep : String(inicial[k] ?? '').trim() !== String(form[k] ?? '').trim()))
      .map((k) => ({ campo: k, nombre: ETIQUETAS[k], antes: k === 'image' && inicial.image && form.image ? 'el de antes' : ver(k, inicial), despues: k === 'image' && inicial.image && form.image ? 'otro' : ver(k, form) }))
    : [];

  const afecta = (): { icono: IconType; texto: ReactNode }[] => {
    if (!categoria) return [];
    const filas: { icono: IconType; texto: ReactNode }[] = [];
    const lleva = `${categoria.productos} ${categoria.productos === 1 ? 'producto' : 'productos'}${categoria.subcategorias ? ` y ${categoria.subcategorias} ${categoria.subcategorias === 1 ? 'subcategoría' : 'subcategorías'}` : ''}`;
    if (cambios.some((c) => c.campo === 'parentId')) filas.push({ icono: IconoPaquete, texto: <>Pasa de <strong>{nombreDe(inicial.parentId)}</strong> a <strong>{nombreDe(form.parentId)}</strong>: sus {lleva} van con ella.</> });
    else filas.push({ icono: IconoPaquete, texto: <>Lleva <strong>{lleva}</strong>; en la tienda se ve el cambio apenas guardes.</> });
    if (cambios.some((c) => c.campo === 'name')) filas.push({ icono: IconoEnlace, texto: <>La dirección no cambia: sigue siendo /categorias/{categoria.slug}.</> });
    if (cambios.some((c) => c.campo === 'isDepartment')) filas.push({ icono: IconoCuadricula, texto: dep ? 'Pasa a ser un departamento aparte: su vitrina, su acceso en la franja y su página.' : 'Deja de ser un departamento aparte: sus productos vuelven al inicio de tecnología.' });
    return filas;
  };

  const pasos: PasoAsistente[] = PASOS.map((p, i) => ({
    ...p,
    problema: i === 0 ? (form.name.trim().length < 2 ? 'Falta el nombre (2 letras o más).' : null) : i === 1 ? (subiendo ? 'Espera a que termine de subir el ícono.' : null) : null,
    resumen: i === 0 ? (form.name.trim() ? `${form.name.trim()}${form.parentId ? ` · en ${nombreDe(form.parentId)}` : ''}` : 'El nombre y dónde va')
      : i === 1 ? (form.image ? 'Ícono propio' : iconoElegido?.label ?? 'Ícono automático')
        : categoria ? `${cambios.length} ${cambios.length === 1 ? 'cambio' : 'cambios'}` : 'Vista previa',
  }));

  const sinCambios = Boolean(categoria) && cambios.length === 0;
  const nombre = form.name.trim() || 'Nombre de la categoría';

  return (
    <>
      <Asistente
        titulo={categoria ? `Cambiar: ${categoria.name}` : padre ? `Nueva subcategoría de ${nombreDe(padre)}` : 'Nueva categoría'}
        subtitulo={categoria ? `${categoria.parentId ? 'Subcategoría' : 'Categoría principal'} · ${categoria.productos} ${categoria.productos === 1 ? 'producto' : 'productos'}` : 'Paso a paso, con lo que verá el cliente.'}
        icono={IconoCuadricula}
        volver={{ href: '/admin/categories', texto: 'Categorías' }}
        etiqueta="Pasos de la categoría"
        pasos={pasos}
        paso={paso}
        onPaso={setPaso}
        editar={Boolean(categoria)}
        arriba={categoria ? <PresenciaEnEditor recurso={`category:${categoria.id}`} etiqueta={categoria.name} nombreRecurso="categoría" femenino /> : undefined}
        final={{
          contenido: guardando ? 'Guardando…' : categoria ? <><IconoGuardar className="h-4 w-4" aria-hidden="true" /> Guardar el cambio</> : <><IconoCheck className="h-4 w-4" aria-hidden="true" /> Crear la categoría</>,
          onClick: () => void guardar(),
          deshabilitado: guardando || sinCambios,
          motivo: sinCambios ? 'No hay cambios que guardar.' : null,
        }}
        vistaPrevia={
          <>
            <VistaPrevia rotulo="En la tienda, sin foto" nota="En el inicio, la casilla lleva la foto de un producto; sin productos con foto, su ícono.">
              <div className="flex overflow-hidden rounded-xl border border-line bg-white">
                <span className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
                  <span className="line-clamp-2 text-base font-semibold text-ink">{nombre}</span>
                  {categoria && categoria.productos >= 10 && <span className="mt-0.5 text-sm text-muted">{categoria.productos} productos</span>}
                </span>
                <span className="relative h-24 w-24 shrink-0 bg-white">
                  {form.image ? <Image src={form.image} alt="" fill sizes="96px" className="object-contain p-4" unoptimized={!form.image.startsWith('/')} />
                    : <span className="iconos-marca flex h-full items-center justify-center text-brand-700"><CategoryIconRenderer iconName={iconoFinal} className="h-8 w-8" /></span>}
                </span>
              </div>
            </VistaPrevia>
            <VistaPrevia rotulo="En el teléfono, arriba del inicio">
              <div className="flex flex-wrap gap-2 rounded-xl bg-brand-100 p-3">
                <span className={`flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border bg-white px-4 text-sm ${dep ? 'border-brand-200 font-semibold text-brand-600' : 'border-line font-medium text-ink-soft'}`}>
                  {dep && <CategoryIconRenderer iconName={iconoFinal} className="h-4 w-4" />}
                  {nombre}
                </span>
                <span className="flex h-9 items-center whitespace-nowrap rounded-full border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-600">Todas</span>
              </div>
            </VistaPrevia>
            <VistaPrevia rotulo="En el panel" nota="El color solo se ve aquí, en el árbol de categorías.">
              <div className="flex items-center gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}>
                  {form.image ? <Image src={form.image} alt="" width={36} height={36} className="h-9 w-9 object-contain" unoptimized={!form.image.startsWith('/')} />
                    : createElement(getCategoryIcon(iconoFinal), { className: 'h-7 w-7 text-white' })}
                </span>
                <span className="min-w-0 truncate font-semibold text-ink">{nombre}</span>
              </div>
            </VistaPrevia>
          </>
        }
      >
        {paso === 0 && (
          <div className="space-y-5">
            <Campo etiqueta="Nombre" id="categoria-nombre">
              <input id="categoria-nombre" value={form.name} maxLength={60} onChange={(e) => set('name', e.target.value)} placeholder="Ej. Smartphones" className={`${adminInput()} sm:max-w-sm`} />
            </Campo>
            <Campo etiqueta="Dentro de" id="categoria-padre" pista="Si eliges una, esta será una subcategoría.">
              <select id="categoria-padre" value={form.parentId || ''} onChange={(e) => set('parentId', e.target.value || null)} className={`${adminInput()} sm:max-w-sm`}>
                <option value="">Ninguna (categoría principal)</option>
                {opcionesPadre.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Campo>
            <div className="flex items-start gap-1">
              <label className={`flex min-h-11 items-center gap-2 text-sm ${form.parentId ? 'text-muted' : 'text-ink'}`}>
                <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={dep} disabled={Boolean(form.parentId)} onChange={(e) => set('isDepartment', e.target.checked)} />
                <span><span className="font-semibold">Departamento aparte</span>, como Ferretería{form.parentId ? ' (solo para una categoría principal)' : ''}</span>
              </label>
              <span className="pt-2.5">
                <Ayuda>Sus productos y los de sus subcategorías no se mezclan con el inicio de tecnología: tienen su vitrina, su acceso en la franja y su página, con la descripción como aviso arriba.</Ayuda>
              </span>
            </div>
            <Campo etiqueta="Descripción" id="categoria-descripcion" pista={dep ? 'En un departamento, sale como aviso arriba de su página.' : undefined}>
              <textarea id="categoria-descripcion" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Describe brevemente esta categoría..." className={`${adminInput()} h-auto py-2`} />
            </Campo>
          </div>
        )}

        {paso === 1 && (
          <div className="space-y-6">
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-ink">Ícono</legend>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10">
                {ICON_OPTIONS.map(({ name, label, Icon }) => (
                  <button key={name} type="button" title={label} aria-label={label} aria-pressed={iconoElegido?.name === name}
                    onClick={() => setForm((f) => ({ ...f, icon: getCategoryIconOption(f.icon)?.name === name ? '' : name }))}
                    className={`flex h-11 items-center justify-center rounded-xl border-2 transition-colors ${iconoElegido?.name === name ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-line text-ink-soft hover:border-brand-200'}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted">
                {form.icon ? <>Elegido: <span className="font-semibold text-ink">{iconoElegido?.label ?? 'uno que ya no está en la lista (se ve como "Otros")'}</span> · <button type="button" className="font-semibold text-brand-500 hover:underline" onClick={() => set('icon', '')}>Quitar</button></>
                  : !form.image && form.name ? 'Sin elegir, se asigna por el nombre.' : null}
              </p>
            </fieldset>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-ink">O un ícono propio <span className="font-normal text-muted">(opcional)</span></p>
              <input ref={archivo} type="file" accept="image/png,image/svg+xml,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = e.target.files?.[0]; if (f) void subirIcono(f); }} />
              <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-brand-300 bg-brand-50 p-3 sm:max-w-lg">
                <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white">
                  {subiendo ? <span className={`${adminSpinner} h-6 w-6 border-2`} aria-label="Subiendo" />
                    : form.image ? <Image src={form.image} alt="" fill sizes="56px" className="object-contain p-1" unoptimized={!form.image.startsWith('/')} />
                      : <IconoImagen className="h-6 w-6 text-subtle" aria-hidden="true" />}
                </span>
                <div className="flex flex-col gap-1">
                  <button type="button" onClick={() => archivo.current?.click()} disabled={subiendo} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-500 hover:underline">
                    <IconoSubir className="h-4 w-4" aria-hidden="true" /> {form.image ? 'Subir otro' : 'Subir ícono personalizado'}
                  </button>
                  {form.image && (
                    <button type="button" onClick={() => set('image', '')} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-deal hover:underline">
                      <IconoEliminar className="h-4 w-4" aria-hidden="true" /> Quitar
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-1 text-xs text-muted">PNG · SVG · WebP · fondo transparente recomendado · máx. 2 MB</p>
            </div>
            <fieldset>
              <legend className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-ink">Color <Ayuda>Solo se ve en el panel, en el árbol de categorías. Sin elegir, se asigna solo.</Ayuda></legend>
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_OPTIONS.map(({ name, label, swatch }) => (
                  <button key={name} type="button" title={label} aria-label={label} aria-pressed={form.color === name}
                    onClick={() => set('color', form.color === name ? '' : name)}
                    className={`h-11 w-11 rounded-full border-4 transition-shadow ${form.color === name ? 'border-ink shadow-lg' : 'border-white shadow hover:shadow-md'}`}
                    style={{ backgroundColor: swatch }} />
                ))}
                <label title="Color personalizado" className={`relative flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 ${form.color.startsWith('#') ? 'border-ink shadow-lg' : 'border-white bg-surface shadow hover:shadow-md'}`}
                  style={form.color.startsWith('#') ? { backgroundColor: form.color } : {}}>
                  <span className="sr-only">Color personalizado</span>
                  <input type="color" className="absolute inset-0 cursor-pointer opacity-0"
                    value={form.color.startsWith('#') ? form.color : (COLOR_OPTIONS.find((c) => c.name === form.color)?.swatch || '#3b82f6')}
                    onChange={(e) => set('color', e.target.value)} />
                </label>
              </div>
              {form.color.startsWith('#') && (
                <p className="mt-1 text-xs text-muted">Color personalizado: <span className="font-mono">{form.color}</span> · <button type="button" className="font-semibold text-brand-500 hover:underline" onClick={() => set('color', '')}>Quitar</button></p>
              )}
            </fieldset>
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-4">
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
              <FilaResumen icono={IconoCuadricula} titulo={form.name.trim()} detalle={[form.parentId ? `Dentro de ${nombreDe(form.parentId)}` : 'Categoría principal', dep ? 'departamento aparte' : null, form.description.trim() ? 'con descripción' : 'sin descripción'].filter(Boolean).join(' · ')} onCambiar={() => setPaso(0)} />
              <FilaResumen icono={IconoImagen} titulo={form.image ? 'Ícono propio' : `Ícono: ${iconoElegido?.label ?? 'automático por el nombre'}`} detalle={`Color: ${ver('color', form)}`} onCambiar={() => setPaso(1)} />
            </ul>
            {categoria && (
              <ListaCambios cambios={cambios}>
                {cambios.length > 0 && <Afecta cargando={false} filas={afecta()} />}
              </ListaCambios>
            )}
          </div>
        )}
      </Asistente>
      {dialogoConflicto}
    </>
  );
}
