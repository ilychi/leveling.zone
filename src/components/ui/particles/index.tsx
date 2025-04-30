import { useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

type Point = {
  x: number;
  y: number;
  size: number;
  color: string;
  alpha: number;
  vx: number;
  vy: number;
};

interface ParticlesProps {
  className?: string;
  quantity?: number;
  staticity?: number;
  ease?: number;
  refresh?: boolean;
  color?: string;
  size?: number;
}

export const Particles = ({
  className,
  quantity = 30,
  staticity = 50,
  ease = 50,
  refresh = false,
  color = "#ffffff",
  size = 1,
}: ParticlesProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const context = useRef<CanvasRenderingContext2D | null>(null);
  const points = useRef<Point[]>([]);
  const mouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasSize = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const { w, h } = canvasSize.current;
        const x = e.clientX - rect.left - w / 2;
        const y = e.clientY - rect.top - h / 2;
        const inside = x < w / 2 && x > -w / 2 && y < h / 2 && y > -h / 2;
        if (inside) {
          mouse.current.x = x;
          mouse.current.y = y;
        }
      }
    },
    [canvasSize]
  );

  const generatePoints = useCallback(() => {
    if (!canvasRef.current) return;

    const { w, h } = canvasSize.current;
    const newPoints: Point[] = [];
    for (let i = 0; i < quantity; i++) {
      const x = Math.random() * w - w / 2;
      const y = Math.random() * h - h / 2;
      const vx = (Math.random() - 0.5) * 0.2;
      const vy = (Math.random() - 0.5) * 0.2;
      const baseSize = (size * Math.random()) + size * 0.5;
      const s = size > 0.5 ? baseSize : 0.5;
      newPoints.push({
        x,
        y,
        size: s,
        color,
        alpha: 1,
        vx,
        vy,
      });
    }
    points.current = newPoints;
  }, [size, color, quantity]);

  const drawPoints = useCallback(() => {
    if (context.current && canvasRef.current) {
      context.current.clearRect(
        0,
        0,
        canvasSize.current.w,
        canvasSize.current.h
      );
      context.current.translate(
        canvasSize.current.w / 2,
        canvasSize.current.h / 2
      );

      for (const point of points.current) {
        const mouseDistance = Math.sqrt(
          Math.pow(point.x - mouse.current.x, 2) +
            Math.pow(point.y - mouse.current.y, 2)
        );

        const mouseEffect = Math.max(0, 60 - mouseDistance) / 30;
        const distanceFromCenter = Math.sqrt(
          Math.pow(point.x, 2) + Math.pow(point.y, 2)
        );
        const distanceEffect = Math.max(0, 1 - distanceFromCenter / 400);

        // Update point position based on velocity
        point.x += point.vx;
        point.y += point.vy;

        // Calculate distance from center of canvas
        const centerX = 0;
        const centerY = 0;
        const distance = Math.sqrt(
          Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2)
        );

        // Apply a force towards the center (gravity-like)
        const directionX = centerX - point.x;
        const directionY = centerY - point.y;
        const normalizedX = directionX / distance;
        const normalizedY = directionY / distance;

        // Adjust velocity based on distance from center and staticity
        const gravityForce = Math.min(1, Math.max(0, distance / (canvasSize.current.w / 2))) / staticity;
        point.vx += normalizedX * gravityForce;
        point.vy += normalizedY * gravityForce;

        // Add some friction to prevent infinite acceleration
        point.vx *= 0.99;
        point.vy *= 0.99;

        // Mouse repulsion effect
        const attractionX = (mouse.current.x - point.x) / staticity;
        const attractionY = (mouse.current.y - point.y) / staticity;
        point.vx += mouseEffect * -attractionX;
        point.vy += mouseEffect * -attractionY;

        // Boundary checking - detect if going out of canvas
        if (
          point.x > canvasSize.current.w / 2 ||
          point.x < -canvasSize.current.w / 2
        ) {
          point.vx = -point.vx;
        }
        if (
          point.y > canvasSize.current.h / 2 ||
          point.y < -canvasSize.current.h / 2
        ) {
          point.vy = -point.vy;
        }

        // Add some slight random movement
        if (Math.random() < 0.02) {
          point.vx += (Math.random() - 0.5) * 0.01;
          point.vy += (Math.random() - 0.5) * 0.01;
        }

        // Draw the point
        context.current.beginPath();
        context.current.arc(point.x, point.y, point.size, 0, Math.PI * 2);
        context.current.fillStyle = `rgba(${parseInt(point.color.slice(1, 3), 16)}, ${parseInt(point.color.slice(3, 5), 16)}, ${parseInt(point.color.slice(5, 7), 16)}, ${point.alpha * Math.min(mouseEffect + 0.3, 0.8)})`;
        context.current.fill();
      }

      context.current.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }, [staticity]);

  const render = useCallback(() => {
    drawPoints();
    requestAnimationFrame(render);
  }, [drawPoints]);

  const initCanvas = useCallback(() => {
    if (canvasContainerRef.current && canvasRef.current && !context.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const { width, height } = rect;
      canvasSize.current.w = width;
      canvasSize.current.h = height;
      canvasRef.current.width = width * dpr;
      canvasRef.current.height = height * dpr;
      canvasRef.current.style.width = `${width}px`;
      canvasRef.current.style.height = `${height}px`;
      context.current = canvasRef.current.getContext("2d");
      if (context.current) {
        context.current.scale(dpr, dpr);
        generatePoints();
        render();
      }
    }
  }, [generatePoints, render, dpr]);

  const resizeCanvas = useCallback(() => {
    if (canvasContainerRef.current && canvasRef.current && context.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const { width, height } = rect;
      canvasSize.current.w = width;
      canvasSize.current.h = height;
      canvasRef.current.width = width * dpr;
      canvasRef.current.height = height * dpr;
      canvasRef.current.style.width = `${width}px`;
      canvasRef.current.style.height = `${height}px`;
      context.current.scale(dpr, dpr);
      generatePoints();
    }
  }, [generatePoints, dpr]);

  useEffect(() => {
    initCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [initCanvas, resizeCanvas, onMouseMove]);

  useEffect(() => {
    if (refresh) {
      generatePoints();
    }
  }, [generatePoints, refresh]);

  useEffect(() => {
    generatePoints();
  }, [color, generatePoints, size, quantity]);

  return (
    <div
      ref={canvasContainerRef}
      className={cn("fixed h-full w-full", className)}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} />
    </div>
  );
};
