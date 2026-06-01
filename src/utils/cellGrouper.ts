import { DetectedDot, DetectedCell } from '../types';
import { decodeSequence } from './brailleMap';

/**
 * Spatial clustering and grid snapping for Braille dots
 */

export function estimateDotSpacing(dots: DetectedDot[]): { horizontal: number; vertical: number } {
  if (dots.length < 2) {
    return { horizontal: 45, vertical: 45 }; // Default spacing in pixels
  }

  const distances: number[] = [];

  // For each dot, calculate distance to its 3 nearest neighbors
  for (let i = 0; i < dots.length; i++) {
    const d1 = dots[i];
    const itemDists: number[] = [];

    for (let j = 0; j < dots.length; j++) {
      if (i === j) continue;
      const d2 = dots[j];
      const dist = Math.hypot(d2.x - d1.x, d2.y - d1.y);
      itemDists.push(dist);
    }

    itemDists.sort((a, b) => a - b);
    distances.push(...itemDists.slice(0, Math.min(3, itemDists.length)));
  }

  distances.sort((a, b) => a - b);
  const medianDist = distances[Math.floor(distances.length / 2)] || 45;

  // Horizontal spacing typically slightly different from vertical in scans, but we can assume they are close
  return {
    horizontal: medianDist,
    vertical: medianDist * 1.1 // standard Braille aspect ratio is slightly taller
  };
}

export function groupIntoCells(
  dots: DetectedDot[],
  spacing: { horizontal: number; vertical: number }
): DetectedCell[] {
  if (dots.length === 0) return [];

  // Sort dots primarily by x coordinate to identify clusters from left to right
  const sortedDots = [...dots].sort((a, b) => a.x - b.x);

  // Simple cell clustering logic:
  // Braille cell size: width is approx 2.2 * horizontal spacing, height is approx 3.2 * vertical spacing
  const cellWidth = spacing.horizontal * 2.2;
  const cellHeight = spacing.vertical * 3.2;

  const cells: { dots: DetectedDot[]; minX: number; maxX: number; minY: number; maxY: number }[] = [];

  for (const dot of sortedDots) {
    // Find if this dot can fit into an existing cell cluster
    let foundCell = false;

    for (const cell of cells) {
      // If dot is within range of the cell bounds
      const centerX = (cell.minX + cell.maxX) / 2;
      const centerY = (cell.minY + cell.maxY) / 2;

      // Distance checking
      if (Math.abs(dot.x - centerX) < cellWidth * 0.9 && Math.abs(dot.y - centerY) < cellHeight * 0.9) {
        cell.dots.push(dot);
        cell.minX = Math.min(cell.minX, dot.x);
        cell.maxX = Math.max(cell.maxX, dot.x);
        cell.minY = Math.min(cell.minY, dot.y);
        cell.maxY = Math.max(cell.maxY, dot.y);
        foundCell = true;
        break;
      }
    }

    if (!foundCell) {
      // Create new cell group
      cells.push({
        dots: [dot],
        minX: dot.x,
        maxX: dot.x,
        minY: dot.y,
        maxY: dot.y
      });
    }
  }

  // Map clusters to 6-bit grid patterns
  const detectedCells: DetectedCell[] = cells.map(cellGroup => {
    // Determine cell center and dimensions
    const minY = cellGroup.minY;
    const maxY = cellGroup.maxY;
    const minX = cellGroup.minX;
    const maxX = cellGroup.maxX;

    const width = Math.max(spacing.horizontal * 1.5, maxX - minX);
    const height = Math.max(spacing.vertical * 2.5, maxY - minY);

    // Grid coordinates
    // Columns: 2 (left column, right column)
    // Rows: 3 (top, mid, bottom)
    const pattern = [0, 0, 0, 0, 0, 0]; // Dot positions 1, 2, 3 (left), 4, 5, 6 (right)

    // Fit dots in this cell to the 2x3 grid
    const leftColX = minX + (maxX - minX) * 0.25;
    const rightColX = minX + (maxX - minX) * 0.75;
    const topRowY = minY + (maxY - minY) * 0.16;
    const midRowY = minY + (maxY - minY) * 0.5;
    const botRowY = minY + (maxY - minY) * 0.83;

    for (const d of cellGroup.dots) {
      const isRight = Math.abs(d.x - rightColX) < Math.abs(d.x - leftColX);

      const rowDistTop = Math.abs(d.y - topRowY);
      const rowDistMid = Math.abs(d.y - midRowY);
      const rowDistBot = Math.abs(d.y - botRowY);

      let row = 0; // 0=Top, 1=Mid, 2=Bottom
      if (rowDistMid < rowDistTop && rowDistMid < rowDistBot) {
        row = 1;
      } else if (rowDistBot < rowDistTop && rowDistBot < rowDistMid) {
        row = 2;
      }

      if (!isRight) {
        // Left Column (dots 1, 2, 3)
        pattern[row] = 1;
      } else {
        // Right Column (dots 4, 5, 6)
        pattern[row + 3] = 1;
      }
    }

    const patternString = pattern.join('');
    const avgConfidence = cellGroup.dots.reduce((sum, d) => sum + d.confidence, 0) / cellGroup.dots.length;

    return {
      pattern: patternString,
      dots: pattern,
      x: minX,
      y: minY,
      width,
      height,
      confidence: avgConfidence || 0.5
    };
  });

  // Sort cells in reading orientation (top-to-bottom, left-to-right)
  return correctOrientation(detectedCells);
}

export function correctOrientation(cells: DetectedCell[]): DetectedCell[] {
  if (cells.length === 0) return [];

  // Group cells into horizontal rows if their y values are within half cell height
  const rows: DetectedCell[][] = [];
  const sortedByY = [...cells].sort((a, b) => a.y - b.y);

  for (const cell of sortedByY) {
    let placed = false;
    for (const row of rows) {
      const avgY = row.reduce((sum, c) => sum + c.y, 0) / row.length;
      const avgHeight = row.reduce((sum, c) => sum + c.height, 0) / row.length;

      if (Math.abs(cell.y - avgY) < avgHeight * 0.6) {
        row.push(cell);
        placed = true;
        break;
      }
    }

    if (!placed) {
      rows.push([cell]);
    }
  }

  // Sort each row left-to-right, and sort the rows top-to-bottom
  rows.sort((a, b) => {
    const avgYA = a.reduce((sum, c) => sum + c.y, 0) / a.length;
    const avgYB = b.reduce((sum, c) => sum + c.y, 0) / b.length;
    return avgYA - avgYB;
  });

  const orderedCells: DetectedCell[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    orderedCells.push(...row);
  }

  return orderedCells;
}
