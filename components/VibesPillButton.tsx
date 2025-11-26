'use client';

import { useState, useEffect } from 'react';

interface VibesPillButtonProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

const AVAILABLE_TAGS = [
  'Gratitude',
  'Reflection', 
  'Energy',
  'Growth',
  'Challenge',
  'Joy',
  'Future',
  'Connection',
  'Creativity',
  'Mindfulness',
  'Accomplishment'
];

export default function VibesPillButton({ selectedTags, onTagsChange }: VibesPillButtonProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Debug: Log when component renders
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[VibesPillButton] Component rendered', { selectedTagsCount: selectedTags.length });
    }
  }, [selectedTags.length]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <>
      {/* Vibes Pill Button - bottom-left */}
      <button
        onClick={() => setIsDrawerOpen(true)}
        className="absolute bottom-4 left-4 px-4 py-2 rounded-full bg-white/95 backdrop-blur-sm border border-[#d9d9d9] shadow-[0_2px_8px_rgba(0,0,0,0.1)] text-xs font-semibold tracking-[0.08em] text-[#4a4a4a] hover:text-[#1a1a1a] hover:border-[#1a1a1a] transition-all duration-200 z-20 pointer-events-auto"
        style={{ zIndex: 20 }}
      >
        {selectedTags.length > 0 ? `${selectedTags.length} Vibes` : 'Vibes'}
      </button>

      {/* Vibes Drawer - slides down from top */}
      {isDrawerOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setIsDrawerOpen(false)}
          />
          
          {/* Drawer */}
          <div className="fixed top-0 left-0 right-0 bg-white z-50 md:hidden shadow-[0_4px_12px_rgba(0,0,0,0.15)] animate-slide-down">
            <div className="max-w-[420px] mx-auto px-4 py-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold tracking-[0.08em] uppercase text-[#2a2a2a]">
                  Today&apos;s Vibe
                </h2>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-[#4a4a4a] hover:text-[#1a1a1a] transition-colors"
                  aria-label="Close"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Tags Grid */}
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-4 py-2 text-xs font-semibold tracking-[0.08em] rounded-full border transition-all duration-150 ${
                      selectedTags.includes(tag)
                        ? 'bg-[#181818] text-white border-[#181818] shadow-sm'
                        : 'bg-white text-[#4a4a4a] border-[#d9d9d9] hover:border-[#1a1a1a] hover:text-[#1a1a1a]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

