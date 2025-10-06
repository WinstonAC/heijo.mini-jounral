'use client';

import { useEffect, useState } from 'react';
import { micEnvProbe } from '@/lib/diagnostics/micProbe';

export default function MicDebugPage() {
  const [probeResult, setProbeResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEBUG !== '1') {
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

  if (process.env.NEXT_PUBLIC_DEBUG !== '1') {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <h1 className="text-2xl mb-4">Diagnostics Disabled</h1>
        <p>Set NEXT_PUBLIC_DEBUG=1 to enable diagnostics.</p>
      </div>
    );
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
