'use client';

// C-196: la lista del proveedor. Se sube su Excel (.xls, .xlsx o .csv; también dos a la vez, el de precios y el de
// existencia) y se elige qué hacer: crear en borrador lo nuevo, con costo, precio sugerido y existencia, y actualizar el
// costo y la existencia de lo que ya está. El archivo se lee aquí (lib/proveedores/hoja.ts) y el servidor calcula y
// guarda (POST /api/admin/proveedores/[id]/lista). Las fotos llamadas con el código se suben aparte, cuando estén.
// C-202: cada fila nueva trae su "Nombre en la tienda", propuesto con la regla de la tienda (lib/nombres/producto.ts) y
// editable antes de crear. Lo dudoso (un nombre cortado, una abreviatura que no se entiende) se marca para revisar.
// C-204 (la carga masiva completa, lo que eligió Andrés el 12/11):
// - las fotos van con el Excel: se sueltan juntos (o se elige la carpeta) y cada producto se crea con las suyas;
// - lo que ZOOM y MRW no llevan (pinturas, solventes, aerosoles…) se marca y no se crea;
// - "Sugeridos" ordena lo que conviene subir: afín a la tienda, con existencia y que aguante el envío;
// - la columna "Modelo" entra como la especificación del mismo nombre;
// - el paso 5 termina los borradores (lista de control, búsqueda en la web en lote) y publica los listos.
// C-205 (Andrés, 13/11: "¿qué hago?, ¿a dónde voy?", y los campos de una palabra a 380 px): un paso a la vez, con los
// pasos arriba (la maqueta A que eligió), cada campo del ancho de su dato y los filtros con ícono y subtítulo
// (PLAN.md §1.5 a §1.7). Ninguna acción se quitó: solo cambiaron de lugar.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import CampoUnidad from '@/components/admin/CampoUnidad';
import Filtros, { type Filtro } from '@/components/admin/Filtros';
import Pasos, { type Paso } from '@/components/admin/Pasos';
import {
  IconoAdvertencia, IconoArchivo, IconoBloqueado, IconoBuscar, IconoCargando, IconoChevronDerecha, IconoConfirmado, IconoCuadricula,
  IconoDeshacer, IconoEditar, IconoEstrella, IconoFlechaDerecha, IconoFlechaIzquierda, IconoImagen, IconoInfo, IconoMas, IconoNovedad,
  IconoPaquete, IconoSubir, IconoTienda,
} from '@/components/iconos';
import {
  adminChoice, adminHint, adminInput, adminLabel, adminNotice, adminPageSubtitle, adminPageTitle, adminPrimaryButton,
  adminSecondaryButton,
} from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { precioSugerido } from '@/lib/precio-sugerido';
import { leerHoja, type Celda } from '@/lib/proveedores/hoja';
import {
  ETIQUETA_CAMPO, LOTE_ACTUALIZAR, LOTE_CREAR, LOTE_REVISAR, codigoDeFoto, costoDesdeLista, detectarColumnas, existenciaPublicable,
  leerFilas, unirListas, type CampoLista, type Columnas, type FilaProveedor,
} from '@/lib/proveedores/lista';
import { proponedorDeNombres, type PropuestaNombre } from '@/lib/nombres/producto';
import { esLaDeSiempre, palabrasDe, terminoQueNoSeEnvia, terminosEfectivos } from '@/lib/proveedores/no-se-envia';
import { compararSugeridos, sugerencia, type Sugerencia } from '@/lib/proveedores/sugeridos';
import Borradores from './_componentes/Borradores';
import Miniatura from './_componentes/Miniatura';
import NoSeEnvia from './_componentes/NoSeEnvia';
import DespachaDesde from './_componentes/DespachaDesde';
import {
  agruparFotos, archivosDeLaCaida, archivosDelInput, FOTOS_MAX, subirFotosAProducto, type ArchivosLlegados, type FotoSuelta,
} from './_componentes/fotos';

interface Proveedor {
  id: string; name: string; discountPercent: number; pricesIncludeTax: boolean; noShipTerms: string[];
  /** C-199: despacha él mismo desde esta ciudad de ZOOM (null = la tienda) */
  dispatchCityCode: string | null; dispatchCityName: string | null;
  productos: number;
}
interface EnTienda { id: string; name: string; sku: string; status: string; stock: number; priceUSD: number; costo: number | null; enPapelera: boolean; fotos: number }
interface Archivo { nombre: string; filas: Celda[][]; encabezados: string[]; columnas: Columnas }
type Vista = 'nuevos-con-existencia' | 'sugeridos' | 'nuevos' | 'revisar' | 'en-tienda' | 'todos';

