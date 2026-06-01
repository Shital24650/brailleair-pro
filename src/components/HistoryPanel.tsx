import { useState, useEffect } from 'react';
import { Trash2, ArrowLeft, Calendar, FileText, Globe, CheckSquare } from 'lucide-react';
import { getHistory, clearHistory } from '../utils/storage';
import { ScanResult } from '../types';

interface HistoryPanelProps {
  onBack: () => void;
}

export default function HistoryPanel({ onBack }: HistoryPanelProps) {
  const [list, setList] = useState<ScanResult[]>([]);

  useEffect(() => {
    setList(getHistory());
  }, []);

  const handleClear = () => {
    if (confirm('Clear all translation history records completely?')) {
      clearHistory();
      setList([]);
    }
  };

  return (
    <div className="p-6 text-white max-w-lg mx-auto w-full flex flex-col justify-between min-h-[85vh] pb-12" style={{ fontFamily: 'Atkinson Hyperlegible, sans-serif' }}>
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <button onClick={onBack} className="text-[#8888AA] hover:text-white flex items-center space-x-1 font-bold text-sm">
          <ArrowLeft className="w-4 h-4" />
          <span>Exit</span>
        </button>
        <span className="text-xs font-bold text-[#8888AA] tracking-widest uppercase">
          SCAN HISTORY
        </span>
      </div>

      {/* BODY SCAN LIST */}
      <div className="flex-1 overflow-y-auto max-h-[500px] py-4 space-y-4 pr-1 mt-4">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600 text-center space-y-2">
            <Calendar className="w-12 h-12 text-slate-800" />
            <p className="text-lg font-bold">No translation history yet</p>
            <p className="text-sm">Scanned pages and translations appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((item) => (
              <div key={item.id} className="bg-[#1A1A2E] border border-gray-800 p-5 rounded-2xl space-y-3 shadow-md flex flex-col">
                <div className="flex items-center justify-between border-b border-gray-800/60 pb-2">
                  <div className="flex items-center space-x-2">
                    {item.mode === 'WORLD' ? (
                      <Globe className="w-4 h-4 text-[#FFD700]" />
                    ) : item.mode === 'CHECK' ? (
                      <CheckSquare className="w-4 h-4 text-[#00FF88]" />
                    ) : (
                      <FileText className="w-4 h-4 text-[#00D4AA]" />
                    )}
                    <span className="text-xs uppercase font-extrabold tracking-wider bg-slate-800 px-2 py-0.5 rounded text-white border border-slate-700">
                      {item.mode}
                    </span>
                  </div>
                  <span className="text-xs text-[#8888AA]">
                    {new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-lg font-bold text-white break-words">
                  "{item.text}"
                </p>

                {item.usefulInfo && (
                  <span className="text-xs text-[#8888AA] font-semibold leading-relaxed">
                    {item.usefulInfo}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER CONTROLS */}
      {list.length > 0 && (
        <button
          onClick={handleClear}
          className="w-full bg-red-950/20 hover:bg-red-950/40 border border-red-900/60 text-red-400 font-bold text-lg py-4 rounded-xl flex items-center justify-center space-x-2 min-h-[56px]"
          aria-label="Wipe all translation logs"
        >
          <Trash2 className="w-5 h-5" />
          <span>Clear All Records</span>
        </button>
      )}
    </div>
  );
}
