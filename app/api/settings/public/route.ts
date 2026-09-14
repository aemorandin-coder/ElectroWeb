import { NextResponse } from 'next/server';
import { getPublicSettings } from '@/lib/site-settings';

// Public endpoint to get company settings (no auth required)
// Misma lista blanca que recibe SettingsProvider desde el layout (lib/site-settings.ts)
export async function GET() {
  return NextResponse.json(await getPublicSettings());
}
