import { CalibrationProfile, ScanResult, Settings } from '../types';

/**
 * storage.ts - Local persistence module for history, settings, profiles, and learning progress
 */

const KEYS = {
  SETTINGS: 'brailleair_settings',
  CALIBRATION: 'brailleair_calibration',
  HISTORY: 'brailleair_history',
  PROGRESS: 'brailleair_progress'
};

const DEFAULT_SETTINGS: Settings = {
  fontSize: 'medium',
  highContrast: false,
  voiceEnabled: true,
  voiceCommands: false,
  ttsSpeed: 1.0,
  ttsVoice: '',
  autoScanInterval: 1000,
  fallbackOpenCV: true,
  geminiApiKey: '',
  storedApiKey: ''
};

// 1. Settings persistence
export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Error reading settings', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings', e);
  }
}

// 2. Calibration profiles
export function getCalibrationProfile(): CalibrationProfile | null {
  try {
    const raw = localStorage.getItem(KEYS.CALIBRATION);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Error reading calibration', e);
    return null;
  }
}

export function saveCalibrationProfile(profile: CalibrationProfile): void {
  try {
    localStorage.setItem(KEYS.CALIBRATION, JSON.stringify(profile));
  } catch (e) {
    console.error('Error saving calibration', e);
  }
}

export function clearCalibrationProfile(): void {
  try {
    localStorage.removeItem(KEYS.CALIBRATION);
  } catch (e) {
    console.error('Error removing calibration', e);
  }
}

// 3. Scan History
export function getHistory(): ScanResult[] {
  try {
    const raw = localStorage.getItem(KEYS.HISTORY);
    if (!raw) return [];
    const history = JSON.parse(raw) as ScanResult[];
    // Sort by timestamp descending
    return history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (e) {
    console.error('Error loading history', e);
    return [];
  }
}

export function saveToHistory(scan: Omit<ScanResult, 'id' | 'timestamp'>): ScanResult {
  const newScan: ScanResult = {
    ...scan,
    id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString()
  };

  try {
    const list = getHistory();
    list.unshift(newScan);
    // Truncate to maximum 50 records to save space
    const truncated = list.slice(0, 50);
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(truncated));
  } catch (e) {
    console.error('Error writing scan to history', e);
  }

  return newScan;
}

export function clearHistory(): void {
  try {
    localStorage.setItem(KEYS.HISTORY, JSON.stringify([]));
  } catch (e) {
    console.error('Error clearing history', e);
  }
}

// 4. Learning Progress
export interface LearnProgress {
  stars: Record<string, number>; // Maps letter/contract to star count (0-3)
  streak: number;
  lastPracticeDate: string; // YYYY-MM-DD
}

export function getProgress(): LearnProgress {
  const defaultProgress: LearnProgress = {
    stars: {},
    streak: 0,
    lastPracticeDate: ''
  };

  try {
    const raw = localStorage.getItem(KEYS.PROGRESS);
    if (!raw) return defaultProgress;
    return { ...defaultProgress, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Error loading learn progress', e);
    return defaultProgress;
  }
}

export function saveProgress(letter: string, stars: number): LearnProgress {
  const current = getProgress();
  const today = new Date().toISOString().split('T')[0];

  // Update stars only if it's better than current score
  const currentStars = current.stars[letter] || 0;
  current.stars[letter] = Math.max(currentStars, stars);

  // Check and increment streak
  if (current.lastPracticeDate) {
    const lastDate = new Date(current.lastPracticeDate);
    const diffTime = Math.abs(new Date(today).getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      current.streak += 1;
    } else if (diffDays > 1) {
      current.streak = 1; // Reset streak
    }
  } else {
    current.streak = 1; // First day
  }

  current.lastPracticeDate = today;

  try {
    localStorage.setItem(KEYS.PROGRESS, JSON.stringify(current));
  } catch (e) {
    console.error('Error saving learn progress', e);
  }

  return current;
}
