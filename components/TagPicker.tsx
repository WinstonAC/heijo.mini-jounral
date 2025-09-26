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
    <div className="space-y-4">
      <label className="block text-sm sm:text-base font-semibold relative" style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
        <span className="relative z-10 bg-gradient-to-r from-[#1A1A1A] via-[#4A4A4A] to-[#1A1A1A] bg-clip-text text-transparent">
          Today’s Vibe
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E8E8E8] to-transparent opacity-30 blur-sm"></div>
      </label>
      
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {visibleTags.map(tag => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg border-2 transition-all duration-100 ${
              selectedTags.includes(tag)
                ? 'bg-[#2A2A2A] text-[#E8E8E8] border-[#C7C7C7]'
                : 'bg-[#F8F8F8] text-[#8A8A8A] border-[#C7C7C7] hover:bg-[#2A2A2A] hover:text-[#E8E8E8]'
            }`}
            style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}
          >
            {tag}
          </button>
        ))}
        
        {!showAll && AVAILABLE_TAGS.length > DEFAULT_TAGS.length && (
          <button
            onClick={() => setShowAll(true)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#8A8A8A] border-2 border-[#C7C7C7] rounded-lg hover:bg-[#2A2A2A] hover:text-[#E8E8E8] transition-all duration-100"
            style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}
          >
            + Show more
          </button>
        )}
        
        {showAll && (
          <button
            onClick={() => setShowAll(false)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#8A8A8A] border-2 border-[#C7C7C7] rounded-lg hover:bg-[#2A2A2A] hover:text-[#E8E8E8] transition-all duration-100"
            style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
}



