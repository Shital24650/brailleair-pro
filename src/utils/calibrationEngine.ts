import { CalibrationProfile, DetectedDot } from '../types';
import { estimateDotSpacing } from './cellGrouper';

/**
 * calibrationEngine.ts - Tracks and processes calibration scans to build personalized profiles
 */

export interface CalibrationScanResult {
  letter: string;
  dots: DetectedDot[];
  imageWidth: number;
  imageHeight: number;
}

export function startCalibration(): string[] {
  return ['a', 'b', 'c', 'the', 'with'];
}

export function buildPersonalProfile(scans: CalibrationScanResult[]): CalibrationProfile {
  let totalDotSize = 0;
  let dotCount = 0;
  let totalCircularity = 0;

  const allHorizontalSpacings: number[] = [];
  const allVerticalSpacings: number[] = [];

  for (const scan of scans) {
    if (scan.dots.length === 0) continue;

    // Dot size and shape
    for (const d of scan.dots) {
      totalDotSize += d.size;
      totalCircularity += d.confidence; // represent shape confidence/circularity here
      dotCount++;
    }

    // Space estimation
    const spacing = estimateDotSpacing(scan.dots);
    allHorizontalSpacings.push(spacing.horizontal);
    allVerticalSpacings.push(spacing.vertical);
  }

  // Median spacing calculation
  allHorizontalSpacings.sort((a, b) => a - b);
  allVerticalSpacings.sort((a, b) => a - b);

  const avgSize = dotCount > 0 ? totalDotSize / dotCount : 35;
  const avgCirc = dotCount > 0 ? totalCircularity / dotCount : 0.85;

  const medianHoriz = allHorizontalSpacings[Math.floor(allHorizontalSpacings.length / 2)] || 45;
  const medianVert = allVerticalSpacings[Math.floor(allVerticalSpacings.length / 2)] || 50;

  // Classify pressure level based on average dot size (larger suggests heavy embossing/stylus pressure)
  let pressureLevel: 'light' | 'medium' | 'heavy' = 'medium';
  if (avgSize < 25) {
    pressureLevel = 'light';
  } else if (avgSize > 55) {
    pressureLevel = 'heavy';
  }

  // Detect smoothness/paper texture based on dot circularity consistency
  let paperType: 'smooth' | 'textured' | 'standard' = 'standard';
  if (avgCirc > 0.9) {
    paperType = 'smooth';
  } else if (avgCirc < 0.65) {
    paperType = 'textured';
  }

  return {
    avgDotSize: Math.round(avgSize),
    dotSpacing: {
      horizontal: Math.round(medianHoriz),
      vertical: Math.round(medianVert)
    },
    minCircularity: parseFloat(Math.max(0.3, avgCirc * 0.8).toFixed(2)),
    pressureLevel,
    paperType
  };
}

export function applyProfileParams(profile: CalibrationProfile | null) {
  const baseParams = {
    minArea: 15,
    maxArea: 600,
    minCircularity: 0.4,
    minConvexity: 0.75,
    minInertiaRatio: 0.3
  };

  if (!profile) return baseParams;

  // Custom adjustments based on users' calibration profile
  const size = profile.avgDotSize;
  const minArea = Math.max(10, Math.round(size * 0.45));
  const maxArea = Math.min(1000, Math.round(size * 2.2));

  let minCircularity = profile.minCircularity;
  if (profile.paperType === 'textured') {
    minCircularity = Math.max(0.3, minCircularity * 0.9); // Relax constraints for coarse paper types
  }

  return {
    minArea,
    maxArea,
    minCircularity,
    minConvexity: profile.pressureLevel === 'heavy' ? 0.8 : 0.7,
    minInertiaRatio: profile.pressureLevel === 'light' ? 0.25 : 0.3
  };
}
