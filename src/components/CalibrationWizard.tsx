import { useState, useCallback, useRef, useEffect } from 'react';
import { Camera, ArrowLeft, RotateCcw, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { detectDots } from '../utils/dotDetector';
import { useCalibration } from '../hooks/useCalibration';

interface CalibrationWizardProps {
  onBack: () => void;
}

export default function CalibrationWizard({ onBack }: CalibrationWizardProps) {
  const {
    activeProfile,
    steps,
    currentStepIndex,
    isComplete,
    activeLetter,
    begin,
    nextStep,
    reset
  } = useCalibration();

  const {
    videoRef,
    canvasRef,
    isActive,
    startCamera,
    stopCamera,
    captureFrame
  } = useCamera();

  const [promptMessage, setPromptMessage] = useState('Position the letter under the scan guides.');
  const [successMetric, setSuccessMetric] = useState<string | null>(null);

  useEffect(() => {
    if (activeLetter) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeLetter, startCamera, stopCamera]);

  const handleManualCapture = useCallback(() => {
    const frame = captureFrame();
    if (!frame || !canvasRef.current) {
      setPromptMessage('Failed to capture frames. Clean the lens and retry.');
      return;
    }

    // Process fallback CV dots to measure exact size
    const localDots = detectDots(canvasRef.current, null);

    if (localDots.length === 0) {
      setPromptMessage('No raised dots detected. Point at physical dots firmly.');
      return;
    }

    // Snap metrics and push step forward
    const successfulVal = nextStep(localDots, canvasRef.current.width, canvasRef.current.height);
    if (successfulVal) {
      setPromptMessage('Cell registered! Onto next calibration standard.');
    }
  }, [captureFrame, nextStep]);

  if (isComplete) {
    return (
      <div className="p-6 text-white max-w-lg mx-auto w-full flex flex-col justify-between min-h-[80vh] pb-12" style={{ fontFamily: 'Atkinson Hyperlegible, sans-serif' }}>
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 pt-12">
          <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-400 rounded-full flex items-center justify-center text-emerald-400 shadow-lg">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#00D4AA] to-emerald-400">
            Calibration Completed!
          </h2>
          <p className="text-[#8888AA] text-lg leading-relaxed">
            BrailleAir Pro parsed your alignment patterns. The following tactile values have been written to your offline profile config:
          </p>

          {/* Details list */}
          {activeProfile && (
            <div className="w-full bg-[#1A1A2E] border border-gray-800 p-6 rounded-2xl text-left space-y-3.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#8888AA] font-bold">EMBOSSING PRESSURE</span>
                <span className="font-extrabold text-[#00D4AA] uppercase bg-[#00D4AA]/10 px-3 py-1 rounded border border-[#00D4AA]/30">
                  {activeProfile.pressureLevel} ({activeProfile.avgDotSize}px dot area)
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#8888AA] font-bold">GRID HORIZ SPACING</span>
                <span className="font-extrabold text-slate-300">{activeProfile.dotSpacing.horizontal}px median</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#8888AA] font-bold">GRID VERT SPACING</span>
                <span className="font-extrabold text-slate-300">{activeProfile.dotSpacing.vertical}px median</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#8888AA] font-bold">PAPER TYPE DETECTED</span>
                <span className="font-extrabold text-slate-300 capitalize">{activeProfile.paperType}</span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onBack}
          className="w-full bg-[#00D4AA] hover:bg-[#009B7D] text-[#0A0A0F] font-extrabold text-xl rounded-xl py-5 transition-all min-h-[60px]"
          aria-label="Confirm profile and proceed"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 text-white max-w-lg mx-auto w-full flex flex-col justify-between min-h-[85vh] pb-12" style={{ fontFamily: 'Atkinson Hyperlegible, sans-serif' }}>
      
      {/* Welcome Step overview */}
      {currentStepIndex === -1 ? (
        <div className="flex-grow flex flex-col justify-between">
          <div className="pt-8 space-y-6">
            <h1 className="text-3xl font-extrabold leading-tight text-white mb-2">Configure Tactile Calibration</h1>
            <p className="text-[#8888AA] text-lg leading-relaxed">
              Every person has unique peg alignment sizes, embossing thicknesses, or stylus patterns. Calibrating guides our computer vision thresholds exactly.
            </p>
            <div className="p-4 bg-[#1A1A2E] border border-gray-800 rounded-xl flex items-start space-x-3 text-sm">
              <Sparkles className="w-5 h-5 text-[#00D4AA] shrink-0 mt-0.5" />
              <p className="text-slate-300 leading-tight">
                Takes only 2 minutes. We will scan standard Braille cells containing known letters and record their spatial widths automatically.
              </p>
            </div>
          </div>

          <div className="flex flex-col space-y-4 pb-8">
            <button
              onClick={begin}
              className="w-full bg-[#00D4AA] hover:bg-[#009B7D] text-[#0A0A0F] font-extrabold text-xl py-5 rounded-2xl shadow-lg border border-teal-400 transition-all min-h-[64px]"
              aria-label="Start Step by step calibration sequence"
            >
              Start Calibration
            </button>
            <button
              onClick={onBack}
              className="w-full text-slate-400 font-semibold text-lg py-3 min-h-[44px]"
              aria-label="Skip Calibration setup"
            >
              Skip Setup
            </button>
          </div>
        </div>
      ) : (
        /* Active Scanning Steps */
        <div className="flex-grow flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <button onClick={reset} className="text-[#8888AA] hover:text-white flex items-center space-x-1 font-bold text-sm">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400 uppercase tracking-widest">
              STEP {currentStepIndex + 1} OF {steps.length}
            </span>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold">Scan Letter: "{activeLetter?.toUpperCase()}"</h2>
            <div className="bg-[#1A1A2E] p-4 rounded-xl border border-gray-800 flex items-center space-x-4">
              <div className="grid grid-cols-2 gap-2 w-14 h-20 p-1.5 bg-[#0A0A0F] rounded-md border border-gray-800 shrink-0">
                {activeLetter === 'a' && (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full bg-[#00D4AA]" />
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-800" />
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-800" />
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-800" />
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-800" />
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-800" />
                  </>
                )}
                {activeLetter === 'b' && (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full bg-[#00D4AA]" />
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-800" />
                    <div className="w-3.5 h-3.5 rounded-full bg-[#00D4AA]" />
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-800" />
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-800" />
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-800" />
                  </>
                )}
                {activeLetter !== 'a' && activeLetter !== 'b' && (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full bg-[#00D4AA]" />
                    <div className="w-3.5 h-3.5 rounded-full bg-[#00D4AA]" />
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-800" />
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-800" />
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-800" />
                    <div className="w-3.5 h-3.5 rounded-full bg-[#00D4AA]" />
                  </>
                )}
              </div>
              <p className="text-[#8888AA] text-sm leading-tight">
                Print or write the correct dots representing standard letter "{activeLetter?.toUpperCase()}" and position them centered on the guidelines.
              </p>
            </div>
          </div>

          {/* Absolute scanning camera container */}
          <div className="relative rounded-2xl overflow-hidden border border-gray-800 bg-black aspect-square max-h-[300px]">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-10 border border-teal-500/30 rounded-lg pointer-events-none flex flex-col justify-between py-2 px-2">
              <div className="w-3.5 h-3.5 border-t-2 border-l-2 border-[#00D4AA]" />
              <div className="w-3.5 h-3.5 border-b-2 border-r-2 border-[#00D4AA] self-end" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-center text-sm font-semibold text-[#8888AA]">
              {promptMessage}
            </div>

            <button
              onClick={handleManualCapture}
              className="w-full bg-[#00D4AA] hover:bg-[#009B7D] text-[#0A0A0F] font-extrabold text-lg py-5 rounded-xl shadow-md min-h-[60px]"
              aria-label="Capture alignment frame"
            >
              Align & Record Cell
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
