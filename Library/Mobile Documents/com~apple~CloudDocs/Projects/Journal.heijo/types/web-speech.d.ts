declare global {
  interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
  }

  interface SpeechRecognitionResult {
    readonly length: number;
    readonly isFinal: boolean;
    [index: number]: SpeechRecognitionAlternative;
    item(index: number): SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    [index: number]: SpeechRecognitionResult;
    item(index: number): SpeechRecognitionResult;
  }

  type SpeechRecognitionEvent = Event & {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  };

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onaudioend: ((event: Event) => void) | null;
    onaudiostart: ((event: Event) => void) | null;
    onend: ((event: Event) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onsoundend: ((event: Event) => void) | null;
    onsoundstart: ((event: Event) => void) | null;
    onspeechend: ((event: Event) => void) | null;
    onspeechstart: ((event: Event) => void) | null;
    onstart: ((event: Event) => void) | null;
    abort(): void;
    start(): void;
    stop(): void;
  }

  var SpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  };

  var webkitSpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  };

  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof webkitSpeechRecognition;
  }
}

export {};
