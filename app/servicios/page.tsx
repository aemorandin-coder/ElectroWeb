import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import PublicHeader from '@/components/public/PublicHeader';
import AnimatedWave from '@/components/AnimatedWave';
import ServiciosClient from './ServiciosClient';

export const revalidate = 0;

export default async function ServiciosPage() {
  const [videos, settings] = await Promise.all([
    prisma.techServiceVideo.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.companySettings.findFirst()
  ]);

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader settings={settings ? JSON.parse(JSON.stringify(settings)) : null} />

      {/* Hero Section - Premium Design */}
      <section className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] overflow-hidden">
        {/* Animated Background Particles */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          {/* Premium Badge */}
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="h-1 w-16 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
            <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <span className="text-sm font-semibold text-white">Servicio Profesional</span>
            </div>
            <div className="h-1 w-16 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
            Servicio Técnico <span className="bg-gradient-to-r from-cyan-200 to-purple-200 bg-clip-text text-transparent">Especializado</span>
          </h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Reparación y mantenimiento de laptops, PCs, consolas y equipos gaming. Más de 10 años de experiencia respaldándonos.
          </p>
        </div>

        {/* Animated Wave Divider */}
        <AnimatedWave />
      </section>

      {/* Services Content & Videos */}
      <ServiciosClient videos={JSON.parse(JSON.stringify(videos))} />
    </div>
  );
}