const CAMPOS: CampoLista[] = ['codigo', 'nombre', 'precio', 'existencia', 'departamento', 'unidad', 'categoria', 'marca', 'modelo', 'peso', 'largo', 'ancho', 'alto'];
const POR_PAGINA = 100;
const miles = (n: number) => n.toLocaleString('es-VE');
const leerPct = (v: string) => { const n = Number(v.replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const partir = <T,>(lista: T[], n: number): T[][] => Array.from({ length: Math.ceil(lista.length / n) }, (_, i) => lista.slice(i * n, (i + 1) * n));

async function post<T>(proveedorId: string, cuerpo: Record<string, unknown>): Promise<T> {
  const r = await fetch(`/api/admin/proveedores/${proveedorId}/lista`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'No se pudo procesar la lista');
  return d as T;
}

/** Lo que viaja de cada fila: el servidor recalcula todo. El nombre es el de la tienda; el de su lista va aparte (C-202) */
const filaParaEnviar = (f: FilaProveedor, nombreTienda?: string) => ({
  codigo: f.codigo, nombre: nombreTienda ?? f.nombre, nombreProveedor: f.nombre, precioLista: f.precioLista, existencia: f.existencia,
  categoria: f.categoria, marca: f.marca, modelo: f.modelo, pesoKg: f.pesoKg, medidas: f.medidas,
});

export default function ListaDelProveedorPage() {
  const [proveedores, setProveedores] = useState<Proveedor[] | null>(null);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [proveedorId, setProveedorId] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  // C-205: el paso en que está (0 a 4)
  const [paso, setPaso] = useState(0);
  const [creandoProveedor, setCreandoProveedor] = useState(false);
  const [categorias, setCategorias] = useState<Array<{ id: string; name: string }>>([]);
  const [iva, setIva] = useState(0);

  const [descuento, setDescuento] = useState('0');
  // C-196b: su lista trae el IVA: el costo es su precio sin el IVA
  const [ivaIncluido, setIvaIncluido] = useState(false);
  const [margen, setMargen] = useState('30');
  const [reserva, setReserva] = useState('1');
  const [categoriaDefecto, setCategoriaDefecto] = useState('');

  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [leyendo, setLeyendo] = useState(false);
  const inputArchivos = useRef<HTMLInputElement>(null);

  // Lo revisado en el servidor y para qué proveedor y archivos: si cambian, vale como no revisado
  const [revisado, setRevisado] = useState<{ para: object; enTienda: Record<string, EnTienda>; agotados: { cantidad: number; nombres: string[] } | null } | null>(null);
  const [vista, setVista] = useState<Vista>('nuevos-con-existencia');
  const [dpto, setDpto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());

  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [creados, setCreados] = useState<Array<{ codigo: string; id: string; sku: string }>>([]);
  const [errores, setErrores] = useState<Array<{ codigo: string; error: string }>>([]);
  const [actualizarQue, setActualizarQue] = useState({ costo: true, existencia: true, precio: false });
  // C-202: las marcas de la tienda (para escribirlas igual) y los nombres que el equipo corrigió, por código
  const [marcasTienda, setMarcasTienda] = useState<string[]>([]);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  // C-204: lo que no se envía (la lista del proveedor, como se está editando), las fotos que vinieron con el Excel y las
  // carpetas que se dejan fuera
  const [noSeEnvia, setNoSeEnvia] = useState<string[]>(() => [...terminosEfectivos(null)]);
  const [guardandoLista, setGuardandoLista] = useState(false);
  // C-204b: cambia cuando "Sí se envía" agrega una excepción, para que el editor de la lista la muestre
  const [versionLista, setVersionLista] = useState(0);
  const [fotos, setFotos] = useState<FotoSuelta[]>([]);
  const [carpetasFuera, setCarpetasFuera] = useState<Set<string>>(new Set());
  const [conFotos, setConFotos] = useState(true);
  const [fallosFotos, setFallosFotos] = useState<string[]>([]);
  const [versionBorradores, setVersionBorradores] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const inputCarpeta = useRef<HTMLInputElement>(null);
  // "Elegir una carpeta": el atributo no está en los tipos de React
  useEffect(() => { inputCarpeta.current?.setAttribute('webkitdirectory', ''); }, []);

  useEffect(() => {
    let vigente = true;
    Promise.all([
      fetch('/api/admin/proveedores').then(async (r) => (r.ok ? r.json() : r.status === 403 || r.status === 401 ? 'sin-permiso' : null)).catch(() => null),
      fetch('/api/categories').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/settings').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/admin/products/marcas').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([provs, cats, ajustes, marcas]) => {
      if (!vigente) return;
      if (provs === 'sin-permiso') { setSinPermiso(true); return; }
      setProveedores(Array.isArray(provs?.proveedores) ? provs.proveedores : []);
      setCategorias(Array.isArray(cats) ? cats.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) : []);
      setIva(ajustes?.taxEnabled ? Number(ajustes.taxPercent) || 0 : 0);
      if (Array.isArray(marcas?.marcas)) setMarcasTienda(marcas.marcas.filter((m: unknown): m is string => typeof m === 'string'));
    });
    return () => { vigente = false; };
  }, []);

  /** Al elegir el proveedor, su descuento de siempre */
  const elegirProveedor = (id: string, lista = proveedores) => {
    setProveedorId(id);
    const p = lista?.find((x) => x.id === id);
    if (p) { setDescuento(String(p.discountPercent).replace('.', ',')); setIvaIncluido(p.pricesIncludeTax); setNoSeEnvia([...terminosEfectivos(p.noShipTerms)]); }
    setSeleccion(new Set()); setCreados([]); setErrores([]); setFallosFotos([]);
  };

  // Al juntar, manda el archivo más completo (el que trae categoría, marca, peso o medidas): su nombre gana al
  // abreviado de la lista del proveedor, se suba en el orden que se suba
  const filas = useMemo(() => {
    const riqueza = (a: Archivo) => (['categoria', 'marca', 'peso', 'largo'] as const).filter((c) => a.columnas[c] !== undefined).length;
    const ordenados = [...archivos].sort((x, y) => riqueza(y) - riqueza(x));
    return unirListas(...ordenados.map((a) => leerFilas(a.filas, a.columnas)));
  }, [archivos]);
  // Cambia (y obliga a revisar de nuevo) cuando cambian el proveedor o los archivos
  const claveRevision = useMemo(() => ({ proveedorId, filas }), [proveedorId, filas]);
  const revision = revisado?.para === claveRevision ? revisado.enTienda : null;
  const agotados = revisado?.para === claveRevision ? revisado.agotados : null;
  const revisando = Boolean(proveedorId && filas.length > 0 && revisado?.para !== claveRevision);
  const traeExistencia = archivos.some((a) => a.columnas.existencia !== undefined);
  const departamentos = useMemo(() => [...new Set(filas.map((f) => f.departamento).filter((d): d is string => Boolean(d)))].sort((a, b) => a.localeCompare(b, 'es')), [filas]);
  // C-202: el nombre que propone la tienda para cada fila, con lo que hay que revisar
  const propuestas = useMemo(() => {
    const proponer = proponedorDeNombres(marcasTienda);
    return new Map<string, PropuestaNombre>(filas.map((f) => [f.codigo, proponer(f.nombre)]));
  }, [filas, marcasTienda]);
  const paraRevisar = useCallback(
    (codigo: string) => (propuestas.get(codigo)?.avisos.some((a) => a.tipo === 'cortado' || a.tipo === 'revisar') ?? false) && nombres[codigo] === undefined,
    [propuestas, nombres],
  );
  /** El nombre con que se crea: el que escribió el equipo o, si no tocó nada, el propuesto */
  const nombreTienda = useCallback(
    (f: FilaProveedor) => nombres[f.codigo]?.trim() || propuestas.get(f.codigo)?.nombre || f.nombre,
    [propuestas, nombres],
  );

  // Qué códigos ya están en la tienda (de este proveedor), por partes
  useEffect(() => {
    if (!proveedorId || filas.length === 0) return;
    let vigente = true;
    (async () => {
      const enTienda: Record<string, EnTienda> = {};
      for (const parte of partir(filas.map((f) => f.codigo), LOTE_REVISAR)) {
        const d = await post<{ enTienda: Record<string, EnTienda> }>(proveedorId, { accion: 'revisar', codigos: parte });
        Object.assign(enTienda, d.enTienda);
        if (!vigente) return;
      }
      const ag = traeExistencia
        ? await post<{ cantidad: number; nombres: string[] }>(proveedorId, { accion: 'agotados', codigos: filas.filter((f) => f.existencia !== null).map((f) => f.codigo), aplicar: false })
        : null;
      if (vigente) setRevisado({ para: claveRevision, enTienda, agotados: ag });
    })().catch((e: Error) => { if (vigente) { toast.error(e.message); setRevisado({ para: claveRevision, enTienda: {}, agotados: null }); } });
    return () => { vigente = false; };
  }, [claveRevision, proveedorId, filas, traeExistencia]);

  const pctDescuento = leerPct(descuento), pctMargen = leerPct(margen), unidadesReserva = Number.parseInt(reserva, 10);
  const opcionesValidas = pctDescuento >= 0 && pctDescuento <= 90 && pctMargen >= 0 && pctMargen <= 300 && Number.isInteger(unidadesReserva) && unidadesReserva >= 0 && unidadesReserva <= 20;
  /** El IVA que se le quita al precio de su lista para el costo (el mismo cálculo del servidor) */
  const ivaLista = ivaIncluido ? (iva > 0 ? iva : 16) : 0;

  const proveedor = proveedores?.find((p) => p.id === proveedorId) ?? null;
  const listaGuardada = useMemo(() => [...terminosEfectivos(proveedor?.noShipTerms)], [proveedor]);
  // C-204: por qué palabra no se envía cada fila (con su nombre de la lista o el de la tienda); null = se envía
  const noSeEnviaPor = useMemo(
    () => new Map(filas.map((f) => [f.codigo, terminoQueNoSeEnvia([f.nombre, nombreTienda(f)], noSeEnvia, f.codigo)])),
    [filas, nombreTienda, noSeEnvia],
  );
  // C-204: si es afín a la tienda y si aguanta solo su envío (con el precio de venta que tendría)
  const sugerencias = useMemo(() => new Map<string, Sugerencia>(filas.map((f) => {
    const costo = costoDesdeLista(f.precioLista, pctDescuento, ivaLista);
    const venta = costo !== null && pctMargen >= 0 ? precioSugerido(costo, iva, pctMargen) : null;
    return [f.codigo, sugerencia([f.nombre, nombreTienda(f)], venta)];
  })), [filas, nombreTienda, pctDescuento, ivaLista, pctMargen, iva]);
  // C-204: las fotos que vinieron con el Excel, por carpeta y por código
  const carpetas = useMemo(() => {
    const c = new Map<string, number>();
    for (const f of fotos) c.set(f.carpeta, (c.get(f.carpeta) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'));
  }, [fotos]);
  const fotosAgrupadas = useMemo(
    () => agruparFotos(fotos.filter((f) => !carpetasFuera.has(f.carpeta)), filas.map((f) => f.codigo)),
    [fotos, carpetasFuera, filas],
  );
  const esSugerido = useCallback((f: FilaProveedor) => (
    !revision?.[f.codigo] && (f.existencia ?? 0) > 0 && (f.precioLista ?? 0) > 0 && !noSeEnviaPor.get(f.codigo) && Boolean(sugerencias.get(f.codigo)?.familia)
  ), [revision, noSeEnviaPor, sugerencias]);

  const estadoDe = (f: FilaProveedor) => (revision?.[f.codigo] ? 'en-tienda' : 'nuevo');
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = filas.filter((f) => {
      const enTienda = Boolean(revision?.[f.codigo]);
      if (vista === 'nuevos-con-existencia' && (enTienda || !((f.existencia ?? 0) > 0) || !((f.precioLista ?? 0) > 0))) return false;
      if (vista === 'sugeridos' && !esSugerido(f)) return false;
      if (vista === 'nuevos' && enTienda) return false;
      if (vista === 'revisar' && (enTienda || !paraRevisar(f.codigo))) return false;
      if (vista === 'en-tienda' && !enTienda) return false;
      if (dpto && f.departamento !== dpto) return false;
      return !q || f.codigo.toLowerCase().includes(q) || f.nombre.toLowerCase().includes(q) || nombreTienda(f).toLowerCase().includes(q);
    });
    if (vista !== 'sugeridos') return lista;
    const datos = (f: FilaProveedor) => ({ sugerencia: sugerencias.get(f.codigo)!, existencia: f.existencia, precio: f.precioLista });
    return lista.sort((a, b) => compararSugeridos(datos(a), datos(b)));
  }, [filas, revision, vista, dpto, busqueda, paraRevisar, nombreTienda, esSugerido, sugerencias]);
  const paginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
  const enPagina = visibles.slice((Math.min(pagina, paginas) - 1) * POR_PAGINA, Math.min(pagina, paginas) * POR_PAGINA);
  const nuevosSeleccionados = filas.filter((f) => seleccion.has(f.codigo) && !revision?.[f.codigo] && !noSeEnviaPor.get(f.codigo));
  const enTiendaTodos = filas.filter((f) => revision?.[f.codigo] && !revision[f.codigo].enPapelera);
  const conteo = useMemo(() => ({
    total: filas.length,
    conExistencia: filas.filter((f) => (f.existencia ?? 0) > 0).length,
    nuevos: filas.filter((f) => !revision?.[f.codigo]).length,
    nuevosConExistencia: filas.filter((f) => !revision?.[f.codigo] && (f.existencia ?? 0) > 0 && (f.precioLista ?? 0) > 0).length,
    enTienda: filas.filter((f) => revision?.[f.codigo]).length,
    revisar: filas.filter((f) => !revision?.[f.codigo] && paraRevisar(f.codigo)).length,
    noSeEnvian: filas.filter((f) => !revision?.[f.codigo] && noSeEnviaPor.get(f.codigo)).length,
    sugeridos: filas.filter(esSugerido).length,
  }), [filas, revision, paraRevisar, noSeEnviaPor, esSugerido]);

  const cambiarVista = (f: () => void) => { f(); setPagina(1); };

  /** C-204: las hojas se leen; las fotos se juntan para la vista previa y para subirlas al crear */
  const agregarArchivos = async ({ hojas, fotos: nuevasFotos, hojasEnCarpeta }: ArchivosLlegados) => {
    // C-204b: una hoja que venía dentro de una carpeta no es su lista (los .csv de trabajo de las fotos, por ejemplo)
    if (hojasEnCarpeta.length > 0) {
      const n = hojasEnCarpeta.length;
      toast(`${n === 1 ? 'Una hoja que venía' : `${miles(n)} hojas que venían`} dentro de la carpeta no se ${n === 1 ? 'leyó' : 'leyeron'} (${hojasEnCarpeta.slice(0, 3).join(', ')}${n > 3 ? '…' : ''}): de una carpeta solo se toman las fotos. Su lista se elige o se suelta aparte.`, {
        icon: <IconoInfo className="h-5 w-5 text-ink-soft" aria-hidden="true" />, duration: 10000,
      });
    }
    if (hojas.length === 0 && nuevasFotos.length === 0) {
      if (hojasEnCarpeta.length === 0) toast.error('Ahí no hay hojas (.xls, .xlsx o .csv) ni fotos (.jpg, .png o .webp)');
      return;
    }
    setLeyendo(true);
    try {
      const nuevos: Archivo[] = [];
      for (const file of hojas) {
        if (file.size > 30 * 1024 * 1024) { toast.error(`"${file.name}" pasa de 30 MB`); continue; }
        try {
          const hoja = await leerHoja(await file.arrayBuffer());
          // El encabezado es la primera fila con al menos dos textos (algunos sistemas ponen un título arriba)
          const inicio = Math.max(0, hoja.findIndex((f) => f.filter((c) => typeof c === 'string' && c.trim()).length >= 2));
          const filasHoja = hoja.slice(inicio);
          const encabezados = (filasHoja[0] ?? []).map((c) => String(c ?? '').trim());
          const columnas = detectarColumnas(encabezados);
          if (columnas.codigo === undefined) toast(`"${file.name}": elige cuál columna es el código`, { icon: <IconoAdvertencia className="h-5 w-5 text-warning-strong" aria-hidden="true" /> });
          nuevos.push({ nombre: file.name, filas: filasHoja, encabezados, columnas });
        } catch (e) {
          toast.error(`"${file.name}": ${e instanceof Error ? e.message : 'no se pudo leer'}`);
        }
      }
      if (nuevos.length > 0) {
        setArchivos((a) => [...a, ...nuevos]);
        setSeleccion(new Set());
        setPagina(1);
      }
      if (nuevasFotos.length > 0) {
        setFotos((previas) => {
          const clave = (x: FotoSuelta) => `${x.carpeta}/${x.file.name}/${x.file.size}`;
          const vistas = new Set(previas.map(clave));
          return [...previas, ...nuevasFotos.filter((x) => !vistas.has(clave(x)))];
        });
      }
    } finally {
      setLeyendo(false);
      if (inputArchivos.current) inputArchivos.current.value = '';
      if (inputCarpeta.current) inputCarpeta.current.value = '';
    }
  };

  /** C-204b: "Sí se envía" en una fila que la regla marcó mal: una excepción con su código en la lista del proveedor */
  const permitir = (codigo: string) => {
    const excepcion = `+${palabrasDe(codigo)}`;
    setNoSeEnvia((l) => (l.includes(excepcion) ? l : [...l, excepcion]));
    setVersionLista((v) => v + 1);
  };

  const guardarLista = async () => {
    if (!proveedorId) return;
    setGuardandoLista(true);
    try {
      const r = await fetch(`/api/admin/proveedores/${proveedorId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ noShipTerms: noSeEnvia }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(d.error || 'No se pudo guardar la lista'); return; }
      setProveedores((l) => l?.map((p) => (p.id === proveedorId ? { ...p, noShipTerms: Array.isArray(d.noShipTerms) ? d.noShipTerms : [] } : p)) ?? l);
      toast.success('Lista guardada con el proveedor');
    } finally {
      setGuardandoLista(false);
    }
  };

  const cambiarColumna = (i: number, campo: CampoLista, valor: string) => setArchivos((lista) => lista.map((a, k) => {
    if (k !== i) return a;
    const columnas = { ...a.columnas };
    if (valor === '') delete columnas[campo]; else columnas[campo] = Number(valor);
    return { ...a, columnas };
  }));

  const agregarProveedor = async () => {
    const nombre = nuevoNombre.trim();
    if (nombre.length < 2) { toast.error('Escribe el nombre del proveedor'); return; }
    setCreandoProveedor(true);
    try {
      const r = await fetch('/api/admin/proveedores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nombre }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(d.error || 'No se pudo agregar'); return; }
      const lista = [...(proveedores ?? []), d].sort((a, b) => a.name.localeCompare(b.name, 'es'));
      setProveedores(lista);
      elegirProveedor(d.id, lista);
      setNuevoNombre('');
    } finally {
      setCreandoProveedor(false);
    }
  };

  const opciones = () => ({ descuento: pctDescuento, margen: pctMargen, reserva: unidadesReserva, ivaIncluido });

  const crear = async () => {
    if (!proveedorId || nuevosSeleccionados.length === 0 || !opcionesValidas) return;
    const sinCategoria = !categoriaDefecto && nuevosSeleccionados.some((f) => !f.categoria);
    if (sinCategoria) { toast.error('Elige la categoría para los que no la traen en el archivo'); return; }
    setTrabajando(`Creando 0 de ${miles(nuevosSeleccionados.length)}…`);
    const hechos: typeof creados = [], fallos: typeof errores = [];
    const fallasFoto: string[] = [];
    let fotosSubidas = 0;
    const suyas = conFotos ? fotosAgrupadas.porCodigo : new Map<string, File[]>();
    try {
      for (const parte of partir(nuevosSeleccionados, LOTE_CREAR)) {
        const d = await post<{ creados: typeof creados; errores: typeof errores }>(proveedorId, { accion: 'crear', filas: parte.map((f) => filaParaEnviar(f, nombreTienda(f))), categoryId: categoriaDefecto || null, noSeEnvia, ...opciones() });
        hechos.push(...d.creados); fallos.push(...d.errores);
        setTrabajando(`Creando ${miles(hechos.length + fallos.length)} de ${miles(nuevosSeleccionados.length)}…`);
        // C-204: cada producto nuevo con sus fotos, apenas se crea
        for (const c of d.creados) {
          const archivosFoto = suyas.get(c.codigo);
          if (!archivosFoto || archivosFoto.length === 0) continue;
          setTrabajando(`Subiendo las fotos de ${c.codigo} (van ${miles(hechos.length)} de ${miles(nuevosSeleccionados.length)})…`);
          try {
            fotosSubidas += await subirFotosAProducto(c.id, archivosFoto, (t) => setTrabajando(`${c.codigo}: ${t}`));
          } catch (e) {
            fallasFoto.push(`${c.codigo}: ${e instanceof Error ? e.message : 'falló'}`);
          }
        }
      }
      toast.success(`${miles(hechos.length)} ${hechos.length === 1 ? 'producto creado' : 'productos creados'} en borrador${fotosSubidas > 0 ? `, con ${miles(fotosSubidas)} ${fotosSubidas === 1 ? 'foto' : 'fotos'}` : ''}`);
      // El servidor guardó con el proveedor la lista de lo que no se envía
      setProveedores((l) => l?.map((p) => (p.id === proveedorId ? { ...p, noShipTerms: esLaDeSiempre(noSeEnvia) ? [] : noSeEnvia } : p)) ?? l);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo crear');
    } finally {
      setCreados((c) => [...c, ...hechos]);
      setErrores(fallos);
      setFallosFotos(fallasFoto);
      setSeleccion(new Set());
      setTrabajando(null);
      // Para que pasen a "ya están" y aparezcan en el paso 5
      setArchivos((a) => [...a]);
      setVersionBorradores((v) => v + 1);
    }
  };

  const actualizar = async () => {
    if (!proveedorId || enTiendaTodos.length === 0 || !opcionesValidas) return;
    setTrabajando('Actualizando…');
    let actualizados = 0, sinCambios = 0, precios = 0;
    try {
      for (const parte of partir(enTiendaTodos, LOTE_ACTUALIZAR)) {
        const d = await post<{ actualizados: number; sinCambios: number; precios: number }>(proveedorId, { accion: 'actualizar', filas: parte.map((f) => filaParaEnviar(f)), ...actualizarQue, ...opciones() });
        actualizados += d.actualizados; sinCambios += d.sinCambios; precios += d.precios;
      }
      toast.success(`${miles(actualizados)} ${actualizados === 1 ? 'producto actualizado' : 'productos actualizados'}${precios > 0 ? `, ${miles(precios)} con precio nuevo` : ''}. ${miles(sinCambios)} sin cambios.`, { duration: 8000 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setTrabajando(null);
      setArchivos((a) => [...a]);
    }
  };

  const ponerAgotadosEnCero = async () => {
    if (!proveedorId || !agotados || agotados.cantidad === 0) return;
    setTrabajando('Poniendo en 0…');
    try {
      const d = await post<{ cantidad: number }>(proveedorId, { accion: 'agotados', codigos: filas.filter((f) => f.existencia !== null).map((f) => f.codigo), aplicar: true });
      toast.success(`${miles(d.cantidad)} ${d.cantidad === 1 ? 'producto quedó' : 'productos quedaron'} sin existencia`);
      setRevisado((r) => (r ? { ...r, agotados: { cantidad: 0, nombres: [] } } : r));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo');
    } finally {
      setTrabajando(null);
    }
  };

  const todosVisiblesNuevos = visibles.filter((f) => !revision?.[f.codigo] && !noSeEnviaPor.get(f.codigo));
  const todosMarcados = todosVisiblesNuevos.length > 0 && todosVisiblesNuevos.every((f) => seleccion.has(f.codigo));

  if (sinPermiso) {
    return <p className={adminNotice('warning')}>La lista del proveedor es para quien administra productos: lleva costos.</p>;
  }

  // C-205: el ejemplo del precio, con la primera fila que traiga precio (o $100), para ver la cuenta sin hacerla
  const precioEjemplo = filas.find((f) => (f.precioLista ?? 0) > 0)?.precioLista ?? 100;
  const costoEjemplo = costoDesdeLista(precioEjemplo, pctDescuento, ivaLista);
  const ventaEjemplo = costoEjemplo !== null && pctMargen >= 0 ? precioSugerido(costoEjemplo, iva, pctMargen) : null;
  const pctTexto = (n: number) => `${String(n).replace('.', ',')} %`;

  const pasos: Paso[] = [
    {
      titulo: 'Proveedor y precio',
      resumen: proveedor ? `${proveedor.name}${ivaIncluido ? ' · IVA incluido' : ''} · margen ${pctTexto(pctMargen)}` : 'Elige el proveedor',
      hecho: Boolean(proveedorId) && opcionesValidas,
      disponible: true,
    },
    {
      titulo: 'Lista y fotos',
      resumen: archivos.length > 0 ? `${miles(conteo.total)} filas · ${miles(fotos.length)} fotos` : 'Su Excel y las fotos',
      hecho: archivos.length > 0,
      disponible: Boolean(proveedorId),
    },
    {
      titulo: 'Revisar',
      resumen: archivos.length === 0 ? 'Lo que llegó' : revisando ? 'Revisando…' : seleccion.size === 0 && creados.length > 0 ? `${miles(creados.length)} creados de ${miles(conteo.total)}` : `${miles(seleccion.size)} marcados de ${miles(conteo.total)}`,
      hecho: creados.length > 0,
      disponible: Boolean(proveedorId) && archivos.length > 0,
    },
    {
      titulo: 'Crear y actualizar',
      resumen: creados.length > 0 ? `${miles(creados.length)} creados en borrador` : revision ? `${miles(nuevosSeleccionados.length)} por crear · ${miles(enTiendaTodos.length)} ya están` : 'Lo nuevo y lo que ya está',
      hecho: creados.length > 0,
      disponible: Boolean(proveedorId) && revision !== null,
    },
    {
      titulo: 'Terminar y publicar',
      resumen: 'Los borradores de este proveedor',
      hecho: false,
      disponible: Boolean(proveedorId),
    },
  ];
  const irA = (i: number) => { setPaso(i); window.scrollTo({ top: 0, behavior: 'instant' }); };

  const filtrosVista: Array<Filtro<Vista>> = [
    { valor: 'nuevos-con-existencia', etiqueta: 'Nuevos con existencia', ayuda: 'Hay en su depósito', Icono: IconoPaquete, cuenta: revision ? conteo.nuevosConExistencia : null },
    { valor: 'sugeridos', etiqueta: 'Sugeridos', ayuda: 'Afines y aguantan el envío', Icono: IconoEstrella, cuenta: revision ? conteo.sugeridos : null },
    { valor: 'nuevos', etiqueta: 'Nuevos', ayuda: 'Todavía no están en la tienda', Icono: IconoNovedad, cuenta: revision ? conteo.nuevos : null },
    { valor: 'revisar', etiqueta: 'Nombres para revisar', ayuda: 'Su sistema los cortó o abrevió', Icono: IconoEditar, cuenta: revision ? conteo.revisar : null, tono: 'aviso' },
    { valor: 'en-tienda', etiqueta: 'Ya en la tienda', ayuda: 'Se actualizan costo y existencia', Icono: IconoTienda, cuenta: revision ? conteo.enTienda : null },
    { valor: 'todos', etiqueta: 'Todos', ayuda: 'Toda su lista', Icono: IconoCuadricula, cuenta: conteo.total },
  ];

  const botonesArchivos = (
    <div className="flex flex-wrap gap-2">
      <label className={`${archivos.length > 0 ? adminSecondaryButton : adminPrimaryButton} cursor-pointer`}>
        {leyendo ? <IconoCargando className="h-4 w-4 animate-spin" aria-hidden="true" /> : <IconoSubir className="h-4 w-4" aria-hidden="true" />}
        {archivos.length > 0 ? 'Agregar otro archivo' : 'Elegir su Excel'}
        <input ref={inputArchivos} type="file" accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => void agregarArchivos(archivosDelInput(e.target.files))} />
      </label>
      <label className={`${adminSecondaryButton} cursor-pointer`}>
        <IconoImagen className="h-4 w-4" aria-hidden="true" /> Elegir la carpeta de fotos
        <input ref={inputCarpeta} type="file" multiple className="sr-only" onChange={(e) => void agregarArchivos(archivosDelInput(e.target.files))} />
      </label>
    </div>
  );

  return (
    <div
      className="w-full min-w-0 space-y-4"
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setArrastrando(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setArrastrando(false); }}
      onDrop={(e) => { e.preventDefault(); setArrastrando(false); void archivosDeLaCaida(e.dataTransfer).then(agregarArchivos).then(() => { if (proveedorId && paso < 1) irA(1); }); }}
    >
      <div>
        <Link href="/admin/products" className="mb-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"><IconoFlechaIzquierda className="h-4 w-4" aria-hidden="true" /> Productos</Link>
        <h1 className={adminPageTitle}>Lista del proveedor</h1>
        <p className={`${adminPageSubtitle} max-w-prose`}>Su Excel y sus fotos, por su código: lo nuevo queda en borrador con sus fotos y lo que ya está se actualiza. Después terminas los borradores y publicas los listos.</p>
      </div>

      <Pasos pasos={pasos} actual={paso} onIr={irA} etiqueta="Pasos de la lista del proveedor" />

      {/* 1. El proveedor y el precio */}
      {paso === 0 && (
        <Marco
          id="t-prov"
          titulo="Proveedor y precio"
          descripcion="De quién es la lista y cómo se calcula el precio. El descuento y el IVA se recuerdan para la próxima."
          arrastrando={arrastrando}
          pie={<Pie siguiente={{ texto: 'Siguiente: su lista y las fotos', onClick: () => irA(1), deshabilitado: !proveedorId || !opcionesValidas, porque: !proveedorId ? 'Primero elige el proveedor' : 'Revisa el descuento, el margen o la reserva' }} />}
        >
          <div className="max-w-3xl space-y-6">
            <div>
              <label htmlFor="prov" className={adminLabel}>Proveedor</label>
              <div className="flex flex-wrap items-center gap-2">
                <select id="prov" className={`${adminInput()} sm:max-w-sm`} value={proveedorId} onChange={(e) => elegirProveedor(e.target.value)} disabled={proveedores === null}>
                  <option value="">{proveedores === null ? 'Cargando…' : 'Elige el proveedor'}</option>
                  {(proveedores ?? []).map((p) => <option key={p.id} value={p.id}>{p.name} ({miles(p.productos)})</option>)}
                </select>
                {!nuevoAbierto && (
                  <button type="button" onClick={() => setNuevoAbierto(true)} className={adminSecondaryButton}><IconoMas className="h-4 w-4" aria-hidden="true" /> Proveedor nuevo</button>
                )}
              </div>
              {nuevoAbierto && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input aria-label="Nombre del proveedor nuevo" autoFocus value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void agregarProveedor(); }} placeholder="Nombre del proveedor" maxLength={80} className={`${adminInput()} sm:max-w-sm`} />
                  <button type="button" onClick={() => void agregarProveedor()} disabled={creandoProveedor || nuevoNombre.trim().length < 2} className={adminPrimaryButton}>Agregar</button>
                  <button type="button" onClick={() => { setNuevoAbierto(false); setNuevoNombre(''); }} className="min-h-11 px-2 text-sm font-semibold text-brand-600 hover:underline">Cancelar</button>
                </div>
              )}
            </div>

            <fieldset>
              <legend className={adminLabel}>Precio</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-3">
                <div>
                  <label htmlFor="desc" className="mb-1 block text-xs font-semibold text-ink-soft">Descuento sobre su lista</label>
                  <CampoUnidad id="desc" unidad="%" inputMode="decimal" value={descuento} onChange={(e) => setDescuento(e.target.value.replace(/[^\d.,]/g, ''))} invalido={!(pctDescuento >= 0 && pctDescuento <= 90)} />
                </div>
                <div>
                  <label htmlFor="marg" className="mb-1 block text-xs font-semibold text-ink-soft">Margen sobre el costo</label>
                  <CampoUnidad id="marg" unidad="%" inputMode="decimal" value={margen} onChange={(e) => setMargen(e.target.value.replace(/[^\d.,]/g, ''))} invalido={!(pctMargen >= 0 && pctMargen <= 300)} />
                </div>
                <div>
                  <label htmlFor="res" className="mb-1 block text-xs font-semibold text-ink-soft">Unidades de reserva</label>
                  <CampoUnidad id="res" unidad="und." inputMode="numeric" value={reserva} onChange={(e) => setReserva(e.target.value.replace(/\D/g, ''))} invalido={!(unidadesReserva >= 0 && unidadesReserva <= 20)} />
                </div>
              </div>
              <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink">
                <input type="checkbox" className="h-4 w-4" checked={ivaIncluido} onChange={(e) => setIvaIncluido(e.target.checked)} />
                Su lista trae el IVA incluido
              </label>
              <p className={adminHint}>
                El costo es su precio menos el descuento{ivaIncluido ? ` y sin el IVA (${pctTexto(iva > 0 ? iva : 16)}): el IVA que le pagas no es costo, y la tienda lo vuelve a sumar al precio de venta` : ''}. El precio de venta es el costo más el margen{iva > 0 ? ` más el IVA (${pctTexto(iva)})` : ''}, como en el asistente. Su existencia es compartida con su mostrador: se publica la suya menos la reserva.
              </p>
              {opcionesValidas && costoEjemplo !== null && ventaEjemplo !== null && (
                <p className="mt-2 text-sm text-ink-soft">
                  Así queda: <span className="tabular-nums">{formatUSD(precioEjemplo)}</span> en su lista → costo <span className="tabular-nums">{formatUSD(costoEjemplo)}</span> → venta <strong className="tabular-nums text-ink">{formatUSD(ventaEjemplo)}</strong>
                </p>
              )}
            </fieldset>

            {proveedor && (
              <DespachaDesde
                key={proveedor.id}
                proveedorId={proveedor.id}
                codigo={proveedor.dispatchCityCode}
                nombre={proveedor.dispatchCityName}
                onGuardado={(codigo, nombre) => setProveedores((l) => l?.map((p) => (p.id === proveedor.id ? { ...p, dispatchCityCode: codigo, dispatchCityName: nombre } : p)) ?? l)}
              />
            )}
            {proveedorId && (
              <NoSeEnvia
                key={`${proveedorId}-${versionLista}`}
                terminos={noSeEnvia}
                guardada={listaGuardada}
                marcados={filas.length > 0 ? conteo.noSeEnvian : null}
                guardando={guardandoLista}
                onCambiar={setNoSeEnvia}
                onGuardar={() => void guardarLista()}
              />
            )}
          </div>
        </Marco>
      )}

      {/* 2. Su lista y las fotos (C-204): elegidos o soltados juntos, en cualquier paso */}
      {paso === 1 && (
        <Marco
          id="t-arch"
          titulo="Su lista y las fotos"
          descripcion="Su Excel como sale de su sistema y la carpeta con las fotos llamadas por su código. Se pueden soltar juntos."
          accion={archivos.length > 0 || fotos.length > 0 ? botonesArchivos : undefined}
          arrastrando={arrastrando}
          pie={<Pie onAtras={() => irA(0)} siguiente={{ texto: archivos.length > 0 ? `Siguiente: revisar ${miles(conteo.total)} filas` : 'Siguiente: revisar', onClick: () => irA(2), deshabilitado: archivos.length === 0, porque: 'Primero su Excel' }} />}
        >
          <div className="max-w-3xl space-y-4">
            {archivos.length === 0 && fotos.length === 0 ? (
              <div className={`flex flex-col items-start gap-3 rounded-2xl border-2 border-dashed p-6 ${arrastrando ? 'border-brand-500 bg-brand-50' : 'border-line-strong'}`}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><IconoSubir className="h-5 w-5" aria-hidden="true" /></span>
                <div>
                  <p className="text-sm font-semibold text-ink">Suelta aquí su Excel y la carpeta de las fotos</p>
                  <p className={adminHint}>Su Excel en .xls, .xlsx o .csv. Las fotos, con el código como nombre: R023127.jpg, R023127-2.jpg. Si manda los precios y la existencia en archivos separados, súbelos juntos: se unen por el código.</p>
                </div>
                {botonesArchivos}
              </div>
            ) : (
              <div className="space-y-3">
                {archivos.map((a, i) => {
                  const reconocidas = CAMPOS.filter((c) => a.columnas[c] !== undefined).length;
                  return (
                    <div key={`${a.nombre}-${i}`} className="rounded-xl border border-line">
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-2">
                        <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
                          <IconoArchivo className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
                          <span className="min-w-0 truncate">{a.nombre}</span>
                          <span className="shrink-0 font-normal text-muted">· {miles(Math.max(0, a.filas.length - 1))} filas</span>
                        </p>
                        <button type="button" onClick={() => setArchivos((l) => l.filter((_, k) => k !== i))} className="min-h-11 text-sm font-semibold text-deal hover:underline">Quitar</button>
                      </div>
                      <details className="group px-3 pb-3" open={a.columnas.codigo === undefined}>
                        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm text-ink-soft">
                          <IconoChevronDerecha className="h-4 w-4 shrink-0 transition-transform duration-150 group-open:rotate-90" aria-hidden="true" />
                          Columnas: {reconocidas} reconocidas{a.columnas.codigo === undefined && <span className="font-semibold text-warning-strong"> · falta el código</span>}
                        </summary>
                        <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {CAMPOS.filter((c) => a.columnas[c] !== undefined || ['codigo', 'nombre', 'precio', 'existencia'].includes(c)).map((campo) => (
                            <label key={campo} className="text-xs font-semibold text-ink-soft">
                              {ETIQUETA_CAMPO[campo]}
                              <select value={a.columnas[campo] ?? ''} onChange={(e) => cambiarColumna(i, campo, e.target.value)} className={`${adminInput(campo === 'codigo' && a.columnas.codigo === undefined)} mt-1`}>
                                <option value="">No viene</option>
                                {a.encabezados.map((h, k) => <option key={k} value={k}>{h || `Columna ${k + 1}`}</option>)}
                              </select>
                            </label>
                          ))}
                        </div>
                      </details>
                    </div>
                  );
                })}
                {archivos.length === 0 && <p className={adminNotice('warning')}>Falta su Excel. Si solo son fotos para productos que ya están en la tienda, súbelas abajo, en &quot;Fotos para lo que ya está en la tienda&quot;.</p>}
              </div>
            )}
            {fotos.length > 0 && (
              <div className="space-y-2 rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
                    <IconoImagen className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
                    <span>{miles(fotos.length)} {fotos.length === 1 ? 'foto' : 'fotos'}{filas.length > 0 && <span className="font-normal text-muted"> · {miles(fotosAgrupadas.porCodigo.size)} {fotosAgrupadas.porCodigo.size === 1 ? 'código' : 'códigos'} de su lista con foto</span>}</span>
                  </p>
                  <button type="button" onClick={() => { setFotos([]); setCarpetasFuera(new Set()); }} className="min-h-11 text-sm font-semibold text-deal hover:underline">Quitar las fotos</button>
                </div>
                {carpetas.length > 1 && (
                  <div>
                    <p className={adminHint}>Vienen de {carpetas.length} carpetas: deja marcada solo la de las fotos listas para subir.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {carpetas.map(([c, n]) => (
                        <label key={c || '-'} className={`${adminChoice(!carpetasFuera.has(c))} flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm`}>
                          <input type="checkbox" className="h-4 w-4" checked={!carpetasFuera.has(c)} onChange={() => setCarpetasFuera((x) => { const k = new Set(x); if (k.has(c)) k.delete(c); else k.add(c); return k; })} />
                          {c || 'Sueltas'} ({miles(n)})
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {fotosAgrupadas.repetidas.length > 0 && (
                  <p className="flex items-start gap-1 text-xs text-warning-strong">
                    <IconoAdvertencia className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {miles(fotosAgrupadas.repetidas.length)} {fotosAgrupadas.repetidas.length === 1 ? 'foto repetida no se sube' : 'fotos repetidas no se suben'} ({fotosAgrupadas.repetidas.slice(0, 4).join(', ')}{fotosAgrupadas.repetidas.length > 4 ? '…' : ''}): el mismo nombre llegó dos veces, de dos carpetas. Quita la que sobra.
                  </p>
                )}
                {filas.length > 0 && fotosAgrupadas.sueltas.length > 0 && (
                  <p className="text-xs text-muted">{miles(fotosAgrupadas.sueltas.length)} no son de ningún código de su lista: {fotosAgrupadas.sueltas.slice(0, 5).join(', ')}{fotosAgrupadas.sueltas.length > 5 ? '…' : ''}</p>
                )}
              </div>
            )}
            <FotosPorCodigo proveedorId={proveedorId} />
          </div>
        </Marco>
      )}

      {/* 3. Revisar lo que llegó: los filtros, la búsqueda y la tabla */}
      {paso === 2 && (
        <Marco
          id="t-prev"
          titulo="Revisa lo que llegó"
          descripcion="Marca lo nuevo que quieres crear y corrige el nombre si hace falta. Lo que ya está en la tienda se actualiza en el paso siguiente."
          accion={
            <p className="text-sm text-muted" aria-live="polite">
              {revisando
                ? <span className="inline-flex items-center gap-1.5 text-brand-700"><IconoCargando className="h-4 w-4 animate-spin" aria-hidden="true" /> Revisando qué ya está en la tienda…</span>
                : <>{miles(conteo.total)} en su lista · {miles(conteo.conExistencia)} con existencia{conteo.noSeEnvian > 0 && <> · {miles(conteo.noSeEnvian)} no se {conteo.noSeEnvian === 1 ? 'envía' : 'envían'}</>}</>}
            </p>
          }
          pie={<Pie onAtras={() => irA(1)} estado={seleccion.size > 0 ? `${miles(nuevosSeleccionados.length)} marcados${conFotos && fotosAgrupadas.porCodigo.size > 0 ? `, ${miles(nuevosSeleccionados.filter((f) => fotosAgrupadas.porCodigo.has(f.codigo)).length)} con foto` : ''}` : 'Marca lo que quieres crear'} siguiente={{ texto: nuevosSeleccionados.length > 0 ? `Siguiente: crear ${miles(nuevosSeleccionados.length)} en borrador` : 'Siguiente: crear y actualizar', onClick: () => irA(3), deshabilitado: revision === null, porque: 'Esperando la revisión' }} />}
        >
          <Filtros filtros={filtrosVista} valor={vista} onCambiar={(v) => cambiarVista(() => setVista(v))} etiqueta="Qué filas ver" />
          {vista === 'sugeridos' && (
            <p className={adminHint}>Afines a la tienda (electricidad, iluminación, protectores de voltaje, herramientas eléctricas, bombas y cerrajería), con existencia y que se pueden enviar. Primero los de $25 o más, que aguantan solos su envío; después, los complementos.</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:max-w-sm">
              <IconoBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input type="search" aria-label="Buscar en la lista" value={busqueda} onChange={(e) => cambiarVista(() => setBusqueda(e.target.value))} placeholder="Buscar por código o nombre" className={`${adminInput()} pl-9`} />
            </div>
            {departamentos.length > 0 && (
              <select aria-label="Departamento" className={`${adminInput()} sm:max-w-xs`} value={dpto} onChange={(e) => cambiarVista(() => setDpto(e.target.value))}>
                <option value="">Todos los departamentos</option>
                {departamentos.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted">{miles(visibles.length)} filas{seleccion.size > 0 && ` · ${miles(seleccion.size)} marcadas`}</span>
            {todosVisiblesNuevos.length > 0 && (
              <button type="button" className="min-h-11 font-semibold text-brand-600 underline" onClick={() => setSeleccion((s) => {
                const n = new Set(s);
                todosVisiblesNuevos.forEach((f) => (todosMarcados ? n.delete(f.codigo) : n.add(f.codigo)));
                return n;
              })}>
                {todosMarcados ? 'Desmarcar los nuevos de esta vista' : `Marcar los ${miles(todosVisiblesNuevos.length)} nuevos de esta vista`}
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[62rem] text-sm">
              <thead>
                <tr className="bg-surface text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="w-10 px-3 py-2"><span className="sr-only">Marcar</span></th>
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Foto</th>
                  <th className="px-3 py-2">Nombre en la tienda</th>
                  <th className="px-3 py-2 text-right">Existencia</th>
                  <th className="px-3 py-2 text-right">Precio de lista</th>
                  <th className="px-3 py-2 text-right">Costo</th>
                  <th className="px-3 py-2 text-right">Precio sugerido</th>
                  <th className="px-3 py-2">Qué pasa</th>
                </tr>
              </thead>
              <tbody>
                {enPagina.map((f) => {
                  const actual = revision?.[f.codigo];
                  const costo = costoDesdeLista(f.precioLista, pctDescuento, ivaLista);
                  const sugerido = costo !== null && pctMargen >= 0 ? precioSugerido(costo, iva, pctMargen) : null;
                  const pub = existenciaPublicable(f.existencia, unidadesReserva);
                  const noSe = actual ? null : noSeEnviaPor.get(f.codigo) ?? null;
                  const sug = sugerencias.get(f.codigo);
                  const fotosFila = fotosAgrupadas.porCodigo.get(f.codigo) ?? [];
                  return (
                    <tr key={f.codigo} className={`border-t border-line ${seleccion.has(f.codigo) ? 'bg-brand-50' : ''}`}>
                      <td className="px-3 py-2">
                        {!actual && !noSe && <input type="checkbox" className="h-4 w-4" checked={seleccion.has(f.codigo)} aria-label={`Marcar ${f.codigo}`}
                          onChange={() => setSeleccion((s) => { const n = new Set(s); if (n.has(f.codigo)) n.delete(f.codigo); else n.add(f.codigo); return n; })} />}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-ink-soft">{f.codigo}</td>
                      <td className="px-3 py-2">
                        {fotosFila.length > 0
                          ? <span className="flex items-center gap-1.5"><Miniatura file={fotosFila[0]} alt={`Foto de ${f.codigo}`} className="h-10 w-10" />{fotosFila.length > 1 && <span className="text-xs text-muted">+{fotosFila.length - 1}</span>}</span>
                          : <span className="text-xs text-muted">—</span>}
                      </td>
                      <td className="min-w-[18rem] px-3 py-2 align-top">
                        <NombreEnTienda
                          fila={f}
                          enTienda={actual?.name ?? null}
                          propuesta={propuestas.get(f.codigo) ?? null}
                          valor={nombres[f.codigo]}
                          onCambiar={(v) => setNombres((n) => {
                            const copia = { ...n };
                            if (v === undefined) delete copia[f.codigo]; else copia[f.codigo] = v;
                            return copia;
                          })}
                        />
                        {f.modelo && <span className="mt-0.5 block text-xs text-muted">Modelo: {f.modelo}</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{f.existencia === null ? '—' : miles(f.existencia)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{f.precioLista === null ? '—' : formatUSD(f.precioLista)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{costo === null ? '—' : formatUSD(costo)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{sugerido === null ? '—' : formatUSD(sugerido)}</td>
                      <td className="px-3 py-2 text-xs">
                        {estadoDe(f) === 'nuevo'
                          ? noSe
                            ? <>
                              <span className="flex items-start gap-1 text-ink-soft"><IconoBloqueado className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> No se envía por ZOOM ni MRW (&quot;{noSe}&quot;): no se crea</span>
                              <button type="button" onClick={() => permitir(f.codigo)} className="min-h-11 text-xs font-semibold text-brand-600 hover:underline">Sí se envía</button>
                            </>
                            : <>
                              <span className="font-semibold text-brand-700">Nuevo{pub !== null ? ` · publica ${pub}` : ''}</span>
                              {sug?.familia && <span className={`block ${sug.seVendeSolo ? 'text-brand-700' : 'text-muted'}`}>{sug.seVendeSolo ? 'Sugerido: aguanta solo su envío' : 'Complemento: mejor acompañado'}</span>}
                            </>
                          : actual!.enPapelera
                            ? <span className="text-muted">En la papelera: no se toca</span>
                            : <span className="text-ink-soft">
                              <Link href={`/admin/products/${actual!.id}`} className="font-semibold text-success-strong hover:underline">En la tienda</Link>
                              {pub !== null && pub !== actual!.stock && <> · existencia {actual!.stock} → {pub}</>}
                              {costo !== null && actual!.costo !== costo && <> · costo {actual!.costo === null ? 'sin costo' : formatUSD(actual!.costo)} → {formatUSD(costo)}</>}
                            </span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {paginas > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button type="button" className={adminSecondaryButton} disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
              <span className="text-sm tabular-nums text-muted">Página {Math.min(pagina, paginas)} de {paginas}</span>
              <button type="button" className={adminSecondaryButton} disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)}>Siguiente</button>
            </div>
          )}
        </Marco>
      )}

      {/* 4. Crear lo nuevo y actualizar lo que ya está */}
      {paso === 3 && (
        <Marco
          id="t-hacer"
          titulo="Crea y actualiza"
          descripcion="Lo nuevo queda en borrador, con sus fotos; lo que ya está en la tienda se actualiza con su lista."
          pie={<Pie onAtras={() => irA(2)} siguiente={{ texto: 'Siguiente: terminar y publicar', onClick: () => irA(4), deshabilitado: Boolean(trabajando), porque: 'Espera a que termine' }} />}
        >
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-line">
            <div className="space-y-3 lg:pr-6">
              <h3 className="text-sm font-semibold text-ink">Crear en borrador los {miles(nuevosSeleccionados.length)} que marcaste</h3>
              <div>
                <label htmlFor="cat-def" className={adminLabel}>Categoría {filas.some((f) => f.categoria) ? '(para los que no la traen en el archivo)' : ''}</label>
                <select id="cat-def" className={`${adminInput()} sm:max-w-sm`} value={categoriaDefecto} onChange={(e) => setCategoriaDefecto(e.target.value)}>
                  <option value="">Elige la categoría</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {fotosAgrupadas.porCodigo.size > 0 && (
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink">
                  <input type="checkbox" className="h-4 w-4" checked={conFotos} onChange={(e) => setConFotos(e.target.checked)} />
                  Con sus fotos ({miles(nuevosSeleccionados.filter((f) => fotosAgrupadas.porCodigo.has(f.codigo)).length)} de los marcados tienen)
                </label>
              )}
              <p className={adminHint}>Quedan en borrador. En el paso siguiente se completan con la web y se publican los que estén listos.</p>
              {nuevosSeleccionados.length === 0 && <p className="text-sm text-muted">No marcaste ninguno: vuelve a <button type="button" onClick={() => irA(2)} className="font-semibold text-brand-600 underline">Revisar</button>.</p>}
              <button type="button" onClick={() => void crear()} disabled={Boolean(trabajando) || nuevosSeleccionados.length === 0 || !opcionesValidas} className={adminPrimaryButton}>
                Crear {miles(nuevosSeleccionados.length)} en borrador
              </button>
            </div>
            <div className="space-y-3 lg:pl-6">
              <h3 className="text-sm font-semibold text-ink">Actualizar los {miles(enTiendaTodos.length)} que ya están</h3>
              <div className="flex flex-wrap gap-2">
                {([['costo', 'Costo'], ['existencia', 'Existencia'], ['precio', 'Precio de venta con el margen']] as const).map(([k, t]) => (
                  <label key={k} className={`${adminChoice(actualizarQue[k])} flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm`}>
                    <input type="checkbox" checked={actualizarQue[k]} onChange={(e) => setActualizarQue((q) => ({ ...q, [k]: e.target.checked }))} className="h-4 w-4" /> {t}
                  </label>
                ))}
              </div>
              {actualizarQue.precio && <p className={adminNotice('warning')}>Cambia el precio de lo publicado: la tienda lo muestra al instante.</p>}
              <button type="button" onClick={() => void actualizar()} disabled={Boolean(trabajando) || enTiendaTodos.length === 0 || !opcionesValidas || !(actualizarQue.costo || actualizarQue.existencia || actualizarQue.precio)} className={adminSecondaryButton}>
                Actualizar {miles(enTiendaTodos.length)}
              </button>
              {agotados && agotados.cantidad > 0 && (
                <div className={adminNotice('warning')}>
                  <p>{miles(agotados.cantidad)} {agotados.cantidad === 1 ? 'producto suyo ya no sale' : 'productos suyos ya no salen'} en esta lista de existencia y todavía {agotados.cantidad === 1 ? 'tiene' : 'tienen'} existencia en la tienda: {agotados.nombres.slice(0, 5).join(', ')}{agotados.cantidad > 5 ? '…' : ''}.</p>
                  <button type="button" onClick={() => void ponerAgotadosEnCero()} disabled={Boolean(trabajando)} className={`${adminSecondaryButton} mt-2`}>Dejarlos sin existencia</button>
                </div>
              )}
            </div>
          </div>

          {trabajando && <p className="flex items-center gap-2 text-sm font-semibold text-brand-700" role="status"><IconoCargando className="h-4 w-4 animate-spin" aria-hidden="true" /> {trabajando}</p>}
          {creados.length > 0 && (
            <div className={adminNotice('success')}>
              <p className="flex items-center gap-2 font-semibold"><IconoConfirmado className="h-4 w-4" aria-hidden="true" /> {miles(creados.length)} creados en borrador.</p>
              <button type="button" onClick={() => irA(4)} className="mt-1 inline-flex min-h-11 items-center font-semibold underline">Terminarlos y publicarlos</button>
            </div>
          )}
          {errores.length > 0 && (
            <div className={adminNotice('danger')}>
              <p className="font-semibold">{miles(errores.length)} no se crearon:</p>
              <ul className="mt-1 list-disc pl-5 text-sm">{errores.slice(0, 10).map((e) => <li key={e.codigo}><span className="font-mono">{e.codigo}</span>: {e.error}</li>)}</ul>
            </div>
          )}
          {fallosFotos.length > 0 && (
            <div className={adminNotice('warning')}>
              <p className="font-semibold">{miles(fallosFotos.length)} {fallosFotos.length === 1 ? 'producto quedó' : 'productos quedaron'} sin sus fotos: súbelas en el paso 2, en &quot;Fotos para lo que ya está en la tienda&quot;.</p>
              <ul className="mt-1 list-disc pl-5 text-sm">{fallosFotos.slice(0, 10).map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
          )}
        </Marco>
      )}

      {/* 5. Terminar los borradores y publicar los listos */}
      {paso === 4 && (
        <Marco
          id="t-borr"
          titulo="Termina los borradores y publica"
          descripcion="Lo que le falta a cada borrador de este proveedor. Completar con la web llena lo vacío (revísalo antes de publicar); Publicar los listos publica solo los completos."
          pie={<Pie onAtras={() => irA(3)} estado={<Link href={`/admin/products?proveedor=${proveedorId}&filtro=borradores`} className="font-semibold text-brand-600 hover:underline">Ver sus borradores en Productos</Link>} />}
        >
          <Borradores proveedorId={proveedorId} version={versionBorradores} enPaso />
        </Marco>
      )}
    </div>
  );
}

/** C-205: la tarjeta de un paso: su título, lo que hay que hacer y, abajo, adónde ir */
function Marco({ id, titulo, descripcion, accion, arrastrando = false, pie, children }: {
  id: string;
  titulo: string;
  descripcion: string;
  accion?: ReactNode;
  arrastrando?: boolean;
  pie: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={`rounded-2xl border bg-white ${arrastrando ? 'border-brand-500 outline-2 outline-offset-2 outline-dashed outline-brand-500' : 'border-line'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <div className="min-w-0">
          <h2 id={id} className="text-lg font-semibold text-ink">{titulo}</h2>
          <p className="mt-0.5 max-w-prose text-sm text-muted">{descripcion}</p>
        </div>
        {accion}
      </div>
      <div className="min-w-0 space-y-4 px-4 py-4 sm:px-5 sm:py-5">{children}</div>
      {pie}
    </section>
  );
}

/** C-205: el pie del paso, pegado abajo: volver, cómo va y el paso siguiente (con el porqué si todavía no se puede) */
function Pie({ onAtras, estado, siguiente }: {
  onAtras?: () => void;
  estado?: ReactNode;
  siguiente?: { texto: string; onClick: () => void; deshabilitado?: boolean; porque?: string };
}) {
  const bloqueado = Boolean(siguiente?.deshabilitado);
  return (
    <div className="sticky bottom-0 z-[var(--z-sticky)] flex items-center gap-3 rounded-b-2xl border-t border-line bg-surface px-4 py-3 sm:px-5">
      {onAtras ? (
        <button type="button" onClick={onAtras} className={adminSecondaryButton}><IconoFlechaIzquierda className="h-4 w-4" aria-hidden="true" /> Atrás</button>
      ) : <span />}
      <div className="hidden min-w-0 flex-1 truncate text-center text-sm text-ink-soft sm:block" aria-live="polite">
        {bloqueado ? siguiente?.porque : estado}
      </div>
      {siguiente && (
        <button type="button" onClick={siguiente.onClick} disabled={bloqueado} title={bloqueado ? siguiente.porque : undefined} aria-label={siguiente.texto} className={`${adminPrimaryButton} ml-auto min-w-0 max-sm:flex-1 sm:ml-0`}>
          {/* En el teléfono basta "Siguiente": lo que sigue ya lo dicen los pasos de arriba */}
          <span className="sm:hidden">Siguiente</span><span className="hidden truncate sm:inline">{siguiente.texto}</span> <IconoFlechaDerecha className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/**
 * C-202: el nombre de una fila. Si es nueva, el campo con el nombre propuesto (se puede corregir) y, debajo, cómo viene
 * en su lista y lo que hay que mirar: en ámbar lo que alguien tiene que revisar (cortado, sin entender), en gris lo que
 * la tienda completó sola. Si ya está en la tienda, su nombre de la tienda.
 */
function NombreEnTienda({ fila, enTienda, propuesta, valor, onCambiar }: {
  fila: FilaProveedor;
  enTienda: string | null;
  propuesta: PropuestaNombre | null;
  valor: string | undefined;
  onCambiar: (v: string | undefined) => void;
}) {
  if (enTienda !== null) {
    return (
      <>
        <span className="block text-ink">{enTienda}</span>
        <span className="block text-xs text-muted">Su lista: {fila.nombre || 'sin nombre'}</span>
      </>
    );
  }
  const propuesto = propuesta?.nombre || fila.nombre;
  const editado = valor !== undefined && valor !== propuesto;
  const avisos = editado ? [] : propuesta?.avisos ?? [];
  return (
    <>
      <div className="flex items-center gap-1">
        <input
          type="text"
          aria-label={`Nombre en la tienda de ${fila.codigo}`}
          value={valor ?? propuesto}
          maxLength={150}
          onChange={(e) => onCambiar(e.target.value)}
          className={`${adminInput()} h-9 text-sm`}
        />
        {editado && (
          <button type="button" onClick={() => onCambiar(undefined)} title="Volver al nombre propuesto" aria-label={`Volver al nombre propuesto de ${fila.codigo}`} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink">
            <IconoDeshacer className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <span className="mt-1 block text-xs text-muted">Su lista: {fila.nombre || 'sin nombre'}{fila.departamento ? ` · ${fila.departamento}` : ''}</span>
      {avisos.map((a) => {
        const revisar = a.tipo === 'cortado' || a.tipo === 'revisar';
        const Icono = revisar ? IconoAdvertencia : IconoInfo;
        return (
          <span key={a.texto} className={`mt-0.5 flex items-start gap-1 text-xs ${revisar ? 'text-warning-strong' : 'text-muted'}`}>
            <Icono className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{a.texto}
          </span>
        );
      })}
    </>
  );
}

/**
 * Las fotos llamadas con el código del proveedor ("R023127.jpg", "R023127-2.jpg") se suben a su producto, con el fondo
 * blanco y la cinta ES de siempre. Se agregan a las que tenga, hasta 8. Sirve el mismo día o cuando las fotos estén.
 */
function FotosPorCodigo({ proveedorId }: { proveedorId: string }) {
  const [archivos, setArchivos] = useState<File[]>([]);
  const [armado, setArmado] = useState<{ para: object; plan: Array<{ codigo: string; producto: EnTienda; fotos: File[] }>; sinProducto: string[] } | null>(null);
  const clave = useMemo(() => ({ proveedorId, archivos }), [proveedorId, archivos]);
  const plan = armado?.para === clave ? armado.plan : null;
  const sinProducto = armado?.para === clave ? armado.sinProducto : [];
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [hecho, setHecho] = useState<{ productos: number; fotos: number; fallos: string[] } | null>(null);

  useEffect(() => {
    if (!proveedorId || archivos.length === 0) return;
    let vigente = true;
    (async () => {
      const nombres = archivos.map((f) => ({ f, ...codigoDeFoto(f.name) }));
      const candidatos = [...new Set(nombres.flatMap((n) => [n.entero, n.base].filter((x): x is string => Boolean(x))))];
      const enTienda: Record<string, EnTienda> = {};
      for (const parte of partir(candidatos, LOTE_REVISAR)) Object.assign(enTienda, (await post<{ enTienda: Record<string, EnTienda> }>(proveedorId, { accion: 'revisar', codigos: parte })).enTienda);
      const grupos = new Map<string, Array<{ f: File; orden: number }>>();
      const sueltas: string[] = [];
      for (const n of nombres) {
        const codigo = enTienda[n.entero] ? n.entero : n.base && enTienda[n.base] ? n.base : null;
        if (!codigo) { sueltas.push(n.f.name); continue; }
        grupos.set(codigo, [...(grupos.get(codigo) ?? []), { f: n.f, orden: codigo === n.entero ? 0 : n.orden }]);
      }
      if (!vigente) return;
      setArmado({
        para: clave,
        plan: [...grupos.entries()].filter(([c]) => !enTienda[c].enPapelera).map(([codigo, fotos]) => ({
          codigo, producto: enTienda[codigo], fotos: fotos.sort((a, b) => a.orden - b.orden || a.f.name.localeCompare(b.f.name)).map((x) => x.f),
        })),
        sinProducto: sueltas,
      });
    })().catch((e: Error) => { if (vigente) toast.error(e.message); });
    return () => { vigente = false; };
  }, [clave, proveedorId, archivos]);

  const subir = async () => {
    if (!plan) return;
    let productos = 0, fotos = 0;
    const fallos: string[] = [];
    for (const [i, item] of plan.entries()) {
      setSubiendo(`${item.codigo} (${i + 1} de ${plan.length})`);
      try {
        fotos += await subirFotosAProducto(item.producto.id, item.fotos, (t) => setSubiendo(`${item.codigo}: ${t}`));
        productos++;
      } catch (e) {
        fallos.push(`${item.codigo}: ${e instanceof Error ? e.message : 'falló'}`);
      }
    }
    setSubiendo(null);
    setHecho({ productos, fotos, fallos });
    setArchivos([]);
  };

  return (
    <details className="group rounded-xl border border-line p-3" open={archivos.length > 0 || hecho !== null}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm">
        <IconoChevronDerecha className="h-4 w-4 shrink-0 text-ink-soft transition-transform duration-150 group-open:rotate-90" aria-hidden="true" />
        <span className="font-semibold text-ink">Fotos para lo que ya está en la tienda</span>
        <span className="text-muted">· sin su Excel</span>
      </summary>
      <div className="mt-2 space-y-3">
      <label className={`${adminSecondaryButton} ${proveedorId ? 'cursor-pointer' : 'pointer-events-none opacity-50'}`}>
        <IconoImagen className="h-4 w-4" aria-hidden="true" /> Elegir fotos
        <input type="file" accept="image/*" multiple className="sr-only" disabled={!proveedorId} onChange={(e) => { setArchivos(Array.from(e.target.files ?? [])); setHecho(null); e.target.value = ''; }} />
      </label>
      <p className={adminHint}>Para las fotos que llegan después. Llama cada foto con el código del proveedor: R023127.jpg, R023127-2.jpg, R023127-3.jpg. Se agregan a las que el producto ya tenga (hasta {FOTOS_MAX}), con fondo blanco y la cinta ES. Mejor con el fondo ya quitado en el teléfono.</p>
      {plan && (
        <div className="space-y-2">
          <p className="text-sm text-ink">{miles(plan.reduce((n, x) => n + x.fotos.length, 0))} fotos para {miles(plan.length)} productos.{sinProducto.length > 0 && <span className="text-warning-strong"> {miles(sinProducto.length)} no coinciden con ningún código de este proveedor: {sinProducto.slice(0, 5).join(', ')}{sinProducto.length > 5 ? '…' : ''}</span>}</p>
          <button type="button" onClick={() => void subir()} disabled={Boolean(subiendo) || plan.length === 0} className={adminPrimaryButton}>
            {subiendo ? <><IconoCargando className="h-4 w-4 animate-spin" aria-hidden="true" /> Subiendo {subiendo}</> : `Subir a ${miles(plan.length)} productos`}
          </button>
        </div>
      )}
      {hecho && (
        <div className={adminNotice(hecho.fallos.length > 0 ? 'warning' : 'success')}>
          <p>{miles(hecho.fotos)} fotos en {miles(hecho.productos)} productos.</p>
          {hecho.fallos.length > 0 && <ul className="mt-1 list-disc pl-5 text-sm">{hecho.fallos.slice(0, 10).map((f) => <li key={f}>{f}</li>)}</ul>}
        </div>
      )}
      </div>
    </details>
  );
}
