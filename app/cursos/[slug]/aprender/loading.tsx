// Reproductor del curso (C-78): pantalla completa oscura como el reproductor, sin el encabezado de la tienda
export default function AprenderLoading() {
  return (
    <div className="flex h-dvh flex-col bg-brand-950" aria-busy="true" aria-label="Cargando lección">
      <div className="flex h-12 shrink-0 items-center gap-4 border-b border-white/10 px-4">
        <div className="h-5 w-5 rounded bg-white/10" />
        <div className="h-4 w-48 rounded bg-white/10" />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden w-80 shrink-0 space-y-2 border-r border-white/10 p-4 lg:block">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-white/5" />
          ))}
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        </div>
      </div>
    </div>
  );
}
