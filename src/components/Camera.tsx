import React, { useEffect, useRef } from 'react';
import { Camera, Flashlight, RefreshCw, ArrowLeft, Loader2 } from 'lucide-react';
import { AppMode, DetectedCell, DetectedDot } from '../types';
import { drawDetectionOverlay } from '../utils/dotDetector';

interface CameraComponentProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isActive: boolean;
  hasPermission: boolean | null;
  error: string | null;
  facingMode: VideoFacingModeEnum;
  torchOn: boolean;
  toggleFacing: () => void;
  toggleTorch: () => void;
  onManualCapture?: () => void;
  onBack: () => void;
  mode: AppMode;
  dotCount: number;
  confidence: number;
  isProcessing?: boolean;
  detectedDots?: DetectedDot[];
  detectedCells?: DetectedCell[];
}

export default function CameraComponent({
  videoRef,
  canvasRef,
  isActive,
  hasPermission,
  error,
  facingMode,
  torchOn,
  toggleFacing,
  toggleTorch,
  onManualCapture,
  onBack,
  mode,
  dotCount,
  confidence,
  isProcessing = false,
  detectedDots = [],
  detectedCells = []
}: CameraComponentProps) {
  const localOverlayRef = useRef<HTMLCanvasElement | null>(null);

  // Redraw overlays in synchronization with video aspect-ratio updates
  useEffect(() => {
    const overlay = localOverlayRef.current;
    if (!overlay || !videoRef.current) return;

    const syncSize = () => {
      const video = videoRef.current;
      if (!video) return;
      overlay.width = video.clientWidth;
      overlay.height = video.clientHeight;

      // Draw detection markers
      const ctx = overlay.getContext('2d');
      if (ctx && detectedCells.length > 0) {
        // Adjust coordinates relative to display dimension vs stream resolution
        const scaleX = overlay.width / (video.videoWidth || overlay.width);
        const scaleY = overlay.height / (video.videoHeight || overlay.height);

        const scaledDots = detectedDots.map(d => ({
          ...d,
          x: d.x * scaleX,
          y: d.y * scaleY,
          size: d.size * scaleX
        }));

        const scaledCells = detectedCells.map(c => ({
          ...c,
          x: c.x * scaleX,
          y: c.y * scaleY,
          width: c.width * scaleX,
          height: c.height * scaleY
        }));

        drawDetectionOverlay(overlay, scaledDots, scaledCells, confidence);
      } else {
        const ctx = overlay.getContext('2d');
        ctx?.clearRect(0, 0, overlay.width, overlay.height);
      }
    };

    const interval = setInterval(syncSize, 120);
    return () => clearInterval(interval);
  }, [detectedCells, detectedDots, confidence, videoRef]);

  if (hasPermission === false) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-white bg-[#0A0A0F]" style={{ fontFamily: 'Atkinson Hyperlegible, sans-serif' }}>
        <div className="p-4 bg-red-950/40 rounded-full border border-red-500 mb-4 text-red-500">
          <Camera className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold">Camera Access Restricted</h2>
        <p className="text-[#8888AA] mt-2 mb-6 max-w-sm">
          BrailleAir Pro requires camera frame streams to analyze embossed dots in real-time. Please adjust system settings.
        </p>
        <button
          onClick={onBack}
          className="bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-8 rounded-xl border border-gray-700 min-h-[60px]"
          aria-label="Back to modes"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex-1 bg-black overflow-hidden flex flex-col justify-between" style={{ fontFamily: 'Atkinson Hyperlegible, sans-serif' }}>
      
      {/* Absolute Videostream Area */}
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        {isActive ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
        ) : (
          <div className="flex flex-col items-center space-y-2 text-slate-500">
            <Loader2 className="w-10 h-10 animate-spin text-[#00D4AA]" />
            <p>Initializing camera...</p>
          </div>
        )}

        {/* Absolute Canvas for Fallback Image Capture Processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Absolute Responsive Visual overlay canvas */}
        <canvas ref={localOverlayRef} className="absolute inset-0 pointer-events-none z-10" />

        {/* Framing brackets / Scan zone indicator */}
        <div className="absolute inset-[10%] border-2 border-dashed border-white/20 rounded-2xl pointer-events-none z-10 flex flex-col items-center justify-between py-6">
          <div className="w-full flex justify-between px-6">
            <div className="w-6 h-6 border-t-4 border-l-4 border-[#00D4AA]" />
            <div className="w-6 h-6 border-t-4 border-r-4 border-[#00D4AA]" />
          </div>
          {isProcessing && (
            <div className="bg-[#0A0A0F]/80 text-[#00D4AA] rounded-full px-4 py-1.5 border border-[#00D4AA] text-sm font-semibold tracking-wider flex items-center space-x-2 animate-pulse shadow-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>GEMINI SCANNING...</span>
            </div>
          )}
          <div className="w-full flex justify-between px-6">
            <div className="w-6 h-6 border-b-4 border-l-4 border-[#00D4AA]" />
            <div className="w-6 h-6 border-b-4 border-r-4 border-[#00D4AA]" />
          </div>
        </div>
      </div>

      {/* Top Status Bar Controls */}
      <div className="relative z-20 w-full bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-3 bg-black/40 hover:bg-black/60 rounded-xl border border-gray-800 text-white min-h-[50px] min-w-[50px]"
          aria-label="Back to Hub"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-end space-y-1.5 text-right">
          <span className="bg-[#00D4AA]/20 text-[#00D4AA] font-bold text-xs tracking-widest uppercase px-3 py-1 rounded-full border border-[#00D4AA]/40 shadow-inner">
            {mode} MODE
          </span>
          {dotCount > 0 && (
            <span className="text-white text-sm font-bold bg-black/60 px-3 py-1 rounded-md border border-gray-800 shadow-md">
              🎯 {dotCount} DOTS FOUND
            </span>
          )}
        </div>
      </div>

      {/* Bottom Interface Control overlay */}
      <div className="relative z-20 w-full bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-6 pb-8 px-6 flex flex-col space-y-4">
        
        {/* Alignment coaching lines */}
        {metadataAngleCoach(confidence)}

        <div className="flex items-center justify-between">
          {/* Facing Switch */}
          <button
            onClick={toggleFacing}
            className="p-4 bg-[#1A1A2E]/80 border border-gray-800 text-white rounded-full shadow-lg hover:text-[#00D4AA] active:scale-95 transition-all min-h-[60px] min-w-[60px]"
            aria-label="Switch camera front back orientation"
          >
            <RefreshCw className="w-6 h-6" />
          </button>

          {/* Trigger Scan Trigger Button */}
          {onManualCapture && (
            <button
              onClick={onManualCapture}
              className="bg-[#00D4AA] text-[#0A0A0F] font-extrabold text-lg px-8 rounded-2xl flex items-center justify-center space-x-2 py-5 shadow-2xl active:scale-[0.98] transition-all min-h-[64px]"
              aria-label="Force direct AI frame capture scan"
            >
              <span>Instant Analyze</span>
            </button>
          )}

          {/* Flash toggle */}
          <button
            onClick={toggleTorch}
            className={`p-4 rounded-full border shadow-lg active:scale-95 transition-all min-h-[60px] min-w-[60px] ${torchOn ? 'bg-[#FFD700] text-black border-[#FFD700]' : 'bg-[#1A1A2E]/80 text-white border-gray-800'}`}
            aria-label="Toggle device torch flash light"
          >
            <Flashlight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

function metadataAngleCoach(confidence: number) {
  if (confidence === 0) return null;
  const rawConf = Math.round(confidence * 100);

  return (
    <div className="max-w-xs mx-auto w-full bg-black/85 border border-gray-800 rounded-xl px-4 py-2 flex items-center justify-between shadow-xl">
      <span className="text-xs text-[#8888AA] font-bold">AI ALIGNMENT COHERENCE</span>
      <div className="flex items-center space-x-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
        <span className="text-sm font-extrabold text-emerald-400">{rawConf}%</span>
      </div>
    </div>
  );
}
