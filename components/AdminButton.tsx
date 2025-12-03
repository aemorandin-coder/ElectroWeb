'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function AdminButton() {
  const { data: session, status } = useSession();
  
  // Don't show anything while loading
  if (status === 'loading') {
    return null;
  }

  const userType = (session?.user as any)?.userType;

  // Only show Admin button if NOT logged in OR if user is admin
  // Hide if customer is logged in
  if (session && userType === 'customer') {
    return null;
  }

  return (
    <Link
      href="/login?redirect=admin"
      className="px-4 py-2 text-sm font-medium text-white bg-[#2a63cd] hover:bg-[#1e4ba3] rounded-lg transition-all duration-300 shadow-md shadow-[#2a63cd]/20 hover:shadow-lg hover:shadow-[#2a63cd]/30 hover:scale-105"
    >
      Admin
    </Link>
  );
}

