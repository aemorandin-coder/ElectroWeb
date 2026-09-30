// Lo que Mi perfil lee de /api/user/profile y /api/customer/settings (C-138).

export interface DatosPerfil {
  user: { id: string; name: string | null; email: string | null; image: string | null; emailVerified: boolean; createdAt: string };
  profile: {
    avatar: string | null;
    idNumber: string | null;
    phone: string | null;
    birthdate: string | null;
    gender: string | null;
    city: string | null;
    state: string | null;
    companyName: string | null;
    taxId: string | null;
    businessVerificationStatus: string | null;
    businessVerificationNotes: string | null;
    businessConstitutiveAct: string | null;
    businessRIFDocument: string | null;
  } | null;
  resumen: { pedidosPagados: number; totalComprado: number };
}

export interface Actividad {
  id: string;
  accion: string;
  fecha: string;
  dispositivo: string;
  metodo: 'google' | 'contraseña' | null;
}

export interface Ajustes {
  cuenta: { estado: string; eliminacionPedidaEl: string | null; correoVerificado: boolean; creadaEl: string };
  seguridad: {
    tieneContrasena: boolean;
    conGoogle: boolean;
    ultimoAcceso: string | null;
    ultimoDispositivo: string | null;
    actividad: Actividad[];
  };
  notificaciones: { emailPromotions: boolean; inAppFavoritos: boolean; emailFavoritos: boolean };
}
