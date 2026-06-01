import { useState, useEffect } from 'react';
import { ArrowLeft, Volume2, Key, RefreshCw, Smartphone, Eye, Check } from 'lucide-react';
import { getSettings, saveSettings, clearCalibrationProfile } from '../utils/storage';
import { Settings } from '../types';

interface SettingsPanelProps {
  onBack: () => void;
  onRefreshProfile?: () => void;
}

export default function SettingsPanel({ onBack, onRefreshProfile }: SettingsPanelProps) {
  const [settings, setSettings] = useState<Settings>(getSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Settings syncing
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const handleUpdate = <K extends keyof Settings>(key: K, val: Settings[K]) => {
    setSettings(prev => ({
      ...prev,
      [key]: val
    }));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 1200);
  };

  const handleWipeCalibration = () => {
    if (confirm('Wipe tactile pressure and spacing profile parameters from storage?')) {
      clearCalibrationProfile();
      if (onRefreshProfile) onRefreshProfile();
      alert('Tactile profile deleted. BrailleAir will run on baseline values.');
    }
  };

  return (
    <div className="p-6 text-white max-w-lg mx-auto w-full flex flex-col justify-between min-h-[85vh] pb-12" style={{ fontFamily: 'Atkinson Hyperlegible, sans-serif' }}>
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <button onClick={onBack} className="text-[#8888AA] hover:text-white flex items-center space-x-1 font-bold text-sm">
          <ArrowLeft className="w-4 h-4" />
          <span>Hub</span>
        </button>
        <span className="text-xs font-bold text-[#8888AA] tracking-widest uppercase">
          SYSTEM CONFIG
        </span>
      </div>

      {/* BODY CONFIG ITEMS */}
      <div className="flex-1 overflow-y-auto max-h-[500px] py-4 space-y-6 mt-4">
        
        {/* Save indicator */}
        {savedSuccess && (
          <div className="bg-[#00D4AA]/10 p-2.5 px-4 rounded-lg text-xs border border-[#00D4AA]/30 text-[#00D4AA] flex items-center space-x-1 font-bold">
            <Check className="w-4 h-4" />
            <span>SYNCED TO OFFLINE LOCALSTORAGE STORAGE</span>
          </div>
        )}

        {/* Font Accessibility settings */}
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold text-[#8888AA] uppercase tracking-wider">AAC FONT LAYOUTS</h3>
          <div className="bg-[#1A1A2E] border border-gray-800 p-5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-300 font-semibold">COHERENT HIGH CONTRAST</span>
              <button
                onClick={() => handleUpdate('highContrast', !settings.highContrast)}
                className={`w-14 h-8 rounded-full border p-1 transition-all flex ${settings.highContrast ? 'bg-[#00D4AA] border-[#00D4AA] justify-end' : 'bg-[#0A0A0F] border-slate-700 justify-start'}`}
                aria-label="Toggle Coherent high contrast colors"
              >
                <div className="w-6 h-6 rounded-full bg-inner shadow-md bg-white" />
              </button>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-300 font-semibold">SCREEN READER FEEDBACK</span>
              <button
                onClick={() => handleUpdate('voiceEnabled', !settings.voiceEnabled)}
                className={`w-14 h-8 rounded-full border p-1 transition-all flex ${settings.voiceEnabled ? 'bg-[#00D4AA] border-[#00D4AA] justify-end' : 'bg-[#0A0A0F] border-slate-700 justify-start'}`}
                aria-label="Toggle screen reader speech"
              >
                <div className="w-6 h-6 rounded-full bg-inner shadow-md bg-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Speech slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <h3 className="text-sm font-extrabold text-[#8888AA] uppercase tracking-wider">SPEECH SPEED RATE</h3>
            <span className="text-[#00D4AA] font-bold text-xs bg-[#00D4AA]/10 px-2.5 py-0.5 rounded border border-[#00D4AA]/30">
              {settings.ttsSpeed}x Speed
            </span>
          </div>
          <div className="bg-[#1A1A2E] border border-gray-800 p-5 rounded-2xl flex flex-col space-y-2">
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.ttsSpeed}
              onChange={(e) => handleUpdate('ttsSpeed', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00D4AA]"
              aria-label="Speech Speed Controller"
            />
            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <span>Very Slow</span>
              <span>Baseline</span>
              <span>Fast Narrator</span>
            </div>
          </div>
        </div>

        {/* OpenCV Fallback */}
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold text-[#8888AA] uppercase tracking-wider">INTERMEDIATE PROCESSING</h3>
          <div className="bg-[#1A1A2E] border border-gray-800 p-5 rounded-2xl space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold">OPENCV OFFLINE FALLBACK</span>
              <button
                onClick={() => handleUpdate('fallbackOpenCV', !settings.fallbackOpenCV)}
                className={`w-14 h-8 rounded-full border p-1 transition-all flex ${settings.fallbackOpenCV ? 'bg-[#00D4AA] border-[#00D4AA] justify-end' : 'bg-[#0A0A0F] border-slate-700 justify-start'}`}
                aria-label="Toggle local computer vision fallback"
              >
                <div className="w-6 h-6 rounded-full bg-inner shadow-md bg-white" />
              </button>
            </div>
            <p className="text-xs text-[#8888AA] leading-snug pt-1">
              If server-side connections error out, processing reverts directly to camera image processing using standard CLAHE filters.
            </p>
          </div>
        </div>

        {/* Secrets Storage info */}
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold text-[#8888AA] uppercase tracking-wider">API ENVIRONMENT SECURITY</h3>
          <div className="bg-[#1A1A2E] border border-gray-800 p-5 rounded-2xl space-y-1.5 text-xs text-[#8888AA]">
            <div className="flex items-center space-x-2 text-slate-300 font-bold text-sm mb-1">
              <Key className="w-4 h-4 text-[#00D4AA]" />
              <span>Full-Stack Proxy Active</span>
            </div>
            <p className="leading-relaxed">
              Your API requests are proxied via secure server endpoints. Gemini credentials can be configured directly in settings secrets.
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER CONTROLS */}
      <button
        onClick={handleWipeCalibration}
        className="w-full bg-amber-950/15 hover:bg-amber-950/25 border border-amber-900 text-amber-500 font-extrabold text-lg py-4.5 rounded-xl transition-all min-h-[58px]"
        aria-label="Wipe system calibration values"
      >
        Wipe Calibration Profile
      </button>
    </div>
  );
}
