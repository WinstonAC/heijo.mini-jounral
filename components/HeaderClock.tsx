'use client';

import { useState, useEffect } from 'react';

export default function HeaderClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    const day = date.toLocaleDateString('en-US', { weekday: 'long' });
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const dayNum = date.getDate();
    const year = date.getFullYear();
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    return { day, month, dayNum, year, time: timeStr };
  };

  const { day, month, dayNum, year, time: timeStr } = formatTime(time);

  return (
    <div className="text-[#1A1A1A] text-lg sm:text-xl tracking-wide whitespace-nowrap mb-4" style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
      <span className="font-semibold">{day}, {month} {dayNum}, {year}</span>
      <span className="mx-2 text-[#8A8A8A]">•</span>
      <span className="font-semibold">{timeStr}</span>
    </div>
  );
}



