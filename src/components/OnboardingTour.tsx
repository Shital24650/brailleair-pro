import { useState, useEffect } from 'react';
import { BookOpen, HelpCircle, CheckCircle, Volume2 } from 'lucide-react';

interface OnboardingTourProps {
  onComplete: () => void;
}

export default function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [step, setStep] = useState(0);

  const slides = [
    {
      title: "Welcome to BrailleAir Pro",
      description: "An advanced assistive platform designed for low-vision users and learners. This tour will guide you through the layouts and settings in 1 minute.",
      icon: <Volume2 className="w-12 h-12 text-[#00D4AA]" />
    },
    {
      title: "Four Powerful Modes",
      description: "📖 READ scans paper translations. ✍️ CHECK evaluates tactile letters and lists stylus errors. 🌍 WORLD reads dark plastic or metallic labels using directional shadow-analysis. 🧠 LEARN has micro-lessons.",
      icon: <BookOpen className="w-12 h-12 text-[#7B61FF]" />
    },
    {
      title: "Tactile Accessibility First",
      description: "Every button is designed with a minimum of 60px target sizing for simple muscle-memory navigation. Integrated text-to-speech announces scanning updates out loud instantly.",
      icon: <CheckCircle className="w-12 h-12 text-[#00FF88]" />
    }
  ];

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0A0A0F] text-white flex flex-col justify-between p-6 z-[999]" style={{ fontFamily: 'Atkinson Hyperlegible, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between text-sm text-[#8888AA] pt-4">
        <span>ONBOARDING GUIDE</span>
        <span>{step + 1} / {slides.length}</span>
      </div>

      {/* Main Slide Content */}
      <div className="flex flex-col items-center justify-center flex-1 max-w-md mx-auto text-center space-y-6">
        <div className="p-4 bg-[#1A1A2E] rounded-full border border-gray-800 shadow-xl">
          {slides[step].icon}
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white">{slides[step].title}</h2>
        <p className="text-[#8888AA] text-lg leading-relaxed">{slides[step].description}</p>
      </div>

      {/* Footer Controls */}
      <div className="flex flex-col space-y-3 pb-8 max-w-md mx-auto w-full">
        <button
          onClick={handleNext}
          className="w-full bg-[#00D4AA] hover:bg-[#009B7D] active:scale-[0.98] transition-all text-[#0A0A0F] font-bold text-xl rounded-xl shadow-lg border border-teal-400 py-5 px-6 min-h-[60px]"
          aria-label={step === slides.length - 1 ? "Finish Tour" : "Next Onboarding Slide"}
        >
          {step === slides.length - 1 ? "Get Started" : "Continue"}
        </button>
        <button
          onClick={onComplete}
          className="w-full text-[#8888AA] hover:text-white font-semibold text-lg py-3 min-h-[44px]"
          aria-label="Skip Onboarding Guide"
        >
          Skip Tutorial
        </button>
      </div>
    </div>
  );
}
