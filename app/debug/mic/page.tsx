'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { micEnvProbe } from '@/lib/diagnostics/micProbe';

const DEBUG_UI = process.env.NEXT_PUBLIC_DEBUG_UI === '1';

export default function MicDebugPage() {
  const [probeResult, setProbeResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!DEBUG_UI) {
      setLoading(false);
      return;
    }

    const runProbe = async () => {
      try {
        const result = await micEnvProbe();
        setProbeResult(result);
      } catch (error) {
        console.error('Mic probe failed:', error);
        setProbeResult({ error: String(error) });
      } finally {
        setLoading(false);
      }
    };

    runProbe();
  }, []);

  if (!DEBUG_UI) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <h1 className="text-2xl mb-4">Microphone Diagnostics</h1>
        <p>Running probe...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl mb-4">Microphone Diagnostics</h1>
      <div className="bg-gray-900 p-4 rounded-lg">
        <h2 className="text-lg mb-2">Environment Probe Results:</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(probeResult, null, 2)}
        </pre>
      </div>
    </div>
  );
}
