import React from 'react';
import miraclezLogo from '@assets/mira logo_1755876002183.png';

interface LogoProps {
  variant?: 'icon' | 'text' | 'full';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Logo({ variant = 'full', size = 'md', className = '' }: LogoProps) {
  const sizes = {
    sm: { width: 16, height: 16, fontSize: 'text-[8px]' },
    md: { width: 20, height: 20, fontSize: 'text-[9px]' },
    lg: { width: 28, height: 28, fontSize: 'text-[10px]' },
    xl: { width: 36, height: 36, fontSize: 'text-[11px]' }
  };

  const { width, height, fontSize } = sizes[size];

  if (variant === 'icon') {
    return (
      <img
        src={miraclezLogo}
        alt="Miraclez Gaming"
        width={width}
        height={height}
        className={`${className} object-contain`}
      />
    );
  }

  if (variant === 'text') {
    return (
      <span className={`font-bold ${fontSize} ${className}`} style={{ color: '#D4AF37' }}>
        Miraclez Gaming
      </span>
    );
  }

  // Full variant with icon and text
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <img
        src={miraclezLogo}
        alt="Miraclez Gaming"
        width={width}
        height={height}
        className="object-contain"
      />
      <span className={`font-bold ${fontSize} hidden sm:inline`} style={{ color: '#D4AF37' }}>
        Miraclez Gaming
      </span>
    </div>
  );
}