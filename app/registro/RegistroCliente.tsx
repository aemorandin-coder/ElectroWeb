'use client';

import { Suspense, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiAlertCircle, FiCheck, FiCheckCircle, FiCircle, FiEye, FiEyeOff, FiX } from 'react-icons/fi';
import AuthShell from '@/components/auth/AuthShell';
import BotonGoogle from '@/components/auth/BotonGoogle';
import { ControlTelefono } from '@/components/forms/ControlesDatos';
import HCaptchaWrapper, { type HCaptchaRefMethods } from '@/components/HCaptchaWrapper';
import { adminError, adminHint, adminInput, adminLabel, adminNotice, adminPrimaryButton } from '@/lib/admin-ui';
import { rutaInternaSegura } from '@/lib/rutas';
import {
  REGLAS_CONTRASENA,
  registroSchema,
  sugerirCorreo,
  type CampoRegistro,
} from '@/lib/validations/registro';

// Registro (C-84). Antes: 8 campos en dos columnas, errores en globos que se borraban a los 3 segundos,
// ayudas que solo se veían con el mouse, reglas distintas a las del servidor y el botón bloqueado hasta resolver el captcha.
// C-85: sin cédula (Andrés, 16/09): se pide en la primera compra y el cliente puede escribirla en su perfil.

type Valores = {
  name: string;
  email: string;
  codigoPais: string;
  telefono: string;
  password: string;
  acceptTerms: boolean;
};

const INICIAL: Valores = {
  name: '',
  email: '',
  codigoPais: '+58',
  telefono: '',
  password: '',
  acceptTerms: false,
};

// Orden en pantalla: al enviar se enfoca el primer campo con error
const ORDEN: CampoRegistro[] = ['name', 'email', 'phone', 'password', 'acceptTerms'];

function datosDe(v: Valores) {
  return {
    name: v.name,
    email: v.email,
    phone: `${v.codigoPais} ${v.telefono}`,
    password: v.password,
    acceptTerms: v.acceptTerms,
  };
}

function erroresDe(v: Valores): Partial<Record<CampoRegistro, string>> {
  const resultado = registroSchema.safeParse(datosDe(v));
  if (resultado.success) return {};
  const errores: Partial<Record<CampoRegistro, string>> = {};
  for (const issue of resultado.error.issues) {
    const campo = issue.path[0] as CampoRegistro;
    errores[campo] ??= issue.message;
  }
  return errores;
}

