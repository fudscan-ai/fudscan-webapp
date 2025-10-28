import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ChatPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to root - chat is now at /
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <p>Redirecting to FUDSCAN...</p>
      </div>
    </div>
  );
}
