// src/components/tools/SessionAnalyticsTool.js
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, XAxis, YAxis, CartesianGrid, Bar } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919', '#82ca9d'];

function SessionAnalyticsTool({ sessionEmotionCounts, sessionAges, sessionGenders, resetSessionData }) {
  const emotionPieData = Object.entries(sessionEmotionCounts)
    .map(([name, value]) => ({ name, value }))
    .filter(entry => entry.value > 0); // Only show emotions that were detected

  const averageAge = sessionAges.length > 0
    ? (sessionAges.reduce((sum, age) => sum + age, 0) / sessionAges.length).toFixed(1)
    : 'N/A';

  const genderData = Object.entries(sessionGenders)
    .map(([name, value]) => ({ name, count: value }));

  return (
    <div className="flex-1 p-8 overflow-y-auto"> {/* Added overflow-y-auto */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Session Analytics</h2>
        <button
            onClick={resetSessionData}
            className="px-4 py-2 bg-red-500 text-white text-sm rounded-md hover:bg-red-600"
        >
            Reset Session Data
        </button>
      </div>

      {emotionPieData.length === 0 && genderData.length === 0 && averageAge === 'N/A' ? (
        <div className="text-center py-10">
            <p className="text-gray-500 text-lg">No session data collected yet.</p>
            <p className="text-gray-400 text-sm">Interact with the "Live Analysis" tool to gather data.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Emotion Distribution */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-medium text-gray-700 mb-4">Emotion Distribution</h3>
            {emotionPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={emotionPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {emotionPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 py-12">No emotion data yet.</p>
            )}
          </div>

          {/* Age and Gender */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-medium text-gray-700 mb-4">Age & Gender</h3>
            <div className="mb-6">
              <p className="text-sm text-gray-500">Average Detected Age:</p>
              <p className="text-3xl font-semibold text-gray-800">{averageAge} <span className="text-lg">years</span></p>
            </div>
            <h4 className="text-md font-medium text-gray-600 mb-2">Gender Counts:</h4>
            {genderData.length > 0 ? (
                 <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={genderData} layout="vertical" margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <p className="text-center text-gray-400 py-8">No gender data yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SessionAnalyticsTool;