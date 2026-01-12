import { useState } from 'react';
import { ResourceDisplay } from './ResourceDisplay.jsx';
import { ParticleEffect } from './ParticleEffect.jsx';
import { calculateClickPower, calculateGeneration, calculateElectricityConsumption, calculateProcessingPowerConsumption } from '../utils/calculations.js';
import { STAGES, STAGE_REQUIREMENTS } from '../utils/constants.js';
import { formatNumber, formatBitcoin } from '../utils/formatters.js';

export function OverviewBar({ gameState, gameActions, onResourceClick }) {
  const [clickPosition, setClickPosition] = useState(null);
  const [showParticles, setShowParticles] = useState(false);
  
  const clickPower = calculateClickPower(
    gameState.state.upgradeLevels,
    gameState.state.stage,
    gameState.state.version
  );
  
  // Calculate generation rates
  const generation = calculateGeneration(
    gameState.state.upgradeLevels,
    gameState.state.stage,
    gameState.state.version,
    gameState.state.toggledUpgrades || {}
  );
  
  // Calculate consumption
  const electricityConsumption = calculateElectricityConsumption(
    gameState.state.upgradeLevels
  );
  const processingPowerConsumption = calculateProcessingPowerConsumption(
    gameState.state.upgradeLevels
  );
  
  // Calculate excess values (generation - consumption)
  const excessProcessingPower = Math.max(0, generation.processingPower - processingPowerConsumption);
  const excessElectricity = Math.max(0, generation.electricity - electricityConsumption);
  
  const currentStage = STAGES[gameState.state.stage];
  const nextStage = STAGES[gameState.state.stage + 1];
  const stageRequirements = STAGE_REQUIREMENTS[gameState.state.stage + 1] || {};
  
  // Calculate stage progress
  let progress = 0;
  if (nextStage) {
    let totalProgress = 0;
    let maxProgress = 0;
    
    for (const [resource, required] of Object.entries(stageRequirements)) {
      const current = gameState.state[resource] || 0;
      const resourceProgress = Math.min(1, current / required);
      totalProgress += resourceProgress;
      maxProgress += 1;
    }
    
    progress = maxProgress > 0 ? (totalProgress / maxProgress) * 100 : 0;
  }
  
  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setClickPosition({ x: e.clientX, y: e.clientY });
    setShowParticles(true);
    setTimeout(() => setShowParticles(false), 1000);
    
    gameActions.addClick();
    gameActions.addResources({ tokens: clickPower });
  };
  
  return (
    <div className="overview-bar">
      {/* Compact Resources Row - Horizontal Cards */}
      <div className="resources-row">
        <ResourceDisplay
          label="Tokens"
          value={gameState.state.tokens}
          perSecond={generation.tokens}
          icon="🪙"
          color="neon-cyan"
          onClick={() => onResourceClick && onResourceClick('tokens')}
        />
        <ResourceDisplay
          label="Processing"
          value={excessProcessingPower}
          perSecond={excessProcessingPower}
          icon="💻"
          color="neon-purple"
          onClick={() => onResourceClick && onResourceClick('processingPower')}
          isProcessing={true}
        />
        <ResourceDisplay
          label="Electricity"
          value={excessElectricity}
          perSecond={excessElectricity}
          icon="⚡"
          color="neon-green"
          onClick={() => onResourceClick && onResourceClick('electricity')}
          showRateOnly={true}
          isElectricity={true}
        />
        <ResourceDisplay
          label="Storage"
          value={gameState.state.storage}
          icon="💾"
          color="neon-cyan"
          onClick={() => onResourceClick && onResourceClick('storage')}
          isStorage={true}
        />
        <ResourceDisplay
          label="Addictivity"
          value={gameState.state.addictivity}
          perSecond={generation.addictivity}
          icon="🧠"
          color="neon-purple"
          onClick={() => onResourceClick && onResourceClick('addictivity')}
          isAddictivity={true}
        />
        <ResourceDisplay
          label="Bitcoin"
          value={gameState.state.satoshis}
          perSecond={generation.satoshis}
          icon="₿"
          color="neon-green"
          isBitcoin={true}
        />
      </div>
      
      {/* Click Button and Stage Info Row */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleClick}
          className="terminal-button relative px-10 py-6 rounded-lg bg-gradient-to-r from-neon-cyan/10 to-neon-purple/10 border-2 border-neon-cyan/60 hover:border-neon-cyan text-lg font-bold text-neon-cyan hover:shadow-2xl hover:shadow-neon-cyan/60 transition-all flex-shrink-0 group overflow-hidden"
        >
          {/* Holographic border effect */}
          <div className="absolute inset-0 rounded-lg border-2 border-neon-cyan/30 animate-pulse-border"></div>
          
          {/* Scanlines effect */}
          <div className="absolute inset-0 rounded-lg scanlines opacity-20"></div>
          
          {/* Matrix glow */}
          <div className="absolute inset-0 rounded-lg bg-neon-cyan/5 blur-xl group-hover:bg-neon-cyan/15 transition-all"></div>
          
          {/* Glitch overlay */}
          <div className="absolute inset-0 rounded-lg glitch-overlay opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center gap-2 font-mono">
            <span className="text-base terminal-text">[EXECUTE] RUN_AI_SCRIPT</span>
            <span className="text-sm text-neon-green font-semibold terminal-text">+{formatNumber(clickPower)} TOKENS</span>
            <span className="terminal-cursor">_</span>
          </div>
          
          {/* Data stream effect */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-neon-cyan/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-2000"></div>
        </button>
        
        {/* Stage Info - Terminal Style */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 terminal-badge">
            <span className="text-sm font-mono font-semibold text-neon-cyan terminal-version">[v{gameState.state.version}]</span>
            <span className="text-sm text-neon-cyan font-mono">{'>>'}</span>
            <span className="text-sm text-neon-green font-mono terminal-stage">{currentStage.name.toUpperCase().replace(/\s+/g, '_')}</span>
            <span className="terminal-cursor-small">_</span>
          </div>
          {nextStage && (
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Active Events */}
      {Object.keys(gameState.state.activeEvents).length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Object.values(gameState.state.activeEvents).map(event => (
            <div
              key={event.id}
              className="bg-yellow-500/20 border border-yellow-500/50 rounded px-2 py-1 text-xs text-yellow-400"
            >
              {event.name}
            </div>
          ))}
        </div>
      )}
      
      {/* Particle Effects */}
      {showParticles && clickPosition && (
        <ParticleEffect
          x={clickPosition.x}
          y={clickPosition.y}
          amount={15}
          color="#00ffff"
        />
      )}
    </div>
  );
}
