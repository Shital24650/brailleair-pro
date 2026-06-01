import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Copy, Share2, CornerDownLeft, RotateCcw, Plus, Check } from 'lucide-react';
import { AppMode, DetectedCell } from '../types';
import { speakWithHighlight, stopSpeaking } from '../utils/ttsEngine';

interface ResultPanelProps {
  text: string;
  mode: AppMode;
  cells: DetectedCell[];
  confidence: number;
  onNewScan: () => void;
  onSave?: (text: string) => void;
}

export default function ResultPanel({
  text,
  mode,
  cells,
  confidence,
  onNewScan,
  onSave
}: ResultPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState<'medium' | 'large' | 'xlarge'>('medium');
  const [highContrast, setHighContrast] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Trigger auto speak on arrival
  useEffect(() => {
    handleSpeakAloud();
    return () => {
      stopSpeaking();
    };
  }, [text]);

  const handleSpeakAloud = () => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
      setActiveWordIndex(null);
      return;
    }

    setIsPlaying(true);
    speakWithHighlight(
      text,
      (idx) => {
        setActiveWordIndex(idx);
      },
      () => {
        setIsPlaying(false);
        setActiveWordIndex(null);
      }
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BrailleAir Pro Translation',
          text: text
        });
      } catch (e) {
        console.warn('Share sheets dismissed');
      }
    } else {
      handleCopy();
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(text);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  // Styles configuration
  const fontClass =
    fontSize === 'xlarge' ? 'text-4xl' : fontSize === 'large' ? 'text-3xl' : 'text-2xl';

  const containerBg = highContrast ? 'bg-black border-4 border-white' : 'bg-[#1A1A2E] border border-gray-800';
  const textClass = highContrast ? 'text-yellow-400 font-extrabold' : 'text-white';

  const words = text.replace(/[\s\n]+/g, ' ').split(' ');

  return (
    <div className={`p-6 rounded-3xl flex flex-col space-y-6 max-w-lg mx-auto w-full shadow-2xl transition-all ${containerBg}`} style={{ fontFamily: 'Atkinson Hyperlegible, sans-serif' }}>
      
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-sm font-bold text-[#8888AA] tracking-widest">TRANSLATION COMPLETED</h2>
          <span className="text-[#00D4AA] text-lg font-bold uppercase">{mode} MODE SCAN</span>
        </div>
        <div className="bg-[#0A0A0F] px-4 py-1.5 rounded-full border border-gray-800 text-sm font-bold flex items-center space-x-1">
          <span className="text-[#00FF88]">●</span>
          <span>{Math.round(confidence * 100)}% Match</span>
        </div>
      </div>

      {/* Font scale selectors */}
      <div className="flex justify-between items-center bg-[#0A0A0F]/50 p-2.5 rounded-xl border border-gray-800 text-sm">
        <span className="text-[#8888AA] font-bold px-1.5">FONT ACCESS</span>
        <div className="flex space-x-1.5">
          {(['medium', 'large', 'xlarge'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFontSize(f)}
              className={`p-2 rounded-lg font-bold text-xs uppercase px-3.5 transition-all ${fontSize === f ? 'bg-[#00D4AA] text-[#0A0A0F]' : 'bg-[#242438] text-white hover:bg-[#34344e]'}`}
              aria-label={`Set font translation ${f}`}
            >
              {f === 'xlarge' ? 'X-L' : f === 'large' ? 'Large' : 'Med'}
            </button>
          ))}
        </div>
      </div>

      {/* Styled text box output */}
      <div className="bg-[#0A0A0F]/50 p-6 rounded-2xl border border-gray-800 min-h-[160px] max-h-[300px] overflow-y-auto">
        <p className={`${fontClass} leading-snug tracking-wide transition-all ${textClass}`}>
          {words.map((word, idx) => (
            <span
              key={idx}
              className={`inline-block mr-2.5 transition-all rounded px-1.5 ${
                activeWordIndex === idx ? 'bg-[#00D4AA] text-black scale-105 font-black shadow-[0_0_8px_#00D4AA]' : ''
              }`}
            >
              {word}
            </span>
          ))}
        </p>
      </div>

      {/* Primary Narrative vocalization button */}
      <button
        onClick={handleSpeakAloud}
        className={`w-full py-6 rounded-2xl flex items-center justify-center space-x-3 text-xl font-extrabold shadow-lg active:scale-[0.98] transition-all min-h-[64px] ${
          isPlaying ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-[#00D4AA] hover:bg-[#009B7D] text-[#0A0A0F]'
        }`}
        aria-label={isPlaying ? "Stop Text Narration" : "Listen to audio translation Read Aloud"}
      >
        {isPlaying ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        <span>{isPlaying ? "Pause Screen Reader" : "Speak Result"}</span>
      </button>

      {/* Utility Controls */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={handleCopy}
          className="flex flex-col items-center justify-center py-4 bg-[#242438] hover:bg-[#2d2d47] border border-gray-800 text-slate-300 font-bold text-xs rounded-xl transition-all min-h-[58px]"
          aria-label="Copy to Clipboard"
        >
          {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
          <span className="mt-1">{copied ? 'Copied' : 'Copy'}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex flex-col items-center justify-center py-4 bg-[#242438] hover:bg-[#2d2d47] border border-gray-800 text-slate-300 font-bold text-xs rounded-xl transition-all min-h-[58px]"
          aria-label="Share Translation"
        >
          <Share2 className="w-5 h-5 animate-pulse" />
          <span className="mt-1">Share</span>
        </button>

        <button
          onClick={handleSave}
          className="flex flex-col items-center justify-center py-4 bg-[#242438] hover:bg-[#2d2d47] border border-gray-800 text-slate-300 font-bold text-xs rounded-xl transition-all min-h-[58px]"
          aria-label="Save scan to History database"
        >
          {saved ? <Check className="w-5 h-5 text-emerald-400" /> : <Plus className="w-5 h-5" />}
          <span className="mt-1">{saved ? 'Saved' : 'Save'}</span>
        </button>

        <button
          onClick={() => setHighContrast(prev => !prev)}
          className={`flex flex-col items-center justify-center py-4 border font-bold text-xs rounded-xl transition-all min-h-[58px] ${
            highContrast ? 'bg-black border-yellow-400 text-yellow-400' : 'bg-[#242438] border-gray-800 text-slate-300 hover:bg-[#2d2d47]'
          }`}
          aria-label="Toggle visual high contrast yellow"
        >
          <span className="text-base leading-none">🌗</span>
          <span className="mt-1">Contrast</span>
        </button>
      </div>

      {/* Bottom Close Trigger buttons */}
      <button
        onClick={onNewScan}
        className="w-full bg-[#7B61FF] hover:bg-[#6449E2] text-white font-extrabold text-lg rounded-xl flex items-center justify-center space-x-2 py-4 shadow-md hover:shadow-xl active:scale-95 transition-all min-h-[60px]"
        aria-label="Dismiss scan results and translation"
      >
        <RotateCcw className="w-5 h-5" />
        <span>Scan Next Page</span>
      </button>
    </div>
  );
}
