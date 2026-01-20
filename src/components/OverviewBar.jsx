import { useState, useRef } from 'react';
import { ResourceDisplay } from './ResourceDisplay.jsx';
import { ParticleEffect } from './ParticleEffect.jsx';
import { calculateClickPower, calculateGeneration, calculateNSFWDrain } from '../utils/calculations.js';
import { STAGES, STAGE_REQUIREMENTS, UPGRADES, VERSION_MULTIPLIERS } from '../utils/constants.js';
import { formatNumber, formatBitcoin, formatStorage, formatElectricity } from '../utils/formatters.js';

export function OverviewBar({ gameState, gameActions, onResourceClick, resourceRefs }) {
  const [particleEffects, setParticleEffects] = useState([]);
  const particleIdRef = useRef(0);
  
  // Create refs for resource displays if not provided
  const tokensRef = useRef(null);
  const satoshisRef = useRef(null);
  const processingPowerRef = useRef(null);
  const electricityRef = useRef(null);
  const storageRef = useRef(null);
  const addictivityRef = useRef(null);
  
  // Expose refs to parent if provided
  if (resourceRefs) {
    resourceRefs.current = {
      tokens: tokensRef,
      satoshis: satoshisRef,
      processingPower: processingPowerRef,
      electricity: electricityRef,
      storage: storageRef,
      addictivity: addictivityRef,
    };
  }
  
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
  
  // Calculate NSFW drain rate (with multipliers)
  const nsfwDrain = calculateNSFWDrain(
    gameState.state.upgradeLevels,
    gameState.state.stage,
    gameState.state.version,
    gameState.state.toggledUpgrades || {}
  );
  
  // Apply active event multipliers (to match game loop behavior)
  let productionMultiplier = 1;
  for (const eventData of Object.values(gameState.state.activeEvents || {})) {
    if (eventData.effect?.productionMultiplier) {
      productionMultiplier *= eventData.effect.productionMultiplier;
    }
  }
  
  // Calculate NET token rate
  // Token generation gets multipliers, token consumption from addictivity is FLAT (not multiplied)
  // Get stage/version multipliers to match game loop calculation
  const stageMultiplier = STAGES[gameState.state.stage || 0]?.multiplier || 1;
  const [major, minor] = (gameState.state.version || '0.1.0').split('.').map(Number);
  const versionMultiplier = Math.pow(VERSION_MULTIPLIERS.major, major) * 
                           Math.pow(VERSION_MULTIPLIERS.minor, minor);
  const totalMultiplier = stageMultiplier * versionMultiplier;
  
  // Apply multipliers to generation only, consumption is FLAT
  const tokenGenerationWithMultipliers = (generation.tokenGeneration || 0) * totalMultiplier * productionMultiplier;
  const tokenConsumptionFlat = generation.tokenConsumption || 0; // Flat - no multipliers
  const nsfwDrainWithMultipliers = nsfwDrain.tokenDrainPerSec * productionMultiplier;
  const netTokenRate = tokenGenerationWithMultipliers - tokenConsumptionFlat - nsfwDrainWithMultipliers;
  
  // Calculate Bitcoin rate including NSFW conversion
  const nsfwSatsWithMultipliers = nsfwDrain.satsPerSec * productionMultiplier;
  const totalBitcoinRate = (generation.satoshis || 0) + nsfwSatsWithMultipliers;
  
  const currentStage = STAGES[gameState.state.stage];
  const nextStage = STAGES[gameState.state.stage + 1];
  const stageRequirements = STAGE_REQUIREMENTS[gameState.state.stage + 1] || {};
  
  // Resource icons and display names
  const resourceDisplayInfo = {
    tokens: { icon: '🪙', name: 'Tokens' },
    processingPower: { icon: '💻', name: 'Processing' },
    electricity: { icon: '⚡', name: 'Electricity' },
    storage: { icon: '💾', name: 'Storage' },
    addictivity: { icon: '🧠', name: 'Addictivity' },
    satoshis: { icon: '₿', name: 'Bitcoin' },
  };

  // Helper function to format resource value for display
  const formatResourceValue = (resource, value, isRequired = false) => {
    switch (resource) {
      case 'electricity':
        return formatElectricity(value);
      case 'storage':
        // For storage, remove GB from current value, keep it for required
        if (isRequired) {
          return formatStorage(value);
        } else {
          return formatNumber(value, 0);
        }
      case 'satoshis':
        return formatBitcoin(value);
      case 'processingPower':
        // For processing, just return the number (unit will be added separately)
        return formatNumber(value, 0);
      default:
        return formatNumber(value);
    }
  };

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
    // Use the actual mouse click position for particle origin
    const id = particleIdRef.current++;
    setParticleEffects(prev => [...prev, { 
      id, 
      x: e.clientX, 
      y: e.clientY 
    }]);
    
    gameActions.addClick();
    gameActions.addResources({ tokens: clickPower });
  };

  const handleParticleComplete = (id) => {
    setParticleEffects(prev => prev.filter(effect => effect.id !== id));
  };
  
  return (
    <div className="overview-bar">
      {/* Compact Resources Row - Horizontal Cards */}
      <div className="resources-row">
        <ResourceDisplay
          ref={tokensRef}
          label="Tokens"
          value={gameState.state.tokens}
          perSecond={netTokenRate}
          icon="🪙"
          color="neon-cyan"
          onClick={() => onResourceClick && onResourceClick('tokens')}
          resourceType="tokens"
        />
        <ResourceDisplay
          ref={processingPowerRef}
          label="Processing"
          value={gameState.state.processingPower}
          icon="💻"
          color="neon-purple"
          onClick={() => onResourceClick && onResourceClick('processingPower')}
          isProcessing={true}
          resourceType="processingPower"
        />
        <ResourceDisplay
          ref={electricityRef}
          label="Electricity"
          value={gameState.state.electricity}
          icon="⚡"
          color="neon-green"
          onClick={() => onResourceClick && onResourceClick('electricity')}
          isElectricity={true}
          resourceType="electricity"
        />
        <ResourceDisplay
          ref={storageRef}
          label="Storage"
          value={gameState.state.storage}
          icon="💾"
          color="neon-cyan"
          onClick={() => onResourceClick && onResourceClick('storage')}
          isStorage={true}
          resourceType="storage"
        />
        <ResourceDisplay
          ref={addictivityRef}
          label="Addictivity"
          value={gameState.state.addictivity}
          perSecond={generation.addictivity}
          icon="🧠"
          color="neon-purple"
          onClick={() => onResourceClick && onResourceClick('addictivity')}
          isAddictivity={true}
          resourceType="addictivity"
        />
        <ResourceDisplay
          ref={satoshisRef}
          label="Bitcoin"
          value={gameState.state.satoshis}
          perSecond={totalBitcoinRate}
          icon="₿"
          color="neon-green"
          isBitcoin={true}
          resourceType="satoshis"
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
            <span className="text-sm text-neon-purple font-mono">({formatNumber(stageMultiplier)}x)</span>
            <span className="terminal-cursor-small">_</span>
          </div>
          {nextStage && (
            <>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {/* Progress Status */}
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                {Object.entries(stageRequirements).map(([resource, required]) => {
                  const current = gameState.state[resource] || 0;
                  const info = resourceDisplayInfo[resource];
                  if (!info) return null;
                  
                  // Format values based on resource type
                  let currentFormatted, requiredFormatted;
                  
                  if (resource === 'storage') {
                    // For storage, use formatStorage which handles GB/TB/PB conversion
                    currentFormatted = formatStorage(current);
                    requiredFormatted = formatStorage(required);
                  } else if (resource === 'processingPower') {
                    // For processing, show number with unit at end: "0/5 FLOPS"
                    currentFormatted = formatNumber(current, 0);
                    requiredFormatted = formatNumber(required, 0) + ' FLOPS';
                  } else if (resource === 'electricity') {
                    // For electricity, use formatElectricity
                    currentFormatted = formatElectricity(current);
                    requiredFormatted = formatElectricity(required);
                  } else {
                    // For other resources (tokens, addictivity), use formatNumber
                    currentFormatted = formatResourceValue(resource, current, false);
                    requiredFormatted = formatResourceValue(resource, required, false);
                  }
                  
                  return (
                    <span key={resource} className="text-gray-300">
                      <span className="mr-1">{info.icon}</span>
                      <span className="text-neon-cyan">{info.name}</span>
                      <span className="text-gray-400"> {currentFormatted}</span>
                      <span className="text-gray-500">/</span>
                      <span className="text-gray-400">{requiredFormatted}</span>
                    </span>
                  );
                })}
              </div>
            </>
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
      
      {/* Particle Effects - One per click */}
      {particleEffects.map(effect => (
        <ParticleEffect
          key={effect.id}
          id={effect.id}
          x={effect.x}
          y={effect.y}
          amount={15}
          color="#00ffff"
          onComplete={() => handleParticleComplete(effect.id)}
        />
      ))}
    </div>
  );
}
