import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppMode, ScanResult, CalibrationProfile, DetectedCell, DetectedDot } from './types';
import SplashScreen from './components/SplashScreen';
import OnboardingTour from './components/OnboardingTour';
import ModeSelector from './components/ModeSelector';
import CameraComponent from './components/Camera';
import ResultPanel from './components/ResultPanel';
import CalibrationWizard from './components/CalibrationWizard';
import CheckMode from './components/CheckMode';
import WorldMode from './components/WorldMode';
import LearnMode from './components/LearnMode';
import HistoryPanel from './components/HistoryPanel';
import SettingsPanel from './components/SettingsPanel';
import { useCamera } from './hooks/useCamera';
import { useAudio } from './hooks/useAudio';
import { useBrailleDetection } from './hooks/useBrailleDetection';
import { getCalibrationProfile, getHistory, saveToHistory, getProgress } from './utils/storage';

export default function App() {
  const [currentState, setCurrentState] = useState<AppState>('SPLASH');
  const [currentMode, setCurrentMode] = useState<AppMode>('READ');
  const [profile, setProfile] = useState<CalibrationProfile | null>(null);
  const [streak, setStreak] = useState(0);

  // Results state variables
  const [scannedTextValue, setScannedTextValue] = useState('');
  const [cellsValue, setCellsValue] = useState<DetectedCell[]>([]);
  const [dotsValue, setDotsValue] = useState<DetectedDot[]>([]);
  const [confidenceValue, setConfidenceValue] = useState(0.95);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    videoRef,
    canvasRef,
    isActive,
    hasPermission,
    error,
    facingMode,
    torchOn,
    startCamera,
    stopCamera,
    toggleFacing,
    toggleTorch,
    captureFrame
  } = useCamera();

  const { speak, stop: stopAudio, announce } = useAudio();

  const {
    isScanning,
    dotCount,
    confidence,
    detectedCells,
    decodedText,
    resetDetection,
    processFrame
  } = useBrailleDetection();

  // Load profile values on startup
  useEffect(() => {
    setProfile(getCalibrationProfile());
    setStreak(getProgress().streak);
  }, [currentState]);

  // Handle active interval loop when in scanning state
  useEffect(() => {
    if (currentState === 'READ_SCANNING') {
      startCamera();
      timerRef.current = setInterval(async () => {
        const frame = captureFrame();
        if (frame) {
          const check = await processFrame(
            frame.base64,
            'READ',
            canvasRef.current,
            profile,
            true
          );

          if (check && check.success) {
            setScannedTextValue(check.text);
            setCellsValue(check.cells || []);
            setConfidenceValue(check.gemini?.confidence || 0.95);

            // Write translation result to history automatically
            const recordsObj = saveToHistory({
              mode: 'READ',
              text: check.text,
              confidence: check.gemini?.confidence || 0.95,
              dotCount: check.cells?.length * 4
            });

            // Transition state
            stopCamera();
            setCurrentState('READ_RESULT');
          }
        }
      }, 2000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (currentState !== 'CHECK_SCANNING' && currentState !== 'WORLD_SCANNING' && currentState !== 'LEARN_LESSON') {
        stopCamera();
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentState, startCamera, stopCamera, captureFrame, processFrame, profile]);

  const handleModeTransition = (mode: AppMode) => {
    setCurrentMode(mode);
    resetDetection();

    if (mode === 'READ') {
      setCurrentState('READ_SCANNING');
      announce('ready');
    } else if (mode === 'CHECK') {
      setCurrentState('CHECK_INPUT');
    } else if (mode === 'WORLD') {
      setCurrentState('WORLD_SCANNING'); // Custom World state inside its component
    } else if (mode === 'LEARN') {
      setCurrentState('LEARN_LESSON'); // Lesson lists handled in LearnMode
    }
  };

  const handleWriteHistoryRecord = (record: any) => {
    saveToHistory(record);
  };

  const handleReturnHome = () => {
    stopCamera();
    stopAudio();
    setCurrentState('HOME');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col justify-between overflow-x-hidden">
      
      {/* 1. SPLASH STATE */}
      {currentState === 'SPLASH' && (
        <SplashScreen onComplete={() => setCurrentState('ONBOARDING')} />
      )}

      {/* 2. ONBOARDING STATE */}
      {currentState === 'ONBOARDING' && (
        <OnboardingTour onComplete={() => setCurrentState('HOME')} />
      )}

      {/* 3. HOME MENU */}
      {currentState === 'HOME' && (
        <ModeSelector
          onSelectMode={handleModeTransition}
          onNavigate={(state) => setCurrentState(state)}
          streakCount={streak}
        />
      )}

      {/* 4. READ CAMERA SCANNING LOOP */}
      {currentState === 'READ_SCANNING' && (
        <CameraComponent
          videoRef={videoRef}
          canvasRef={canvasRef}
          isActive={isActive}
          hasPermission={hasPermission}
          error={error}
          facingMode={facingMode}
          torchOn={torchOn}
          toggleFacing={toggleFacing}
          toggleTorch={toggleTorch}
          onBack={handleReturnHome}
          mode="READ"
          dotCount={dotCount || detectedCells.length * 3}
          confidence={confidence}
          isProcessing={isScanning}
          detectedDots={[]}
          detectedCells={detectedCells}
        />
      )}

      {/* 5. READ TRANSLATION OUTPUT PANEL */}
      {currentState === 'READ_RESULT' && (
        <div className="flex-1 flex flex-col justify-center px-4 py-8">
          <ResultPanel
            text={scannedTextValue}
            mode="READ"
            cells={cellsValue}
            confidence={confidenceValue}
            onNewScan={() => {
              resetDetection();
              setCurrentState('READ_SCANNING');
            }}
            onSave={(text) => handleWriteHistoryRecord({ mode: 'READ', text, confidence: 1.0 })}
          />
        </div>
      )}

      {/* 6. VERIFICATION/CHECK STAGES */}
      {currentState === 'CHECK_INPUT' && (
        <CheckMode
          onBack={handleReturnHome}
          calibrationProfile={profile}
          onSaveToHistory={handleWriteHistoryRecord}
        />
      )}

      {/* 7. WORLD SCENE MODE */}
      {currentState === 'WORLD_SCANNING' && (
        <WorldMode
          onBack={handleReturnHome}
          calibrationProfile={profile}
          onSaveResult={(text, surf, category) => {
            handleWriteHistoryRecord({
              mode: 'WORLD',
              text,
              surfaceType: surf,
              usefulInfo: `Scanned on ${surf} in ${category}`
            });
          }}
        />
      )}

      {/* 8. LEARN CURRICULUM LEVEL */}
      {currentState === 'LEARN_LESSON' && (
        <LearnMode onBack={handleReturnHome} />
      )}

      {/* 9. SERVICE MENUS */}
      {currentState === 'HISTORY' && (
        <HistoryPanel onBack={handleReturnHome} />
      )}

      {currentState === 'SETTINGS' && (
        <SettingsPanel
          onBack={handleReturnHome}
          onRefreshProfile={() => setProfile(getCalibrationProfile())}
        />
      )}
    </div>
  );
}
