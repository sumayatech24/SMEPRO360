import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const sizes = { sm: 32, md: 40, lg: 56 };
  const s = sizes[size];
  const textSizes = { sm: 'text-lg', md: 'text-xl', lg: 'text-3xl' };

  return (
    <div className="flex items-center gap-3">
      <svg width={s} height={s} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        {/* Hexagon shape */}
        <polygon points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5" fill="url(#grad1)" opacity="0.15" />
        <polygon points="50,12 87,32 87,68 50,88 13,68 13,32" fill="url(#grad1)" />
        {/* S letter */}
        <text x="50" y="68" textAnchor="middle" fontSize="52" fontWeight="800" fill="white" fontFamily="Inter, sans-serif">S</text>
        {/* Orbit ring */}
        <circle cx="50" cy="50" r="43" stroke="url(#grad2)" strokeWidth="3" fill="none" strokeDasharray="8 4" opacity="0.6" />
        {/* Dots */}
        <circle cx="93" cy="50" r="4" fill="#06b6d4" />
        <circle cx="7" cy="50" r="4" fill="#8b5cf6" />
      </svg>
      {showText && (
        <div>
          <div className={`font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent leading-none ${textSizes[size]}`}>
            SMEPRO<span className="text-cyan-500">360</span>
          </div>
          {size !== 'sm' && (
            <div className="text-xs text-slate-500 font-medium tracking-widest uppercase">Enterprise ERP</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
