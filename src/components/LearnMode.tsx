import { useState, useEffect, useRef } from 'react';
import { Camera, Volume2, ArrowLeft, RefreshCw, Star, Trophy, Sparkles, CheckCircle, Award } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { getExpectedPattern, decodeSequence } from '../utils/brailleMap';
import { detectDots } from '../utils/dotDetector';
import { groupIntoCells } from '../utils/cellGrouper';
import { speak, stopSpeaking } from '../utils/ttsEngine';
import { saveProgress, getProgress } from '../utils/storage';

interface LearnModeProps {
  onBack: () => void;
}

interface Lesson {
  letter: string;
  dots: number[];
  clue: string;
}

export default function LearnMode({ onBack }: LearnModeProps) {
  const curriculum: Lesson[] = [
    { letter: 'a', dots: [1, 0, 0, 0, 0, 0], clue: 'Top-left dot raised.' },
    { letter: 'b', dots: [1, 1, 0, 0, 0, 0], clue: 'Top-left and middle-left dots raised.' },
    { letter: 'c', dots: [1, 0, 0, 1, 0, 0], clue: 'Top-left and top-right dots raised.' },
    { letter: 'd', dots: [1, 0, 0, 1, 1, 0], clue: 'Top-left, top-right, and middle-right dots.' },
    { letter: 'e', dots: [1, 0, 0, 0, 1, 0], clue: 'Top-left and middle-right dots raised.' }
  ];

  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [successScore, setSuccessScore] = useState<number | null>(null);
  const [detectedLetter, setDetectedLetter] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [starsMap, setStarsMap] = useState<Record<string, number>>(getProgress().stars);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  const {
    videoRef,
    canvasRef,
    isActive,
    startCamera,
    stopCamera,
    captureFrame
  } = useCamera();

  const lesson = curriculum[activeLessonIndex];

  useEffect(() => {
    startCamera();
    speakLesson();

    return () => {
      stopCamera();
      stopSpeaking();
    };
  }, [activeLessonIndex, startCamera]);

  const speakLesson = () => {
    speak(`Let's learn the letter ${lesson.letter.toUpperCase()}. ${lesson.clue}`, 'high');
  };

  const handlePracticeCapture = async () => {
    setIsProcessing(true);
    setSuccessScore(null);
    setDetectedLetter(null);
    setIsQuotaExceeded(false);

    const frame = captureFrame();
    if (!frame) {
      speak('Camera snapshot error. Make sure your hands are clear.', 'high');
      setIsProcessing(false);
      return;
    }

    try {
      // Connect to server-side Gemini LEARN analysis to match cell config
      const response = await fetch('/api/gemini/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: frame.base64.replace(/^data:image\/[a-z]+;base64,/, ''),
          mode: 'LEARN',
          targetLetter: lesson.letter,
          targetPattern: JSON.stringify(lesson.dots)
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        if (response.status === 429 || errJson?.error === 'QUOTA_EXCEEDED') {
          setIsQuotaExceeded(true);
          throw new Error('QUOTA_EXCEEDED');
        }
        throw new Error(errJson?.error || 'Learn server response failed.');
      }

      const learnDetails = await response.json();
      setIsQuotaExceeded(false);
      const userCorrect = learnDetails.isCorrect === true || learnDetails.score >= 80;

      // Grade scoring calculations
      const calculatedScore = learnDetails.score || 70;
      setSuccessScore(calculatedScore);

      const resolvedLetter = userCorrect ? lesson.letter : 'unknown';
      setDetectedLetter(resolvedLetter);

      if (userCorrect) {
        const starRating = calculatedScore >= 95 ? 3 : calculatedScore >= 85 ? 2 : 1;
        
        // Write score metrics straight to storage
        const nextProgress = saveProgress(lesson.letter, starRating);
        setStarsMap(nextProgress.stars);

        speak(`Correct! Amazing job! You earned ${starRating} stars for letter ${lesson.letter.toUpperCase()}`, 'high');
      } else {
        speak(`Close attempt. Feedback says: ${learnDetails.feedback || 'Try aligning the dot patterns again.'}`, 'high');
      }
    } catch (e: any) {
      console.warn('Gemini Learn scan failed, doing local edge matching:', e);
      const isQuota = e.message === 'QUOTA_EXCEEDED' || e.message?.includes('429');
      if (isQuota) {
        setIsQuotaExceeded(true);
      }
      
      // Heuristic fallback matching local contours
      const boardDots = detectDots(canvasRef.current || document.createElement('canvas'), null);
      const computedBoardCells = groupIntoCells(boardDots, { horizontal: 45, vertical: 50 });
      const boardText = decodeSequence(computedBoardCells.map(c => c.dots));

      const matchLetter = boardText.toLowerCase().trim();
      const isWordMatch = matchLetter.includes(lesson.letter);

      if (isWordMatch) {
        setSuccessScore(100);
        setDetectedLetter(lesson.letter);
        const updatedProg = saveProgress(lesson.letter, 3);
        setStarsMap(updatedProg.stars);
        
        if (isQuota) {
          speak(`Perfect! The cloud service limit was handling beautifully offline. Your handwritten shape matches ${lesson.letter.toUpperCase()} perfectly!`, 'high');
        } else {
          speak(`Correct! Locally evaluated letter shape matches ${lesson.letter.toUpperCase()}!`, 'high');
        }
      } else {
        setSuccessScore(40);
        setDetectedLetter('wrong pattern');
        if (isQuota) {
          speak(`Close shape offline analysis. Try checking standard dots for ${lesson.letter.toUpperCase()} and align again.`, 'high');
        } else {
          speak(`Not quite. Try aligning only the standard dots for ${lesson.letter.toUpperCase()}. Click the guide illustration.`, 'high');
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNextLesson = () => {
    setSuccessScore(null);
    setDetectedLetter(null);
    if (activeLessonIndex < curriculum.length - 1) {
      setActiveLessonIndex(prev => prev + 1);
    } else {
      onBack(); // Hub return on completion of levels
    }
  };

  return (
    <div className="p-6 text-white max-w-lg mx-auto w-full flex flex-col justify-between min-h-[85vh] pb-12" style={{ fontFamily: 'Atkinson Hyperlegible, sans-serif' }}>
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <button onClick={onBack} className="text-[#8888AA] hover:text-white flex items-center space-x-1 font-bold text-sm">
          <ArrowLeft className="w-4 h-4" />
          <span>Exit</span>
        </button>
        <span className="text-xs font-bold text-[#7B61FF] bg-[#7B61FF]/10 px-2.5 py-1 rounded border border-[#7B61FF]/30 tracking-wider">
          TACTILE SCHOOL
        </span>
      </div>

      {/* ILLUSTRATED PATTERN CARD */}
      <div className="bg-[#1A1A2E] border border-gray-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-[#8888AA] font-bold">PRACTICE LEVEL {activeLessonIndex + 1}</span>
            <h2 className="text-3xl font-black text-white">Letter: "{lesson.letter.toUpperCase()}"</h2>
          </div>
          <div className="flex space-x-0.5">
            {[1, 2, 3].map(pos => (
              <Star
                key={pos}
                className={`w-5 h-5 ${pos <= (starsMap[lesson.letter] || 0) ? 'text-[#FFD700] fill-[#FFD700]' : 'text-slate-600'}`}
              />
            ))}
          </div>
        </div>

        {/* 6 Grid Circles visualization of target letter */}
        <div className="flex justify-center py-2.5">
          <div className="grid grid-cols-2 gap-3.5 bg-[#0A0A0F] border border-slate-800 p-4 rounded-xl shadow-inner w-24">
            {lesson.dots.map((isFilled, idx) => (
              <div
                key={idx}
                className={`w-5 h-5 rounded-full transition-all duration-300 ${isFilled === 1 ? 'bg-[#7B61FF] scale-110 shadow-[0_0_8px_#7B61FF]' : 'bg-[#242438]'}`}
                aria-label={`Dot position ${idx + 1} ${isFilled === 1 ? 'Raised' : 'Flat'}`}
              />
            ))}
          </div>
        </div>

        <p className="text-[#8888AA] text-sm text-center leading-snug">{lesson.clue}</p>
      </div>

      {/* CAMERA SCREEN FEEDBACK */}
      {successScore === null ? (
        <div className="flex flex-col space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-gray-800 bg-black aspect-square max-h-[220px]">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <button
            onClick={handlePracticeCapture}
            disabled={isProcessing}
            className="w-full bg-[#7B61FF] hover:bg-[#6449E2] text-white font-extrabold text-xl py-5 rounded-2xl active:scale-[0.98] transition-all shadow-lg min-h-[60px] flex items-center justify-center"
            aria-label="Capture practice shape"
          >
            {isProcessing ? (
              <span className="animate-pulse">EVALUATING PLACEMENT...</span>
            ) : (
              <span>Check My Placement</span>
            )}
          </button>
        </div>
      ) : (
        /* AFTER SCORE BOARD REVIEW */
        <div className="bg-[#0A0A0F]/60 border border-gray-800 p-6 rounded-2xl text-center space-y-5 shadow-inner">
          <div className="flex justify-center">
            {successScore >= 80 ? (
              <Trophy className="w-14 h-14 text-[#FFD700] animate-bounce" />
            ) : (
              <Sparkles className="w-14 h-14 text-indigo-400" />
            )}
          </div>
          
          <div className="space-y-1">
            <h3 className="text-2xl font-bold">{successScore >= 80 ? 'Correct Alignment!' : 'Requires Adjustment'}</h3>
            <p className="text-sm text-[#8888AA] max-w-xs mx-auto">
              Heuristics measured a matching accuracy score of {successScore}%.
            </p>
          </div>

          <button
            onClick={successScore >= 80 ? handleNextLesson : () => setSuccessScore(null)}
            className="w-full bg-white text-[#0A0A0F] font-extrabold text-lg py-4.5 rounded-xl transition-all min-h-[58px]"
          >
            {successScore >= 80 ? 'Next Lesson' : 'Practice Again'}
          </button>
        </div>
      )}
    </div>
  );
}
