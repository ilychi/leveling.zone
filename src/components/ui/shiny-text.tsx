'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface ShinyTextProps {
  children: React.ReactNode;
  className?: string;
}

export const ShinyText = ({ children, className = '' }: ShinyTextProps) => {
  const textRef = useRef<HTMLDivElement>(null);
  
  // 追踪鼠标位置，让光泽效果跟随鼠标移动
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!textRef.current) return;
      
      const rect = textRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      textRef.current.style.setProperty('--mouse-x', `${x}%`);
      textRef.current.style.setProperty('--mouse-y', `${y}%`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <motion.div
      ref={textRef}
      className={`relative select-none ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* 背景文字 - 黑灰渐变 */}
      <span className="absolute inset-0 bg-gradient-to-b from-gray-800 to-black bg-clip-text text-transparent select-none">
        {children}
      </span>
      
      {/* 光泽效果 */}
      <span 
        className="absolute inset-0 bg-gradient-to-br from-transparent via-gray-200 to-transparent bg-clip-text text-transparent select-none opacity-0 shine-effect"
        style={{
          backgroundPosition: 'var(--mouse-x, 50%) var(--mouse-y, 50%)',
          backgroundSize: '350% 350%',
        }}
      >
        {children}
      </span>
      
      {/* 实际显示的文字 */}
      <span className="bg-gradient-to-b from-gray-600 to-gray-900 bg-clip-text text-transparent relative z-10">
        {children}
      </span>

      <style jsx>{`
        .shine-effect {
          animation: shine 4s ease-in-out infinite;
          background-size: 200% 200%;
        }
        
        @keyframes shine {
          0% {
            opacity: 0.1;
            background-position: 200% 0%;
          }
          33% {
            opacity: 0.9;
          }
          66% {
            opacity: 0.1;
          }
          100% {
            opacity: 0.1;
            background-position: -200% 0%;
          }
        }
      `}</style>
    </motion.div>
  );
}; 
