'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PublicPageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  useEffect(() => {
    if (pathname !== prevPathname) {
      setIsTransitioning(true);

      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setPrevPathname(pathname);
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [pathname, prevPathname]);

  return (
    <div
      className={`transition-all duration-400 ${
        isTransitioning
          ? 'opacity-0 scale-[0.98] translate-y-2'
          : 'opacity-100 scale-100 translate-y-0'
      }`}
      style={{
        transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {children}
    </div>
  );
}
