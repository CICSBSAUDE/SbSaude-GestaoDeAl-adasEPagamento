import React from 'react';

interface LogoSBSaudeProps {
  className?: string;
  variant?: 'full' | 'symbol' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
}

export const LogoSBSaude: React.FC<LogoSBSaudeProps> = ({
  className = '',
  variant = 'full',
  size = 'md',
  showTagline = true,
}) => {
  // Dimensions map
  const dimensions = {
    sm: { symbolSize: 28, height: 32, fontSize: 'text-sm', subFontSize: 'text-[9px]' },
    md: { symbolSize: 36, height: 42, fontSize: 'text-base', subFontSize: 'text-[10px]' },
    lg: { symbolSize: 48, height: 56, fontSize: 'text-xl', subFontSize: 'text-xs' },
    xl: { symbolSize: 64, height: 72, fontSize: 'text-2xl', subFontSize: 'text-sm' },
  }[size];

  // The SB Saúde logo mark geometry:
  // Red geometric pill quadrants formed by two connected capsule curves in pure red (#E50914 / #DC2626)
  const renderSymbol = () => (
    <svg
      viewBox="0 0 120 120"
      className="shrink-0"
      style={{ width: dimensions.symbolSize, height: dimensions.symbolSize }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Top Left Capsule quadrant */}
      <path
        d="M60 10 C25 10 10 25 10 60 L60 60 Z"
        fill="#DC2626"
      />
      <rect x="10" y="10" width="50" height="50" rx="25" fill="#DC2626" />
      {/* Bottom Right Capsule quadrant */}
      <rect x="60" y="60" width="50" height="50" rx="25" fill="#DC2626" />
      {/* Red accent connecting corners */}
      <path
        d="M60 10 H35 C21.1929 10 10 21.1929 10 35 V60 H60 V10 Z"
        fill="#DC2626"
      />
      <path
        d="M60 60 H110 V85 C110 98.8071 98.8071 110 85 110 H60 V60 Z"
        fill="#DC2626"
      />
    </svg>
  );

  if (variant === 'symbol') {
    return <div className={`inline-flex items-center ${className}`}>{renderSymbol()}</div>;
  }

  const isWhite = variant === 'white';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {renderSymbol()}
      <div className="flex flex-col leading-tight select-none">
        <span
          className={`font-black tracking-tight transition-colors duration-200 ${dimensions.fontSize} ${
            isWhite ? 'text-white' : 'text-slate-900 dark:text-white'
          }`}
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.03em' }}
        >
          SB SAÚDE
        </span>
        {showTagline && (
          <span
            className={`font-medium tracking-normal transition-colors duration-200 ${dimensions.subFontSize} ${
              isWhite ? 'text-slate-300' : 'text-slate-700 dark:text-slate-300'
            }`}
            style={{ marginTop: '-2px' }}
          >
            Operadora de Saúde
          </span>
        )}
      </div>
    </div>
  );
};
