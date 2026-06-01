/**
 * ttsEngine.ts - High-accessibility Text-To-Speech engine with priority queuing and verbal guide alerts
 */

interface VoiceSettings {
  rate: number;
  pitch: number;
  volume: number;
  voiceName?: string;
}

const defaultSettings: VoiceSettings = {
  rate: 0.95,
  pitch: 1.0,
  volume: 1.0
};

let selectedVoice: SpeechSynthesisVoice | null = null;

// Initialize TTS
export function initTTS(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([]);
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Find best default voice (Google US English, Microsoft David, etc.)
        selectedVoice =
          voices.find(v => v.name.includes('Google US English') || v.lang === 'en-US') ||
          voices.find(v => v.lang.startsWith('en')) ||
          voices[0] ||
          null;
        resolve(voices);
      } else {
        resolve([]);
      }
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      loadVoices();
    } else {
      window.speechSynthesis.onvoiceschanged = loadVoices;
      // In case onvoiceschanged does not fire in some browsers, set a timeout
      setTimeout(loadVoices, 1000);
    }
  });
}

export function setTTSVoiceByName(name: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices();
  const found = voices.find(v => v.name === name);
  if (found) {
    selectedVoice = found;
  }
}

// Speak text immediately or in sequence queue
export function speak(text: string, priority: 'high' | 'normal' = 'normal', onEnd?: () => void): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }

    if (priority === 'high') {
      window.speechSynthesis.cancel(); // Interrupt current speak
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    const settings = localStorage.getItem('brailleair_settings');
    let rate = defaultSettings.rate;
    let volume = defaultSettings.volume;

    if (settings) {
      try {
        const parsed = JSON.parse(settings);
        rate = parsed.ttsSpeed ?? defaultSettings.rate;
        if (!parsed.voiceEnabled) {
          resolve();
          return;
        }
      } catch (e) {
        // Fallback
      }
    }

    utterance.rate = rate;
    utterance.pitch = defaultSettings.pitch;
    utterance.volume = volume;

    utterance.onend = () => {
      onEnd?.();
      resolve();
    };

    utterance.onerror = () => {
      resolve();
    };

    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// Speak with word highlighting callback
export function speakWithHighlight(
  text: string,
  onWordSpoken: (wordIndex: number, word: string) => void,
  onEnd?: () => void
): () => void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd?.();
    return () => {};
  }

  window.speechSynthesis.cancel();

  // Split string to keep track of spacing
  const words = text.replace(/[\s\n]+/g, ' ').split(' ');
  const utterance = new SpeechSynthesisUtterance(text);
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  const settingsRaw = localStorage.getItem('brailleair_settings');
  let rate = defaultSettings.rate;
  if (settingsRaw) {
    try {
      rate = JSON.parse(settingsRaw).ttsSpeed ?? defaultSettings.rate;
    } catch (e) {}
  }
  utterance.rate = rate;

  let boundaryWordIndex = 0;

  // Utilize the boundry event of speech synthesis to match spoken words
  utterance.onboundary = (event) => {
    if (event.name === 'word') {
      const charIndex = event.charIndex;
      // Estimate what word this corresponds to by calculating character lengths
      let lengthSum = 0;
      let targetWordIndex = 0;

      for (let i = 0; i < words.length; i++) {
        lengthSum += words[i].length + 1; // including estimated space
        if (charIndex < lengthSum) {
          targetWordIndex = i;
          break;
        }
      }
      onWordSpoken(targetWordIndex, words[targetWordIndex] || '');
    }
  };

  utterance.onend = () => {
    onEnd?.();
  };

  utterance.onerror = () => {
    onEnd?.();
  };

  window.speechSynthesis.speak(utterance);

  return () => {
    window.speechSynthesis.cancel();
  };
}

// Speak standard system guides
export function announceGuidance(type: string, placeholderVal?: string | number): void {
  let message = '';
  switch (type) {
    case 'ready':
      message = 'BrailleAir ready. Point the camera at Braille text.';
      break;
    case 'detected':
      message = 'Braille detected. Hold steady.';
      break;
    case 'scanning':
      message = 'Scanning, please hold.';
      break;
    case 'success':
      message = `Excellent! ${placeholderVal || 'Some'} words successfully recognized.`;
      break;
    case 'no_dots':
      message = 'No Braille pattern found. Try shifting the camera closer.';
      break;
    case 'low_light':
      message = 'Ambient light is too dark. Turn on torch or adjust lighting.';
      break;
    case 'tilted':
      message = 'The paper is slightly tilted. Please rotate your camera slightly.';
      break;
    case 'perfect':
      message = 'Perfect alignment achieved! Reading standard patterns now.';
      break;
    case 'error_found':
      message = `Attention. Detected ${placeholderVal || 'several'} minor inaccuracies in your Braille writing.`;
      break;
    case 'all_correct':
      message = 'Fantastic writing! All tactile cells are completely correct.';
      break;
    default:
      message = String(placeholderVal || '');
  }

  if (message) {
    speak(message, 'high');
  }
}

// Speech recognition voice command listener
export function initVoiceCommandListener(onCommand: (cmd: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  // Check support for SpeechRecognition in browsers
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return () => {};
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (event: any) => {
    const lastResultIndex = event.results.length - 1;
    const transcript = event.results[lastResultIndex][0].transcript.toLowerCase().trim();

    if (transcript.includes('scan')) {
      onCommand('scan');
    } else if (transcript.includes('stop')) {
      onCommand('stop');
    } else if (transcript.includes('read') || transcript.includes('speak')) {
      onCommand('read');
    } else if (transcript.includes('clear') || transcript.includes('reset')) {
      onCommand('clear');
    } else if (transcript.includes('flash') || transcript.includes('torch') || transcript.includes('light')) {
      onCommand('flash');
    } else if (transcript.includes('help') || transcript.includes('info')) {
      onCommand('help');
    }
  };

  recognition.onerror = () => {
    // Silently continue or restart
  };

  try {
    recognition.start();
  } catch (e) {
    console.error('Failed to start speech recognition', e);
  }

  return () => {
    try {
      recognition.stop();
    } catch (e) {}
  };
}
