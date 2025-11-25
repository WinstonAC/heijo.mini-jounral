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
    <div className="flex flex-wrap items-baseline gap-2 text-[#1f1f1f] mb-2 leading-tight" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <span className="text-[clamp(1rem,2vw,1.125rem)] font-semibold tracking-[0.02em]">
        {day}, {month} {dayNum}, {year}
      </span>
      <span className="text-[#9a9a9a]">•</span>
      <span className="text-[clamp(0.95rem,1.8vw,1.05rem)] font-medium tracking-[0.08em]">
        {timeStr}
      </span>
    </div>
  );
}



