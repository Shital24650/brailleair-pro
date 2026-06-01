import { QualityMetrics } from '../types';

/**
 * geminiVision.ts - Client-side proxy utility to request server-side Gemini 3.5 AI Vision operations
 */

export interface GeminiDetectResult {
  cells?: number[][];
  decoded?: string;
  confidence?: number;
  dotCount?: number;
  surfaceType?: string;
  lighting?: string;
  context?: string;
  usefulInfo?: string;
  errors?: any[];
  overallAccuracy?: number;
  encouragement?: string;
  feedback?: string;
  isCorrect?: boolean;
  detectedPattern?: number[];
  score?: number;
  warnings?: string[];
}

export async function detectBrailleFromImage(
  base64Image: string,
  mode: 'READ' | 'CHECK' | 'WORLD' | 'LEARN',
  targetLetter?: string,
  targetPattern?: string
): Promise<GeminiDetectResult> {
  const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

  try {
    const response = await fetch('/api/gemini/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: cleanBase64,
        mode,
        targetLetter,
        targetPattern
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (response.status === 429 || err?.error === 'QUOTA_EXCEEDED') {
        const quotaError = new Error('QUOTA_EXCEEDED');
        quotaError.name = 'QuotaExceededError';
        throw quotaError;
      }
      throw new Error(err.error || 'Server-side Gemini detection failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('Gemini vision API error, falling back locally', error);
    throw error;
  }
}

export async function analyzeImageQuality(base64Image: string): Promise<QualityMetrics> {
  const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

  try {
    const response = await fetch('/api/gemini/quality', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: cleanBase64
      })
    });

    if (!response.ok) {
      throw new Error('Image quality analysis endpoint failed');
    }

    const data = await response.json();
    return data;
  } catch (e) {
    console.warn('Failed to call Gemini quality assessment, returning standard defaults', e);
    return {
      brightness: 75,
      blur: 20,
      angle: 0,
      hasBraille: true
    };
  }
}
