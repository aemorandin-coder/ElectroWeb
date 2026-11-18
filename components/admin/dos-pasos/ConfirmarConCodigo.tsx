'use client';

import { useEffect, useRef, useState } from 'react';
import { IconoCandado } from '@/components/iconos';
import {
  adminInput, adminLabel, adminModalBody, adminModalFooter, adminModalHeader, adminModalOverlay, adminModalPanel, adminModalTitle,
  adminPrimaryButton, adminSecondaryButton,
} from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { FilaDeLaApp } from './TelefonoDibujado';

// C-291: lo delicado pide el número de la app otra vez si la sesión entró por un dispositivo de confianza. Las rutas
// responden 403 con `codigo: 'CODIGO_RECIENTE'` (lib/dispositivos-confianza): esta pieza, montada una vez en el marco del
// panel, lo reconoce en cualquier pantalla, abre la ventana y, al confirmar, repite el mismo pedido. Así cada pantalla
// delicada (la clave de la IA, el correo, Equipo, Métodos de pago, Respaldos) no tiene que hacer nada.
// Si se cancela, la pantalla recibe el 403 con su mensaje ("Para esto, confirma con el número de tu app").
// Varios pedidos a la vez comparten una sola ventana.

const esDelPanel = (url: string) => {
  try {
    const u = new URL(url, window.location.origin);
    return u.origin === window.location.origin && u.pathname.startsWith('/api/admin/') && u.pathname !== '/api/admin/dos-pasos';
  } catch {
    return false;
  }
};

export default function ConfirmarConCodigo() {
  const [abierta, setAbierta] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const [codigo, setCodigo] = useState('');
  const [conLlave, setConLlave] = useState(false);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  useBodyScrollLock(abierta);

  useEffect(() => {
    const original = window.fetch;
    let enCurso: Promise<boolean> | null = null;
    const pedirCodigo = () => {
      enCurso ??= new Promise<boolean>((resolve) => {
        resolver.current = (ok) => {
          enCurso = null;
          resolver.current = null;
          setAbierta(false);
          resolve(ok);
        };
        setCodigo('');
        setError('');
        setConLlave(false);
        setAbierta(true);
      });
      return enCurso;
    };
    const conConfirmacion: typeof fetch = async (input, init) => {
      // Un Request se gasta al mandarlo: se guarda una copia por si hay que repetirlo
      const copia = input instanceof Request ? input.clone() : input;
      const respuesta = await original(input, init);
      if (respuesta.status !== 403) return respuesta;
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (!esDelPanel(url)) return respuesta;
      const datos = (await respuesta.clone().json().catch(() => null)) as { codigo?: string } | null;
      if (datos?.codigo !== 'CODIGO_RECIENTE') return respuesta;
      if (!(await pedirCodigo())) return respuesta;
      return original(copia, init);
    };
    window.fetch = conConfirmacion;
    return () => {
      window.fetch = original;
      resolver.current?.(false);
    };
  }, []);

  if (!abierta) return null;

  const confirmar = async () => {
    const limpio = codigo.trim();
    if (!conLlave && limpio.replace(/\s/g, '').length !== 6) {
      setError('Faltan cifras: el número de la app tiene 6.');
      return;
    }
    if (conLlave && limpio.length < 8) {
      setError('Escribe la llave completa, como aparece en tu archivo.');
      return;
    }
    setOcupado(true);
    setError('');
    try {
      const r = await fetch('/api/admin/dos-pasos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'confirmar', codigo: limpio }) });
      const datos = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(datos.error || 'No se pudo confirmar. Intenta de nuevo.');
        return;
      }
      resolver.current?.(true);
    } catch {
      setError('Sin conexión. Revisa tu internet e intenta de nuevo.');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="confirmar-codigo-titulo" onKeyDown={(e) => { if (e.key === 'Escape') resolver.current?.(false); }}>
      <form className={`${adminModalPanel} sm:max-w-md`} noValidate onSubmit={(e) => { e.preventDefault(); void confirmar(); }}>
        <div className={adminModalHeader}>
          <h2 id="confirmar-codigo-titulo" className={`${adminModalTitle} flex items-center gap-2`}>
            <IconoCandado className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
            Confirma que eres tú
          </h2>
        </div>
        <div className={`${adminModalBody} space-y-4`}>
          <p className="text-sm text-muted">Esto cambia algo delicado. Escribe el número de tu app para seguir.</p>
          {!conLlave && <FilaDeLaApp />}
          <div>
            <label htmlFor="confirmar-codigo" className={adminLabel}>{conLlave ? 'Llave de repuesto' : 'El número de 6 cifras'}</label>
            <input
              key={conLlave ? 'llave' : 'app'}
              id="confirmar-codigo"
              type="text"
              inputMode={conLlave ? 'text' : 'numeric'}
              autoComplete={conLlave ? 'off' : 'one-time-code'}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              maxLength={conLlave ? 12 : 7}
              value={codigo}
              onChange={(e) => { setCodigo(conLlave ? e.target.value.toUpperCase() : e.target.value.replace(/[^\d\s]/g, '')); setError(''); }}
              placeholder={conLlave ? 'XXXX-XXXX' : '000 000'}
              aria-invalid={Boolean(error) || undefined}
              className={`${adminInput(Boolean(error))} h-14 max-w-56 text-center font-mono text-2xl tracking-[0.3em]`}
              disabled={ocupado}
            />
            {error && <p className="mt-2 text-sm font-semibold text-deal" role="alert">{error}</p>}
            <button type="button" onClick={() => { setConLlave((v) => !v); setCodigo(''); setError(''); }} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand-600 hover:text-brand-700">
              {conLlave ? 'Usar el número de la app' : '¿Sin el teléfono? Usa una llave de repuesto'}
            </button>
          </div>
          <p className="text-xs text-muted">Por 15 minutos no te lo vuelve a pedir.</p>
        </div>
        <div className={adminModalFooter}>
          <button type="button" onClick={() => resolver.current?.(false)} className={adminSecondaryButton} disabled={ocupado}>Cancelar</button>
          <button type="submit" className={adminPrimaryButton} disabled={ocupado}>
            {ocupado && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />}
            Confirmar y seguir
          </button>
        </div>
      </form>
    </div>
  );
}
