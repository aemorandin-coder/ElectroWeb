import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { leerDocumento, leerTelefono, nombreSchema } from '@/lib/validations/registro';

// null se acepta como vacío: la ruta ya lo trataba así
const texto = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`).nullable();
// Avatar subido a la tienda o la foto de Google (C-85). Antes se guardaba cualquier texto, y después cualquier
// https: una foto de otro dominio sale rota en todo next/image (C-80, next.config.js remotePatterns).
const imagen = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^\/(api\/)?uploads\/[\w./-]+$/.test(v) && !v.includes('..') || /^https:\/\/[a-z0-9-]+\.googleusercontent\.com\/[^\s]+$/i.test(v), 'Imagen inválida')
  .nullable()
  .transform((v) => v || null);

const datosPerfil = z.object({
  phone: texto(24).optional(),
  whatsapp: texto(24).optional(),
  idNumber: texto(20).optional(),
  bio: texto(500).optional(),
  birthdate: texto(30).refine((v) => !v || /^\d{4}-\d{2}-\d{2}/.test(v), 'Fecha de nacimiento inválida').optional(),
  gender: texto(30).optional(),
  avatar: imagen.optional(),
  city: texto(80).optional(),
  state: texto(80).optional(),
  country: texto(80).optional(),
  customerType: z.enum(['', 'PERSON', 'COMPANY'], { error: 'Tipo de cliente inválido' }).nullable().optional(),
  companyName: texto(150).optional(),
  taxId: texto(30).optional(),
});

const perfilSchema = datosPerfil.extend({
  name: z.string().max(120).nullable().optional(),
  // La pantalla reenvía siempre la foto actual: solo se valida si cambia (abajo)
  image: z.string().trim().max(500).nullable().optional(),
  profile: datosPerfil.optional(),
  address: z
    .object({ state: texto(80).optional(), city: texto(80).optional(), street: texto(300).optional(), zipCode: texto(20).optional() })
    .optional(),
});

const PERFIL_PUBLICO = {
  avatar: true,
  idNumber: true,
  phone: true,
  whatsapp: true,
  bio: true,
  birthdate: true,
  gender: true,
  city: true,
  state: true,
  country: true,
  customerType: true,
  companyName: true,
  taxId: true,
  isBusinessAccount: true,
  businessVerified: true,
  businessVerificationStatus: true,
  businessVerificationNotes: true,
  businessRIF: true,
  businessConstitutiveAct: true,
  businessRIFDocument: true,
  savedAddresses: true,
} satisfies Prisma.ProfileSelect;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Lista blanca (C-80): antes salía la fila entera (IP y dispositivo del último acceso, carrito guardado,
    // motivo de eliminación…). Solo lo que leen el perfil, el checkout, los términos del saldo y el panel.
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        profile: { select: PERFIL_PUBLICO },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      profile: user.profile,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Error al obtener perfil' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const parsed = perfilSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
    }
    const body = parsed.data;
    // Extract profile data from body or body.profile
    const profileData = body.profile ?? body;

    const actual = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, image: true, profile: { select: { idNumber: true, phone: true, whatsapp: true } } },
    });
    if (!actual) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    // C-84: antes esta ruta guardaba cualquier cosa. La pantalla bloquea la cédula una vez escrita, pero la API
    // la dejaba cambiar (y es la que queda en la firma de los términos del saldo). Nombre, teléfono y cédula
    // se validan con las reglas del registro solo si cambian: los datos viejos no dejan de guardarse.
    const userUpdateData: { name?: string; image?: string | null } = {};
    if (body.name && body.name.trim() !== (actual.name ?? '')) {
      const nombre = nombreSchema.safeParse(body.name);
      if (!nombre.success) return NextResponse.json({ success: false, error: nombre.error.issues[0].message }, { status: 400 });
      userUpdateData.name = nombre.data;
    }
    if (body.image !== undefined && (body.image || null) !== actual.image) {
      const nueva = imagen.safeParse(body.image);
      if (!nueva.success) return NextResponse.json({ success: false, error: nueva.error.issues[0].message }, { status: 400 });
      userUpdateData.image = nueva.data;
    }

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: userUpdateData,
      });
    }

    const profileUpdateData: Prisma.ProfileUpdateInput = {};

    const telefono = (campo: 'phone' | 'whatsapp') => {
      const valor = profileData[campo];
      if (valor === undefined) return { ok: true as const };
      if (!valor?.trim()) return { ok: true as const, valor: null };
      if (valor === actual.profile?.[campo]) return { ok: true as const };
      const lectura = leerTelefono(valor);
      return lectura.ok ? { ok: true as const, valor: lectura.valor } : { ok: false as const, error: lectura.error };
    };
    for (const campo of ['phone', 'whatsapp'] as const) {
      const r = telefono(campo);
      if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: 400 });
      if ('valor' in r) profileUpdateData[campo] = r.valor;
    }

    if (profileData.idNumber?.trim()) {
      const guardada = actual.profile?.idNumber;
      const lectura = leerDocumento(profileData.idNumber);
      if (guardada) {
        const anterior = leerDocumento(guardada);
        const igual = profileData.idNumber === guardada || (lectura.ok && anterior.ok && lectura.valor === anterior.valor);
        if (!igual) {
          return NextResponse.json({ success: false, error: 'La cédula ya registrada no se puede cambiar. Escríbenos si hay un error.' }, { status: 400 });
        }
      } else if (!lectura.ok) {
        return NextResponse.json({ success: false, error: lectura.error }, { status: 400 });
      } else {
        profileUpdateData.idNumber = lectura.valor;
      }
    }

    if (profileData.bio !== undefined) profileUpdateData.bio = profileData.bio || null;
    if (profileData.birthdate !== undefined) profileUpdateData.birthdate = profileData.birthdate || null;
    if (profileData.gender !== undefined) profileUpdateData.gender = profileData.gender || null;
    if (profileData.avatar !== undefined) profileUpdateData.avatar = profileData.avatar;
    if (profileData.city !== undefined) profileUpdateData.city = profileData.city || null;
    if (profileData.state !== undefined) profileUpdateData.state = profileData.state || null;
    if (profileData.country !== undefined) profileUpdateData.country = profileData.country || 'Venezuela';
    if (profileData.customerType !== undefined) profileUpdateData.customerType = profileData.customerType || 'PERSON';
    if (profileData.companyName !== undefined) profileUpdateData.companyName = profileData.companyName || null;
    if (profileData.taxId !== undefined) profileUpdateData.taxId = profileData.taxId || null;

    // Update or create profile
    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: profileUpdateData,
      create: {
        user: { connect: { id: session.user.id } },
        ...(profileUpdateData as Omit<Prisma.ProfileCreateInput, 'user'>),
      },
    });

    // Update or create default address if provided
    if (body.address) {
      const defaultAddress = await prisma.address.findFirst({
        where: {
          userId: session.user.id,
          isDefault: true,
        },
      });

      if (defaultAddress) {
        await prisma.address.update({
          where: { id: defaultAddress.id },
          data: {
            state: body.address.state || defaultAddress.state,
            city: body.address.city || defaultAddress.city,
            street: body.address.street || defaultAddress.street,
            zipCode: body.address.zipCode || defaultAddress.zipCode,
          },
        });
      } else if (body.address.street && body.address.city && body.address.state) {
        await prisma.address.create({
          data: {
            userId: session.user.id,
            name: session.user.name || 'Principal',
            phone: profileData.phone || '',
            state: body.address.state,
            city: body.address.city,
            street: body.address.street,
            zipCode: body.address.zipCode || '',
            country: 'Venezuela',
            isDefault: true,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      profile
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al actualizar perfil'
    }, { status: 500 });
  }
}

