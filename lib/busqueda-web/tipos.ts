// Lo que devuelve la búsqueda de un producto en la web (C-155). Módulo puro: lo usan la API y el asistente.

export interface MedidasCaja {
  /** cm */
  largo: number;
  ancho: number;
  alto: number;
}

export interface FuenteWeb {
  dominio: string;
  url: string;
  titulo: string;
}

export interface Hallazgo<T> {
  valor: T;
  /** Dominio de donde salió; '' si es un estimado sin fuente */
  fuente: string;
  /** true si no se leyó tal cual: se calculó o se supuso. Siempre se muestra como estimado */
  estimado: boolean;
  /** Qué hay que comprobar, en una línea */
  nota: string;
}

export interface EspecificacionWeb {
  nombre: string;
  valor: string;
  fuente: string;
}

export interface ResultadoBusquedaWeb {
  /** false si ninguna página hablaba de este producto: no hay datos leídos (puede haber estimados) */
  encontrado: boolean;
  /** Lo que se buscó */
  consulta: string;
  fuentes: FuenteWeb[];
  marca: Hallazgo<string> | null;
  codigoBarras: Hallazgo<string> | null;
  /** Peso de la caja, en kg */
  peso: Hallazgo<number> | null;
  /** Medidas de la caja, en cm */
  medidas: Hallazgo<MedidasCaja> | null;
  especificaciones: EspecificacionWeb[];
  /** Borrador redactado por la tienda con los datos hallados; '' si no hay con qué */
  descripcion: string;
  /** Quién redactó y ordenó la ficha: la IA (Groq) con los datos leídos, o las reglas de la tienda */
  redaccion: 'ia' | 'reglas';
  /** Lo que no salió bien, en palabras para quien usa el panel */
  avisos: string[];
}
