import { useEffect, useState } from 'react';

export function ParticleEffect({ x, y, amount = 10, color = '#00ffff' }) {
  const [particles, setParticles] = useState([]);
  
  useEffect(() => {
    const newParticles = [];
    for (let i = 0; i < amount; i++) {
      const angle = (Math.PI * 2 * i) / amount;
      const velocity = 50 + Math.random() * 50;
      newParticles.push({
        id: i,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 1,
      });
    }
    setParticles(newParticles);
    
    const interval = setInterval(() => {
      setParticles(prev => 
        prev.map(p => ({
          ...p,
          x: p.x + p.vx * 0.016,
          y: p.y + p.vy * 0.016,
          life: p.life - 0.02,
        })).filter(p => p.life > 0)
      );
    }, 16);
    
    return () => clearInterval(interval);
  }, [amount]);
  
  if (particles.length === 0) return null;
  
  return (
    <div className="fixed pointer-events-none z-50" style={{ left: x, top: y }}>
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute w-1 h-1 rounded-full"
          style={{
            left: particle.x,
            top: particle.y,
            backgroundColor: color,
            opacity: particle.life,
            transform: `scale(${particle.life})`,
            transition: 'opacity 0.1s, transform 0.1s',
          }}
        />
      ))}
    </div>
  );
}
