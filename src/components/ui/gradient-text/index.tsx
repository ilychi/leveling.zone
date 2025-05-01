"use client";

import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GradientTextProps {
  children: ReactNode;
  colors: string[];
  animationSpeed?: number;
  showBorder?: boolean;
  className?: string;
}

export function GradientText({
  children,
  colors,
  animationSpeed = 2,
  showBorder = false,
  className,
}: GradientTextProps) {
  const gradientStyle = {
    backgroundImage: `linear-gradient(90deg, ${colors.join(", ")})`,
    backgroundSize: `${colors.length * 200}% 100%`,
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
    animation: `gradient-animation ${animationSpeed}s linear infinite`,
  };

  const borderStyle = showBorder
    ? {
        border: "1px solid transparent",
        backgroundImage: `linear-gradient(white, white), linear-gradient(90deg, ${colors.join(
          ", "
        )})`,
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
        animation: `gradient-animation ${animationSpeed}s linear infinite`,
      }
    : {};

  return (
    <div
      className={cn("inline-block", showBorder && "p-1 rounded-lg", className)}
      style={{
        ...gradientStyle,
        ...borderStyle,
      }}
    >
      {children}
    </div>
  );
}

// Add a keyframe animation for the gradient effect
if (typeof document !== "undefined") {
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    @keyframes gradient-animation {
      0% {
        background-position: 0% 50%;
      }
      100% {
        background-position: 100% 50%;
      }
    }
  `;
  document.head.appendChild(styleElement);
}
