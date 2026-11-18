import { useSyncExternalStore } from 'react';
import { FaMicrosoft } from 'react-icons/fa';
import { SiGoogleauthenticator } from 'react-icons/si';
import { IconoCandado, type IconType } from '@/components/iconos';

// C-290: las apps de códigos que se nombran en los dos pasos, con su logo y dónde se bajan (skill herramientas-claras,
// regla 2). La recomendada va primero. Los enlaces se comprobaron el 18/11 (las seis tiendas responden 200).
// Authy no tiene logo en react-icons: va con un candado del pack en su placa, sin inventar el dibujo de su marca.

export type IdApp = 'google' | 'microsoft' | 'authy';

export interface AppDeCodigos {
  id: IdApp;
  nombre: string;
  /** Para el teléfono dibujado, donde no cabe el nombre entero */
  corto: string;
  /** Una línea para elegirla */
  nota: string;
  logo: IconType;
  play: string;
  appStore: string;
  /** Lo que se toca en la app para agregar una cuenta con el QR, en orden */
  agregar: string[];
}

export const APPS_DE_CODIGOS: readonly AppDeCodigos[] = [
  {
    id: 'google',
    nombre: 'Google Authenticator',
    corto: 'Authenticator',
    nota: 'La recomendada: la más simple',
    logo: SiGoogleauthenticator,
    play: 'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2',
    appStore: 'https://apps.apple.com/app/google-authenticator/id388497605',
    agregar: ['Toca el botón +', 'Elige «Escanear un código QR»'],
  },
  {
    id: 'microsoft',
    nombre: 'Microsoft Authenticator',
    corto: 'Authenticator',
    nota: 'Si ya usas Outlook o Teams',
    logo: FaMicrosoft,
    play: 'https://play.google.com/store/apps/details?id=com.azure.authenticator',
    appStore: 'https://apps.apple.com/app/microsoft-authenticator/id983156458',
    agregar: ['Toca el botón +', 'Elige «Otra cuenta»', 'Toca «Escanear un código QR»'],
  },
  {
    id: 'authy',
    nombre: 'Authy',
    corto: 'Authy',
    nota: 'Guarda tus códigos en la nube',
    logo: IconoCandado,
    play: 'https://play.google.com/store/apps/details?id=com.authy.authy',
    appStore: 'https://apps.apple.com/app/twilio-authy/id494168017',
    agregar: ['Toca el botón +', 'Elige «Escanear código QR»'],
  },
];

export const appPorId = (id: IdApp): AppDeCodigos => APPS_DE_CODIGOS.find((a) => a.id === id) ?? APPS_DE_CODIGOS[0];

/** En qué teléfono se está, para mostrar primero su tienda. En la computadora: null. */
export function sistemaDelTelefono(): 'android' | 'iphone' | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  // iPadOS se presenta como Mac: se reconoce por la pantalla táctil
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'iphone';
  return null;
}

const sinCambios = () => () => {};

/**
 * El teléfono en que se mira la página (null en la computadora y en el servidor). No decide el diseño, que va por CSS:
 * decide qué se puede hacer (en el teléfono, abrir la app con un enlace; en la computadora, escanear el QR).
 */
export function useTelefono(): 'android' | 'iphone' | null {
  return useSyncExternalStore(sinCambios, sistemaDelTelefono, () => null);
}
