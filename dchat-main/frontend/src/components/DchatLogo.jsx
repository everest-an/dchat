import React from 'react';

/**
 * Dchat Logo Component
 * Inspired by Dsign's circular arc design
 * Features concentric circular arcs forming a communication symbol
 */
const DchatLogo = ({ size = 40, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer arc */}
      <path
        d="M 20 80 Q 20 20, 80 20"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Middle arc */}
      <path
        d="M 30 75 Q 30 30, 75 30"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Inner arc */}
      <path
        d="M 40 70 Q 40 40, 70 40"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
};

export default DchatLogo;
