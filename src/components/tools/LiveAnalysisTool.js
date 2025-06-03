// src/components/tools/LiveAnalysisTool.js
import React from 'react';

// Ensure your CSS has this or similar for the scanning line
// @keyframes scan-line-anim {
//   0% { transform: translateY(0%); opacity: 0.7; }
//   100% { transform: translateY(calc(100% - 6px)); opacity: 0; } /* 6px for h-1.5 */
// }
// .animate-scan-line { animation: scan-line-anim 2s linear infinite; }

function LiveAnalysisTool({
  videoRef,
  canvasRef,
  VIDEO_WIDTH,
  VIDEO_HEIGHT,
  isDetecting,
  modelsLoaded,
  isWebcamReady,
  handleVideoCanPlay,
}) {
  return (
    <div className="flex-1 p-8 flex flex-col items-center justify-center">
      <div className="relative w-full max-w-3xl aspect-[4/3] bg-black rounded-xl shadow-2xl border border-gray-300 overflow-hidden">
        <video
          ref={videoRef}
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
          autoPlay
          muted
          playsInline
          onCanPlay={handleVideoCanPlay}
          className="w-full h-full object-cover"
        />
        <canvas
          ref={canvasRef}
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
          className="absolute top-0 left-0 w-full h-full"
        />
        {isDetecting && (
          <div
            className="absolute left-0 w-full h-1.5 bg-blue-400 opacity-70 animate-scan-line" // Make sure animate-scan-line is defined in global CSS
          />
        )}
      </div>
      <div className="mt-4 h-6"> {/* Placeholder for messages to prevent layout shift */}
        {isDetecting && <p className="text-sm text-blue-600 font-medium">AI Detection Active</p>}
        {!isDetecting && modelsLoaded && isWebcamReady && (
          <p className="text-sm text-gray-500">Detection paused. Ensure face is visible to start.</p>
        )}
        {!isWebcamReady && modelsLoaded && !isDetecting && (
            <p className="text-sm text-orange-500">Waiting for webcam to initialize...</p>
        )}
      </div>
    </div>
  );
}

export default LiveAnalysisTool;