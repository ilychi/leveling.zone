'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface GlowingSearchProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export const GlowingSearch = ({
  placeholder = "输入IP地址...",
  value,
  onChange,
  onSubmit,
  disabled = false,
  loading = false,
  className = "",
}: GlowingSearchProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disabled) {
      onSubmit();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  // Automatically focus input on mobile when tapping the container
  const handleContainerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && document.activeElement === inputRef.current) {
        if (!disabled) {
          onSubmit();
        }
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
    };
  }, [disabled, onSubmit]);

  return (
    <motion.div
      ref={containerRef}
      className={`relative w-full max-w-2xl mx-auto ${className}`}
      onMouseMove={handleMouseMove}
      onClick={handleContainerClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full opacity-70 pointer-events-none"
        animate={{
          boxShadow: isFocused
            ? `0 0 25px 10px rgba(136, 58, 234, 0.35)`
            : `0 0 15px 2px rgba(136, 58, 234, 0.15)`,
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Dynamic hover glow effect */}
      {isFocused && (
        <motion.div
          className="absolute bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full pointer-events-none blur-[40px]"
          style={{
            left: mousePosition.x - 50,
            top: mousePosition.y - 50,
            width: 100,
            height: 100,
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center w-full">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="pl-4 pr-16 py-3 h-12 w-full bg-white dark:bg-gray-950 border-0 rounded-full shadow-lg focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600 focus:ring-opacity-50 transition-all duration-300"
          />
          <button 
            type="submit"
            disabled={disabled}
            className="absolute right-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 text-white rounded-full w-10 h-10 flex items-center justify-center"
          >
            {loading ? (
              <motion.div 
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}; 
