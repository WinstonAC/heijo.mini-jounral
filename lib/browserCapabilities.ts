/**
 * Browser capability detection for voice input
 * Determines which voice input methods are available and which provider to use
 */

export type VoiceCapabilities = {
  isIOS: boolean;
  isSafari: boolean;
  isChromeIOS: boolean;
  isFirefox: boolean;
  hasWebSpeech: boolean;
  requiresBackend: boolean;
  isSecure: boolean;
  hasMediaDevices: boolean;
};

/**
 * Detect browser capabilities for voice input
 */
export function detectVoiceCapabilities(): VoiceCapabilities {
  if (typeof window === 'undefined') {
    // SSR - return safe defaults
    return {
      isIOS: false,
      isSafari: false,
      isChromeIOS: false,
      isFirefox: false,
      hasWebSpeech: false,
      requiresBackend: true,
      isSecure: false,
      hasMediaDevices: false,
    };
  }

  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
  const isChromeIOS = /CriOS/i.test(userAgent) || (/iPhone|iPad|iPod/.test(userAgent) && /Chrome/i.test(userAgent));
  const isFirefox = /Firefox/i.test(userAgent);
  
  // Check for Web Speech API
  const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
  const hasWebSpeech = typeof SpeechRecognition !== 'undefined';
  
  // Check for secure context
  const isSecure = window.isSecureContext;
  
  // Check for MediaDevices API
  const hasMediaDevices = typeof navigator.mediaDevices !== 'undefined' && 
                          typeof navigator.mediaDevices.getUserMedia !== 'undefined';
  
  // Determine if backend STT is required
  // iOS Safari doesn't support Web Speech API
  // Firefox doesn't support Web Speech API
  // Chrome iOS uses Safari engine, so also doesn't support Web Speech API
  const requiresBackend = isIOS || isFirefox || !hasWebSpeech || !isSecure;
  
  return {
    isIOS,
    isSafari,
    isChromeIOS,
    isFirefox,
    hasWebSpeech,
    requiresBackend,
    isSecure,
    hasMediaDevices,
  };
}

/**
 * Get recommended voice provider based on browser capabilities
 */
export function getRecommendedProvider(capabilities: VoiceCapabilities): 'webspeech' | 'backend' | 'unsupported' {
  if (!capabilities.hasMediaDevices) {
    return 'unsupported';
  }
  
  if (!capabilities.isSecure && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1') {
    return 'unsupported';
  }
  
  if (capabilities.requiresBackend) {
    return 'backend';
  }
  
  if (capabilities.hasWebSpeech) {
    return 'webspeech';
  }
  
  return 'unsupported';
}

/**
 * Get user-friendly error message based on capabilities
 */
export function getVoiceSupportMessage(capabilities: VoiceCapabilities): string | null {
  if (!capabilities.hasMediaDevices) {
    return 'Voice input is not supported on this device.';
  }
  
  if (!capabilities.isSecure && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1') {
    return 'Voice input requires a secure connection (HTTPS).';
  }
  
  if (capabilities.isIOS && capabilities.isSafari) {
    return 'iOS Safari does not support browser voice recognition. Backend transcription will be used.';
  }
  
  if (capabilities.isFirefox) {
    return 'Firefox does not support browser voice recognition. Backend transcription will be used.';
  }
  
  if (!capabilities.hasWebSpeech) {
    return 'Voice recognition is not supported in this browser. Backend transcription will be used.';
  }
  
  return null; // No error, WebSpeech is available
}

