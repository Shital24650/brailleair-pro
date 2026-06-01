import { BrailleError, CheckReport } from '../types';
import { getExpectedPattern, decodeSequence, GRADE1 } from './brailleMap';

/**
 * errorAnalyzer.ts - Checks Braille writing accuracy and produces human-oriented suggestions
 */

export function analyzeErrors(detectedPatterns: number[][], expectedText: string): CheckReport {
  const cleanExpected = expectedText.trim().replace(/\s+/g, ' ');
  const expectedChars = cleanExpected.split('');
  const errors: BrailleError[] = [];

  // Decode the user's actual writing
  const decodedText = decodeSequence(detectedPatterns);

  const totalCells = Math.max(detectedPatterns.length, expectedChars.length);
  let correctCount = 0;

  for (let i = 0; i < totalCells; i++) {
    const detected = detectedPatterns[i] || [0, 0, 0, 0, 0, 0];
    const expectedChar = expectedChars[i];
    const expected = expectedChar ? getExpectedPattern(expectedChar) : [0, 0, 0, 0, 0, 0];

    const isMatch = detected.every((val, idx) => val === expected[idx]);

    if (isMatch) {
      if (expectedChar) correctCount++;
      continue;
    }

    // Diagnose dot differences
    // Grid maps: 1=TL, 2=ML, 3=BL, 4=TR, 5=MR, 6=BR
    const dotNames = ['', 'top-left', 'middle-left', 'bottom-left', 'top-right', 'middle-right', 'bottom-right'];

    for (let d = 0; d < 6; d++) {
      const pos = d + 1;
      const detDot = detected[d];
      const expDot = expected[d];

      if (detDot !== expDot) {
        let errorType: 'missing_dot' | 'extra_dot' | 'misplaced_dot' = 'missing_dot';
        let correction = '';

        if (expDot === 1 && detDot === 0) {
          errorType = 'missing_dot';
          correction = `Add dot ${pos} (${dotNames[pos]}) to cell ${i + 1}`;
        } else if (expDot === 0 && detDot === 1) {
          errorType = 'extra_dot';
          correction = `Remove dot ${pos} (${dotNames[pos]}) from cell ${i + 1}`;
        }

        const expLetter = expectedChar || '';
        const detLetterStr = i < detectedPatterns.length ? decodeSequence([detected]) : '';
        const detLetter = detLetterStr ? `'${detLetterStr}'` : 'blank';

        if (expLetter) {
          correction += `. You wrote ${detLetter} but it should be '${expLetter}'`;
        }

        errors.push({
          cellIndex: i,
          errorType,
          dotPosition: pos,
          expected,
          detected,
          correction
        });
      }
    }
  }

  // Calculate percentage accuracy
  const overallAccuracy = totalCells > 0 ? Math.round((correctCount / totalCells) * 100) : 100;

  // Grade and encouragement
  let grade = 'Keep Trying';
  let encouragement = 'Don\'t worry! Braille writing takes practice. Try scanning again slowly.';

  if (overallAccuracy === 100) {
    grade = 'Excellent!';
    encouragement = 'Perfect! All your Braille writing is completely correct!';
  } else if (overallAccuracy >= 90) {
    grade = 'Outstanding!';
    encouragement = 'Amazing job! Nearly perfect, with just a tiny adjustment needed.';
  } else if (overallAccuracy >= 75) {
    grade = 'Very Good!';
    encouragement = 'Great work! You have the core shape down. Just double-check your dots.';
  } else if (overallAccuracy >= 50) {
    grade = 'Good Effort';
    encouragement = 'Good attempt! Take your time making each dot distinct and firm.';
  }

  // Generate learning tip based on common mistakes
  const tip = generateLearningTip(errors);

  return {
    decoded: decodedText,
    cells: detectedPatterns,
    errors,
    overallAccuracy,
    encouragement: `${grade} ${encouragement}`,
    tip
  };
}

function generateLearningTip(errors: BrailleError[]): string {
  if (errors.length === 0) {
    return 'You have mastered this sequence! Keep practicing with Grade 2 contractions.';
  }

  // Analyze most missing or extra dots
  const missingCount: Record<number, number> = {};
  const extraCount: Record<number, number> = {};

  for (const err of errors) {
    if (err.errorType === 'missing_dot') {
      missingCount[err.dotPosition] = (missingCount[err.dotPosition] || 0) + 1;
    } else if (err.errorType === 'extra_dot') {
      extraCount[err.dotPosition] = (extraCount[err.dotPosition] || 0) + 1;
    }
  }

  let peakMissingDot = -1;
  let maxMissing = 0;
  for (const [dot, count] of Object.entries(missingCount)) {
    if (count > maxMissing) {
      maxMissing = count;
      peakMissingDot = parseInt(dot, 10);
    }
  }

  let peakExtraDot = -1;
  let maxExtra = 0;
  for (const [dot, count] of Object.entries(extraCount)) {
    if (count > maxExtra) {
      maxExtra = count;
      peakExtraDot = parseInt(dot, 10);
    }
  }

  if (peakMissingDot !== -1 && maxMissing >= maxExtra) {
    const side = peakMissingDot <= 3 ? 'left' : 'right';
    const row = peakMissingDot <= 3 ? peakMissingDot : peakMissingDot - 3;
    const rowNames = ['top', 'middle', 'bottom'];
    return `Learning Tip: You frequently miss dot ${peakMissingDot} (${rowNames[row - 1]} ${side}). Remember to press firmly on the ${rowNames[row - 1]}-${side} of your stylus/peg!`;
  } else if (peakExtraDot !== -1) {
    const side = peakExtraDot <= 3 ? 'left' : 'right';
    const row = peakExtraDot <= 3 ? peakExtraDot : peakExtraDot - 3;
    const rowNames = ['top', 'middle', 'bottom'];
    return `Learning Tip: You tend to add extra accidental marks at dot ${peakExtraDot} (${rowNames[row - 1]} ${side}). Try leaving plenty of clear space between your cells!`;
  }

  return 'Learning Tip: Make sure your cell columns are vertically straight. Dots 1-2-3 go down the left side, and 4-5-6 go down the right!';
}
