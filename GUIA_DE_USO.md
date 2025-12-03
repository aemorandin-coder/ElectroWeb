# 📚 Guía de Uso - Sistema de Reviews y Order Tracking

## 🎯 Para Clientes

### Cómo Dejar una Reseña

1. **Compra un producto**
2. **Espera a que tu pedido sea entregado**
3. **Recibirás un email** con un link directo
4. **Haz click en "Dejar una Reseña"**
5. **Completa el formulario**:
   - Calificación (1-5 estrellas)
   - Título (opcional)
   - Comentario (mínimo 10 caracteres)
6. **Envía** - Tu reseña será revisada por un administrador

### Rastreo de Pedidos

1. **Ve a tu panel**: `/customer/orders`
2. **Click en "Ver Detalles"** de cualquier pedido
3. **Verás**:
   - Barra de progreso animada
   - Estado actual con icono
   - Historial completo
   - Productos incluidos

---

## 👨‍💼 Para Administradores

### Moderar Reseñas

1. **Accede a**: `/admin/reviews`
2. **Filtra por estado**:
   - Todas
   - Pendientes
   - Aprobadas
3. **Acciones disponibles**:
   - ✅ **Aprobar**: Publica la reseña
   - ❌ **Rechazar**: Oculta la reseña
   - 🗑️ **Eliminar**: Borra permanentemente

### Gestionar Pedidos

1. **Accede a**: `/admin/orders`
2. **Cambia el estado** del pedido
3. **Cuando marques como DELIVERED**:
   - Se envía email automático al cliente
   - Cliente puede dejar reseña

---

## 🔧 Para Desarrolladores

### Agregar Rating a Productos

El sistema ya calcula automáticamente el rating promedio. Para mostrarlo en product cards:

```tsx
// El ProductCard ya incluye el rating
<ProductCard product={product} />

// Asegúrate de incluir averageRating y totalReviews en tu query
const products = await prisma.product.findMany({
  include: {
    _count: {
      select: {
        reviews: {
          where: { isPublished: true }
        }
      }
    },
    reviews: {
      where: { isPublished: true },
      select: { rating: true }
    }
  }
});

// Calcula el promedio
const productsWithRating = products.map(p => ({
  ...p,
  totalReviews: p._count.reviews,
  averageRating: p.reviews.length > 0
    ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length
    : 0
}));
```

### Enviar Emails Personalizados

```typescript
import { sendEmail } from '@/lib/email';
import { generateReviewReminderEmail } from '@/lib/email-templates/ReviewReminder';

const emailHtml = generateReviewReminderEmail({
  companyName: 'Tu Empresa',
  companyLogo: 'https://...',
  customerName: 'Juan Pérez',
  orderNumber: 'ORD-001',
  productName: 'Producto X',
  productImage: 'https://...',
  reviewUrl: 'https://...'
});

await sendEmail({
  to: 'cliente@example.com',
  subject: '¿Qué te pareció tu compra?',
  html: emailHtml
});
```

### Validar Elegibilidad para Review

```typescript
// En tu componente
const checkEligibility = async (productId: string) => {
  const response = await fetch(
    `/api/reviews/check-eligibility?productId=${productId}`
  );
  const data = await response.json();
  
  if (data.canReview) {
    // Mostrar formulario
  } else {
    // Mostrar mensaje: data.message
  }
};
```

### Personalizar OrderTracking

```tsx
<OrderTracking
  status="SHIPPED"
  createdAt="2024-01-01T00:00:00Z"
  paidAt="2024-01-01T01:00:00Z"
  shippedAt="2024-01-02T00:00:00Z"
  deliveredAt={null}
  deliveryMethod="HOME_DELIVERY" // o "PICKUP"
/>
```

---

## ⚙️ Configuración

### Variables de Entorno Requeridas

```env
# SMTP para emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-app
SMTP_FROM_NAME=Tu Empresa
SMTP_FROM_EMAIL=noreply@tuempresa.com

# URL base para links en emails
NEXTAUTH_URL=https://tudominio.com
```

### Configurar Gmail para SMTP

1. Habilita verificación en 2 pasos
2. Genera una "Contraseña de aplicación"
3. Usa esa contraseña en `SMTP_PASS`

---

## 🐛 Troubleshooting

### Las reseñas no aparecen

**Problema**: Reseñas enviadas pero no visibles  
**Solución**: Verifica que estén aprobadas en `/admin/reviews`

### Email no se envía

**Problema**: No llega email de reminder  
**Solución**: 
1. Verifica variables SMTP
2. Revisa logs del servidor
3. Verifica que orden esté en estado DELIVERED

### No puedo dejar reseña

**Problema**: Formulario bloqueado  
**Solución**: Verifica que:
1. Estés registrado
2. Hayas comprado el producto
3. Tu pedido esté DELIVERED

### OrderTracking no se ve

**Problema**: Modal vacío  
**Solución**: Verifica que el componente esté importado correctamente

---

## 📈 Mejores Prácticas

### Para Reviews
- Modera reviews dentro de 24 horas
- Responde a reviews negativas (próxima feature)
- Incentiva reviews con descuentos

### Para Emails
- Personaliza los templates con tu branding
- Prueba en diferentes clientes de email
- Monitorea tasas de apertura

### Para Order Tracking
- Actualiza estados en tiempo real
- Notifica cambios importantes
- Mantén información precisa

---

## 🔄 Flujos Completos

### Flujo de Review

```
1. Cliente compra producto
2. Admin procesa orden
3. Admin marca como DELIVERED
4. Sistema envía email reminder
5. Cliente hace click en link
6. Sistema valida elegibilidad
7. Cliente completa formulario
8. Review va a moderación
9. Admin aprueba
10. Review visible en producto
11. Rating actualizado en cards
```

### Flujo de Order Tracking

```
1. Cliente crea orden (PENDING)
2. Admin confirma (CONFIRMED)
3. Cliente paga (PAID)
4. Admin prepara (PROCESSING)
5. Admin envía (SHIPPED)
6. Cliente recibe (DELIVERED)
7. Email reminder enviado
```

---

## 🎨 Personalización

### Cambiar Colores

Edita los archivos de componentes:
- OrderTracking: Busca `from-green-500`, `from-blue-500`, etc.
- ReviewForm: Busca `text-green-600`, `bg-green-100`, etc.

### Cambiar Iconos

Todos los iconos son de `react-icons/fi`. Para cambiar:

```tsx
import { FiTuIcono } from 'react-icons/fi';
```

### Personalizar Emails

Edita `lib/email-templates/base.ts` para cambiar:
- Colores principales
- Tipografía
- Footer
- Header

---

**¿Necesitas ayuda?** Revisa los archivos de código o contacta al equipo de desarrollo.
