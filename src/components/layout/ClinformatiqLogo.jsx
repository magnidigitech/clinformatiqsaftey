import React from 'react';

export default function ClinformatiqLogo({ className = "", sizeClass = "h-12", showText = true }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img src="/clinformatiq_logo.png" alt="Clinformatiq Logo" className={`${sizeClass} w-auto object-contain`} />
      {showText && (
        <div className="flex items-center gap-3 h-full border-l-[1.5px] border-slate-300 pl-3">
          <span className="text-[17px] font-semibold tracking-wide text-slate-600 mt-0.5">
            Safety
          </span>
        </div>
      )}
    </div>
  );
}
