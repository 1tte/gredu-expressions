// client/src/App.js
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, Zap, Download, User, Calendar, Smile } from 'lucide-react'; // Icons

// --- Constants ---
const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;
const DETECTION_INTERVAL_MS = 300; // Faster detection for smoother updates
const BACKEND_URL = 'http://localhost:5000'; // Optional backend

// --- Helper Functions ---
const getDominantEmotion = (expressions) => {
  if (!expressions) return { emotion: 'N/A', confidence: 0 };
  return Object.entries(expressions)
    .reduce((prev, curr) => (prev[1] > curr[1] ? prev : curr), ['N/A', 0]);
};

// --- Main Component ---
function App() {
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const scanningLineRef = useRef(null); // For animation

  // Model & Video State
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isWebcamReady, setIsWebcamReady] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  // UI & Error State
  const [error, setError] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [showCameraSelector, setShowCameraSelector] = useState(false);

  // Detected Data State
  const [detectedEmotion, setDetectedEmotion] = useState('N/A');
  const [emotionConfidence, setEmotionConfidence] = useState(0);
  const [detectedAge, setDetectedAge] = useState(null);
  const [detectedGender, setDetectedGender] = useState(null);
  const [detectionsArray, setDetectionsArray] = useState([]); // To store all detections for drawing

  // Camera Selection State
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');


  // --- 1. Load AI Models ---
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = process.env.PUBLIC_URL + '/models';
      try {
        setLoadingMessage('Loading Face Detector...');
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        setLoadingMessage('Loading Face Landmarks...');
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        setLoadingMessage('Loading Face Expressions...');
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        setLoadingMessage('Loading Age & Gender Detector...');
        await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL); // New model
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

  // --- 2. Enumerate Video Devices (after models are loaded) ---
  useEffect(() => {
    if (modelsLoaded) {
      const getVideoDevices = async () => {
        try {
          setLoadingMessage('Accessing camera list...');
          // Request permission first to get full labels
          await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter(device => device.kind === 'videoinput');
          setVideoDevices(videoInputs);

          if (videoInputs.length > 0) {
            const iphoneCamera = videoInputs.find(device => device.label.toLowerCase().includes('iphone'));
            setSelectedDeviceId(iphoneCamera ? iphoneCamera.deviceId : videoInputs[0].deviceId);
            setShowCameraSelector(videoInputs.length > 1);
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

  // --- 3. Start/Restart Video Stream when selectedDeviceId or modelsLoaded changes ---
  useEffect(() => {
    const currentVideo = videoRef.current; // Capture for cleanup

    // Stop existing stream and detection before starting a new one
    if (currentVideo && currentVideo.srcObject) {
      currentVideo.srcObject.getTracks().forEach(track => track.stop());
      currentVideo.srcObject = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setIsWebcamReady(false);
    setIsDetecting(false);
    setDetectionsArray([]); // Clear previous detections

    if (selectedDeviceId && modelsLoaded) {
      const startVideoStream = async () => {
        setLoadingMessage(`Starting camera: ${videoDevices.find(d=>d.deviceId === selectedDeviceId)?.label || 'Default'}...`);
        const constraints = {
          video: {
            deviceId: { exact: selectedDeviceId },
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT,
          },
        };
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setLoadingMessage('');
        } catch (err) {
          setError(`Error starting selected webcam: ${err.message}`);
          setLoadingMessage('');
          console.error("Error starting video stream:", err);
        }
      };
      startVideoStream();
    }
    // Cleanup function for this effect
    return () => {
        if (currentVideo && currentVideo.srcObject) {
            currentVideo.srcObject.getTracks().forEach(track => track.stop());
        }
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
        }
    };
  }, [selectedDeviceId, modelsLoaded]); // React to changes in selected camera or model load status

  // --- 4. Detection Loop ---
  const runDetection = useCallback(async () => {
    if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || !canvasRef.current || !modelsLoaded) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Ensure video has dimensions
     if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn("Video dimensions not ready for detection.");
        return; // Skip this frame
    }

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })) // Adjusted threshold
        .withFaceLandmarks()
        .withFaceExpressions()
        .withAgeAndGender(); // Added age and gender

      setDetectionsArray(detections); // Store for drawing

      if (detections.length > 0) {
        const firstDetection = detections[0];
        const [emotion, confidence] = getDominantEmotion(firstDetection.expressions);
        setDetectedEmotion(emotion);
        setEmotionConfidence(confidence);
        setDetectedAge(Math.round(firstDetection.age));
        setDetectedGender(firstDetection.gender);

        // Optional: Send to backend
        // fetch(`${BACKEND_URL}/log-emotion`, { ... });

      } else {
        setDetectedEmotion('N/A');
        setEmotionConfidence(0);
        setDetectedAge(null);
        setDetectedGender(null);
      }
    } catch (err) {
      console.error("Error during face detection:", err);
      setError("An error occurred during detection.");
    }
  }, [modelsLoaded]); // Dependencies for the detection logic

  // --- 5. Drawing on Canvas (moved out of detection interval for clarity) ---
  useEffect(() => {
    if (!isDetecting || !canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const displaySize = { width: video.videoWidth, height: video.videoHeight };

    // Ensure canvas context is available
    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    if (detectionsArray.length > 0) {
      const resizedDetections = faceapi.resizeResults(detectionsArray, displaySize);
      faceapi.draw.drawDetections(canvas, resizedDetections);
      // faceapi.draw.drawFaceLandmarks(canvas, resizedDetections); // Optional for more detail
      
      resizedDetections.forEach(detection => {
        // Custom drawing for expressions, age, and gender
        const { age, gender, genderProbability, expressions } = detection;
        const [emotionName, probability] = getDominantEmotion(expressions);
        
        const text = [
          `${emotionName} (${(probability * 100).toFixed(1)}%)`,
          `${gender} (${(genderProbability * 100).toFixed(1)}%)`,
          `${Math.round(age)} years`
        ];
        
        new faceapi.draw.DrawTextField(
          text,
          detection.detection.box.bottomLeft, // Position below the box
          { 
            backgroundColor: 'rgba(0, 0, 0, 0.5)', 
            fontColor: 'white',
            fontSize: 14,
            padding: 4,
          }
        ).draw(canvas);
      });
    }
  }, [detectionsArray, isDetecting]);


  // --- 6. Start/Stop Detection Interval ---
  useEffect(() => {
    if (isWebcamReady && modelsLoaded && !detectionIntervalRef.current && !isDetecting) {
      console.log("Starting detection interval...");
      setIsDetecting(true);
      detectionIntervalRef.current = setInterval(runDetection, DETECTION_INTERVAL_MS);
    } else if ((!isWebcamReady || !modelsLoaded) && detectionIntervalRef.current) {
      console.log("Stopping detection interval...");
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
      setIsDetecting(false);
    }
    // This effect should manage the lifecycle of the interval
  }, [isWebcamReady, modelsLoaded, runDetection, isDetecting]);


  // --- Event Handlers ---
  const handleVideoCanPlay = () => {
    if (!videoRef.current) return;
    console.log("Video can play. Device:", selectedDeviceId, "Ready State:", videoRef.current.readyState);
    setIsWebcamReady(true); // Now webcam is truly ready
    setLoadingMessage(''); // Clear any final loading messages
  };

  const handleCameraChange = (event) => {
    const newDeviceId = event.target.value;
    setSelectedDeviceId(newDeviceId);
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || detectionsArray.length === 0) {
        alert("No detection to capture or video not ready.");
        return;
    }

    const video = videoRef.current;
    const overlayCanvas = canvasRef.current; // The canvas with existing drawings

    // Create a new temporary canvas to combine video and overlay
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const ctx = tempCanvas.getContext('2d');

    // 1. Draw video frame
    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    // 2. Draw the overlay (detections, text, etc.) from the visible canvas
    // This assumes the overlayCanvas is correctly sized and positioned
    // relative to the video for this to work as a direct overlay.
    // If overlayCanvas has different dimensions or transform, this might need adjustment.
    ctx.drawImage(overlayCanvas, 0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Create image and trigger download
    const imageURL = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = imageURL;
    link.download = `emotion_capture_${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log("Image captured and download triggered.");
  };

  // --- UI Rendering ---
  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-white p-6 border-r border-gray-200 flex flex-col space-y-6">
        <div className="flex items-center space-x-3 text-blue-600">
          <Zap size={32} strokeWidth={2} />
          <h1 className="text-2xl font-bold text-gray-900">AI Vision</h1>
        </div>

        {/* Camera Selector */}
        {showCameraSelector && videoDevices.length > 0 && (
          <div className="space-y-1">
            <label htmlFor="camera-select" className="text-sm font-medium text-gray-700">
              Select Camera
            </label>
            <select
              id="camera-select"
              value={selectedDeviceId}
              onChange={handleCameraChange}
              disabled={!modelsLoaded || isDetecting}
              className="w-full p-2.5 bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              {videoDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Status Messages */}
        {(loadingMessage && !error) && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>{loadingMessage}</span>
          </div>
        )}
        {error && <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md">{error}</p>}

        {/* Detection Info */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Detection Results</h2>
            <InfoCard icon={<Smile size={20} className="text-blue-600"/>} label="Emotion" value={`${detectedEmotion} (${(emotionConfidence * 100).toFixed(1)}%)`} />
            <InfoCard icon={<User size={20} className="text-blue-600"/>} label="Gender" value={detectedGender || 'N/A'} />
            <InfoCard icon={<Calendar size={20} className="text-blue-600"/>} label="Approx. Age" value={detectedAge ? `${detectedAge} years` : 'N/A'} />
        </div>

        {/* Capture Button */}
        <button
            onClick={handleCapture}
            disabled={!isDetecting || detectionsArray.length === 0}
            className="w-full mt-auto py-2.5 px-5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
            <Download size={20}/>
            <span>Capture Frame</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 flex flex-col items-center justify-center bg-gray-100">
        <div className="relative w-full max-w-3xl aspect-video bg-black rounded-xl shadow-2xl border border-gray-300 overflow-hidden">
          <video
            ref={videoRef}
            width={VIDEO_WIDTH}
            height={VIDEO_HEIGHT}
            autoPlay
            muted
            playsInline
            onCanPlay={handleVideoCanPlay} // Important event
            className="w-full h-full object-cover"
          />
          <canvas
            ref={canvasRef}
            width={VIDEO_WIDTH} // Ensure canvas has initial dimensions
            height={VIDEO_HEIGHT}
            className="absolute top-0 left-0 w-full h-full"
          />
          {/* Scanning Line Animation */}
          {isDetecting && (
             <div
                ref={scanningLineRef}
                className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 opacity-50 animate-scan-vertical"
                // style={{ animationDuration: '3s' }} // Control speed via CSS or inline
            />
          )}
        </div>
        {isDetecting && <p className="mt-4 text-sm text-blue-600 font-medium">AI Detection Active</p>}
        {!isDetecting && modelsLoaded && isWebcamReady && <p className="mt-4 text-sm text-gray-500">Detection paused or not started. Ensure face is visible.</p>}
      </main>
    </div>
  );
}

// --- Helper Component for Info Cards ---
function InfoCard({ icon, label, value }) {
    return (
        <div className="bg-gray-100 p-3.5 rounded-lg">
            <div className="flex items-center space-x-2.5 mb-1">
                {icon}
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-gray-800 font-semibold text-base truncate" title={value}>{value}</p>
        </div>
    );
}

export default App;