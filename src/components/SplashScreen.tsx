import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [activeDots, setActiveDots] = useState<number[]>([]);

  // B-A Braille mapping:
  // B: dots 1, 2 = [1, 1, 0, 0, 0, 0]
  // A: dot 1 = [1, 0, 0, 0, 0, 0]
  const bDots = [1, 2];
  const aDots = [7]; // mapped to 2nd cell top-left (7)

  useEffect(() => {
    const sequence = [1, 2, 7];
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < sequence.length) {
        setActiveDots(prev => [...prev, sequence[currentIndex]]);
        currentIndex++;
      } else {
        clearInterval(interval);
        const timeout = setTimeout(() => {
          onComplete();
        }, 1100);
        return () => clearTimeout(timeout);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-[#0A0A0F] flex flex-col items-center justify-center text-white z-[9999]">
      <div className="flex flex-col items-center space-y-8">
        {/* Responsive Braille Grid representation for "B - A" */}
        <div className="flex space-x-12">
          {/* Cell 1: B */}
          <div className="grid grid-cols-2 gap-4 w-20 h-28 p-2 bg-[#1A1A2E] rounded-xl border border-gray-800 shadow-xl">
            <div className={`w-6 h-6 rounded-full transition-all duration-300 ${activeDots.includes(1) ? 'bg-[#00D4AA] scale-110 shadow-[0_0_12px_#00D4AA]' : 'bg-[#242438]'}`} id="dot-1" />
            <div className="w-6 h-6 rounded-full bg-[#242438]" id="dot-4" />
            <div className={`w-6 h-6 rounded-full transition-all duration-300 ${activeDots.includes(2) ? 'bg-[#00D4AA] scale-110 shadow-[0_0_12px_#00D4AA]' : 'bg-[#242438]'}`} id="dot-2" />
            <div className="w-6 h-6 rounded-full bg-[#242438]" id="dot-5" />
            <div className="w-6 h-6 rounded-full bg-[#242438]" id="dot-3" />
            <div className="w-6 h-6 rounded-full bg-[#242438]" id="dot-6" />
          </div>

          {/* Cell 2: A */}
          <div className="grid grid-cols-2 gap-4 w-20 h-28 p-2 bg-[#1A1A2E] rounded-xl border border-gray-800 shadow-xl">
            <div className={`w-6 h-6 rounded-full transition-all duration-300 ${activeDots.includes(7) ? 'bg-[#00D4AA] scale-110 shadow-[0_0_12px_#00D4AA]' : 'bg-[#242438]'}`} id="dot-2-1" />
            <div className="w-6 h-6 rounded-full bg-[#242438]" id="dot-2-4" />
            <div className="w-6 h-6 rounded-full bg-[#242438]" id="dot-2-2" />
            <div className="w-6 h-6 rounded-full bg-[#242438]" id="dot-2-5" />
            <div className="w-6 h-6 rounded-full bg-[#242438]" id="dot-2-3" />
            <div className="w-6 h-6 rounded-full bg-[#242438]" id="dot-2-6" />
          </div>
        </div>

        {/* Text Fade and Typewriter */}
        <div className="text-center space-y-2 animate-pulse">
          <h1 className="text-4xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#00D4AA] to-teal-400 font-sans" style={{ fontFamily: 'Atkinson Hyperlegible, sans-serif' }}>
            BrailleAir Pro
          </h1>
          <p className="text-[#8888AA] tracking-wider text-lg font-medium" style={{ fontFamily: 'Atkinson Hyperlegible, sans-serif' }}>
            Braille for Everyone
          </p>
        </div>
      </div>
    </div>
  );
}
