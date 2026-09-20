'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReviewPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-sm text-gray-600">Redirecting to home...</p>
      </div>
    </div>
  );
}
