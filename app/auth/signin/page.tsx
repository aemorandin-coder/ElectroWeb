'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'customer' | 'admin'>('customer');

  const callbackUrl = searchParams.get('callbackUrl') || (userType === 'admin' ? '/admin' : '/customer');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('unified-credentials', {
        email,
        password,
        userType,
        redirect: false,
      });

      if (result?.error) {
        setError('Credenciales inválidas. Por favor verifica tu email y contraseña.');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      setError('Ocurrió un error. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a8a] via-[#2563eb] to-[#1e4ba3] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 animate-scaleIn">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-[#212529] mb-2">Iniciar Sesión</h1>
            <p className="text-[#6a6c6b]">Bienvenido de vuelta</p>
          </div>

          {/* User Type Toggle */}
          <div className="flex gap-2 mb-6 p-1 bg-[#f8f9fa] rounded-xl">
            <button
              type="button"
              onClick={() => setUserType('customer')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                userType === 'customer'
                  ? 'bg-white text-[#2a63cd] shadow-md'
                  : 'text-[#6a6c6b] hover:text-[#212529]'
              }`}
            >
              Cliente
            </button>
            <button
              type="button"
              onClick={() => setUserType('admin')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                userType === 'admin'
                  ? 'bg-white text-[#2a63cd] shadow-md'
                  : 'text-[#6a6c6b] hover:text-[#212529]'
              }`}
            >
              Administrador
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-shake">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[#212529] mb-2">
                Email
              </label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6a6c6b]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3 border border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent transition-all"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-[#212529] mb-2">
                Contraseña
              </label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6a6c6b]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-12 py-3 border border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6a6c6b] hover:text-[#212529] transition-colors"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-xl hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center space-y-2">
            <Link href="/" className="block text-sm text-[#2a63cd] hover:underline">
              Volver a la tienda
            </Link>
            {userType === 'customer' && (
              <p className="text-sm text-[#6a6c6b]">
                ¿No tienes cuenta?{' '}
                <Link href="/auth/signup" className="text-[#2a63cd] hover:underline font-medium">
                  Regístrate
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
