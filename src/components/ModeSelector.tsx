import { BookOpen, CheckSquare, Globe, Award, Settings, History } from 'lucide-react';
import { AppMode } from '../types';

interface ModeSelectorProps {
  onSelectMode: (mode: AppMode) => void;
  onNavigate: (state: any) => void;
  streakCount: number;
}

export default function ModeSelector({ onSelectMode, onNavigate, streakCount }: ModeSelectorProps) {

  const modes = [
    {
      id: 'READ' as AppMode,
      title: 'READ MODE',
      tagline: 'Scan any physical paper Braille',
      description: 'English transcription + audio feedback',
      color: 'border-l-4 border-l-[#00D4AA]',
      icon: <BookOpen className="w-8 h-8 text-[#00D4AA]" />,
      bg: 'bg-[#1A1A2E]'
    },
    {
      id: 'CHECK' as AppMode,
      title: 'CHECK MODE',
      tagline: 'Verify user handwritten Braille',
      description: 'Heuristic alignment error finder',
      color: 'border-l-4 border-l-[#00FF88]',
      icon: <CheckSquare className="w-8 h-8 text-[#00FF88]" />,
      bg: 'bg-[#1D2B24]'
    },
    {
      id: 'WORLD' as AppMode,
      title: 'WORLD MODE',
      tagline: 'Scan non-paper physical Braille',
      description: 'ATM keys, elevator buttons, metal labels',
      color: 'border-l-4 border-l-[#FFD700]',
      icon: <Globe className="w-8 h-8 text-[#FFD700]" />,
      bg: 'bg-[#2B281D]'
    },
    {
      id: 'LEARN' as AppMode,
      title: 'LEARN MODE',
      tagline: 'Interactive tactile exercises',
      description: 'Lesson guidelines + live practice scoring',
      color: 'border-l-4 border-l-[#7B61FF]',
      icon: <Award className="w-8 h-8 text-[#7B61FF]" />,
      bg: 'bg-[#211D2D]'
    }
  ];

  return (
    <div className="flex flex-col flex-grow justify-between p-6 max-w-lg mx-auto w-full text-white space-y-8 pb-12" style={{ fontFamily: 'Atkinson Hyperlegible, sans-serif' }}>
      
      {/* App Logo & Streak */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center space-x-3">
          <div className="grid grid-cols-2 gap-1 w-8 h-10 p-1 bg-[#1A1A2E] rounded-md border border-teal-500">
            <div className="w-2 h-2 rounded-full bg-[#00D4AA]" />
            <div className="w-2 h-2 rounded-full bg-slate-700" />
            <div className="w-2 h-2 rounded-full bg-[#00D4AA]" />
            <div className="w-2 h-2 rounded-full bg-slate-700" />
            <div className="w-2 h-2 rounded-full bg-[#00D4AA]" />
            <div className="w-2 h-2 rounded-full bg-slate-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">BrailleAir Pro</h1>
            <p className="text-xs text-[#8888AA]">BrailleVision Platform 2026</p>
          </div>
        </div>

        {streakCount > 0 && (
          <div className="bg-[#242438] px-3 py-1.5 rounded-full border border-gray-800 flex items-center space-x-1.5 shadow-md">
            <span className="text-base">🔥</span>
            <span className="text-sm font-bold text-[#FFD700]">{streakCount} DAY STREAK</span>
          </div>
        )}
      </div>

      {/* Main Mode Listings */}
      <div className="flex flex-col flex-grow space-y-4 justify-center">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onSelectMode(mode.id)}
            className={`w-full min-h-[110px] text-left p-5 rounded-2xl flex items-center justify-between border border-gray-800 shadow-md ${mode.color} ${mode.bg} hover:border-slate-500 active:scale-[0.98] transition-all`}
            aria-label={`${mode.title}: ${mode.tagline}`}
          >
            <div className="flex-1 pr-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs tracking-widest font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400">
                  {mode.title}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mt-1">{mode.tagline}</h3>
              <p className="text-sm text-[#8888AA] mt-0.5">{mode.description}</p>
            </div>
            <div className="p-3 bg-[#0A0A0F]/50 rounded-xl max-h-[56px] flex items-center justify-center">
              {mode.icon}
            </div>
          </button>
        ))}
      </div>

      {/* Navigation Footer */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onNavigate('HISTORY')}
          className="flex items-center justify-center space-x-2 bg-[#1A1A2E] hover:bg-[#242438] border border-gray-800 text-slate-300 font-bold text-lg rounded-xl py-4 transition-all min-h-[60px]"
          aria-label="View Past Scans History"
        >
          <History className="w-5 h-5 text-slate-400" />
          <span>History</span>
        </button>
        <button
          onClick={() => onNavigate('SETTINGS')}
          className="flex items-center justify-center space-x-2 bg-[#1A1A2E] hover:bg-[#242438] border border-gray-800 text-slate-300 font-bold text-lg rounded-xl py-4 transition-all min-h-[60px]"
          aria-label="View Custom Accessibility Settings"
        >
          <Settings className="w-5 h-5 text-slate-400" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
