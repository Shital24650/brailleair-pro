import { useState, useCallback, useRef } from 'react';
import { AppMode, DetectedDot, DetectedCell, CalibrationProfile } from '../types';
import { detectBrailleFromImage } from '../utils/geminiVision';
import { detectDots, detectShadowDots } from '../utils/dotDetector';
import { groupIntoCells } from '../utils/cellGrouper';
import { decodeSequence } from '../utils/brailleMap';

export function useBrailleDetection() {
  const [isScanning, setIsScanning] = useState(false);
  const [dotCount, setDotCount] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [detectedCells, setDetectedCells] = useState<DetectedCell[]>([]);
  const [decodedText, setDecodedText] = useState('');
  const [lastSurface, setLastSurface] = useState<string>('paper');

  const consensusBuffer = useRef<string[]>([]);
  const lastProcessedText = useRef<string>('');

  const resetDetection = useCallback(() => {
    setDetectedCells([]);
    setDecodedText('');
    setDotCount(0);
    setConfidence(0);
    consensusBuffer.current = [];
    lastProcessedText.current = '';
  }, []);

  const processFrame = useCallback(async (
    base64Str: string,
    mode: AppMode,
    canvasElement: HTMLCanvasElement | null,
    profile: CalibrationProfile | null,
    fallbackEnabled: boolean = true,
    targetLetter?: string,
    targetPattern?: string
  ) => {
    setIsScanning(true);
    try {
      // 1. Try server-side Gemini Vision first for supreme precision
      const geminiResult = await detectBrailleFromImage(base64Str, mode, targetLetter, targetPattern);

      if (geminiResult && (geminiResult.cells || geminiResult.decoded)) {
        const text = geminiResult.decoded || '';
        const cellsData: DetectedCell[] = (geminiResult.cells || []).map((binaryPattern, index) => {
          return {
            pattern: binaryPattern.join(''),
            dots: binaryPattern,
            x: 50 + index * 110,
            y: 180,
            width: 80,
            height: 120,
            confidence: geminiResult.confidence || 0.95,
            char: '' // Decoded inline during display or mapping
          };
        });

        // Translate letters instantly
        cellsData.forEach(c => {
          c.char = decodeSequence([c.dots]);
        });

        setConfidence(geminiResult.confidence || 0.95);
        setDotCount(geminiResult.dotCount || (cellsData.length * 3));
        setDetectedCells(cellsData);
        setLastSurface(geminiResult.surfaceType || 'paper');

        // Evaluate stabilized consensus
        if (text) {
          consensusBuffer.current.push(text);
          if (consensusBuffer.current.length > 3) {
            consensusBuffer.current.shift();
          }

          // Trigger result if the last 3 translations align completely
          const unique = Array.from(new Set(consensusBuffer.current));
          if (unique.length === 1 && unique[0] !== '') {
            setDecodedText(unique[0]);
            setIsScanning(false);
            return { success: true, text: unique[0], cells: cellsData, gemini: geminiResult };
          }
        }
        setIsScanning(false);
        return { success: false, text, cells: cellsData, gemini: geminiResult };
      }
    } catch (e) {
      console.warn('Gemini vision request failed, trying computer vision edge fallback:', e);
    }

    // 2. OpenCV fallback pipeline (runs offline or when API is unavailable/throttled)
    if (fallbackEnabled && canvasElement) {
      try {
        let dots: DetectedDot[] = [];
        if (mode === 'WORLD') {
          dots = detectShadowDots(canvasElement); // 3D Surface Tactile Shader Analysis
          setLastSurface('textured/embossed');
        } else {
          dots = detectDots(canvasElement, profile); // CLAHE / Gaussian heuristics
          setLastSurface('paper');
        }

        setDotCount(dots.length);

        // Grid-spacing and cell-grouping
        const spacingEstimate = { horizontal: profile?.dotSpacing?.horizontal || 45, vertical: profile?.dotSpacing?.vertical || 50 };
        const cells = groupIntoCells(dots, spacingEstimate);

        // Apply visual character mapping to cells
        cells.forEach(c => {
          c.char = decodeSequence([c.dots]);
        });

        const localizedText = decodeSequence(cells.map(c => c.dots));
        setDetectedCells(cells);
        setConfidence(0.72); // Computer vision baseline confidence

        if (localizedText) {
          consensusBuffer.current.push(localizedText);
          if (consensusBuffer.current.length > 4) {
            consensusBuffer.current.shift();
          }

          const unique = Array.from(new Set(consensusBuffer.current));
          if (unique.length === 1 && unique[0] !== '') {
            setDecodedText(unique[0]);
            setIsScanning(false);
            return { success: true, text: unique[0], cells };
          }
        }
      } catch (cvError) {
        console.error('Computer vision local pipeline error:', cvError);
      }
    }

    setIsScanning(false);
    return { success: false, text: '', cells: [] };
  }, []);

  return {
    isScanning,
    dotCount,
    confidence,
    detectedCells,
    decodedText,
    lastSurface,
    resetDetection,
    processFrame
  };
}
