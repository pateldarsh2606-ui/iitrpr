'use client';

import { useEffect, useState, useCallback } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
  color: string;
  size: number;
  shape: 'rect' | 'circle' | 'heart';
}

const colors = [
  '#ff4d6d', '#ff6b8a', '#ff8fab', '#ffb3c6',
  '#ffd700', '#ff9a3c', '#ff5e7e', '#e63946',
  '#f72585', '#b5179e',
];

export function useConfetti() {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [active, setActive] = useState(false);

  const fire = useCallback(() => {
    const newPieces: ConfettiPiece[] = [];
    for (let i = 0; i < 150; i++) {
      newPieces.push({
        id: i,
        x: 50 + (Math.random() - 0.5) * 30,
        y: 50,
        rotation: Math.random() * 360,
        velocityX: (Math.random() - 0.5) * 40,
        velocityY: -Math.random() * 35 - 15,
        rotationSpeed: (Math.random() - 0.5) * 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 10 + 6,
        shape: Math.random() > 0.7 ? 'circle' : Math.random() > 0.85 ? 'heart' : 'rect',
      });
    }
    setPieces(newPieces);
    setActive(true);
    setTimeout(() => {
      setActive(false);
      setPieces([]);
    }, 4000);
  }, []);

  return { pieces, active, fire };
}

export function ConfettiOverlay({ pieces, active }: { pieces: ConfettiPiece[]; active: boolean }) {
  const [animated, setAnimated] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!active || pieces.length === 0) {
      setAnimated([]);
      return;
    }
    setAnimated(pieces.map(p => ({ ...p, x: p.x, y: p.y, rotation: p.rotation })));
    const startTime = Date.now();
    let raf: number;
    const tick = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const gravity = 30;
      setAnimated(prev =>
        prev.map(p => {
          const t = elapsed;
          const newX = p.x + p.velocityX * t;
          const newY = p.y + p.velocityY * t + 0.5 * gravity * t * t;
          const newRotation = p.rotation + p.rotationSpeed * t * 10;
          return { ...p, x: newX, y: newY, rotation: newRotation };
        })
      );
      if (elapsed < 4) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, pieces]);

  if (!active || animated.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {animated.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`,
            width: p.shape === 'heart' ? `${p.size}px` : `${p.size}px`,
            height: p.shape === 'rect' ? `${p.size * 0.6}px` : `${p.size}px`,
            backgroundColor: p.shape === 'heart' ? 'transparent' : p.color,
            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'rect' ? '2px' : '0',
          }}
        >
          {p.shape === 'heart' && (
            <svg viewBox="0 0 24 24" width={p.size} height={p.size} fill={p.color}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}
