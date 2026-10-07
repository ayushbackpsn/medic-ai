import React from 'react';

export default function RiskBadge({ level, size = "md" }) {
  const normalized = (level || "LOW").toUpperCase();
  
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs font-semibold rounded-full",
    md: "px-3 py-1 text-sm font-bold rounded-lg",
    lg: "px-4 py-2 text-base font-extrabold rounded-xl"
  }[size] || "px-3 py-1 text-sm font-bold rounded-lg";

  const colorClasses = {
    LOW: "bg-emerald-100 text-emerald-800 border border-emerald-300",
    MEDIUM: "bg-amber-100 text-amber-800 border border-amber-300",
    HIGH: "bg-orange-100 text-orange-800 border border-orange-400 animate-pulse",
    CRITICAL: "bg-red-100 text-red-800 border border-red-500 animate-bounce shadow-md"
  }[normalized] || "bg-gray-100 text-gray-800";

  return (
    <span className={`inline-flex items-center gap-1.5 justify-center uppercase tracking-wide ${sizeClasses} ${colorClasses}`}>
      <span className={`w-2 h-2 rounded-full ${normalized === 'CRITICAL' ? 'bg-red-600' : normalized === 'HIGH' ? 'bg-orange-600' : normalized === 'MEDIUM' ? 'bg-amber-600' : 'bg-emerald-600'}`}></span>
      {normalized}
    </span>
  );
}
