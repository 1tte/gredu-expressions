// src/components/DashboardPage.js
import React from 'react';

function DashboardPage({
  videoRef,
  canvasRef,
  scanningLineRef, // Keep if you use it, or remove if animation is simpler
  VIDEO_WIDTH,
  VIDEO_HEIGHT,
  isDetecting,
  modelsLoaded,
  isWebcamReady,
  handleVideoCanPlay, // Pass the handler
}) {
  return (
    <main className="flex-1 p-8 flex flex-col items-center justify-center bg-gray-100">
      <div className="relative w-full max-w-3xl aspect-[4/3] bg-black rounded-xl shadow-2xl border border-gray-300 overflow-hidden"> {/* Use aspect-[4/3] for correct ratio */}
        <video
          ref={videoRef}
          width={VIDEO_WIDTH} // These are for the video element's intrinsic size
          height={VIDEO_HEIGHT}
          autoPlay
          muted
          playsInline
          onCanPlay={handleVideoCanPlay} // Attach the event handler
          className="w-full h-full object-cover" // Tailwind classes for responsive display
        />
        <canvas
          ref={canvasRef}
          width={VIDEO_WIDTH} // Match video intrinsic dimensions
          height={VIDEO_HEIGHT}
          className="absolute top-0 left-0 w-full h-full" // Overlay canvas
        />
        {/* Scanning Line Animation - using the new animate-scan-line */}
        {isDetecting && (
          <div
            // ref={scanningLineRef} // Ref might not be needed if animation is purely CSS
            className="absolute left-0 w-full h-1.5 bg-blue-400 opacity-70 animate-scan-line"
            // The animation 'animate-scan-line' needs to be defined in your global CSS (e.g., index.css)
            // to move from top to bottom.
          />
        )}
      </div>
      {isDetecting && <p className="mt-4 text-sm text-blue-600 font-medium">AI Detection Active</p>}
      {!isDetecting && modelsLoaded && isWebcamReady && (
        <p className="mt-4 text-sm text-gray-500">Detection paused or not started. Ensure face is visible.</p>
      )}
       {/* A general message when webcam is not ready yet but models might be loaded */}
      {!isWebcamReady && modelsLoaded && !isDetecting && (
        <p className="mt-4 text-sm text-orange-500">Waiting for webcam to initialize...</p>
      )}
    </main>
  );
}

export default DashboardPage;