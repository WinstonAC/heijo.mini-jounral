'use client';

import { useState, useEffect } from 'react';
import { JournalEntry } from '@/lib/store';

interface RecentEntriesDrawerProps {
  entries: JournalEntry[];
  onEntryClick: (entry: JournalEntry) => void;
  onExportAll?: () => void;
  onDelete?: (id: string) => void;
}

export default function RecentEntriesDrawer({ entries, onEntryClick, onExportAll, onDelete }: RecentEntriesDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  // Listen for custom event to open drawer
  useEffect(() => {
    const handleOpenJournalHistory = () => {
      setIsOpen(true);
    };

    window.addEventListener('openJournalHistory', handleOpenJournalHistory);
    return () => {
      window.removeEventListener('openJournalHistory', handleOpenJournalHistory);
    };
  }, []);

  // Group entries by time periods
  const groupEntriesByTime = (entries: JournalEntry[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of current week

    const groups = {
      today: [] as JournalEntry[],
      thisWeek: [] as JournalEntry[],
      pastWeeks: {} as Record<string, JournalEntry[]>
    };

    entries.forEach(entry => {
      const entryDate = new Date(entry.created_at);
      const entryDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
      
      if (entryDay.getTime() === today.getTime()) {
        groups.today.push(entry);
      } else if (entryDate >= weekStart) {
        groups.thisWeek.push(entry);
      } else {
        // Group by week
        const weekKey = `${entryDate.getFullYear()}-W${Math.ceil(entryDate.getDate() / 7)}`;
        if (!groups.pastWeeks[weekKey]) {
          groups.pastWeeks[weekKey] = [];
        }
        groups.pastWeeks[weekKey].push(entry);
      }
    });

    return groups;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getSyncStatusIcon = (entry: JournalEntry) => {
    switch (entry.sync_status) {
      case 'synced':
        return <span className="text-xs text-[#4A7A4A]">●</span>;
      case 'local_only':
        return <span className="text-xs text-[#8A8A8A]">○</span>;
      case 'syncing':
        return <span className="text-xs text-[#6A6A6A] animate-pulse">⟳</span>;
      case 'error':
        return <span className="text-xs text-[#D8B8B8]">!</span>;
      default:
        return null;
    }
  };

  const toggleWeek = (weekKey: string) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekKey)) {
      newExpanded.delete(weekKey);
    } else {
      newExpanded.add(weekKey);
    }
    setExpandedWeeks(newExpanded);
  };

  // Filter entries by search and tag
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !selectedTag || entry.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  // Get all unique tags from entries
  const allTags = Array.from(new Set(entries.flatMap(entry => entry.tags))).sort();

  const groups = groupEntriesByTime(filteredEntries);
  const hasEntries = filteredEntries.length > 0;

  // Selection handlers
  const toggleSelection = (entryId: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedEntries.size === filteredEntries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(filteredEntries.map(e => e.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedEntries.size === 0) return;
    
    const count = selectedEntries.size;
    if (confirm(`Are you sure you want to delete ${count} ${count === 1 ? 'entry' : 'entries'}?`)) {
      selectedEntries.forEach(id => {
        onDelete?.(id);
      });
      setSelectedEntries(new Set());
      setSelectionMode(false);
    }
  };

  // Reset selection when closing drawer or exiting selection mode
  useEffect(() => {
    if (!selectionMode) {
      setSelectedEntries(new Set());
    }
  }, [selectionMode]);

  useEffect(() => {
    if (!isOpen) {
      setSelectionMode(false);
      setSelectedEntries(new Set());
    }
  }, [isOpen]);

  return (
    <>
      {/* Drawer Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={() => setIsOpen(false)}
        >
        <div 
          className="fixed left-0 top-0 h-full w-full sm:w-[90%] md:max-w-md bg-gradient-to-b from-heijo-card-top to-heijo-card-bottom border-r-2 border-heijo-border shadow-sm transform transition-transform duration-300 ease-in-out flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-heijo-border flex-shrink-0">
            <div className="flex items-center gap-3">
              {selectionMode && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEntries.size === filteredEntries.length && filteredEntries.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-heijo-border text-heijo-press focus:ring-heijo-press"
                  />
                  <span className="text-xs text-heijo-text">
                    {selectedEntries.size > 0 ? `${selectedEntries.size} selected` : 'Select All'}
                  </span>
                </label>
              )}
              {!selectionMode && (
                <h2 className="text-base sm:text-lg font-light text-heijo-text" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Journal History
                </h2>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {selectionMode ? (
                <>
                  <button
                    onClick={() => {
                      setSelectionMode(false);
                      setSelectedEntries(new Set());
                    }}
                    className="px-3 py-1.5 text-xs font-light border border-heijo-border text-text-secondary rounded hover:bg-soft-silver transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  {selectedEntries.size > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      className="px-3 py-1.5 text-xs font-light bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200"
                    >
                      Delete ({selectedEntries.size})
                    </button>
                  )}
                </>
              ) : (
                <>
                  {onExportAll && (
                    <div className="relative group">
                      <button
                        onClick={onExportAll}
                        className="px-3 py-1.5 text-xs font-light border border-heijo-border text-text-secondary rounded hover:bg-soft-silver transition-colors duration-200"
                      >
                        Export All
                      </button>
                      {/* 90-day retention tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-graphite-charcoal text-text-inverse text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                        Export your last 90 days of entries
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-graphite-charcoal"></div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setSelectionMode(true)}
                    className="px-3 py-1.5 text-xs font-light border border-heijo-border text-text-secondary rounded hover:bg-soft-silver transition-colors duration-200"
                  >
                    Select
                  </button>
                </>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-text-secondary hover:text-heijo-text transition-colors duration-200"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 min-h-0">
              {/* Search and Filter */}
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Search entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-heijo-border rounded-lg focus:ring-1 focus:ring-heijo-press focus:outline-none text-graphite-charcoal"
                />
                
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedTag(null)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        selectedTag === null
                          ? 'bg-heijo-press text-white border-heijo-press'
                          : 'bg-white text-heijo-text border-heijo-border hover:border-heijo-press'
                      }`}
                    >
                      All
                    </button>
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(tag)}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                          selectedTag === tag
                            ? 'bg-heijo-press text-white border-heijo-press'
                            : 'bg-white text-heijo-text border-heijo-border hover:border-heijo-press'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Empty State */}
              {!hasEntries && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-text-secondary mb-2">
                    {searchTerm || selectedTag ? 'No entries match your filters' : 'No journal entries yet'}
                  </p>
                  <p className="text-xs text-text-caption">
                    {searchTerm || selectedTag ? 'Try adjusting your search or filter' : 'Start writing to see your history here'}
                  </p>
                </div>
              )}
              
              {/* Today */}
              {groups.today.length > 0 && (
                <div>
                  <h3 className="text-sm font-light text-[#C7C7C7] mb-3" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    TODAY
                  </h3>
                  <div className="space-y-2">
                    {groups.today.map(entry => (
                      <div key={entry.id}>
                        <div
                          onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                          className="p-2.5 sm:p-3 bg-[#2A2A2A] border border-[#C7C7C7] hover:border-[#E8E8E8] cursor-pointer transition-colors duration-200"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#8A8A8A]">
                                {formatTime(entry.created_at)}
                              </span>
                              {getSyncStatusIcon(entry)}
                            </div>
                            <span className="text-xs text-[#8A8A8A]">
                              {entry.source === 'voice' ? 'Voice' : 'Text'}
                            </span>
                          </div>
                          <p className="text-sm text-[#E8E8E8] line-clamp-2 leading-relaxed">
                            {entry.content}
                          </p>
                          {entry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {entry.tags.slice(0, 3).map(tag => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 text-xs bg-[#1C1C1C] text-[#C7C7C7] border border-[#C7C7C7]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Expanded Entry Content */}
                        {expandedEntry === entry.id && (
                          <div className="mt-2 p-3 sm:p-4 bg-[#1C1C1C] border border-[#C7C7C7] animate-fade-in">
                            <div className="space-y-3">
                              <div className="text-sm text-[#E8E8E8] leading-relaxed whitespace-pre-wrap">
                                {entry.content}
                              </div>
                              {entry.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {entry.tags.map(tag => (
                                    <span
                                      key={tag}
                                      className="px-2 py-1 text-xs bg-[#2A2A2A] text-[#C7C7C7] border border-[#C7C7C7]"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center justify-between pt-2 border-t border-[#C7C7C7]">
                                <div className="text-xs text-[#8A8A8A]">
                                  {formatDate(entry.created_at)} at {formatTime(entry.created_at)} • {entry.source === 'voice' ? 'Voice' : 'Text'} entry
                                </div>
                                {onDelete && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm('Are you sure you want to delete this entry?')) {
                                        onDelete(entry.id);
                                        setExpandedEntry(null);
                                      }
                                    }}
                                    className="text-xs text-[#DC2626] hover:text-[#B91C1C] transition-colors duration-200"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* This Week */}
              {groups.thisWeek.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-[#6A6A6A] mb-3" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    THIS WEEK
                  </h3>
                  <div className="space-y-2">
                    {groups.thisWeek.map(entry => (
                      <div key={entry.id}>
                        <div
                          onClick={() => {
                            setExpandedEntry(expandedEntry === entry.id ? null : entry.id);
                          }}
                          className="p-2.5 sm:p-3 bg-white border border-[#D8D8D8] rounded-lg hover:border-[#B8B8B8] transition-all duration-200 cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#8A8A8A]">
                                {formatDate(entry.created_at)}
                              </span>
                              {getSyncStatusIcon(entry)}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#8A8A8A]">
                                {entry.source === 'voice' ? 'Voice' : 'Text'}
                              </span>
                              {expandedEntry === entry.id && onDelete && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Are you sure you want to delete this entry?')) {
                                      onDelete(entry.id);
                                      setExpandedEntry(null);
                                    }
                                  }}
                                  className="text-xs text-[#DC2626] hover:text-[#B91C1C] transition-colors duration-200"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                          <p className={`text-sm text-[#4A4A4A] leading-relaxed transition-all duration-200 ${
                            expandedEntry === entry.id ? 'whitespace-pre-wrap' : 'line-clamp-2'
                          }`}>
                            {entry.content}
                          </p>
                          
                          {/* Expanded Entry Content - now inline */}
                          {expandedEntry === entry.id && (
                            <div className="mt-3 pt-3 border-t border-[#E5E5E5]">
                              {entry.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {entry.tags.map(tag => (
                                    <span
                                      key={tag}
                                      className="px-2 py-1 text-xs bg-[#E8E8E8] text-[#6A6A6A] border border-[#C7C7C7] rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="text-xs text-[#8A8A8A]">
                                {formatDate(entry.created_at)} at {formatTime(entry.created_at)} • {entry.source === 'voice' ? 'Voice' : 'Text'} entry
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Past Weeks */}
              {Object.keys(groups.pastWeeks).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-[#6A6A6A] mb-3" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    PAST WEEKS
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(groups.pastWeeks)
                      .sort(([a], [b]) => b.localeCompare(a))
                      .map(([weekKey, weekEntries]) => (
                        <div key={weekKey}>
                          <button
                            onClick={() => toggleWeek(weekKey)}
                            className="w-full flex items-center justify-between p-2 text-left hover:bg-[#F0F0F0] rounded-lg transition-colors duration-200"
                          >
                            <span className="text-sm text-[#6A6A6A]">
                              Week of {formatDate(weekEntries[0].created_at)}
                            </span>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className={`transform transition-transform duration-200 ${
                                expandedWeeks.has(weekKey) ? 'rotate-180' : ''
                              }`}
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>
                          
                          {expandedWeeks.has(weekKey) && (
                            <div className="ml-4 space-y-2 mt-2">
                              {weekEntries.map(entry => (
                                <div key={entry.id}>
                                  <div
                                    onClick={() => {
                                      setExpandedEntry(expandedEntry === entry.id ? null : entry.id);
                                    }}
                                    className="p-2.5 sm:p-3 bg-white border border-[#D8D8D8] rounded-lg hover:border-[#B8B8B8] transition-all duration-200 cursor-pointer"
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-[#8A8A8A]">
                                          {formatDate(entry.created_at)}
                                        </span>
                                        {getSyncStatusIcon(entry)}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-[#8A8A8A]">
                                          {entry.source === 'voice' ? 'Voice' : 'Text'}
                                        </span>
                                        {expandedEntry === entry.id && onDelete && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (confirm('Are you sure you want to delete this entry?')) {
                                                onDelete(entry.id);
                                                setExpandedEntry(null);
                                              }
                                            }}
                                            className="text-xs text-[#DC2626] hover:text-[#B91C1C] transition-colors duration-200"
                                          >
                                            Delete
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    <p className={`text-sm text-[#4A4A4A] leading-relaxed transition-all duration-200 ${
                                      expandedEntry === entry.id ? 'whitespace-pre-wrap' : 'line-clamp-2'
                                    }`}>
                                      {entry.content}
                                    </p>
                                    
                                    {/* Expanded Entry Content - now inline */}
                                    {expandedEntry === entry.id && (
                                      <div className="mt-3 pt-3 border-t border-[#E5E5E5]">
                                        {entry.tags.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mb-3">
                                            {entry.tags.map(tag => (
                                              <span
                                                key={tag}
                                                className="px-2 py-1 text-xs bg-[#E8E8E8] text-[#6A6A6A] border border-[#C7C7C7] rounded"
                                              >
                                                {tag}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                        <div className="text-xs text-[#8A8A8A]">
                                          {formatDate(entry.created_at)} at {formatTime(entry.created_at)} • {entry.source === 'voice' ? 'Voice' : 'Text'} entry
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
