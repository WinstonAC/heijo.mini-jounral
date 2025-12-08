import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from '@/components/Settings';
import { VoiceSettingsProvider } from '@/lib/voiceSettings';

// Mock dependencies
vi.mock('@/lib/gdpr', () => ({
  gdprManager: {
    getConsentSettings: () => ({
      microphone: true,
      dataStorage: true,
      analytics: false,
    }),
  },
}));

vi.mock('@/lib/analytics', () => ({
  analyticsCollector: {
    trackEvent: vi.fn(),
  },
}));

vi.mock('@/lib/premium', () => ({
  checkPremiumStatus: async () => ({ isPremium: false }),
  activatePremium: vi.fn(),
  deactivatePremium: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'test-user' },
    loading: false,
  }),
}));

vi.mock('@/lib/store', () => ({
  storage: {
    getEntries: async () => [],
  },
}));

vi.mock('@/components/AnalyticsDashboard', () => ({
  default: () => <div>Analytics Dashboard</div>,
}));

vi.mock('@/components/NotificationSettings', () => ({
  default: () => <div>Notification Settings</div>,
}));

describe('Settings Component - Language Selector', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderSettings = (props = {}) => {
    const defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
      onExportCSV: vi.fn(),
      fontSize: 'medium' as const,
      setFontSize: vi.fn(),
      ...props,
    };

    return render(
      <VoiceSettingsProvider>
        <Settings {...defaultProps} />
      </VoiceSettingsProvider>
    );
  };

  it('should display language selector in Settings', async () => {
    renderSettings();

    // Wait for Settings to render
    await waitFor(() => {
      expect(screen.getByText('Voice Input Language')).toBeInTheDocument();
    });
  });

  it('should update selectedLanguage when user selects a language', async () => {
    const user = userEvent.setup();
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('Voice Input Language')).toBeInTheDocument();
    });

    // Find the language selector (dropdown)
    const languageSelect = screen.getByTitle('Select voice input language') as HTMLSelectElement;
    
    expect(languageSelect).toBeInTheDocument();

    // Change language to German
    await user.selectOptions(languageSelect, 'de-DE');

    // Verify language was saved to localStorage
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('heijo_voice_settings') || '{}');
      expect(stored.language).toBe('de-DE');
    });
  });

  it('should show current selected language in dropdown', async () => {
    // Set initial language
    localStorage.setItem('heijo_voice_settings', JSON.stringify({ language: 'es-ES' }));

    renderSettings();

    await waitFor(() => {
      const languageSelect = screen.getByTitle('Select voice input language') as HTMLSelectElement;
      expect(languageSelect.value).toBe('es-ES');
    });
  });

  it('should display all supported languages in dropdown', async () => {
    renderSettings();

    await waitFor(() => {
      const languageSelect = screen.getByTitle('Select voice input language') as HTMLSelectElement;
      const options = Array.from(languageSelect.options).map(opt => opt.value);
      
      expect(options).toContain('en-US');
      expect(options).toContain('es-ES');
      expect(options).toContain('pt-BR');
      expect(options).toContain('de-DE');
      expect(options).toContain('fr-FR');
      expect(options).toContain('hi-IN');
      expect(options).toContain('ja-JP');
      expect(options).toContain('zh-CN');
    });
  });
});


