// src/components/InfoCard.js
import React from 'react';

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

export default InfoCard;