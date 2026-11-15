'use client';

// Marketing → Sorteo (C-212; Andrés, 13/11: la PlayStation 4, con el resultado el 20/12).
// C-221 (PLAN.md §1.9, el equipo el 14/11: "básico, sin comprensión, desordenado"): sin sorteo, el asistente de 4 pasos con
// lo que se propone para el primero; con uno, su tablero. "Cambiar" abre el mismo asistente con todo hecho, y su último paso
// dice qué cambia y a cuántos clientes les cambian los boletos antes de guardar.
// C-254: ya sorteado, "Publicar la entrega" abre su propio asistente (la foto, el video, el nombre y el permiso).

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { adminSpinner } from '@/lib/admin-ui';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import AsistenteEntrega from './sorteo/AsistenteEntrega';
import AsistenteSorteo from './sorteo/AsistenteSorteo';
import TableroSorteo from './sorteo/TableroSorteo';
import { formularioDe, nuevoDesde, PROPUESTO, type Datos, type Formulario } from './sorteo/tipos';

type Vista = { tipo: 'tablero' } | { tipo: 'editar' } | { tipo: 'nuevo'; base: Formulario } | { tipo: 'entrega' };

export default function Sorteo() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [vista, setVista] = useState<Vista>({ tipo: 'tablero' });

  const cargar = async () => {
    const r = await fetch('/api/admin/sorteo');
    if (!r.ok) { toast.error('No se pudo cargar el sorteo'); return; }
    setDatos((await r.json()) as Datos);
  };
  useCargarAlMontar(cargar);

  if (!datos) return <div className="flex justify-center py-16"><span className={adminSpinner} aria-label="Cargando" /></div>;

  const listo = async () => { await cargar(); setVista({ tipo: 'tablero' }); };
  const s = datos.sorteo;

  // El primero: directo al asistente, con lo que pidió Andrés ya puesto
  if (!s) return <AsistenteSorteo key="primero" modo="nuevo" inicial={PROPUESTO()} actual={null} onListo={listo} />;

  if (vista.tipo === 'editar' && !s.sorteadoAt) {
    return <AsistenteSorteo key={`editar-${s.id}`} modo="editar" inicial={formularioDe(s)} actual={s} onCancelar={() => setVista({ tipo: 'tablero' })} onListo={listo} />;
  }
  if (vista.tipo === 'entrega' && s.sorteadoAt) {
    return <AsistenteEntrega key={`entrega-${s.id}`} sorteo={s} onCancelar={() => setVista({ tipo: 'tablero' })} onListo={listo} />;
  }
  if (vista.tipo === 'nuevo') {
    return <AsistenteSorteo key="nuevo" modo="nuevo" inicial={vista.base} actual={s} onCancelar={() => setVista({ tipo: 'tablero' })} onListo={listo} />;
  }
  return (
    <TableroSorteo
      datos={datos}
      onEditar={() => setVista({ tipo: 'editar' })}
      onNuevo={() => setVista({ tipo: 'nuevo', base: nuevoDesde(s) })}
      onEntrega={() => setVista({ tipo: 'entrega' })}
      onRecargar={cargar}
    />
  );
}
