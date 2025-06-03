// src/App.js
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';

// UI Components
import Sidebar from './components/Sidebar';
// InfoCard is imported and used by Sidebar.js, so no need for direct import here if not used in App.js JSX

// Tool Components
import LiveAnalysisTool from './components/tools/LiveAnalysisTool';
import SessionAnalyticsTool from './components/tools/SessionAnalyticsTool';
import DetectionLogTool from './components/tools/DetectionLogTool';

// --- Constants ---
const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;
const DETECTION_INTERVAL_MS = 300;
const MAX_LOG_ENTRIES = 100;

// --- Helper Functions ---
const getDominantEmotion = (expressions) => {
  if (!expressions) return { emotion: 'N/A', confidence: 0 };
  return Object.entries(expressions)
    .reduce((prev, curr) => (prev[1] > curr[1] ? prev : curr), ['N/A', 0]);
};

function App() {
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  // Active Tool State
  const [activeTool, setActiveTool] = useState('live'); // 'live', 'analytics', 'log'

  // Model & Video State
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isWebcamReady, setIsWebcamReady] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false); // Represents if detection *should be* active and interval running

  // UI & Error State
  const [error, setError] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [showCameraSelector, setShowCameraSelector] = useState(false);

  // Detected Data State (for current snapshot in Sidebar)
  const [detectedEmotion, setDetectedEmotion] = useState('N/A');
  const [emotionConfidence, setEmotionConfidence] = useState(0);
  const [detectedAge, setDetectedAge] = useState(null);
  const [detectedGender, setDetectedGender] = useState(null);
  const [detectionsArray, setDetectionsArray] = useState([]); // For drawing on canvas

  // Camera Selection State
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  // State for Session Analytics Tool
  const [sessionEmotionCounts, setSessionEmotionCounts] = useState({});
  const [sessionAges, setSessionAges] = useState([]);
  const [sessionGenders, setSessionGenders] = useState({});

  // State for Detection Log Tool
  const [detectionLog, setDetectionLog] = useState([]);


  // --- 1. Load AI Models ---
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = process.env.PUBLIC_URL + '/models';
      setLoadingMessage('Loading AI Models...');
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
        setLoadingMessage('AI Models Loaded!');
        console.log("All AI models loaded successfully!");
      } catch (err) {
        console.error("Error loading AI models:", err);
        setError(`Failed to load AI models: ${err.message}. Check public/models.`);
        setLoadingMessage('');
      }
    };
    loadModels();
  }, []);

  // --- 2. Enumerate Video Devices ---
  useEffect(() => {
    if (modelsLoaded) {
      const getVideoDevices = async () => {
        setLoadingMessage('Accessing camera list...');
        try {
          // Request permission first to get full labels
          await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter(device => device.kind === 'videoinput');
          setVideoDevices(videoInputs);

          if (videoInputs.length > 0) {
            const preferredCamera = videoInputs.find(d => d.label.toLowerCase().includes('iphone')) || videoInputs[0];
            setSelectedDeviceId(preferredCamera.deviceId);
            setShowCameraSelector(true);
          } else {
            setError("No video input devices found.");
          }
          setLoadingMessage('');
        } catch (err) {
          setError("Could not access camera list. Please grant permission.");
          setLoadingMessage('');
          console.error("Error getting video devices:", err);
        }
      };
      getVideoDevices();
    }
  }, [modelsLoaded]);

  // Helper to stop stream and clear detection related states
  const stopStreamAndClearDetections = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
    }
    if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
    }
    setIsWebcamReady(false);
    // setIsDetecting(false); // This will be handled by the effect managing the interval
    setDetectionsArray([]);

    // Reset snapshot data for cleaner UI
    setDetectedEmotion('N/A');
    setEmotionConfidence(0);
    setDetectedAge(null);
    setDetectedGender(null);
  }, []); // Empty dependency array as it uses refs and setters

  // --- 3. Start/Restart Video Stream (only if 'live' tool is active) ---
  useEffect(() => {
    if (activeTool === 'live' && selectedDeviceId && modelsLoaded) {
      // Stop any existing stream before starting a new one (e.g., on device change)
      if (videoRef.current && videoRef.current.srcObject) {
          videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      // Clear detection interval if it was running from a previous setup
      if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
          detectionIntervalRef.current = null;
      }
      setIsWebcamReady(false); // Reset webcam readiness for the new stream
      // setIsDetecting(false); // Let the interval management effect handle this

      const startVideoStream = async () => {
        const selectedDeviceLabel = videoDevices.find(d => d.deviceId === selectedDeviceId)?.label || 'Default';
        setLoadingMessage(`Starting camera: ${selectedDeviceLabel}...`);
        setError(null);
        const constraints = { video: { deviceId: { exact: selectedDeviceId }, width: VIDEO_WIDTH, height: VIDEO_HEIGHT }, audio: false };
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // onCanPlay will set isWebcamReady and clear loading message
          }
        } catch (err) {
          setError(`Error starting webcam: ${err.message}`);
          setLoadingMessage('');
          setIsWebcamReady(false); // Ensure it's false on error
          console.error("Error starting video stream:", err);
        }
      };
      startVideoStream();
    } else {
      // If not live tool, or no device/models, ensure stream is stopped
      stopStreamAndClearDetections();
    }

    // Cleanup for this effect: stop stream if activeTool, selectedDeviceId, or modelsLoaded change
    return () => {
      stopStreamAndClearDetections();
    };
  }, [activeTool, selectedDeviceId, modelsLoaded, videoDevices, stopStreamAndClearDetections]);

  // --- 4. Detection Loop ---
  const runDetection = useCallback(async () => {
    // Guard conditions for running detection
    if (!videoRef.current || videoRef.current.paused || videoRef.current.ended ||
        !canvasRef.current || !modelsLoaded || !isWebcamReady || activeTool !== 'live') {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn("Video dimensions not ready for detection.");
        return;
    }

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
        faceapi.matchDimensions(canvas, displaySize);
    }

    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceExpressions()
        .withAgeAndGender();

      setDetectionsArray(detections); // For drawing on canvas

      if (detections.length > 0) {
        const firstDetection = detections[0];
        const [emotion, confidence] = getDominantEmotion(firstDetection.expressions);
        const age = Math.round(firstDetection.age);
        const gender = firstDetection.gender;

        // Update current snapshot for Sidebar
        setDetectedEmotion(emotion);
        setEmotionConfidence(confidence);
        setDetectedAge(age);
        setDetectedGender(gender);

        // Update session analytics data
        if (emotion !== 'N/A') {
            setSessionEmotionCounts(prev => ({ ...prev, [emotion]: (prev[emotion] || 0) + 1 }));
        }
        // Only add valid ages to sessionAges
        if (typeof age === 'number' && !isNaN(age)) {
            setSessionAges(prev => [...prev, age]);
        }
        if (gender) {
            setSessionGenders(prev => ({ ...prev, [gender]: (prev[gender] || 0) + 1 }));
        }


        // Update detection log
        const newLogEntry = {
            timestamp: new Date().toLocaleTimeString(),
            emotion, confidence, age, gender
        };
        setDetectionLog(prevLog => [newLogEntry, ...prevLog].slice(0, MAX_LOG_ENTRIES));

      } else { // No detections
        setDetectedEmotion('N/A');
        setEmotionConfidence(0);
        setDetectedAge(null);
        setDetectedGender(null);
      }
    } catch (err) {
      console.error("Error during face detection:", err);
      // Avoid spamming errors, maybe set a temporary error state if needed
    }
  }, [modelsLoaded, isWebcamReady, activeTool]); // Dependencies for the detection logic itself

  // --- 5. Drawing on Canvas ---
  useEffect(() => {
    if (activeTool !== 'live' || !isDetecting || !canvasRef.current || !videoRef.current || !detectionsArray) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
        faceapi.matchDimensions(canvas, displaySize);
    }

    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (detectionsArray.length > 0) {
      const resizedDetections = faceapi.resizeResults(detectionsArray, displaySize);
      faceapi.draw.drawDetections(canvas, resizedDetections);
      resizedDetections.forEach(detection => {
        const { age, gender, genderProbability, expressions } = detection;
        const [emotionName, probability] = getDominantEmotion(expressions);
        const text = [
          `${emotionName} (${(probability * 100).toFixed(0)}%)`,
          `${gender} (${(genderProbability * 100).toFixed(0)}%)`,
          `${Math.round(age)} yrs`
        ];
        new faceapi.draw.DrawTextField(
          text,
          detection.detection.box.bottomLeft,
          { backgroundColor: 'rgba(0, 0, 0, 0.6)', fontColor: 'white', fontSize: 14, padding: 5 }
        ).draw(canvas);
      });
    }
  }, [activeTool, detectionsArray, isDetecting]); // Redraw when these change

  // --- 6. Start/Stop Detection Interval (Revised for Robustness) ---
  useEffect(() => {
    const shouldBeDetecting = activeTool === 'live' && isWebcamReady && modelsLoaded;

    if (shouldBeDetecting) {
      // If we should be detecting, and the interval isn't set up, set it up.
      if (!detectionIntervalRef.current) {
        detectionIntervalRef.current = setInterval(runDetection, DETECTION_INTERVAL_MS);
        console.log("Detection interval STARTED.");
      }
      // Sync the isDetecting flag if it's not already true
      if (!isDetecting) {
        setIsDetecting(true);
      }
    } else {
      // If we shouldn't be detecting, and the interval is running, clear it.
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
        console.log("Detection interval STOPPED.");
      }
      // Sync the isDetecting flag if it's not already false
      if (isDetecting) {
        setIsDetecting(false);
      }
    }

    // Cleanup: This will run if the component unmounts or if dependencies change
    // before the next run of the effect (e.g., runDetection callback changes).
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
        console.log("Detection interval CLEARED (cleanup from effect).");
      }
    };
  }, [activeTool, isWebcamReady, modelsLoaded, runDetection, isDetecting]); // isDetecting is needed to sync the flag accurately

  // --- Event Handlers ---
  const handleVideoCanPlay = () => {
    if (!videoRef.current || activeTool !== 'live') return; // Only act if live tool is active
    setIsWebcamReady(true);
    setLoadingMessage(''); // Clear loading message once video stream is active
    setError(null); // Clear any previous stream errors
    console.log("Video can play for Live Analysis Tool.");
  };

  const handleCameraChange = (event) => {
    const newDeviceId = event.target.value;
    if (newDeviceId !== selectedDeviceId) {
        // No need to manually clear interval here, the useEffect for stream management will handle it
        // when selectedDeviceId changes.
        setIsWebcamReady(false); // Reset webcam ready state for new device
        // setIsDetecting(false); // Allow effect #6 to manage this based on new conditions
        setLoadingMessage('Changing camera...');
        setSelectedDeviceId(newDeviceId);
    }
  };

  const handleCapture = () => {
    if (activeTool !== 'live' || !videoRef.current || !canvasRef.current || detectionsArray.length === 0) {
      alert("Capture available only in Live Analysis with active detection.");
      return;
    }
    const video = videoRef.current;
    const overlayCanvas = canvasRef.current;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    ctx.drawImage(overlayCanvas, 0, 0, overlayCanvas.width, overlayCanvas.height); // Draw existing detections
    const imageURL = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = imageURL;
    link.download = `ai_vision_capture_${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetSessionData = () => {
    setSessionEmotionCounts({});
    setSessionAges([]);
    setSessionGenders({});
    alert("Session analytics data has been reset.");
  };

  const clearDetectionLogHandler = () => {
    setDetectionLog([]);
    alert("Detection log has been cleared.");
  };

  // --- Render Active Tool ---
  const renderActiveTool = () => {
    switch (activeTool) {
      case 'live':
        return (
          <LiveAnalysisTool
            videoRef={videoRef}
            canvasRef={canvasRef}
            VIDEO_WIDTH={VIDEO_WIDTH}
            VIDEO_HEIGHT={VIDEO_HEIGHT}
            isDetecting={isDetecting} // Pass the master isDetecting flag
            modelsLoaded={modelsLoaded}
            isWebcamReady={isWebcamReady}
            handleVideoCanPlay={handleVideoCanPlay}
          />
        );
      case 'analytics':
        return (
          <SessionAnalyticsTool
            sessionEmotionCounts={sessionEmotionCounts}
            sessionAges={sessionAges}
            sessionGenders={sessionGenders}
            resetSessionData={resetSessionData}
          />
        );
      case 'log':
        return (
            <DetectionLogTool
                detectionLog={detectionLog}
                clearDetectionLog={clearDetectionLogHandler}
            />
        );
      default:
        return <div className="p-8 text-center text-gray-500">Select a tool from the sidebar.</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <Sidebar
        loadingMessage={loadingMessage}
        error={error}
        showCameraSelector={showCameraSelector}
        videoDevices={videoDevices}
        selectedDeviceId={selectedDeviceId}
        handleCameraChange={handleCameraChange}
        modelsLoaded={modelsLoaded}
        isDetecting={isDetecting && activeTool === 'live'} // Reflect true detection status for live tool
        detectedEmotion={detectedEmotion}
        emotionConfidence={emotionConfidence}
        detectedAge={detectedAge}
        detectedGender={detectedGender}
        handleCapture={handleCapture}
        detectionsArrayLength={detectionsArray.length}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
      />
      <main className="flex-1 flex flex-col bg-gray-100">
        {renderActiveTool()}
      </main>
    </div>
  );
}

export default App;