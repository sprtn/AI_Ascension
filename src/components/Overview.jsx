import { useState } from 'react';
import { ResourceDisplay } from './ResourceDisplay.jsx';
import { ParticleEffect } from './ParticleEffect.jsx';
import { calculateClickPower } from '../utils/calculations.js';
import { STAGES, STAGE_REQUIREMENTS } from '../utils/constants.js';
import { formatNumber } from '../utils/formatters.js';

export function Overview({ gameState, gameActions }) {
  const [clickPosition, setClickPosition] = useState(null);
  const [showParticles, setShowParticles] = useState(false);
  
  const clickPower = calculateClickPower(
    gameState.state.upgradeLevels,
    gameState.state.stage,
    gameState.state.version
  );
  
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
    <div className="space-y-6">
      {/* Version Display */}
      <div className="text-center">
        <div className="text-3xl font-bold text-neon-purple mb-2">
          AI Ascension v{gameState.state.version}
        </div>
        <div className="text-lg text-gray-400">
          {currentStage.name}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {currentStage.description}
        </div>
      </div>
      
      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <ResourceDisplay
          label="xAI Tokens"
          value={gameState.state.tokens}
          icon="⚡"
          color="neon-cyan"
        />
        <ResourceDisplay
          label="Processing Power"
          value={gameState.state.processingPower}
          icon="💻"
          color="neon-purple"
        />
        <ResourceDisplay
          label="Electricity"
          value={gameState.state.electricity}
          icon="⚡"
          color="neon-green"
        />
        <ResourceDisplay
          label="Storage"
          value={gameState.state.storage}
          icon="💾"
          color="neon-cyan"
        />
        <ResourceDisplay
          label="Addictivity"
          value={gameState.state.addictivity}
          icon="🧠"
          color="neon-purple"
        />
      </div>
      
      {/* Main Click Button */}
      <div className="flex justify-center">
        <button
          onClick={handleClick}
          className="relative px-12 py-8 rounded-xl bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 border-2 border-neon-cyan/50 hover:border-neon-cyan text-2xl font-bold text-neon-cyan hover:shadow-2xl hover:shadow-neon-cyan/50 transition-all animate-pulse-glow"
        >
          <div className="absolute inset-0 rounded-xl bg-neon-cyan/10 blur-xl"></div>
          <span className="relative z-10">CLICK ME</span>
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-sm text-gray-400">
            +{formatNumber(clickPower)} tokens
          </div>
        </button>
      </div>
      
      {/* Stage Progress */}
      {nextStage && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-neon-purple/30">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-neon-purple">
              Progress to {nextStage.name}
            </div>
            <div className="text-sm text-gray-400">
              {progress.toFixed(1)}%
            </div>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            {Object.entries(stageRequirements).map(([resource, required]) => {
              const current = gameState.state[resource] || 0;
              const percentage = Math.min(100, (current / required) * 100);
              return (
                <div key={resource} className="flex justify-between">
                  <span className="capitalize">{resource}:</span>
                  <span className={percentage >= 100 ? 'text-neon-green' : 'text-gray-400'}>
                    {formatNumber(current)} / {formatNumber(required)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Active Events */}
      {Object.keys(gameState.state.activeEvents).length > 0 && (
        <div className="space-y-2">
          {Object.values(gameState.state.activeEvents).map(event => (
            <div
              key={event.id}
              className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 text-yellow-400"
            >
              <div className="font-bold">{event.name}</div>
              <div className="text-sm">{event.description}</div>
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
