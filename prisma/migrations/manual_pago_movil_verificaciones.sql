-- Migración: Agregar tabla de verificaciones de Pago Móvil BDV
-- Fecha: 2024-12-22
-- Descripción: Tabla para registrar las verificaciones de pago móvil con la API del Banco de Venezuela

-- CreateTable
CREATE TABLE IF NOT EXISTS "pago_movil_verificaciones" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "telefonoPagador" TEXT NOT NULL,
    "bancoOrigen" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "importeSolicitado" DECIMAL(65,30) NOT NULL,
    "importeVerificado" DECIMAL(65,30),
    "codigoRespuesta" INTEGER NOT NULL,
    "mensajeRespuesta" TEXT NOT NULL,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "contexto" TEXT NOT NULL DEFAULT 'GENERAL',
    "transactionId" TEXT,
    "orderId" TEXT,
    "rawResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pago_movil_verificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pago_movil_verificaciones_userId_idx" ON "pago_movil_verificaciones"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pago_movil_verificaciones_referencia_idx" ON "pago_movil_verificaciones"("referencia");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pago_movil_verificaciones_verificado_idx" ON "pago_movil_verificaciones"("verificado");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pago_movil_verificaciones_contexto_idx" ON "pago_movil_verificaciones"("contexto");
