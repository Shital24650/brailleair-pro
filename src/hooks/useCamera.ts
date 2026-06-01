import { useState, useRef, useCallback } from 'react';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<VideoFacingModeEnum>('environment');
  const [torchOn, setTorchOn] = useState(false);

  const startCamera = useCallback(async (mode: VideoFacingModeEnum = 'environment') => {
    setError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play().catch(e => console.warn('Autoplay prevented:', e));
      }

      setHasPermission(true);
      setIsActive(true);
      setFacingMode(mode);
      
      // Auto enable continuous focus/exposure if supported (handled by standard browsers in getUserMedia)
    } catch (err: any) {
      console.error('Error starting camera:', err);
      setHasPermission(false);
      setError(err.message || 'Could not acquire camera access. Check permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    setTorchOn(false);
  }, []);

  const toggleFacing = useCallback(() => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  }, [facingMode, startCamera]);

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities = track.getCapabilities() as any;
      if (capabilities.torch) {
        const nextTorch = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextTorch }]
        } as any);
        setTorchOn(nextTorch);
      } else {
        // Fallback or warning
        console.warn('Torch not supported on this device/facing mode.');
      }
    } catch (e) {
      console.warn('Error toggling torch constraints:', e);
    }
  }, [torchOn]);

  const captureFrame = useCallback((): { imageData: ImageData; base64: string } | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Maintain aspect ratio matching the actual webcam sizing
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    canvas.width = vw;
    canvas.height = vh;

    ctx.drawImage(video, 0, 0, vw, vh);

    const imageData = ctx.getImageData(0, 0, vw, vh);
    const base64 = canvas.toDataURL('image/jpeg', 0.82);

    return { imageData, base64 };
  }, []);

  return {
    videoRef,
    canvasRef,
    isActive,
    hasPermission,
    error,
    facingMode,
    torchOn,
    startCamera,
    stopCamera,
    toggleFacing,
    toggleTorch,
    captureFrame
  };
}
