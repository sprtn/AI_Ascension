import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export function ParticleEffect({ id, x, y, amount = 10, color = '#00ffff', onComplete }) {
  // Initialize particles immediately
  const initialParticles = [];
  for (let i = 0; i < amount; i++) {
    const angle = (Math.PI * 2 * i) / amount;
    const velocity = 50 + Math.random() * 50;
    initialParticles.push({
      id: i,
      x: 0,
      y: 0,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: 1,
    });
  }
  
  const [particles, setParticles] = useState(initialParticles);
  const onCompleteRef = useRef(onComplete);
  const intervalRef = useRef(null);
  
  // Keep onComplete ref updated without triggering effect reset
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  
  useEffect(() => {
    // Start animation loop
    intervalRef.current = setInterval(() => {
      setParticles(prev => {
        if (prev.length === 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          if (onCompleteRef.current) {
            setTimeout(() => onCompleteRef.current(), 0);
          }
          return prev;
        }
        
        const updated = prev.map(p => ({
          ...p,
          x: p.x + p.vx * 0.016,
          y: p.y + p.vy * 0.016,
          life: p.life - 0.02,
        })).filter(p => p.life > 0);
        
        // If all particles are gone, notify parent to remove this effect
        if (updated.length === 0 && prev.length > 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          if (onCompleteRef.current) {
            setTimeout(() => onCompleteRef.current(), 0);
          }
        }
        
        return updated;
      });
    }, 16);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [id]); // Only depend on id to prevent resets
  
  const particleElements = particles.map(particle => (
    <div
      key={particle.id}
      className="pointer-events-none z-50"
      style={{
        position: 'fixed',
        left: `${Number(x) + particle.x - 2}px`,
        top: `${Number(y) + particle.y - 2}px`,
        width: '4px',
        height: '4px',
        borderRadius: '50%',
        backgroundColor: color,
        opacity: particle.life,
        transform: `scale(${particle.life})`,
        willChange: 'transform, opacity',
        pointerEvents: 'none',
      }}
    />
  ));
  
  // Render particles in a portal at document body to avoid parent transform issues
  return createPortal(
    <>{particleElements}</>,
    document.body
  );
}
