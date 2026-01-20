import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { formatNumber, formatBitcoin, formatStorage, formatElectricity } from '../utils/formatters.js';

export const ResourceDisplay = forwardRef(({ label, value, perSecond, icon, color = 'neon-cyan', onClick, isBitcoin = false, isStorage = false, isElectricity = false, isProcessing = false, isAddictivity = false, showRateOnly = false, rateUnit = '/s', resourceType }, ref) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const cardRef = useRef(null);
  
  useImperativeHandle(ref, () => ({
    getPosition: () => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      }
      return null;
    },
    resourceType,
  }));
  
  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true);
      setDisplayValue(value);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 1200); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);
  
  const colorMap = {
    'neon-cyan': { border: 'border-cyan-500/30', hover: 'hover:border-cyan-500/60', text: 'text-cyan-400' },
    'neon-purple': { border: 'border-purple-500/30', hover: 'hover:border-purple-500/60', text: 'text-purple-400' },
    'neon-green': { border: 'border-green-500/30', hover: 'hover:border-green-500/60', text: 'text-green-400' },
  };
  
  const colors = colorMap[color] || colorMap['neon-cyan'];
  
  return (
    <div 
      ref={cardRef}
      className={`resource-card ${isAnimating ? 'resource-card-updating' : ''} ${onClick ? 'resource-card-clickable' : ''}`} 
      data-color={color}
      onClick={onClick}
    >
      {icon && <span className="resource-icon">{icon}</span>}
      <div className="resource-content">
        <div className="resource-label">{label}</div>
        {showRateOnly ? (
          <div className={`resource-value ${colors.text}`}>
            {isElectricity ? formatElectricity(perSecond !== undefined ? perSecond : displayValue) : formatNumber(perSecond !== undefined ? perSecond : displayValue) + rateUnit}
          </div>
        ) : isProcessing ? (
          // Processing shows value with FLOPS unit
          <div className={`resource-value ${colors.text}`}>
            {formatNumber(displayValue)} FLOPS
          </div>
        ) : isAddictivity ? (
          // Addictivity shows per-second rate with SATS/sec unit
          <div className={`resource-value ${colors.text}`}>
            {formatNumber(perSecond !== undefined ? perSecond : 0)} SATS/sec
          </div>
        ) : (
          <>
            <div className={`resource-value ${colors.text}`}>
              {isBitcoin ? formatBitcoin(displayValue) : isStorage ? formatStorage(displayValue) : isElectricity ? formatElectricity(displayValue) : formatNumber(displayValue)}
            </div>
            {perSecond !== undefined && perSecond !== 0 && (
              <div className={`resource-per-second ${perSecond > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {perSecond > 0 ? '+' : ''}{formatNumber(perSecond)}/s
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});
