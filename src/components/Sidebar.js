// src/components/Sidebar.js
import React from 'react';
import { Zap, Download, User, Calendar, Smile, BarChart2, ListChecks, Settings } from 'lucide-react'; // Added more icons
import InfoCard from './InfoCard';

function Sidebar({
  // Props for general status and camera
  loadingMessage,
  error,
  showCameraSelector,
  videoDevices,
  selectedDeviceId,
  handleCameraChange,
  modelsLoaded,
  isDetecting,
  // Props for current detection results
  detectedEmotion,
  emotionConfidence,
  detectedAge,
  detectedGender,
  // Props for actions
  handleCapture,
  detectionsArrayLength,
  // Props for dashboard navigation
  activeTool,
  setActiveTool,
}) {
  const navButtonClass = (toolName) =>
    `w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg cursor-pointer transition-colors
    ${activeTool === toolName
      ? 'bg-blue-100 text-blue-700 font-medium'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <aside className="w-72 bg-white p-6 border-r border-gray-200 flex flex-col">
      <div className="flex items-center space-x-3 text-blue-600 mb-6">
        <Zap size={32} strokeWidth={2} />
        <h1 className="text-2xl font-bold text-gray-900">AI Vision</h1>
      </div>

      {/* Tool Navigation */}
      <nav className="space-y-2 mb-6">
        <button onClick={() => setActiveTool('live')} className={navButtonClass('live')}>
          <Smile size={20} />
          <span>Live Analysis</span>
        </button>
        <button onClick={() => setActiveTool('analytics')} className={navButtonClass('analytics')}>
          <BarChart2 size={20} />
          <span>Session Analytics</span>
        </button>
        <button onClick={() => setActiveTool('log')} className={navButtonClass('log')}>
          <ListChecks size={20} />
          <span>Detection Log</span>
        </button>
        {/* Add more tools here, e.g., Settings */}
        {/* <button onClick={() => setActiveTool('settings')} className={navButtonClass('settings')}>
          <Settings size={20} />
          <span>Configuration</span>
        </button> */}
      </nav>

      {/* Camera Selector */}
      {showCameraSelector && videoDevices.length > 0 && (
        <div className="space-y-1 mb-4">
          <label htmlFor="camera-select" className="text-sm font-medium text-gray-700">
            Select Camera
          </label>
          <select
            id="camera-select"
            value={selectedDeviceId}
            onChange={handleCameraChange}
            disabled={!modelsLoaded || (isDetecting && activeTool === 'live')} // Disable if detecting in live view
            className="w-full p-2.5 bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            {videoDevices.map((device, index) => (
              <option key={device.deviceId || index} value={device.deviceId}>
                {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Status Messages */}
      {(loadingMessage && !error) && (
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>{loadingMessage}</span>
        </div>
      )}
      {error && <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md mb-4">{error}</p>}

      {/* Current Detection Info (only if models loaded) */}
      {modelsLoaded && (
        <div className="space-y-4 pt-4 border-t border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Current Snapshot</h2>
          <InfoCard
            icon={<Smile size={20} className="text-blue-600" />}
            label="Emotion"
            value={`${detectedEmotion} (${(emotionConfidence * 100).toFixed(1)}%)`}
          />
          <InfoCard
            icon={<User size={20} className="text-blue-600" />}
            label="Gender"
            value={detectedGender || 'N/A'}
          />
          <InfoCard
            icon={<Calendar size={20} className="text-blue-600" />}
            label="Approx. Age"
            value={detectedAge ? `${detectedAge} years` : 'N/A'}
          />
        </div>
      )}

      {/* Capture Button */}
      <button
        onClick={handleCapture}
        disabled={!isDetecting || detectionsArrayLength === 0 || activeTool !== 'live'}
        className="w-full mt-auto py-2.5 px-5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        <Download size={20} />
        <span>Capture Frame</span>
      </button>
    </aside>
  );
}

export default Sidebar;