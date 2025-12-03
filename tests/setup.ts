import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Type definitions for SpeechRecognition (not available in Node.js build environment)
// Using type assertions to avoid conflicts with existing definitions
type SpeechRecognitionType = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: any, ev: Event) => any) | null;
  onend: ((this: any, ev: Event) => any) | null;
  onresult: ((this: any, ev: any) => any) | null;
  onerror: ((this: any, ev: any) => any) | null;
  onspeechstart: ((this: any, ev: Event) => any) | null;
  onspeechend: ((this: any, ev: Event) => any) | null;
  onsoundstart: ((this: any, ev: Event) => any) | null;
  onsoundend: ((this: any, ev: Event) => any) | null;
  onaudiostart: ((this: any, ev: Event) => any) | null;
  onaudioend: ((this: any, ev: Event) => any) | null;
  onnomatch: ((this: any, ev: any) => any) | null;
};

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
export function createMockSpeechRecognition(): SpeechRecognitionType {
  const mockRecognition: SpeechRecognitionType = {
    continuous: false,
    interimResults: false,
    lang: 'en-US',
    maxAlternatives: 1,
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
    onstart: null,
    onend: null,
    onresult: null,
    onerror: null,
    onspeechstart: null,
    onspeechend: null,
    onsoundstart: null,
    onsoundend: null,
    onaudiostart: null,
    onaudioend: null,
    onnomatch: null,
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

