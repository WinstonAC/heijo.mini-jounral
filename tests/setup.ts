import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.SpeechRecognition and window.webkitSpeechRecognition
export function createMockSpeechRecognition() {
  const mockRecognition = {
    continuous: false,
    interimResults: false,
    lang: 'en-US',
    maxAlternatives: 1,
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
    onstart: null as ((this: SpeechRecognition, ev: Event) => any) | null,
    onend: null as ((this: SpeechRecognition, ev: Event) => any) | null,
    onresult: null as ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null,
    onerror: null as ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null,
    onspeechstart: null as ((this: SpeechRecognition, ev: Event) => any) | null,
    onspeechend: null as ((this: SpeechRecognition, ev: Event) => any) | null,
    onsoundstart: null as ((this: SpeechRecognition, ev: Event) => any) | null,
    onsoundend: null as ((this: SpeechRecognition, ev: Event) => any) | null,
    onaudiostart: null as ((this: SpeechRecognition, ev: Event) => any) | null,
    onaudioend: null as ((this: SpeechRecognition, ev: Event) => any) | null,
    onnomatch: null as ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null,
  };

  return mockRecognition;
}

export function setupMockSpeechRecognition() {
  const MockSpeechRecognition = vi.fn(() => createMockSpeechRecognition());
  
  Object.defineProperty(window, 'SpeechRecognition', {
    writable: true,
    value: MockSpeechRecognition,
  });

  Object.defineProperty(window, 'webkitSpeechRecognition', {
    writable: true,
    value: MockSpeechRecognition,
  });

  return MockSpeechRecognition;
}

export function removeMockSpeechRecognition() {
  delete (window as any).SpeechRecognition;
  delete (window as any).webkitSpeechRecognition;
}

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn(() => Promise.resolve({} as MediaStream)),
  },
});

// Mock performance.now
global.performance = {
  ...global.performance,
  now: vi.fn(() => Date.now()),
} as any;

