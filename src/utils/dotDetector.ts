import { DetectedDot, DetectedCell, CalibrationProfile } from '../types';

/**
 * dotDetector.ts - Handles computer vision image preprocessing, blob-finding, 
 * 3D tactile shadow analysis, and overlay drawings using OpenCV.js.
 */

// Window representation for OpenCV loading
declare global {
  interface Window {
    openCVReady?: boolean;
    cv?: any;
  }
}

export function initOpenCV(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.cv && window.openCVReady) {
      resolve(window.cv);
      return;
    }

    const checkInterval = setInterval(() => {
      if (window.cv && window.openCVReady) {
        clearInterval(checkInterval);
        resolve(window.cv);
      }
    }, 200);

    // Timeout after 15 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      if (window.cv) {
        resolve(window.cv);
      } else {
        reject(new Error('OpenCV.js load timeout'));
      }
    }, 15000);
  });
}

export function preprocessFrame(canvas: HTMLCanvasElement): { binaryMat: any; grayMat: any; cv: any } | null {
  const cv = window.cv;
  if (!cv) return null;

  let src = null;
  let gray = null;
  let enhanced = null;
  let binary = null;
  let ksize = null;
  let M = null;

  try {
    src = cv.imread(canvas);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // Enhance contrast using localized histogram equalization (CLAHE)
    enhanced = new cv.Mat();
    const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
    clahe.apply(gray, enhanced);
    clahe.delete();

    // Gaussian Blur
    ksize = new cv.Size(5, 5);
    cv.GaussianBlur(enhanced, gray, ksize, 0, 0, cv.BORDER_DEFAULT);

    // Adaptive threshold to binarize local dot boundaries
    binary = new cv.Mat();
    cv.adaptiveThreshold(
      gray,
      binary,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      11,
      2
    );

    // Morpological open operation to remove specks
    M = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));
    cv.morphologyEx(binary, binary, cv.MORPH_OPEN, M);

    // Keep binary and gray mats, discard temporary mats
    src.delete();
    enhanced.delete();
    if (ksize) ksize = null;
    if (M) M.delete();

    return { binaryMat: binary, grayMat: gray, cv };
  } catch (e) {
    console.error('OpenCV preprocessing exception:', e);
    // Safe manual cleaning
    if (src) src.delete();
    if (gray) gray.delete();
    if (enhanced) enhanced.delete();
    if (binary) binary.delete();
    if (M) M.delete();
    return null;
  }
}

export function detectDots(
  canvas: HTMLCanvasElement,
  profile: CalibrationProfile | null
): DetectedDot[] {
  const cv = window.cv;
  if (!cv) return [];

  const preprocessed = preprocessFrame(canvas);
  if (!preprocessed) return [];

  const { binaryMat, grayMat } = preprocessed;
  const dots: DetectedDot[] = [];

  let contours = null;
  let hierarchy = null;

  try {
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();

    // Find contours/shapes
    cv.findContours(binaryMat, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    // Ideal contours search
    const minArea = profile?.avgDotSize ? profile.avgDotSize * 0.4 : 12;
    const maxArea = profile?.avgDotSize ? profile.avgDotSize * 3.0 : 400;
    const targetCircularity = profile?.minCircularity || 0.45;

    for (let i = 0; i < contours.size(); ++i) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);

      if (area >= minArea && area <= maxArea) {
        const perimeter = cv.arcLength(cnt, true);
        const circularity = perimeter > 0 ? (4 * Math.PI * area) / (perimeter * perimeter) : 0;

        if (circularity >= targetCircularity) {
          // Calculate center of mass using moments
          const M = cv.moments(cnt, false);
          if (M.m00 !== 0) {
            const cx = M.m10 / M.m00;
            const cy = M.m01 / M.m00;
            const size = Math.sqrt(area / Math.PI) * 2;

            dots.push({
              x: cx,
              y: cy,
              size,
              confidence: circularity
            });
          }
        }
      }
      cnt.delete();
    }
  } catch (err) {
    console.error('Error during fallback dot recognition', err);
  } finally {
    // Crucial Memory Cleanup
    if (binaryMat) binaryMat.delete();
    if (grayMat) grayMat.delete();
    if (contours) contours.delete();
    if (hierarchy) hierarchy.delete();
  }

  return dots;
}

