import { useState, useCallback } from 'react';
import { CalibrationProfile, DetectedDot } from '../types';
import { startCalibration, buildPersonalProfile, CalibrationScanResult } from '../utils/calibrationEngine';
import { saveCalibrationProfile, getCalibrationProfile } from '../utils/storage';

export function useCalibration() {
  const [activeProfile, setActiveProfile] = useState<CalibrationProfile | null>(getCalibrationProfile());
  const [steps] = useState<string[]>(startCalibration());
  const [currentStepIndex, setCurrentStepIndex] = useState(-1); // -1 means welcome step
  const [results, setResults] = useState<CalibrationScanResult[]>([]);

  const begin = useCallback(() => {
    setCurrentStepIndex(0);
    setResults([]);
  }, []);

  const nextStep = useCallback((dots: DetectedDot[], width: number, height: number) => {
    if (currentStepIndex < 0 || currentStepIndex >= steps.length) return false;

    const currentLetter = steps[currentStepIndex];
    const itemScan: CalibrationScanResult = {
      letter: currentLetter,
      dots,
      imageWidth: width,
      imageHeight: height
    };

    const nextScans = [...results, itemScan];
    setResults(nextScans);

    const isLast = currentStepIndex === steps.length - 1;
    if (isLast) {
      const generatedProfile = buildPersonalProfile(nextScans);
      saveCalibrationProfile(generatedProfile);
      setActiveProfile(generatedProfile);
      setCurrentStepIndex(steps.length); // wizard completed
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
    return true;
  }, [currentStepIndex, steps, results]);

  const reset = useCallback(() => {
    setCurrentStepIndex(-1);
    setResults([]);
  }, []);

  return {
    activeProfile,
    steps,
    currentStepIndex,
    isComplete: currentStepIndex === steps.length,
    activeLetter: currentStepIndex >= 0 && currentStepIndex < steps.length ? steps[currentStepIndex] : null,
    begin,
    nextStep,
    reset
  };
}
