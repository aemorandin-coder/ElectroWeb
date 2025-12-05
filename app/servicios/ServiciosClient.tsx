'use client';

import Link from 'next/link';
import Image from 'next/image';

interface TechServiceVideo {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnail?: string;
  customerName?: string;
  testimonial?: string;
}

interface ServiciosClientProps {
  videos: TechServiceVideo[];
}

export default function ServiciosClient({ videos }: ServiciosClientProps) {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {videos.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No hay videos disponibles</h3>
          <p className="text-gray-500">Vuelve más tarde para ver nuestros trabajos técnicos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {videos.map((video) => (
            <div
              key={video.id}
              className="group bg-white rounded-2xl border border-gray-200 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              {/* Video Thumbnail */}
              <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                {video.thumbnail ? (
                  <Image
                    src={video.thumbnail}
                    alt={video.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-[#2a63cd] ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-lg font-bold text-[#212529] mb-2 line-clamp-2 group-hover:text-[#2a63cd] transition-colors">
                  {video.title}
                </h3>
                <p className="text-sm text-[#6a6c6b] mb-4 line-clamp-3">
                  {video.description}
                </p>

                {/* Customer Testimonial */}
                {video.customerName && video.testimonial && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                    <p className="text-xs text-[#212529] italic mb-2 line-clamp-2">
                      "{video.testimonial}"
                    </p>
                    <p className="text-xs font-bold text-[#2a63cd]">
                      - {video.customerName}
                    </p>
                  </div>
                )}

                {/* Watch Button */}
                <a
                  href={video.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all hover:scale-105"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Ver Video
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Section */}
      <div className="mt-16 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-200 p-8 text-center">
        <h2 className="text-2xl font-bold text-[#212529] mb-4">
          ¿Necesitas servicio técnico?
        </h2>
        <p className="text-[#6a6c6b] mb-6 max-w-2xl mx-auto">
          Ofrecemos servicio técnico especializado en computadoras, laptops, y equipos gaming. ¡Contáctanos para una cotización!
        </p>
        <Link
          href="/contacto"
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-xl hover:shadow-2xl transition-all hover:scale-105"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Contactar Ahora
        </Link>
      </div>
    </main>
  );
}