export function detectShadowDots(canvas: HTMLCanvasElement): DetectedDot[] {
  const dots: DetectedDot[] = [];
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  try {
    // 3D Shadow Analysis for non-paper surfaces (e.g. plastic or metallic buttons)
    // Raised dots cast distinct directional shadows (darker pixels on one side, lighter on another).
    const nextCanvas = document.createElement('canvas');
    nextCanvas.width = canvas.width;
    nextCanvas.height = canvas.height;
    const nextCtx = nextCanvas.getContext('2d');
    if (!nextCtx) return [];

    nextCtx.drawImage(canvas, 0, 0);

    const imgData = nextCtx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // Fast pixel-gradient evaluation for raised surfaces
    const width = canvas.width;
    const height = canvas.height;

    for (let y = 10; y < height - 10; y += 4) {
      for (let x = 10; x < width - 10; x += 4) {
        const idx = (y * width + x) * 4;
        const brightness = (data[idx] + data[idx+1] + data[idx+2]) / 3;

        // Compare with pixel slightly below right (modeling top-left lighting casting bottom-right shadow)
        const offsetIdx = ((y + 4) * width + (x + 4)) * 4;
        const neighborBr = (data[offsetIdx] + data[offsetIdx+1] + data[offsetIdx+2]) / 3;

        const diff = brightness - neighborBr;

        // Deep shadow contrast indicating a dot transition
        if (diff > 45) {
          dots.push({
            x,
            y,
            size: 15,
            confidence: Math.min(0.9, diff / 100)
          });
        }
      }
    }

    // Merge adjacent shadow candidates
    const mergedDots: DetectedDot[] = [];
    const mergeRadius = 18;

    for (const d of dots) {
      let isMerged = false;
      for (const m of mergedDots) {
        if (Math.hypot(d.x - m.x, d.y - m.y) < mergeRadius) {
          m.x = (m.x + d.x) / 2;
          m.y = (m.y + d.y) / 2;
          m.size = Math.max(m.size, d.size);
          m.confidence = Math.max(m.confidence, d.confidence);
          isMerged = true;
          break;
        }
      }
      if (!isMerged) {
        mergedDots.push(d);
      }
    }

    return mergedDots.slice(0, 40); // Cap suggestions
  } catch (e) {
    console.error('Shadow detection failure', e);
    return [];
  }
}

export function drawDetectionOverlay(
  canvas: HTMLCanvasElement,
  dots: DetectedDot[],
  cells: DetectedCell[],
  confidence: number = 0
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw active dots (green circles)
  ctx.strokeStyle = '#00FF88';
  ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
  ctx.lineWidth = 2;

  for (const dot of dots) {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.size ? dot.size / 2 + 1 : 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Pulse core
    ctx.fillStyle = '#00FF88';
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
  }

  // Draw cells (blue bounding box overlays with translations)
  ctx.strokeStyle = '#7B61FF';
  ctx.fillStyle = 'rgba(123, 97, 255, 0.08)';
  ctx.lineWidth = 1.5;

  cells.forEach((cell, idx) => {
    ctx.beginPath();
    ctx.rect(cell.x - 4, cell.y - 4, cell.width + 8, cell.height + 8);
    ctx.fill();
    ctx.stroke();

    // Display letter tag on cell
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Atkinson Hyperlegible, sans-serif';
    const cellTag = cell.char ? cell.char.toUpperCase() : '?';

    // Backing bubble
    ctx.fillStyle = '#7B61FF';
    ctx.beginPath();
    ctx.arc(cell.x + cell.width / 2, cell.y - 14, 10, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cellTag, cell.x + cell.width / 2, cell.y - 14);
  });
}
