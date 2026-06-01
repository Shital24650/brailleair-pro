/**
 * BrailleAir Pro - Type Definitions
 */

export type AppMode = 'READ' | 'CHECK' | 'WORLD' | 'LEARN';

export type AppState =
  | 'SPLASH'
  | 'ONBOARDING'
  | 'CALIBRATION'
  | 'HOME'
  | 'READ_SCANNING'
  | 'READ_RESULT'
  | 'CHECK_INPUT'
  | 'CHECK_SCANNING'
  | 'CHECK_RESULT'
  | 'WORLD_SCANNING'
  | 'WORLD_RESULT'
  | 'LEARN_LESSON'
  | 'HISTORY'
  | 'SETTINGS';

export interface CalibrationProfile {
  avgDotSize: number; // in pixels
  dotSpacing: {
    horizontal: number;
    vertical: number;
  };
  minCircularity: number;
  pressureLevel: 'light' | 'medium' | 'heavy';
  paperType: 'smooth' | 'textured' | 'standard';
}

export interface ScanResult {
  id: string;
  timestamp: string;
  mode: AppMode;
  text: string;
  accuracy?: number; // for CHECK MODE
  image?: string; // base64 visual thumbnail
  dotCount?: number;
  confidence?: number;
  surfaceType?: string;
  usefulInfo?: string;
}

export interface Settings {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  highContrast: boolean;
  voiceEnabled: boolean;
  voiceCommands: boolean;
  ttsSpeed: number; // 0.5 to 2.0
  ttsVoice: string; // voice name
  autoScanInterval: number; // ms to pause between scans, or 0 for manual
  fallbackOpenCV: boolean;
  geminiApiKey: string; // stored locally in settings, used if process.env.GEMINI_API_KEY is not available
  storedApiKey: string;
}

export interface BrailleIndicatorState {
  numberMode: boolean;
  capitalMode: boolean;
  italicMode: boolean;
}

export interface BrailleError {
  cellIndex: number;
  errorType: 'missing_dot' | 'extra_dot' | 'misplaced_dot' | 'wrong_spacing' | 'unknown';
  dotPosition: number; // 1-6
  expected: number[]; // 6-bit array
  detected: number[]; // 6-bit array
  correction: string;
}

export interface CheckReport {
  decoded: string;
  cells: number[][]; // detected cells
  errors: BrailleError[];
  overallAccuracy: number;
  encouragement: string;
  tip?: string;
}

export interface QualityMetrics {
  brightness: number; // 0-100
  blur: number; // 0-100
  angle: number; // degrees deviation from flat
  hasBraille: boolean;
}

export interface DetectedDot {
  x: number;
  y: number;
  size: number;
  confidence: number;
}

export interface DetectedCell {
  pattern: string; // e.g. '100000'
  dots: number[]; // 6 elements [0/1]
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  char?: string;
}
