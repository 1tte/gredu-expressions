// src/components/tools/DetectionLogTool.js
import React from 'react';

function DetectionLogTool({ detectionLog, clearDetectionLog }) {
  return (
    <div className="flex-1 p-8 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Detection Log</h2>
        <button
            onClick={clearDetectionLog}
            className="px-4 py-2 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 disabled:opacity-50"
            disabled={detectionLog.length === 0}
        >
            Clear Log
        </button>
      </div>
      {detectionLog.length === 0 ? (
        <div className="flex-grow flex items-center justify-center">
            <p className="text-gray-500 text-lg">No detections logged yet for this session.</p>
        </div>
      ) : (
        <div className="bg-white p-4 rounded-xl shadow-lg overflow-y-auto flex-grow">
          <ul className="divide-y divide-gray-200">
            {detectionLog.map((entry, index) => (
              <li key={index} className="py-3 px-2 hover:bg-gray-50 text-sm">
                <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">
                        {entry.emotion} ({(entry.confidence * 100).toFixed(0)}%)
                    </span>
                    <span className="text-gray-500">{entry.timestamp}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Age: {entry.age || 'N/A'}, Gender: {entry.gender || 'N/A'}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default DetectionLogTool;