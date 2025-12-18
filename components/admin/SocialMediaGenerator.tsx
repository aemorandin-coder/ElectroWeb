'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import {
    FiDownload, FiRefreshCw, FiImage, FiLayers,
    FiSearch, FiCheck, FiDollarSign, FiPercent,
    FiZap, FiPackage, FiInstagram, FiType,
    FiStar, FiTrendingUp, FiClock, FiAward, FiTag,
    FiCpu, FiHash, FiMessageCircle, FiKey, FiEye, FiEyeOff,
    FiLayout, FiSave, FiBox
} from 'react-icons/fi';

interface Product {
    id: string;
    name: string;
    priceUSD: number;
    mainImage: string | null;
    images: string;
    category: { name: string };
    stock: number;
}

interface CompanySettings {
    companyName: string;
    logo: string | null;
    primaryColor: string;
    tagline: string | null;
    instagram: string | null;
}

interface Template {
    id: string;
    name: string;
    gradient: string;
    gradientClass: string;
    accent: string;
    textBg: string;
}

// Quick phrases
const QUICK_PHRASES = ['OFERTA', 'NUEVO', 'HOT', 'EXCLUSIVO', 'TOP'];

// Badges - simple
const BADGES = [
    { id: 'none', label: 'Sin Badge', icon: null, gradient: '' },
    { id: 'hot', label: 'HOT', icon: FiTrendingUp, gradient: 'linear-gradient(135deg, #ef4444, #f97316)' },
    { id: 'new', label: 'NEW', icon: FiStar, gradient: 'linear-gradient(135deg, #22c55e, #10b981)' },
    { id: 'sale', label: 'SALE', icon: FiTag, gradient: 'linear-gradient(135deg, #a855f7, #ec4899)' },
    { id: 'top', label: 'TOP', icon: FiAward, gradient: 'linear-gradient(135deg, #f59e0b, #eab308)' },
    { id: 'limited', label: 'LIMITED', icon: FiClock, gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)' },
];

// Templates with HEX colors
const TEMPLATES: Template[] = [
    { id: 'offer', name: 'Oferta', gradient: 'linear-gradient(135deg, #e11d48, #dc2626, #ea580c)', gradientClass: 'from-rose-600 via-red-500 to-orange-500', accent: '#fbbf24', textBg: 'rgba(0,0,0,0.4)' },
    { id: 'product', name: 'Producto', gradient: 'linear-gradient(135deg, #2563eb, #4f46e5, #9333ea)', gradientClass: 'from-blue-600 via-indigo-600 to-purple-600', accent: '#60a5fa', textBg: 'rgba(255,255,255,0.2)' },
    { id: 'promo', name: 'Promo', gradient: 'linear-gradient(135deg, #9333ea, #ec4899, #e11d48)', gradientClass: 'from-purple-600 via-pink-500 to-rose-500', accent: '#c084fc', textBg: 'rgba(0,0,0,0.3)' },
    { id: 'new', name: 'Nuevo', gradient: 'linear-gradient(135deg, #10b981, #14b8a6, #06b6d4)', gradientClass: 'from-emerald-500 via-teal-500 to-cyan-500', accent: '#34d399', textBg: 'rgba(255,255,255,0.25)' },
    { id: 'flash', name: 'Flash', gradient: 'linear-gradient(135deg, #f59e0b, #f97316, #dc2626)', gradientClass: 'from-amber-500 via-orange-500 to-red-500', accent: '#fcd34d', textBg: 'rgba(0,0,0,0.4)' },
    { id: 'vip', name: 'VIP', gradient: 'linear-gradient(135deg, #1e293b, #334155, #0f172a)', gradientClass: 'from-slate-800 via-slate-700 to-slate-900', accent: '#fbbf24', textBg: 'rgba(245,158,11,0.3)' },
    { id: 'hot', name: 'Hot', gradient: 'linear-gradient(135deg, #dc2626, #f43f5e, #db2777)', gradientClass: 'from-red-600 via-rose-500 to-pink-600', accent: '#ffffff', textBg: 'rgba(0,0,0,0.4)' },
    { id: 'minimal', name: 'Minimal', gradient: 'linear-gradient(135deg, #111827, #1f2937, #000000)', gradientClass: 'from-gray-900 via-gray-800 to-black', accent: '#ffffff', textBg: 'rgba(255,255,255,0.1)' },
];

