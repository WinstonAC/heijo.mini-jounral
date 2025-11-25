'use client';

import { useState } from 'react';

interface TagPickerProps {
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

const DEFAULT_TAGS = ['Gratitude', 'Reflection', 'Energy'];

export default function TagPicker({ selectedTags, onTagsChange }: TagPickerProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleTags = showAll ? AVAILABLE_TAGS : DEFAULT_TAGS;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="space-y-2.5">
      <label className="block text-[11px] sm:text-sm font-semibold label-track text-[#4b4b4b]">
        TODAY&apos;S VIBE
      </label>
      
      <div className="flex flex-wrap gap-2">
        {visibleTags.map(tag => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold tracking-[0.08em] rounded-full border transition-all duration-150 ${
              selectedTags.includes(tag)
                ? 'bg-[#181818] text-white border-[#181818] shadow-sm'
                : 'bg-white text-[#4a4a4a] border-[#d9d9d9] hover:border-[#1a1a1a] hover:text-[#1a1a1a]'
            }`}
          >
            {tag}
          </button>
        ))}
        
        {!showAll && AVAILABLE_TAGS.length > DEFAULT_TAGS.length && (
          <button
            onClick={() => setShowAll(true)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold tracking-[0.08em] text-[#5a5a5a] border border-[#d9d9d9] rounded-full hover:border-[#1a1a1a] hover:text-[#1a1a1a] transition-all duration-150"
          >
            + Show more
          </button>
        )}
        
        {showAll && (
          <button
            onClick={() => setShowAll(false)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold tracking-[0.08em] text-[#5a5a5a] border border-[#d9d9d9] rounded-full hover:border-[#1a1a1a] hover:text-[#1a1a1a] transition-all duration-150"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
}



