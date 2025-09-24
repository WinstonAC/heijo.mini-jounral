'use client';

import { useState } from 'react';

export default function IntroDebug() {
  const [isVisible, setIsVisible] = useState(false);

  const resetIntro = () => {
    localStorage.removeItem('heijoIntroPlayed');
    window.location.reload();
  };

  const forceIntro = () => {
    localStorage.removeItem('heijoIntroPlayed');
    window.location.href = '/';
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-blue-500 text-white px-3 py-1 rounded text-xs"
      >
        Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
      <div className="text-xs text-gray-600 mb-2">Intro Debug</div>
      <div className="space-y-1">
        <button
          onClick={resetIntro}
          className="block w-full text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
        >
          Reset Intro
        </button>
        <button
          onClick={forceIntro}
          className="block w-full text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
        >
          Force Intro
        </button>
        <button
          onClick={() => setIsVisible(false)}
          className="block w-full text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}
