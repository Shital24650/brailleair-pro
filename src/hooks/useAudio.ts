import { useEffect, useState, useCallback, useRef } from 'react';
import * as tts from '../utils/ttsEngine';

export function useAudio() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const commandCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    tts.initTTS().then((availableVoices) => {
      setVoices(availableVoices);
    });

    return () => {
      tts.stopSpeaking();
      if (commandCleanupRef.current) {
        commandCleanupRef.current();
      }
    };
  }, []);

  const speak = useCallback((text: string, priority: 'high' | 'normal' = 'normal') => {
    setSpeaking(true);
    return tts.speak(text, priority, () => {
      setSpeaking(false);
    });
  }, []);

  const stop = useCallback(() => {
    tts.stopSpeaking();
    setSpeaking(false);
  }, []);

  const announce = useCallback((type: string, val?: string | number) => {
    tts.announceGuidance(type, val);
  }, []);

  const startVoiceListener = useCallback((onCommand: (cmd: string) => void) => {
    if (commandCleanupRef.current) {
      commandCleanupRef.current();
    }
    commandCleanupRef.current = tts.initVoiceCommandListener(onCommand);
    return commandCleanupRef.current;
  }, []);

  const stopVoiceListener = useCallback(() => {
    if (commandCleanupRef.current) {
      commandCleanupRef.current();
      commandCleanupRef.current = null;
    }
  }, []);

  return {
    voices,
    speaking,
    speak,
    stop,
    announce,
    startVoiceListener,
    stopVoiceListener
  };
}
