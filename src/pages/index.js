import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to /chat
    router.replace('/chat');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center pixel-text">
      <div className="nes-container is-dark">
        <p>Redirecting to FUDSCAN...</p>
      </div>
    </div>
  );
}
