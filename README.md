# Electro Shop Morandin C.A.

Plataforma de e-commerce premium para tienda de tecnología especializada en gaming, laptops, consolas y servicios técnicos.

## 🎯 Stack Tecnológico

- **Framework**: Next.js 14+ (App Router)
- **Lenguaje**: TypeScript
- **Base de Datos**: PostgreSQL
- **ORM**: Prisma
- **Estilos**: Tailwind CSS 4
- **Autenticación**: NextAuth.js
- **State Management**: Zustand
- **Tipografía**: Inter (Google Fonts)

## 🎨 Diseño

### Paleta de Colores
- **Primario**: `#2a63cd` (Azul)
- **Secundario**: `#6a6c6b` (Gris)
- **Fondo**: `#ffffff` / `#f8f9fa`
- **Acentos**: Verde (#10b981), Amarillo (#f59e0b), Rojo (#ef4444)

### Filosofía de Diseño
- **Mobile-first**: Optimizado para dispositivos móviles
- **Compacto**: Uso eficiente del espacio sin sentirse apretado
- **Premium**: Experiencia moderna y de alta calidad
- **Inspiración**: Amazon y MercadoLibre

## 📋 Estado del Proyecto - FASE 1 COMPLETADA

### ✅ Completado

1. **Inicialización del Proyecto**
   - Next.js 14+ configurado
   - TypeScript habilitado
   - Tailwind CSS 4 configurado
   - Todas las dependencias instaladas

2. **Base de Datos (Schema Prisma)**
   - ✅ Modelos de Autenticación (`User`, `AdminUser`, `Profile`, `Address`)
   - ✅ Catálogo de Productos (`Product`, `Category`)
   - ✅ Sistema de Pedidos (`Order`, `OrderItem`)
   - ✅ Gestión de Contenido (`TechServiceVideo`, `Course`)
   - ✅ Configuración de la Empresa (`CompanySettings`)
   - ✅ Soporte multi-moneda (USD, VES, EUR)
   - ✅ Sistema de permisos para empleados

3. **Configuración del Sistema de Diseño**
   - ✅ Tipografía Inter configurada
   - ✅ Paleta de colores implementada
   - ✅ Variables CSS personalizadas
   - ✅ Scrollbar estilizada
   - ✅ Estados de focus y selection

## 🚀 Configuración Inicial

### 1. Instalar PostgreSQL

Antes de continuar, necesitas tener PostgreSQL instalado y corriendo:

**Windows:**
```bash
# Descarga PostgreSQL desde https://www.postgresql.org/download/windows/
# Durante la instalación, recuerda la contraseña del usuario 'postgres'
```

**Verificar instalación:**
```bash
psql --version
```

### 2. Crear la Base de Datos

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear la base de datos
CREATE DATABASE electroshop;

# Salir
\q
```

### 3. Configurar Variables de Entorno

Edita el archivo `.env` y actualiza con tus credenciales:

```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/electroshop?schema=public"
NEXTAUTH_SECRET="genera-un-secret-aleatorio-aqui"
```

Para generar un `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 4. Ejecutar Migraciones de Prisma

```bash
# Generar el cliente de Prisma
npx prisma generate

# Crear las tablas en la base de datos
npx prisma migrate dev --name init

# (Opcional) Ver la base de datos con Prisma Studio
npx prisma studio
```

### 5. Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
electro-shop/
├── app/                    # Next.js App Router
│   ├── globals.css        # Estilos globales + Sistema de diseño
│   ├── layout.tsx         # Layout principal
│   └── page.tsx           # Página de inicio
├── prisma/
│   └── schema.prisma      # Schema de base de datos completo
├── .env                   # Variables de entorno (NO COMMITEAR)
└── package.json
```

## 🗂️ Modelos de Base de Datos

### Autenticación
- `User` - Clientes
- `AdminUser` - Empleados/Administradores (con sistema de roles y permisos)
- `Profile` - Perfil extendido del cliente
- `Address` - Direcciones de envío

### Catálogo
- `Category` - Categorías anidadas de productos
- `Product` - Productos con especificaciones JSON, multi-imagen, SKU

### Pedidos
- `Order` - Pedidos con multi-moneda y tasas de cambio
- `OrderItem` - Items del pedido con snapshot del producto

### Contenido
- `TechServiceVideo` - Testimonios en video del servicio técnico
- `Course` - Cursos online/presenciales

### Configuración
- `CompanySettings` - Configuración global (tasas de cambio, delivery, etc.)

## 🎯 Próximos Pasos - FASE 2

Cuando estés listo para continuar:

1. **Crear Seed Script** - Poblar la base de datos con datos de prueba
2. **Configurar NextAuth** - Sistema de autenticación completo
3. **Panel de Administrador** - CRUD para productos, categorías, usuarios
4. **Frontend Público** - Tienda, carrito, checkout

## 📞 Contacto

**Empresa**: Electro Shop Morandin C.A.
**Ubicación**: Guanare, Estado Portuguesa, Venezuela
**Director del Proyecto**: Andres
