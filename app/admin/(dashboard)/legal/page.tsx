'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import {
    FiFileText, FiSearch, FiRefreshCw, FiEye, FiX, FiUser,
    FiMail, FiPhone, FiMapPin, FiClock, FiDownload, FiPrinter,
    FiShield, FiCheck
} from 'react-icons/fi';

interface TermsAcceptance {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    userIdNumber: string | null;
    userPhone: string | null;
    userAddress: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    termsVersion: string;
    signatureData: string | null;
    acceptedAt: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function LegalDocumentsPage() {
    const [acceptances, setAcceptances] = useState<TermsAcceptance[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });

    // Document viewer modal
    const [viewingDocument, setViewingDocument] = useState<TermsAcceptance | null>(null);

    const fetchAcceptances = async (page = 1) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/admin/legal/terms-acceptances?page=${page}&search=${encodeURIComponent(search)}`);
            if (response.ok) {
                const data = await response.json();
                setAcceptances(data.acceptances);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error('Error fetching acceptances:', error);
            toast.error('Error al cargar documentos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAcceptances();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchAcceptances(1);
    };

    const printDocument = () => {
        if (!viewingDocument) return;
        window.print();
    };

    const downloadDocument = () => {
        if (!viewingDocument) return;

        // Create a simple HTML document for download
        const htmlContent = generateDocumentHtml(viewingDocument);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `terminos_aceptados_${viewingDocument.userIdNumber || viewingDocument.userId}_${format(new Date(viewingDocument.acceptedAt), 'yyyy-MM-dd')}.html`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Documento descargado');
    };

    const generateDocumentHtml = (doc: TermsAcceptance) => {
        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Aceptación de Términos y Condiciones - ${doc.userName}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #2a63cd; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #2a63cd; margin: 0; }
        .header p { color: #666; margin: 10px 0 0 0; }
        .section { margin-bottom: 25px; }
        .section h2 { color: #2a63cd; font-size: 16px; border-bottom: 1px solid #e9ecef; padding-bottom: 8px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .info-item { background: #f8f9fa; padding: 12px; border-radius: 8px; }
        .info-item label { font-size: 11px; color: #666; text-transform: uppercase; display: block; margin-bottom: 4px; }
        .info-item span { font-size: 14px; font-weight: 500; }
        .terms-box { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #2a63cd; }
        .terms-box p { margin: 10px 0; font-size: 13px; line-height: 1.6; }
        .signature-section { margin-top: 40px; border-top: 2px solid #e9ecef; padding-top: 20px; }
        .signature-box { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .signature-box img { max-width: 300px; border: 1px solid #e9ecef; border-radius: 8px; }
        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #e9ecef; padding-top: 20px; }
        .legal-notice { background: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 12px; }
        @media print { body { padding: 20px; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>CONSTANCIA DE ACEPTACIÓN</h1>
        <p>Términos y Condiciones de Recarga de Saldo</p>
    </div>

    <div class="section">
        <h2>Datos del Usuario</h2>
        <div class="info-grid">
            <div class="info-item">
                <label>Nombre Completo</label>
                <span>${doc.userName}</span>
            </div>
            <div class="info-item">
                <label>Correo Electrónico</label>
                <span>${doc.userEmail}</span>
            </div>
            <div class="info-item">
                <label>Cédula de Identidad</label>
                <span>${doc.userIdNumber || 'No proporcionado'}</span>
            </div>
            <div class="info-item">
                <label>Teléfono</label>
                <span>${doc.userPhone || 'No proporcionado'}</span>
            </div>
            <div class="info-item" style="grid-column: span 2;">
                <label>Dirección</label>
                <span>${doc.userAddress || 'No proporcionada'}</span>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Detalles de la Aceptación</h2>
        <div class="info-grid">
            <div class="info-item">
                <label>Fecha y Hora de Aceptación</label>
                <span>${format(new Date(doc.acceptedAt), "dd 'de' MMMM 'de' yyyy, HH:mm:ss", { locale: es })}</span>
            </div>
            <div class="info-item">
                <label>Versión de Términos</label>
                <span>${doc.termsVersion}</span>
            </div>
            <div class="info-item">
                <label>Dirección IP</label>
                <span>${doc.ipAddress || 'No registrada'}</span>
            </div>
            <div class="info-item">
                <label>ID de Documento</label>
                <span>${doc.id}</span>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Términos Aceptados</h2>
        <div class="terms-box">
            <p><strong>El usuario declara que:</strong></p>
            <p>1. Los fondos utilizados para recargar saldo provienen de actividades lícitas y legales.</p>
            <p>2. Acepta la política de no reembolso - el saldo recargado no es reembolsable bajo ninguna circunstancia.</p>
            <p>3. Proporcionará información veraz, exacta y actualizada en todas sus transacciones.</p>
            <p>4. Acepta que las transacciones pueden ser rechazadas por información incorrecta o sospechosa.</p>
            <p>5. Acepta la verificación de identidad y auditoría por parte de la empresa.</p>
            <p>6. Asume total responsabilidad legal por cualquier violación de estos términos.</p>
        </div>
    </div>

    <div class="signature-section">
        <h2>Firma Digital del Usuario</h2>
        <div class="signature-box">
            ${doc.signatureData ? `<img src="${doc.signatureData}" alt="Firma Digital" />` : '<p>Firma no disponible</p>'}
            <p style="margin-top: 15px; font-size: 12px; color: #666;">
                <strong>${doc.userName}</strong><br>
                C.I.: ${doc.userIdNumber || 'N/A'}
            </p>
        </div>
    </div>

    <div class="legal-notice">
        <strong>AVISO LEGAL:</strong> Este documento constituye prueba de la aceptación voluntaria de los términos y 
        condiciones por parte del usuario. La firma digital tiene validez legal según la legislación vigente. 
        Este documento puede ser utilizado como evidencia en procedimientos legales.
    </div>

    <div class="footer">
        <p>Documento generado automáticamente el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}</p>
        <p>ID de Usuario: ${doc.userId} | ID de Documento: ${doc.id}</p>
    </div>
</body>
</html>`;
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#212529] flex items-center gap-3">
                        <FiShield className="w-7 h-7 text-[#2a63cd]" />
                        Documentos Legales
                    </h1>
                    <p className="text-[#6a6c6b] text-sm">Términos y condiciones aceptados por clientes</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {/* Search */}
                    <form onSubmit={handleSearch} className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6c6b]" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nombre, email o cédula..."
                            className="pl-9 pr-4 py-2 bg-white border border-[#dee2e6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent w-64"
                        />
                    </form>

                    {/* Refresh */}
                    <button
                        onClick={() => fetchAcceptances(pagination.page)}
                        className="p-2 bg-white border border-[#dee2e6] rounded-lg hover:bg-[#f8f9fa] transition-all hover:scale-105 active:scale-95"
                        title="Actualizar"
                    >
                        <FiRefreshCw className={`w-5 h-5 text-[#6a6c6b] ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] text-white rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <FiFileText className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-white/80">Total Documentos</p>
                            <p className="text-2xl font-bold">{pagination.total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <FiCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-white/80">Usuarios Verificados</p>
                            <p className="text-2xl font-bold">{pagination.total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-violet-600 text-white rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <FiShield className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-white/80">Protección Legal</p>
                            <p className="text-2xl font-bold">Activa</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden bg-white rounded-xl border border-[#e9ecef] shadow-sm flex flex-col">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2a63cd]"></div>
                            <span className="text-sm text-[#6a6c6b]">Cargando documentos...</span>
                        </div>
                    </div>
                ) : acceptances.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-[#6a6c6b]">
                        <FiFileText className="w-16 h-16 mb-4 text-[#dee2e6]" />
                        <p className="text-lg font-medium">No hay documentos legales</p>
                        <p className="text-sm">Los clientes aún no han aceptado términos</p>
                    </div>
                ) : (
                    <div className="overflow-auto flex-1">
                        <table className="w-full">
                            <thead className="bg-[#f8f9fa] border-b border-[#e9ecef] sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Usuario</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Cédula</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Contacto</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Versión</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Fecha Aceptación</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e9ecef]">
                                {acceptances.map((acceptance) => (
                                    <tr key={acceptance.id} className="hover:bg-[#f8f9fa] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-full flex items-center justify-center text-white font-bold">
                                                    {acceptance.userName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-[#212529]">{acceptance.userName}</p>
                                                    <p className="text-xs text-[#6a6c6b]">{acceptance.userEmail}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-mono text-[#212529]">
                                                {acceptance.userIdNumber || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {acceptance.userPhone && (
                                                    <span className="text-xs text-[#6a6c6b] flex items-center gap-1">
                                                        <FiPhone className="w-3 h-3" />
                                                        {acceptance.userPhone}
                                                    </span>
                                                )}
                                                {acceptance.userAddress && (
                                                    <span className="text-xs text-[#6a6c6b] flex items-center gap-1">
                                                        <FiMapPin className="w-3 h-3" />
                                                        {acceptance.userAddress.substring(0, 30)}...
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                                                v{acceptance.termsVersion}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-[#212529]">
                                                    {format(new Date(acceptance.acceptedAt), 'dd MMM yyyy', { locale: es })}
                                                </span>
                                                <span className="text-xs text-[#6a6c6b]">
                                                    {format(new Date(acceptance.acceptedAt), 'HH:mm:ss')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setViewingDocument(acceptance)}
                                                className="p-2 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] text-white rounded-lg hover:shadow-lg hover:scale-110 active:scale-95 transition-all"
                                                title="Ver Documento"
                                            >
                                                <FiEye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="p-4 border-t border-[#e9ecef] flex items-center justify-between">
                        <span className="text-sm text-[#6a6c6b]">
                            Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => fetchAcceptances(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className="px-3 py-1 border border-[#dee2e6] rounded-lg text-sm disabled:opacity-50 hover:bg-[#f8f9fa]"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => fetchAcceptances(pagination.page + 1)}
                                disabled={pagination.page === pagination.totalPages}
                                className="px-3 py-1 border border-[#dee2e6] rounded-lg text-sm disabled:opacity-50 hover:bg-[#f8f9fa]"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Document Viewer Modal - Using Portal */}
            {viewingDocument && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:bg-white print:p-0">
                    <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-3xl max-h-[90vh] overflow-hidden flex flex-col print:max-w-none print:max-h-none print:rounded-none print:shadow-none">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white px-6 py-4 flex items-center justify-between print:hidden">
                            <div className="flex items-center gap-3">
                                <FiFileText className="w-6 h-6" />
                                <div>
                                    <h2 className="text-lg font-bold">Constancia de Aceptación</h2>
                                    <p className="text-sm text-white/80">{viewingDocument.userName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={printDocument}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                    title="Imprimir"
                                >
                                    <FiPrinter className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={downloadDocument}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                    title="Descargar"
                                >
                                    <FiDownload className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setViewingDocument(null)}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Document Content */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {/* User Info */}
                            <div>
                                <h3 className="text-sm font-bold text-[#212529] mb-3 flex items-center gap-2">
                                    <FiUser className="w-4 h-4 text-[#2a63cd]" />
                                    Datos del Usuario
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-[#f8f9fa] rounded-lg p-3">
                                        <span className="text-[10px] text-[#6a6c6b] uppercase font-bold tracking-wider">Nombre</span>
                                        <p className="text-sm font-medium text-[#212529]">{viewingDocument.userName}</p>
                                    </div>
                                    <div className="bg-[#f8f9fa] rounded-lg p-3">
                                        <span className="text-[10px] text-[#6a6c6b] uppercase font-bold tracking-wider">Email</span>
                                        <p className="text-sm font-medium text-[#212529]">{viewingDocument.userEmail}</p>
                                    </div>
                                    <div className="bg-[#f8f9fa] rounded-lg p-3">
                                        <span className="text-[10px] text-[#6a6c6b] uppercase font-bold tracking-wider">Cédula</span>
                                        <p className="text-sm font-medium text-[#212529]">{viewingDocument.userIdNumber || 'No proporcionada'}</p>
                                    </div>
                                    <div className="bg-[#f8f9fa] rounded-lg p-3">
                                        <span className="text-[10px] text-[#6a6c6b] uppercase font-bold tracking-wider">Teléfono</span>
                                        <p className="text-sm font-medium text-[#212529]">{viewingDocument.userPhone || 'No proporcionado'}</p>
                                    </div>
                                    <div className="bg-[#f8f9fa] rounded-lg p-3 col-span-2">
                                        <span className="text-[10px] text-[#6a6c6b] uppercase font-bold tracking-wider">Dirección</span>
                                        <p className="text-sm font-medium text-[#212529]">{viewingDocument.userAddress || 'No proporcionada'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Acceptance Details */}
                            <div>
                                <h3 className="text-sm font-bold text-[#212529] mb-3 flex items-center gap-2">
                                    <FiClock className="w-4 h-4 text-[#2a63cd]" />
                                    Detalles de Aceptación
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-[#f8f9fa] rounded-lg p-3">
                                        <span className="text-[10px] text-[#6a6c6b] uppercase font-bold tracking-wider">Fecha y Hora</span>
                                        <p className="text-sm font-medium text-[#212529]">
                                            {format(new Date(viewingDocument.acceptedAt), "dd 'de' MMMM 'de' yyyy, HH:mm:ss", { locale: es })}
                                        </p>
                                    </div>
                                    <div className="bg-[#f8f9fa] rounded-lg p-3">
                                        <span className="text-[10px] text-[#6a6c6b] uppercase font-bold tracking-wider">Versión</span>
                                        <p className="text-sm font-medium text-[#212529]">v{viewingDocument.termsVersion}</p>
                                    </div>
                                    <div className="bg-[#f8f9fa] rounded-lg p-3">
                                        <span className="text-[10px] text-[#6a6c6b] uppercase font-bold tracking-wider">Dirección IP</span>
                                        <p className="text-sm font-medium text-[#212529] font-mono">{viewingDocument.ipAddress || 'No registrada'}</p>
                                    </div>
                                    <div className="bg-[#f8f9fa] rounded-lg p-3">
                                        <span className="text-[10px] text-[#6a6c6b] uppercase font-bold tracking-wider">ID Documento</span>
                                        <p className="text-xs font-medium text-[#212529] font-mono">{viewingDocument.id}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Terms Summary */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <h3 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                                    <FiShield className="w-4 h-4" />
                                    Términos Aceptados
                                </h3>
                                <ul className="text-xs text-blue-800 space-y-1">
                                    <li>• Fondos de origen lícito y legal</li>
                                    <li>• Política de no reembolso aceptada</li>
                                    <li>• Compromiso de información veraz</li>
                                    <li>• Aceptación de verificación de identidad</li>
                                    <li>• Responsabilidad legal asumida</li>
                                </ul>
                            </div>

                            {/* Signature */}
                            <div>
                                <h3 className="text-sm font-bold text-[#212529] mb-3">Firma Digital</h3>
                                <div className="bg-[#f8f9fa] rounded-xl p-4 text-center border-2 border-dashed border-[#2a63cd]">
                                    {viewingDocument.signatureData ? (
                                        <>
                                            <img
                                                src={viewingDocument.signatureData}
                                                alt="Firma Digital"
                                                className="max-w-[300px] mx-auto rounded-lg"
                                            />
                                            <p className="text-sm font-medium text-[#212529] mt-3">{viewingDocument.userName}</p>
                                            <p className="text-xs text-[#6a6c6b]">C.I.: {viewingDocument.userIdNumber || 'N/A'}</p>
                                        </>
                                    ) : (
                                        <p className="text-sm text-[#6a6c6b]">Firma no disponible</p>
                                    )}
                                </div>
                            </div>

                            {/* Legal Notice */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-xs text-yellow-800">
                                <strong>AVISO LEGAL:</strong> Este documento constituye prueba de la aceptación voluntaria
                                de los términos y condiciones por parte del usuario. La firma digital tiene validez legal
                                según la legislación vigente. Este documento puede ser utilizado como evidencia en
                                procedimientos legales.
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
