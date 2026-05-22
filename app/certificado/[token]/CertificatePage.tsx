'use client';

import Link from 'next/link';

type Props = {
  certificateId: string;
  studentName: string;
  completedAt: string;
  course: {
    title: string;
    slug: string;
    category: string | null;
    totalLessons: number;
    instructorName: string;
    instructorAvatar: string | null;
  };
};

export default function CertificatePage({ certificateId, studentName, completedAt, course }: Props) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const certUrl = `${appUrl}/certificado/${certificateId}`;
  const dateStr = new Date(completedAt).toLocaleDateString('es-VE', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(certUrl)}&bgcolor=ffffff&color=1e3a8a&margin=4`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex flex-col">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between print:hidden">
        <Link href="/" className="font-black text-[#2a63cd] text-lg">ElectroShop</Link>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Certificado Verificado
          </span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-[#2a63cd] text-white text-sm font-semibold rounded-lg hover:bg-[#1e4ba3] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir / PDF
          </button>
        </div>
      </nav>

      {/* Certificate */}
      <div className="flex-1 flex items-center justify-center p-6 print:p-0 print:block">
        <div
          id="certificate"
          className="bg-white w-full max-w-3xl shadow-2xl print:shadow-none print:max-w-none"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          {/* Top border decoration */}
          <div style={{ height: 8, background: 'linear-gradient(90deg, #1e3a8a, #2a63cd, #06b6d4, #2a63cd, #1e3a8a)' }} />

          <div className="p-12 print:p-10">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-lg"
                  style={{ background: 'linear-gradient(135deg, #1e3a8a, #2a63cd)' }}
                >
                  E
                </div>
                <div className="text-left">
                  <p style={{ color: '#1e3a8a', fontFamily: 'sans-serif', fontSize: 18, fontWeight: 900, letterSpacing: '0.05em', margin: 0 }}>
                    ELECTRO SHOP
                  </p>
                  <p style={{ color: '#6a6c6b', fontFamily: 'sans-serif', fontSize: 10, margin: 0, letterSpacing: '0.1em' }}>
                    PLATAFORMA DE CURSOS
                  </p>
                </div>
              </div>

              <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #2a63cd40, transparent)', margin: '16px 0' }} />

              <p style={{ color: '#6a6c6b', fontFamily: 'sans-serif', fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 12px' }}>
                Certifica que
              </p>

              <h1 style={{ color: '#1e3a8a', fontSize: 42, fontWeight: 700, margin: '0 0 8px', fontStyle: 'italic' }}>
                {studentName}
              </h1>

              <p style={{ color: '#6a6c6b', fontFamily: 'sans-serif', fontSize: 14, margin: '0 0 20px' }}>
                ha completado satisfactoriamente el curso
              </p>

              <h2 style={{ color: '#212529', fontSize: 26, fontWeight: 700, margin: '0 0 8px', fontStyle: 'normal', fontFamily: 'sans-serif' }}>
                {course.title}
              </h2>

              {course.category && (
                <span style={{ display: 'inline-block', padding: '4px 12px', background: '#eff6ff', color: '#1e40af', borderRadius: 20, fontSize: 12, fontFamily: 'sans-serif', fontWeight: 600 }}>
                  {course.category}
                </span>
              )}
            </div>

            {/* Details row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginTop: 32 }}>
              {/* Left: instructor + date */}
              <div style={{ flex: 1 }}>
                <div style={{ borderTop: '1px solid #e9ecef', paddingTop: 16, marginBottom: 20 }}>
                  <p style={{ color: '#6a6c6b', fontFamily: 'sans-serif', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 6px' }}>
                    Instructor
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {course.instructorAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={course.instructorAvatar} alt={course.instructorName} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #2a63cd, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontFamily: 'sans-serif', fontSize: 14 }}>
                        {course.instructorName[0]}
                      </div>
                    )}
                    <p style={{ color: '#212529', fontFamily: 'sans-serif', fontSize: 15, fontWeight: 700, margin: 0 }}>
                      {course.instructorName}
                    </p>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e9ecef', paddingTop: 16 }}>
                  <p style={{ color: '#6a6c6b', fontFamily: 'sans-serif', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 6px' }}>
                    Fecha de Finalización
                  </p>
                  <p style={{ color: '#212529', fontFamily: 'sans-serif', fontSize: 15, fontWeight: 700, margin: 0 }}>
                    {dateStr}
                  </p>
                </div>
              </div>

              {/* Center: seal */}
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 100, height: 100, borderRadius: '50%', margin: '0 auto',
                  background: 'linear-gradient(135deg, #1e3a8a, #2a63cd)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(42,99,205,0.3)',
                }}>
                  <div style={{ textAlign: 'center', color: 'white' }}>
                    <div style={{ fontSize: 22, fontFamily: 'sans-serif', fontWeight: 900, letterSpacing: '0.05em' }}>ES</div>
                    <div style={{ fontSize: 9, fontFamily: 'sans-serif', fontWeight: 700, letterSpacing: '0.1em' }}>COMPLETADO</div>
                  </div>
                </div>
              </div>

              {/* Right: QR code */}
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ display: 'inline-block', border: '1px solid #e9ecef', borderRadius: 12, padding: 10 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt="QR de verificación" width={100} height={100} />
                  <p style={{ color: '#6a6c6b', fontFamily: 'sans-serif', fontSize: 9, margin: '6px 0 0', textAlign: 'center' }}>
                    Verificar certificado
                  </p>
                </div>
              </div>
            </div>

            {/* Certificate ID */}
            <div style={{ marginTop: 24, padding: '12px 16px', background: '#f8f9fa', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#6a6c6b', fontFamily: 'sans-serif', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 2px' }}>
                  ID de Verificación
                </p>
                <p style={{ color: '#212529', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, margin: 0, wordBreak: 'break-all' }}>
                  {certificateId}
                </p>
              </div>
              <p style={{ color: '#adb5bd', fontFamily: 'sans-serif', fontSize: 10, margin: 0, textAlign: 'right' }}>
                Verificar en:<br />
                <span style={{ color: '#2a63cd' }}>electroshop.com</span>
              </p>
            </div>
          </div>

          {/* Bottom border */}
          <div style={{ height: 8, background: 'linear-gradient(90deg, #1e3a8a, #2a63cd, #06b6d4, #2a63cd, #1e3a8a)' }} />
        </div>
      </div>

      {/* Verification info */}
      <div className="print:hidden text-center py-6 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full">
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-emerald-700 text-sm font-semibold">
            Certificado auténtico emitido por ElectroShop · ID: <span className="font-mono text-xs">{certificateId.slice(0, 8)}...</span>
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body { margin: 0; }
          nav, footer { display: none !important; }
          #certificate { width: 100vw; max-width: 100vw; box-shadow: none; }
        }
      `}</style>
    </div>
  );
}