function Campo({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={adminLabel}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className={adminError}>
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className={adminHint}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

function RegistroContenido({ google }: { google: boolean }) {
  const searchParams = useSearchParams();
  // ?callbackUrl= lo usan el checkout y el proxy; ?redirect= lo usa "Comparte y gana"
  const destino = rutaInternaSegura(searchParams.get('callbackUrl')) ?? rutaInternaSegura(searchParams.get('redirect'));
  const hrefLogin = destino ? `/login?callbackUrl=${encodeURIComponent(destino)}` : '/login';

  const [valores, setValores] = useState<Valores>(INICIAL);
  const [tocados, setTocados] = useState<Partial<Record<CampoRegistro, boolean>>>({});
  const [erroresServidor, setErroresServidor] = useState<Partial<Record<CampoRegistro | 'captcha', string>>>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [faltaCaptcha, setFaltaCaptcha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [cuentaCreada, setCuentaCreada] = useState(false);
  const captchaRef = useRef<HCaptchaRefMethods>(null);

  const errores = erroresDe(valores);
  const errorDe = (campo: CampoRegistro) => erroresServidor[campo] ?? (tocados[campo] ? errores[campo] : undefined);
  const sugerencia = sugerirCorreo(valores.email);

  const cambiar = <K extends keyof Valores>(clave: K, valor: Valores[K], campo: CampoRegistro) => {
    setValores((prev) => ({ ...prev, [clave]: valor }));
    if (erroresServidor[campo]) setErroresServidor((prev) => ({ ...prev, [campo]: undefined }));
    setErrorGeneral('');
  };
  const tocar = (campo: CampoRegistro) => setTocados((prev) => ({ ...prev, [campo]: true }));

  const aria = (campo: CampoRegistro, conAyuda = false) => {
    const error = errorDe(campo);
    return {
      'aria-invalid': Boolean(error),
      'aria-describedby': error ? `${campo}-error` : conAyuda ? `${campo}-hint` : undefined,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGeneral('');

    const primero = ORDEN.find((campo) => errores[campo]);
    if (primero) {
      setTocados(Object.fromEntries(ORDEN.map((campo) => [campo, true])));
      document.getElementById(primero)?.focus();
      return;
    }
    if (!captchaToken) {
      setFaltaCaptcha(true);
      return;
    }

    setEnviando(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...datosDe(valores), captchaToken }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // El token del captcha ya se gastó: hay que resolverlo otra vez
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
        const campo = data.field as CampoRegistro | 'captcha' | undefined;
        if (campo && (campo === 'captcha' || ORDEN.includes(campo))) {
          setErroresServidor((prev) => ({ ...prev, [campo]: data.error }));
          if (campo !== 'captcha') document.getElementById(campo)?.focus();
        } else {
          setErrorGeneral(data.error || 'No pudimos crear tu cuenta. Intenta de nuevo.');
        }
        return;
      }

      // Con el correo que guardó el servidor (en minúsculas): con el escrito a mano fallaba si tenía mayúsculas (C-83)
      const result = await signIn('unified-credentials', {
        email: data.email ?? valores.email,
        password: valores.password,
        redirect: false,
      });

      if (result?.ok && !result.error) {
        // Recarga completa: el header y el carrito leen la sesión nueva
        window.location.assign(destino ?? '/');
        return;
      }
      setCuentaCreada(true);
    } catch {
      setErrorGeneral('Sin conexión. Revisa tu internet e intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  if (cuentaCreada) {
    return (
      <AuthShell volver={{ href: '/', texto: 'Volver a la tienda' }}>
        <div className="text-center">
          <FiCheckCircle className="mx-auto h-12 w-12 text-success-strong" aria-hidden="true" />
          <h1 className="mt-3 text-2xl font-bold text-ink">Tu cuenta está lista</h1>
          <p className="mt-2 text-sm text-muted">
            Entra con <span className="font-semibold text-ink">{valores.email.trim().toLowerCase()}</span> y la contraseña que acabas de crear.
            También te enviamos un correo para confirmarlo.
          </p>
          <Link href={hrefLogin} className={`${adminPrimaryButton} mt-6 w-full`}>
            Iniciar sesión
          </Link>
        </div>
      </AuthShell>
    );
  }

  const errorTelefono = errorDe('phone');
  const passwordTocada = tocados.password || Boolean(erroresServidor.password);

  return (
    <AuthShell
      volver={{ href: destino ?? '/', texto: destino ? 'Volver' : 'Volver a la tienda' }}
      pie={
        <p className="text-sm text-muted">
          ¿Ya tienes cuenta?{' '}
          <Link href={hrefLogin} className="font-semibold text-brand-600 hover:text-brand-700 hover:underline">
            Inicia sesión
          </Link>
        </p>
      }
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Crea tu cuenta</h1>
        <p className="mt-1 text-sm text-muted">Para comprar, seguir tus pedidos y usar tu saldo.</p>
      </div>

      {google && <BotonGoogle destino={destino ?? '/'} deshabilitado={enviando} />}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Campo id="name" label="Nombre y apellido" error={errorDe('name')}>
          <input
            id="name"
            type="text"
            autoComplete="name"
            autoCapitalize="words"
            maxLength={80}
            value={valores.name}
            onChange={(e) => cambiar('name', e.target.value, 'name')}
            onBlur={() => tocar('name')}
            className={adminInput(Boolean(errorDe('name')))}
            placeholder="Ana Pérez"
            disabled={enviando}
            {...aria('name')}
          />
        </Campo>

        <Campo
          id="email"
          label="Correo"
          error={errorDe('email')}
          hint={
            sugerencia ? (
              <>
                ¿Quisiste decir{' '}
                <button
                  type="button"
                  onClick={() => cambiar('email', sugerencia, 'email')}
                  className="font-semibold text-brand-600 underline underline-offset-2"
                >
                  {sugerencia}
                </button>
                ?
              </>
            ) : undefined
          }
        >
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={255}
            value={valores.email}
            onChange={(e) => cambiar('email', e.target.value, 'email')}
            onBlur={() => tocar('email')}
            className={adminInput(Boolean(errorDe('email')))}
            placeholder="nombre@gmail.com"
            disabled={enviando}
            {...aria('email', Boolean(sugerencia))}
          />
        </Campo>

        <Campo id="phone" label="Teléfono con WhatsApp" error={errorTelefono} hint="Te escribimos por aquí sobre tus pedidos.">
          <ControlTelefono
            id="phone"
            codigo={valores.codigoPais}
            numero={valores.telefono}
            onCodigo={(v) => cambiar('codigoPais', v, 'phone')}
            onNumero={(v) => cambiar('telefono', v, 'phone')}
            onBlur={() => tocar('phone')}
            error={Boolean(errorTelefono)}
            disabled={enviando}
            aria={aria('phone', true)}
          />
        </Campo>

        <div>
          <label htmlFor="password" className={adminLabel}>
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              type={verContrasena ? 'text' : 'password'}
              autoComplete="new-password"
              maxLength={128}
              value={valores.password}
              onChange={(e) => cambiar('password', e.target.value, 'password')}
              onBlur={() => tocar('password')}
              className={`${adminInput(passwordTocada && Boolean(errores.password))} pr-12`}
              disabled={enviando}
              aria-invalid={passwordTocada && Boolean(errores.password)}
              aria-describedby="password-reglas"
            />
            <button
              type="button"
              onClick={() => setVerContrasena((v) => !v)}
              aria-label={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={verContrasena}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted transition-colors hover:text-ink"
            >
              {verContrasena ? <FiEyeOff className="h-5 w-5" aria-hidden="true" /> : <FiEye className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
          <ul id="password-reglas" className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {REGLAS_CONTRASENA.map((regla) => {
              const cumple = regla.cumple(valores.password);
              const Icono = cumple ? FiCheck : passwordTocada ? FiX : FiCircle;
              const tono = cumple ? 'text-success-strong' : passwordTocada ? 'text-deal' : 'text-muted';
              return (
                <li key={regla.id} className={`flex items-center gap-1.5 text-xs font-medium ${tono}`}>
                  <Icono className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {regla.texto}
                  <span className="sr-only">{cumple ? ': listo' : ': falta'}</span>
                </li>
              );
            })}
          </ul>
          {erroresServidor.password && <p className={adminError}>{erroresServidor.password}</p>}
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              id="acceptTerms"
              type="checkbox"
              checked={valores.acceptTerms}
              onChange={(e) => {
                cambiar('acceptTerms', e.target.checked, 'acceptTerms');
                tocar('acceptTerms');
              }}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-line-strong accent-brand-500"
              disabled={enviando}
              {...aria('acceptTerms')}
            />
            <span className="text-sm text-ink-soft">
              Acepto los{' '}
              <Link href="/terminos" target="_blank" rel="noopener" className="font-semibold text-brand-600 hover:underline">
                términos y condiciones
              </Link>{' '}
              y la{' '}
              <Link href="/privacidad" target="_blank" rel="noopener" className="font-semibold text-brand-600 hover:underline">
                política de privacidad
              </Link>
              .
            </span>
          </label>
          {errorDe('acceptTerms') && (
            <p id="acceptTerms-error" className={adminError}>
              {errorDe('acceptTerms')}
            </p>
          )}
        </div>

        <div>
          <div className="flex justify-center">
            <HCaptchaWrapper
              ref={captchaRef}
              sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001'}
              onVerify={(token) => {
                setCaptchaToken(token);
                setFaltaCaptcha(false);
                setErroresServidor((prev) => ({ ...prev, captcha: undefined }));
              }}
              onExpire={() => setCaptchaToken(null)}
              theme="light"
            />
          </div>
          {(erroresServidor.captcha || (faltaCaptcha && !captchaToken)) && (
            <p className={`${adminError} text-center`}>{erroresServidor.captcha ?? 'Completa la verificación de seguridad'}</p>
          )}
        </div>

        {errorGeneral && (
          <div role="alert" className={`${adminNotice('danger')} flex items-start gap-2`}>
            <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{errorGeneral}</p>
          </div>
        )}

        <button type="submit" disabled={enviando} className={`${adminPrimaryButton} w-full`}>
          {enviando ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
              Creando tu cuenta
            </>
          ) : (
            'Crear cuenta'
          )}
        </button>
      </form>
    </AuthShell>
  );
}

export default function RegistroCliente({ google }: { google: boolean }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white lg:bg-surface" />}>
      <RegistroContenido google={google} />
    </Suspense>
  );
}