// Format options
const FORMATS = [
    { id: 'story', name: 'Story', width: 1080, height: 1920, ratio: '9:16' },
    { id: 'post', name: 'Post', width: 1080, height: 1080, ratio: '1:1' },
];

export default function SocialMediaGenerator() {
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [settings, setSettings] = useState<CompanySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Generator state
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<Template>(TEMPLATES[0]);
    const [selectedFormat, setSelectedFormat] = useState(FORMATS[0]);
    const [customText, setCustomText] = useState('');
    const [discountPercent, setDiscountPercent] = useState<number>(0);
    const [showPrice, setShowPrice] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [selectedBadge, setSelectedBadge] = useState(BADGES[0]);
    const [showLogo, setShowLogo] = useState(true);
    const [showInstagram, setShowInstagram] = useState(true);
    const [textPosition, setTextPosition] = useState<'top' | 'bottom'>('top');

    // AI state
    const [aiLoading, setAiLoading] = useState(false);
    const [aiApiKey, setAiApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [aiConfigured, setAiConfigured] = useState(false);

    // Caption
    const [captionText, setCaptionText] = useState('');
    const [hashtagText, setHashtagText] = useState('');

    const canvasRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchData();
        // Load API key from localStorage
        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) {
            setAiApiKey(savedKey);
            setAiConfigured(true);
        }
    }, []);

    useEffect(() => {
        if (searchQuery) {
            const filtered = products.filter(p =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.category?.name?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredProducts(filtered);
        } else {
            setFilteredProducts(products);
        }
    }, [searchQuery, products]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [productsRes, settingsRes] = await Promise.all([
                fetch('/api/products?status=published'),
                fetch('/api/settings/public')
            ]);

            if (productsRes.ok) {
                const data = await productsRes.json();
                const productList = Array.isArray(data) ? data : (data.products || []);
                setProducts(productList);
                setFilteredProducts(productList);
            }

            if (settingsRes.ok) {
                const data = await settingsRes.json();
                setSettings(data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const saveApiKey = () => {
        if (aiApiKey.trim()) {
            localStorage.setItem('gemini_api_key', aiApiKey.trim());
            setAiConfigured(true);
            toast.success('API Key guardada');
        }
    };

    const getProductImage = (product: Product): string => {
        if (product.mainImage) return product.mainImage;
        try {
            const images = JSON.parse(product.images || '[]');
            return images[0] || '/placeholder.png';
        } catch {
            return '/placeholder.png';
        }
    };

    const calculateDiscountedPrice = (price: number): number => {
        if (discountPercent <= 0) return price;
        return price * (1 - discountPercent / 100);
    };

    const formatPrice = (price: number): string => {
        return new Intl.NumberFormat('es-VE', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(price);
    };

    const generateWithAI = async () => {
        if (!selectedProduct) {
            toast.error('Selecciona un producto');
            return;
        }
        if (!aiApiKey) {
            toast.error('Configura tu API Key de Gemini');
            return;
        }

        setAiLoading(true);
        try {
            // Direct Gemini API call using the stored key
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${aiApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Genera contenido para Instagram Story de este producto:
Producto: ${selectedProduct.name}
Precio: $${selectedProduct.priceUSD} USD
Categoria: ${selectedProduct.category?.name || 'General'}

Responde SOLO con JSON (sin markdown):
{"headline":"TEXTO CORTO MAX 15 CHARS","caption":"Caption de max 100 chars con emojis","hashtags":["5 hashtags sin #"]}`
                        }]
                    }]
                })
            });

            if (response.ok) {
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                try {
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        setCustomText(parsed.headline || 'OFERTA');
                        setCaptionText(parsed.caption || '');
                        setHashtagText(parsed.hashtags?.map((h: string) => `#${h}`).join(' ') || '');
                        toast.success('Contenido generado');
                    }
                } catch { toast.error('Error al parsear respuesta'); }
            } else {
                toast.error('Error de API - verifica tu key');
            }
        } catch (error) {
            toast.error('Error de conexion');
        } finally {
            setAiLoading(false);
        }
    };

    const downloadImage = async () => {
        if (!canvasRef.current || !selectedProduct) return;

        setGenerating(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(canvasRef.current, {
                scale: 4,
                useCORS: true,
                allowTaint: true,
                backgroundColor: null,
            });

            const link = document.createElement('a');
            link.download = `${selectedFormat.id}-${selectedProduct.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();

            toast.success('Descargado en HD');
        } catch (error) {
            toast.error('Error al generar');
        } finally {
            setGenerating(false);
        }
    };

    const copyCaption = () => {
        const fullCaption = `${captionText}\n\n${hashtagText}`;
        navigator.clipboard.writeText(fullCaption);
        toast.success('Copiado');
    };

    const canvasSize = selectedFormat.id === 'post' ? { width: 270, height: 270 } : { width: 270, height: 480 };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <FiRefreshCw className="w-6 h-6 text-[#2a63cd] animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Header simple */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#2a63cd] rounded-lg flex items-center justify-center">
                        <FiInstagram className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-[#212529]">Generador Social</h2>
                        <p className="text-[10px] text-[#6a6c6b]">{products.length} productos</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-3">
                {/* Left Panel - Controls */}
                <div className="col-span-5 space-y-2">

                    {/* AI Config */}
                    <div className="bg-white rounded-lg border border-[#e9ecef] p-2">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <FiCpu className="w-3.5 h-3.5 text-[#2a63cd]" />
                            <span className="text-[10px] font-bold text-[#212529]">Gemini AI</span>
                            {aiConfigured && <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>}
                        </div>
                        <div className="flex gap-1">
                            <div className="flex-1 relative">
                                <FiKey className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#6a6c6b]" />
                                <input
                                    type={showApiKey ? 'text' : 'password'}
                                    value={aiApiKey}
                                    onChange={(e) => setAiApiKey(e.target.value)}
                                    placeholder="API Key..."
                                    className="w-full pl-7 pr-7 py-1 text-[10px] border border-[#e9ecef] rounded focus:ring-1 focus:ring-[#2a63cd]/20"
                                />
                                <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6a6c6b] hover:text-[#2a63cd]">
                                    {showApiKey ? <FiEyeOff className="w-3 h-3" /> : <FiEye className="w-3 h-3" />}
                                </button>
                            </div>
                            <button onClick={saveApiKey} className="px-2 py-1 bg-[#2a63cd] text-white rounded text-[10px] hover:bg-[#1e4ba3]" title="Guardar">
                                <FiSave className="w-3 h-3" />
                            </button>
                            <button
                                onClick={generateWithAI}
                                disabled={!selectedProduct || aiLoading || !aiConfigured}
                                className="px-2 py-1 bg-[#2a63cd] text-white rounded text-[10px] hover:bg-[#1e4ba3] disabled:opacity-50"
                                title="Generar con IA"
                            >
                                {aiLoading ? <FiRefreshCw className="w-3 h-3 animate-spin" /> : <FiZap className="w-3 h-3" />}
                            </button>
                        </div>
                    </div>

                    {/* Product Selection */}
                    <div className="bg-white rounded-lg border border-[#e9ecef] p-2">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <FiPackage className="w-3.5 h-3.5 text-[#2a63cd]" />
                            <span className="text-[10px] font-bold text-[#212529]">Producto</span>
                        </div>
                        <div className="relative mb-1.5">
                            <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#6a6c6b]" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar..."
                                className="w-full pl-7 pr-2 py-1 text-[10px] border border-[#e9ecef] rounded focus:ring-1 focus:ring-[#2a63cd]/20"
                            />
                        </div>
                        <div className="grid grid-cols-5 gap-1 max-h-20 overflow-y-auto">
                            {filteredProducts.slice(0, 15).map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => setSelectedProduct(product)}
                                    className={`relative aspect-square rounded overflow-hidden border-2 transition-all hover:scale-105 ${selectedProduct?.id === product.id ? 'border-[#2a63cd]' : 'border-transparent'}`}
                                    title={product.name}
                                >
                                    <Image src={getProductImage(product)} alt={product.name} fill className="object-cover" />
                                    {selectedProduct?.id === product.id && (
                                        <div className="absolute inset-0 bg-[#2a63cd]/30 flex items-center justify-center">
                                            <FiCheck className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Format & Template in one row */}
                    <div className="grid grid-cols-2 gap-2">
                        {/* Format */}
                        <div className="bg-white rounded-lg border border-[#e9ecef] p-2">
                            <div className="flex items-center gap-1 mb-1">
                                <FiLayout className="w-3 h-3 text-[#2a63cd]" />
                                <span className="text-[9px] font-bold text-[#212529]">Formato</span>
                            </div>
                            <div className="flex gap-1">
                                {FORMATS.map((f) => (
                                    <button
                                        key={f.id}
                                        onClick={() => setSelectedFormat(f)}
                                        className={`flex-1 py-1 text-[9px] rounded border transition-all hover:border-[#2a63cd] ${selectedFormat.id === f.id ? 'bg-[#2a63cd] text-white border-[#2a63cd]' : 'border-[#e9ecef]'}`}
                                    >
                                        {f.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Text Position */}
                        <div className="bg-white rounded-lg border border-[#e9ecef] p-2">
                            <div className="flex items-center gap-1 mb-1">
                                <FiType className="w-3 h-3 text-[#2a63cd]" />
                                <span className="text-[9px] font-bold text-[#212529]">Texto</span>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => setTextPosition('top')} className={`flex-1 py-1 text-[9px] rounded border transition-all hover:border-[#2a63cd] ${textPosition === 'top' ? 'bg-[#2a63cd] text-white border-[#2a63cd]' : 'border-[#e9ecef]'}`}>Arriba</button>
                                <button onClick={() => setTextPosition('bottom')} className={`flex-1 py-1 text-[9px] rounded border transition-all hover:border-[#2a63cd] ${textPosition === 'bottom' ? 'bg-[#2a63cd] text-white border-[#2a63cd]' : 'border-[#e9ecef]'}`}>Abajo</button>
                            </div>
                        </div>
                    </div>

                    {/* Template */}
                    <div className="bg-white rounded-lg border border-[#e9ecef] p-2">
                        <div className="flex items-center gap-1.5 mb-1">
                            <FiLayers className="w-3.5 h-3.5 text-[#2a63cd]" />
                            <span className="text-[10px] font-bold text-[#212529]">Plantilla</span>
                        </div>
                        <div className="grid grid-cols-8 gap-1">
                            {TEMPLATES.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedTemplate(t)}
                                    className={`aspect-[9/16] rounded border-2 transition-all hover:scale-110 bg-gradient-to-br ${t.gradientClass} ${selectedTemplate.id === t.id ? 'border-[#212529] scale-90' : 'border-transparent'}`}
                                    title={t.name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Custom Text */}
                    <div className="bg-white rounded-lg border border-[#e9ecef] p-2">
                        <input
                            type="text"
                            value={customText}
                            onChange={(e) => setCustomText(e.target.value.toUpperCase().slice(0, 20))}
                            placeholder="TEXTO PRINCIPAL"
                            maxLength={20}
                            className="w-full px-2 py-1 text-[10px] border border-[#e9ecef] rounded text-center font-bold uppercase focus:ring-1 focus:ring-[#2a63cd]/20 mb-1"
                        />
                        <div className="flex gap-1 flex-wrap">
                            {QUICK_PHRASES.map((p) => (
                                <button key={p} onClick={() => setCustomText(p)} className={`px-2 py-0.5 text-[8px] rounded border transition-all hover:border-[#2a63cd] ${customText === p ? 'bg-[#2a63cd] text-white border-[#2a63cd]' : 'border-[#e9ecef]'}`}>{p}</button>
                            ))}
                        </div>
                    </div>

                    {/* Badge */}
                    <div className="bg-white rounded-lg border border-[#e9ecef] p-2">
                        <div className="flex items-center gap-1 mb-1">
                            <FiAward className="w-3 h-3 text-[#2a63cd]" />
                            <span className="text-[9px] font-bold text-[#212529]">Badge</span>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                            {BADGES.map((b) => (
                                <button
                                    key={b.id}
                                    onClick={() => setSelectedBadge(b)}
                                    className={`px-2 py-0.5 text-[8px] rounded border transition-all hover:border-[#2a63cd] ${selectedBadge.id === b.id ? 'bg-[#2a63cd] text-white border-[#2a63cd]' : 'border-[#e9ecef]'}`}
                                    title={b.label}
                                >
                                    {b.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Price & Options - Compact */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white rounded-lg border border-[#e9ecef] p-2">
                            <div className="flex items-center gap-1 mb-1">
                                <FiPercent className="w-3 h-3 text-[#2a63cd]" />
                                <span className="text-[9px] font-bold text-[#212529]">Descuento</span>
                            </div>
                            <input
                                type="number"
                                value={discountPercent}
                                onChange={(e) => setDiscountPercent(Math.min(99, Math.max(0, parseInt(e.target.value) || 0)))}
                                min={0} max={99}
                                className="w-full px-2 py-1 text-[10px] border border-[#e9ecef] rounded text-center"
                            />
                        </div>
                        <div className="bg-white rounded-lg border border-[#e9ecef] p-2">
                            <div className="flex items-center gap-1 mb-1">
                                <FiBox className="w-3 h-3 text-[#2a63cd]" />
                                <span className="text-[9px] font-bold text-[#212529]">Opciones</span>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => setShowPrice(!showPrice)} className={`flex-1 p-1 rounded border transition-all hover:border-[#2a63cd] ${showPrice ? 'bg-[#2a63cd] text-white border-[#2a63cd]' : 'border-[#e9ecef]'}`} title="Mostrar Precio">
                                    <FiDollarSign className="w-3 h-3 mx-auto" />
                                </button>
                                <button onClick={() => setShowLogo(!showLogo)} className={`flex-1 p-1 rounded border transition-all hover:border-[#2a63cd] ${showLogo ? 'bg-[#2a63cd] text-white border-[#2a63cd]' : 'border-[#e9ecef]'}`} title="Mostrar Logo">
                                    <FiImage className="w-3 h-3 mx-auto" />
                                </button>
                                <button onClick={() => setShowInstagram(!showInstagram)} className={`flex-1 p-1 rounded border transition-all hover:border-[#2a63cd] ${showInstagram ? 'bg-[#2a63cd] text-white border-[#2a63cd]' : 'border-[#e9ecef]'}`} title="Mostrar Instagram">
                                    <FiInstagram className="w-3 h-3 mx-auto" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Caption (AI Generated) */}
                    {(captionText || hashtagText) && (
                        <div className="bg-white rounded-lg border border-[#e9ecef] p-2">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1">
                                    <FiMessageCircle className="w-3 h-3 text-[#2a63cd]" />
                                    <span className="text-[9px] font-bold text-[#212529]">Caption IA</span>
                                </div>
                                <button onClick={copyCaption} className="text-[8px] text-[#2a63cd] hover:underline">Copiar</button>
                            </div>
                            <p className="text-[9px] text-[#6a6c6b] mb-1">{captionText}</p>
                            <p className="text-[8px] text-[#2a63cd]">{hashtagText}</p>
                        </div>
                    )}

                    {/* Download */}
                    <button
                        onClick={downloadImage}
                        disabled={!selectedProduct || generating}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-[#2a63cd] text-white font-bold text-xs rounded-lg hover:bg-[#1e4ba3] transition-all disabled:opacity-50"
                    >
                        {generating ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiDownload className="w-4 h-4" />}
                        Descargar {selectedFormat.name} HD
                    </button>
                </div>

                {/* Right Panel - Preview */}
                <div className="col-span-7">
                    <div className="bg-white rounded-lg border border-[#e9ecef] overflow-hidden">
                        <div className="px-2 py-1.5 border-b border-[#e9ecef] flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                <FiImage className="w-3 h-3 text-[#2a63cd]" />
                                <span className="text-[10px] font-bold text-[#212529]">Preview</span>
                            </div>
                            <span className="text-[8px] text-[#6a6c6b]">{selectedFormat.width}x{selectedFormat.height}</span>
                        </div>
                        <div className="p-3 flex justify-center bg-[#f8f9fa] min-h-[500px]">
                            {/* Canvas */}
                            <div
                                ref={canvasRef}
                                style={{
                                    position: 'relative',
                                    borderRadius: 16,
                                    overflow: 'hidden',
                                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                                    width: canvasSize.width,
                                    height: canvasSize.height,
                                    fontFamily: 'system-ui, -apple-system, sans-serif',
                                    background: selectedTemplate.gradient
                                }}
                            >
                                {/* Background */}
                                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                                    <div style={{ position: 'absolute', top: -64, right: -64, width: 192, height: 192, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(48px)' }} />
                                    <div style={{ position: 'absolute', bottom: -64, left: -64, width: 160, height: 160, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(32px)' }} />
                                </div>

                                {/* Top */}
                                <div style={{ position: 'relative', zIndex: 10, padding: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                        {showLogo && (
                                            settings?.logo ? (
                                                <div style={{ position: 'relative', width: 40, height: 40, background: '#ffffff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                                    <Image src={settings.logo} alt="Logo" fill className="object-contain p-1" />
                                                </div>
                                            ) : (
                                                <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.25)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <span style={{ color: '#ffffff', fontWeight: 900, fontSize: 14 }}>{settings?.companyName?.charAt(0) || 'E'}</span>
                                                </div>
                                            )
                                        )}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                            {discountPercent > 0 && (
                                                <div style={{ padding: '4px 10px', background: '#ffffff', borderRadius: 9999 }}>
                                                    <span style={{ fontWeight: 900, fontSize: 14, color: selectedTemplate.accent }}>-{discountPercent}%</span>
                                                </div>
                                            )}
                                            {selectedBadge.id !== 'none' && (
                                                <div style={{ padding: '2px 8px', background: selectedBadge.gradient, borderRadius: 9999, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <span style={{ color: '#ffffff', fontWeight: 700, fontSize: 9 }}>{selectedBadge.label}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {customText && textPosition === 'top' && (
                                        <div style={{ marginTop: 12, textAlign: 'center' }}>
                                            <span style={{ display: 'inline-block', padding: '8px 16px', background: selectedTemplate.textBg, borderRadius: 12, color: '#ffffff', fontWeight: 900, fontSize: 14, letterSpacing: '0.05em', textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
                                                {customText}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Center */}
                                <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
                                    {selectedProduct ? (
                                        <div style={{ position: 'relative', background: '#ffffff', borderRadius: 16, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', width: selectedFormat.id === 'post' ? 160 : 170, height: selectedFormat.id === 'post' ? 160 : 170, padding: 8 }}>
                                            <Image src={getProductImage(selectedProduct)} alt={selectedProduct.name} fill className="object-contain p-2" />
                                        </div>
                                    ) : (
                                        <div style={{ width: 160, height: 160, background: 'rgba(255,255,255,0.1)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255,255,255,0.3)' }}>
                                            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                                                <FiImage style={{ width: 32, height: 32, margin: '0 auto 8px' }} />
                                                <p style={{ fontSize: 9 }}>Selecciona producto</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom */}
                                <div style={{ position: 'relative', zIndex: 10, padding: 16, background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.4), transparent)' }}>
                                    {customText && textPosition === 'bottom' && (
                                        <div style={{ marginBottom: 8, textAlign: 'center' }}>
                                            <span style={{ display: 'inline-block', padding: '6px 12px', background: selectedTemplate.textBg, borderRadius: 8, color: '#ffffff', fontWeight: 900, fontSize: 12, textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
                                                {customText}
                                            </span>
                                        </div>
                                    )}
                                    {selectedProduct && (
                                        <>
                                            <h3 style={{ color: '#ffffff', fontWeight: 700, fontSize: 14, lineHeight: 1.25, marginBottom: 4, textShadow: '0 2px 4px rgba(0,0,0,0.3)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                {selectedProduct.name}
                                            </h3>
                                            {showPrice && (
                                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                                                    {discountPercent > 0 && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textDecoration: 'line-through' }}>{formatPrice(selectedProduct.priceUSD)}</span>}
                                                    <span style={{ color: '#ffffff', fontWeight: 900, fontSize: 20, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{formatPrice(calculateDiscountedPrice(selectedProduct.priceUSD))}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8, fontWeight: 500 }}>{settings?.companyName || 'Electro Shop'}</span>
                                        {showInstagram && settings?.instagram && (
                                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8, display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <FiInstagram style={{ width: 10, height: 10 }} />
                                                @{settings.instagram.replace('@', '')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
