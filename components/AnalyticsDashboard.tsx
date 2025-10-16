'use client';

import { useState, useEffect } from 'react';
import { analyticsCollector, AnalyticsData } from '@/lib/analytics';

interface AnalyticsDashboardProps {
  isVisible: boolean;
}

export default function AnalyticsDashboard({ isVisible }: AnalyticsDashboardProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isVisible) {
      loadAnalyticsData();
    }
  }, [isVisible]);

  const loadAnalyticsData = () => {
    setIsLoading(true);
    const data = analyticsCollector.getAnalyticsData();
    setAnalyticsData(data);
    setIsLoading(false);
  };

  if (!isVisible || isLoading) {
    return null;
  }

  if (!analyticsData || analyticsData.totalSessions === 0) {
    return (
      <div className="mb-6 p-4 bg-tactile-taupe rounded-lg">
        <h3 className="text-sm font-medium text-graphite-charcoal mb-3 subheading">Usage Analytics</h3>
        <p className="text-xs text-text-secondary">
          No analytics data available yet. Start using the app to see your usage patterns.
        </p>
      </div>
    );
  }

  const formatNumber = (num: number): string => {
    return Math.round(num).toString();
  };

  const formatPercentage = (num: number): string => {
    return `${Math.round(num)}%`;
  };

  const formatTime = (timestamp: string): string => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleDateString();
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatMemory = (mb: number): string => {
    return `${Math.round(mb)}MB`;
  };

  return (
    <div className="mb-6 p-4 bg-tactile-taupe rounded-lg">
      <h3 className="text-sm font-medium text-graphite-charcoal mb-4 subheading">Usage Analytics</h3>
      
      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-graphite-charcoal">{analyticsData.totalSessions}</div>
          <div className="text-xs text-text-secondary">Sessions</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-graphite-charcoal">{analyticsData.totalEntries}</div>
          <div className="text-xs text-text-secondary">Total Entries</div>
        </div>
      </div>

      {/* Entry Types */}
      <div className="mb-4">
        <div className="text-xs font-medium text-graphite-charcoal mb-2">Entry Types</div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-text-secondary">Voice</span>
            <div className="flex items-center gap-2">
              <div className="w-16 bg-soft-silver rounded-full h-2">
                <div 
                  className="bg-graphite-charcoal h-2 rounded-full" 
                  style={{ width: `${analyticsData.voicePercentage}%` }}
                ></div>
              </div>
              <span className="text-xs font-medium text-graphite-charcoal w-8 text-right">
                {formatPercentage(analyticsData.voicePercentage)}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-text-secondary">Text</span>
            <div className="flex items-center gap-2">
              <div className="w-16 bg-soft-silver rounded-full h-2">
                <div 
                  className="bg-graphite-charcoal h-2 rounded-full" 
                  style={{ width: `${analyticsData.textPercentage}%` }}
                ></div>
              </div>
              <span className="text-xs font-medium text-graphite-charcoal w-8 text-right">
                {formatPercentage(analyticsData.textPercentage)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="mb-4">
        <div className="text-xs font-medium text-graphite-charcoal mb-2">Performance</div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-text-secondary">Avg Voice Latency:</span>
            <div className="font-medium text-graphite-charcoal">{formatDuration(analyticsData.averageVoiceLatency)}</div>
          </div>
          <div>
            <span className="text-text-secondary">Avg Start Time:</span>
            <div className="font-medium text-graphite-charcoal">{formatDuration(analyticsData.averageAppStartTime)}</div>
          </div>
          <div>
            <span className="text-text-secondary">Memory Usage:</span>
            <div className="font-medium text-graphite-charcoal">{formatMemory(analyticsData.averageMemoryUsage)}</div>
          </div>
          <div>
            <span className="text-text-secondary">Entries/Day:</span>
            <div className="font-medium text-graphite-charcoal">{formatNumber(analyticsData.entriesPerDay)}</div>
          </div>
        </div>
      </div>

      {/* Writing Stats */}
      <div className="mb-4">
        <div className="text-xs font-medium text-graphite-charcoal mb-2">Writing Patterns</div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-text-secondary">Avg Length:</span>
            <div className="font-medium text-graphite-charcoal">{formatNumber(analyticsData.averageEntryLength)} chars</div>
          </div>
          <div>
            <span className="text-text-secondary">Longest Entry:</span>
            <div className="font-medium text-graphite-charcoal">{formatNumber(analyticsData.longestEntry)} chars</div>
          </div>
        </div>
      </div>

      {/* Feature Usage */}
      <div className="mb-4">
        <div className="text-xs font-medium text-graphite-charcoal mb-2">Features Used</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-text-secondary">Voice Recording:</span>
            <span className="font-medium text-graphite-charcoal">{analyticsData.featuresUsed.voiceRecording}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Text Entry:</span>
            <span className="font-medium text-graphite-charcoal">{analyticsData.featuresUsed.textEntry}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Voice-to-Text:</span>
            <span className="font-medium text-graphite-charcoal">{analyticsData.featuresUsed.voiceToText}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Export Data:</span>
            <span className="font-medium text-graphite-charcoal">{analyticsData.featuresUsed.exportData}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Delete Entry:</span>
            <span className="font-medium text-graphite-charcoal">{analyticsData.featuresUsed.deleteEntry}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Search:</span>
            <span className="font-medium text-graphite-charcoal">{analyticsData.featuresUsed.searchEntries}</span>
          </div>
        </div>
      </div>

      {/* Usage Timeline */}
      <div>
        <div className="text-xs font-medium text-graphite-charcoal mb-2">Usage Timeline</div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-text-secondary">First Used:</span>
            <div className="font-medium text-graphite-charcoal">{formatTime(analyticsData.firstUsed)}</div>
          </div>
          <div>
            <span className="text-text-secondary">Last Used:</span>
            <div className="font-medium text-graphite-charcoal">{formatTime(analyticsData.lastUsed)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
