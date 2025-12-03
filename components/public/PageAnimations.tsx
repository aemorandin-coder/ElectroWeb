'use client';

export default function PageAnimations() {
    return (
        <style jsx global>{`
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes shine {
        0% {
          background-position: -200% -200%;
        }
        100% {
          background-position: 200% 200%;
        }
      }
    `}</style>
    );
}
