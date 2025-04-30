import React from 'react';

interface LogoProps {
  className?: string;
}

export function LevelingLogo({ className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={`w-8 h-8 ${className || ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="8"
    >
      {/* 背景圆 */}
      <circle cx="50" cy="50" r="45" fill="currentColor" stroke="none" className="text-gray-900 dark:text-white" />
      
      {/* 内部阶梯/层级结构 */}
      <path d="M25 75 L75 75" strokeLinecap="round" strokeLinejoin="round" className="text-white dark:text-gray-900" />
      <path d="M35 60 L65 60" strokeLinecap="round" strokeLinejoin="round" className="text-white dark:text-gray-900" />
      <path d="M45 45 L55 45" strokeLinecap="round" strokeLinejoin="round" className="text-white dark:text-gray-900" />
      
      {/* 可选：添加一点上升的箭头/动感 */}
      {/* <polyline points="50 40, 50 25, 60 35" strokeLinecap="round" strokeLinejoin="round" className="text-white dark:text-gray-900" /> */}
    </svg>
  );
}


export function LevelingLogoText({ className }: LogoProps) {
  return (
    <span className={`mx-2 text-xl font-extrabold ${className || ''}`}>
      LEVELING<span className="text-indigo-600">.</span>ZONE
    </span>
  );
} 
 