import { useState, useEffect, useRef } from 'react';
import { formatNumber, formatBitcoin, formatStorage, formatElectricity } from '../utils/formatters.js';

export function ResourceBurst({ amounts, position = { x: 0, y: 0 } }) {
  const [bursts, setBursts] = useState([]);
  const idRef = useRef(0);
  
  useEffect(() => {
    if (!amounts || Object.keys(amounts).length === 0) return;
    
    const newBursts = [];
    const resourceLabels = {
      tokens: '🪙',
      satoshis: '₿',
      processingPower: '💻',
      electricity: '⚡',
      storage: '💾',
      addictivity: '🧠',
    };
    
    const resourceFormatters = {
      tokens: (v) => formatNumber(v),
      satoshis: (v) => formatBitcoin(v),
      processingPower: (v) => formatNumber(v),
      electricity: (v) => formatElectricity(v),
      storage: (v) => formatStorage(v),
      addictivity: (v) => formatNumber(v),
    };
    
    for (const [resource, amount] of Object.entries(amounts)) {
      if (amount > 0) {
        const id = idRef.current++;
        const label = resourceLabels[resource] || '';
        const formatted = resourceFormatters[resource] ? resourceFormatters[resource](amount) : formatNumber(amount);
        
        // Position burst centered on the resource card with slight random offset
        newBursts.push({
          id,
          resource,
          label,
          text: `+${formatted}`,
          x: position.x + (Math.random() - 0.5) * 40, // Smaller random offset
          y: position.y + (Math.random() - 0.5) * 30,
        });
      }
    }
    
    if (newBursts.length > 0) {
      setBursts(prev => [...prev, ...newBursts]);
      
      // Remove bursts after animation
      setTimeout(() => {
        setBursts(prev => prev.filter(b => !newBursts.some(nb => nb.id === b.id)));
      }, 1000);
    }
  }, [amounts, position]);
  
  return (
    <>
      {bursts.map(burst => (
        <div
          key={burst.id}
          className="resource-burst"
          style={{
            position: 'fixed',
            left: `${burst.x}px`,
            top: `${burst.y}px`,
            pointerEvents: 'none',
            zIndex: 10000,
            color: '#00ff88',
            fontSize: '18px',
            fontWeight: 'bold',
            textShadow: '0 0 10px #00ff88, 0 0 20px #00ff88',
            animation: 'burstFloat 1s ease-out forwards',
          }}
        >
          {burst.label} {burst.text}
        </div>
      ))}
      <style>{`
        @keyframes burstFloat {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-60px) scale(1.2);
          }
        }
      `}</style>
    </>
  );
}
