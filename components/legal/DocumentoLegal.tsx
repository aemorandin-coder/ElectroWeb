import { parsearDocumento, segmentosNegrita } from '@/lib/legal-docs-core';
import { IconoAdvertencia } from '@/components/iconos';
import { avisoAccion } from '@/lib/admin-ui';

// Una página legal pública (C-160: /terminos y /privacidad) a partir del texto del documento, con el formato de
// lib/legal-docs-core. Sin HTML: todo se muestra como texto, así lo que se escriba en el panel no puede inyectar nada.

function Linea({ texto }: { texto: string }) {
  return (
    <>
      {segmentosNegrita(texto).map((t, i) => (t.negrita ? <strong key={i} className="font-semibold text-ink">{t.texto}</strong> : t.texto))}
    </>
  );
}

export default function DocumentoLegal({ contenido }: { contenido: string }) {
  return (
    <article className="mx-auto max-w-3xl space-y-4 rounded-2xl border border-line bg-white p-5 leading-relaxed text-ink-soft sm:p-8 lg:p-10">
      {parsearDocumento(contenido).map((b, i) => {
        if (b.tipo === 'subtitulo') return <h2 key={i} id={b.id} className="scroll-mt-28 pt-4 text-xl font-bold text-ink first:pt-0">{b.texto}</h2>;
        if (b.tipo === 'subsubtitulo') return <h3 key={i} id={b.id} className="scroll-mt-28 pt-2 font-bold text-ink">{b.texto}</h3>;
        // C-251b: el mismo aviso de la ventana de firmar, en el azul claro con su placa (PLAN.md §1.1)
        if (b.tipo === 'aviso') return <p key={i} className={`flex items-start gap-3 rounded-lg border p-4 font-bold ${avisoAccion}`}><IconoAdvertencia aria-hidden="true" /><span><Linea texto={b.texto} /></span></p>;
        if (b.tipo === 'lista') return <ul key={i} className="list-disc space-y-2 pl-6">{b.items.map((item, j) => <li key={j}><Linea texto={item} /></li>)}</ul>;
        return <p key={i}><Linea texto={b.texto} /></p>;
      })}
    </article>
  );
}
