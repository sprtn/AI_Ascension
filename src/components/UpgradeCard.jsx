import { useState, useEffect, useRef } from 'react';
import { formatNumber, formatBitcoin, formatElectricity, formatStorage } from '../utils/formatters.js';
import { calculateUpgradeCost, canAfford, calculateGeneration } from '../utils/calculations.js';
import { UPGRADES, STAGES, VERSION_MULTIPLIERS } from '../utils/constants.js';
import { ParticleEffect } from './ParticleEffect.jsx';

export function UpgradeCard({ upgrade, level, resources, onPurchase, disabled, onToggle }) {
  const currentLevel = level || 0;
  const cost = calculateUpgradeCost(upgrade, currentLevel);
  
  // Check if this is an inventory-type upgrade (no effects, used as resource)
  const isInventoryUpgrade = !upgrade.effect || Object.keys(upgrade.effect).length === 0;
  const levelLabel = isInventoryUpgrade ? 'Amount' : 'Lv';
  const levelLabelFull = isInventoryUpgrade ? 'Amount' : 'Level';
  
  // If cost is empty, it means the upgrade only requires GPT Mini (no resource cost)
  const hasResourceCost = Object.keys(cost).length > 0;
  
  // Check affordability
  // If there's no resource cost, it's affordable if GPT Mini requirement is met
  let affordable = hasResourceCost ? canAfford(resources, cost) : true;
  
  // Check processing power requirement (use current processingPower value directly)
  if (upgrade.requiresProcessingPower) {
    const currentProcessingPower = resources.processingPower || 0;
    if (currentProcessingPower < upgrade.requiresProcessingPower) {
      affordable = false;
    }
  }
  
  // Check GPT Mini requirement
  if (upgrade.costsGptMini) {
    const gptMiniLevel = (resources.upgradeLevels || {})['gpt-mini'] || 0;
    if (gptMiniLevel < upgrade.costsGptMini) {
      affordable = false;
    }
  }
  
  // Check GPT Pro requirement
  if (upgrade.costsGptPro) {
    const gptProLevel = (resources.upgradeLevels || {})['gpt-pro'] || 0;
    if (gptProLevel < upgrade.costsGptPro) {
      affordable = false;
    }
  }
  
  // Check Neural Networks requirement
  if (upgrade.costsNeuralNetworks) {
    const neuralNetworksLevel = (resources.upgradeLevels || {})['neural-networks'] || 0;
    if (neuralNetworksLevel < upgrade.costsNeuralNetworks) {
      affordable = false;
    }
  }
  
  // Calculate maxLevel - for NSFW Clickbait, multiply by stage multiplier
  let maxLevel = upgrade.maxLevel || Infinity;
  if (upgrade.id === 'nsfw-reddit-clickbait' && upgrade.maxLevel) {
    const stageMultiplier = STAGES[resources.stage || 0]?.multiplier || 1;
    maxLevel = upgrade.maxLevel * stageMultiplier;
  }
  
  const canBuy = affordable && currentLevel < maxLevel && !disabled;
  
  // Check if upgrade is toggled (for toggleable upgrades like token conversion or overclocking)
  const isToggled = upgrade.effect?.tokenToSatsConversion 
    ? (resources.toggledUpgrades?.[upgrade.id] !== false) // Default to true
    : upgrade.isToggleable
    ? (resources.toggledUpgrades?.[upgrade.id] !== false) // Default to true for toggleable upgrades
    : false;
  
  const handleClick = (e) => {
    if (canBuy) {
      // Create particle effect at click position
      if (e) {
        const id = particleIdRef.current++;
        setParticleEffects(prev => [...prev, { 
          id, 
          x: e.clientX, 
          y: e.clientY 
        }]);
      }
      
      onPurchase(upgrade.id, currentLevel + 1, cost, upgrade.effect);
    }
  };

  const handleParticleComplete = (id) => {
    setParticleEffects(prev => prev.filter(effect => effect.id !== id));
  };
  
  // Click-and-hold state for + and - buttons
  const [isHoldingIncrease, setIsHoldingIncrease] = useState(false);
  const [isHoldingDecrease, setIsHoldingDecrease] = useState(false);
  const [isGlowingIncrease, setIsGlowingIncrease] = useState(false);
  const [isGlowingDecrease, setIsGlowingDecrease] = useState(false);
  const increaseIntervalRef = useRef(null);
  const decreaseIntervalRef = useRef(null);
  const increaseHoldTimeoutRef = useRef(null);
  const decreaseHoldTimeoutRef = useRef(null);
  const holdStartTimeRef = useRef(0);
  
  // Particle effects for purchase button clicks
  const [particleEffects, setParticleEffects] = useState([]);
  const particleIdRef = useRef(0);
  
  // Refs to track latest values for intervals
  const latestValuesRef = useRef({ level, canBuy, cost, upgrade, resources, hasResourceCost, disabled, onPurchase });
  
  // Update refs when values change
  useEffect(() => {
    latestValuesRef.current = { level, canBuy, cost, upgrade, resources, hasResourceCost, disabled, onPurchase };
  }, [level, canBuy, cost, upgrade, resources, hasResourceCost, disabled, onPurchase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (increaseHoldTimeoutRef.current) {
        clearTimeout(increaseHoldTimeoutRef.current);
      }
      if (decreaseHoldTimeoutRef.current) {
        clearTimeout(decreaseHoldTimeoutRef.current);
      }
      if (increaseIntervalRef.current) {
        clearTimeout(increaseIntervalRef.current);
      }
      if (decreaseIntervalRef.current) {
        clearTimeout(decreaseIntervalRef.current);
      }
    };
  }, []);

  const handleDecrease = (e) => {
    if (e) e.stopPropagation();
    if (currentLevel > 0 && onPurchase) {
      // Decrease level (no cost, just set level lower)
      // Note: In a full implementation, you'd want to refund resources
      onPurchase(upgrade.id, currentLevel - 1, {}, upgrade.effect);
    }
  };
  
  const handleIncrease = (e) => {
    if (e) e.stopPropagation();
    if (canBuy) {
      onPurchase(upgrade.id, currentLevel + 1, cost, upgrade.effect);
    }
  };

  const handleMax = (e) => {
    if (e) e.stopPropagation();
    if (!canBuy || maxLevel === Infinity || currentLevel >= maxLevel) return;
    
    // Buy levels up to max
    for (let i = currentLevel; i < maxLevel; i++) {
      const levelCost = calculateUpgradeCost(upgrade, i);
      const resourceCheck = Object.keys(levelCost).length > 0 ? canAfford(resources, levelCost) : true;
      if (resourceCheck) {
        onPurchase(upgrade.id, i + 1, levelCost, upgrade.effect);
      } else {
        break; // Stop if can't afford next level
      }
    }
  };

  // Handle mouse down for increase button
  const handleIncreaseMouseDown = (e) => {
    e.stopPropagation();
    if (!canBuy) return;
    
    // Immediate single click
    handleIncrease(e);
    
    // Set up hold detection with delay
    holdStartTimeRef.current = Date.now();
    increaseHoldTimeoutRef.current = setTimeout(() => {
      // Hold threshold reached - start auto-incrementing
      setIsHoldingIncrease(true);
      setIsGlowingIncrease(true);
    }, 400); // 400ms hold threshold
  };

  // Handle mouse down for decrease button
  const handleDecreaseMouseDown = (e) => {
    e.stopPropagation();
    if (currentLevel === 0) return;
    
    // Immediate single click
    handleDecrease(e);
    
    // Set up hold detection with delay
    holdStartTimeRef.current = Date.now();
    decreaseHoldTimeoutRef.current = setTimeout(() => {
      // Hold threshold reached - start auto-decrementing
      setIsHoldingDecrease(true);
      setIsGlowingDecrease(true);
    }, 400); // 400ms hold threshold
  };

  // Handle mouse up/leave - stop holding
  const handleMouseUp = () => {
    // Clear hold timeouts
    if (increaseHoldTimeoutRef.current) {
      clearTimeout(increaseHoldTimeoutRef.current);
      increaseHoldTimeoutRef.current = null;
    }
    if (decreaseHoldTimeoutRef.current) {
      clearTimeout(decreaseHoldTimeoutRef.current);
      decreaseHoldTimeoutRef.current = null;
    }
    
    // Stop holding and remove glow
    setIsHoldingIncrease(false);
    setIsHoldingDecrease(false);
    setIsGlowingIncrease(false);
    setIsGlowingDecrease(false);
    holdStartTimeRef.current = 0;
  };

  // Effect for increase button hold with acceleration
  useEffect(() => {
    if (isHoldingIncrease) {
      let interval = 200; // Start slow: 200ms
      const startTime = Date.now();
      
      const tick = () => {
        const latest = latestValuesRef.current;
        const currentLvl = latest.level || 0;
        const currentCost = calculateUpgradeCost(latest.upgrade, currentLvl);
        const resourceCheck = latest.hasResourceCost ? canAfford(latest.resources, currentCost) : true;
        const maxLvl = latest.upgrade.maxLevel || Infinity;
        const canStillBuy = resourceCheck && currentLvl < maxLvl && !latest.disabled;
        
        if (canStillBuy && latest.onPurchase) {
          latest.onPurchase(latest.upgrade.id, currentLvl + 1, currentCost, latest.upgrade.effect);
          
          // Acceleration: speed up over time
          const holdDuration = Date.now() - startTime;
          if (holdDuration > 2000) {
            interval = 100; // Fast: 100ms after 2 seconds
          } else if (holdDuration > 1000) {
            interval = 150; // Medium: 150ms after 1 second
          }
          // else keep at 200ms (slow)
          
          // Schedule next tick with current interval
          increaseIntervalRef.current = setTimeout(tick, interval);
        } else {
          setIsHoldingIncrease(false);
          setIsGlowingIncrease(false);
        }
      };
      
      // Start first tick
      increaseIntervalRef.current = setTimeout(tick, interval);
    } else {
      if (increaseIntervalRef.current) {
        clearTimeout(increaseIntervalRef.current);
        increaseIntervalRef.current = null;
      }
    }

    return () => {
      if (increaseIntervalRef.current) {
        clearTimeout(increaseIntervalRef.current);
      }
    };
  }, [isHoldingIncrease]);

  // Effect for decrease button hold with acceleration
  useEffect(() => {
    if (isHoldingDecrease) {
      let interval = 200; // Start slow: 200ms
      const startTime = Date.now();
      
      const tick = () => {
        const latest = latestValuesRef.current;
        const currentLvl = latest.level || 0;
        if (currentLvl > 0 && latest.onPurchase) {
          latest.onPurchase(latest.upgrade.id, currentLvl - 1, {}, latest.upgrade.effect);
          
          // Acceleration: speed up over time
          const holdDuration = Date.now() - startTime;
          if (holdDuration > 2000) {
            interval = 100; // Fast: 100ms after 2 seconds
          } else if (holdDuration > 1000) {
            interval = 150; // Medium: 150ms after 1 second
          }
          // else keep at 200ms (slow)
          
          // Schedule next tick with current interval
          decreaseIntervalRef.current = setTimeout(tick, interval);
        } else {
          setIsHoldingDecrease(false);
          setIsGlowingDecrease(false);
        }
      };
      
      // Start first tick
      decreaseIntervalRef.current = setTimeout(tick, interval);
    } else {
      if (decreaseIntervalRef.current) {
        clearTimeout(decreaseIntervalRef.current);
        decreaseIntervalRef.current = null;
      }
    }

    return () => {
      if (decreaseIntervalRef.current) {
        clearTimeout(decreaseIntervalRef.current);
      }
    };
  }, [isHoldingDecrease]);
  
  const handleToggle = (e) => {
    if (e) {
      e.stopPropagation(); // Prevent card click
      e.preventDefault();
    }
    if (onToggle && currentLevel > 0) {
      onToggle(upgrade.id);
    }
  };
  
  const handleToggleClick = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    handleToggle(e);
  };
  
  // Check if this is the NSFW upgrade or Overclocking
  const isNsfwUpgrade = upgrade.id === 'nsfw-reddit-clickbait';
  const isOverclockingUpgrade = upgrade.id === 'overclocking';
  
  // Determine color based on category (could be passed as prop in future)
  const cardColor = 'neon-cyan';
  
  return (
    <div 
      className={`upgrade-card ${canBuy && !isNsfwUpgrade && !isOverclockingUpgrade ? 'upgrade-card-clickable' : 'upgrade-card-disabled'}`}
      data-color={cardColor}
      data-forbidden={upgrade.isForbidden ? 'true' : 'false'}
      onClick={canBuy && !isNsfwUpgrade && !isOverclockingUpgrade ? handleClick : undefined}
    >
      <div className="upgrade-card-content">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-base font-bold text-neon-cyan">{upgrade.name}</h3>
          {currentLevel > 0 && (
            <span className="text-xs px-2 py-1 rounded bg-neon-purple/20 text-neon-purple">
              {levelLabel} {currentLevel}
            </span>
          )}
        </div>
        <div className="mb-3">
          <p className={`text-xs mb-3 ${upgrade.isForbidden ? 'text-red-300/80' : 'text-gray-400'}`}>
            {upgrade.description}
          </p>
          {upgrade.effect?.tokenToSatsConversion && (
            <div className="text-xs text-neon-green font-mono mb-3">
              Convert {formatNumber(upgrade.effect.tokenToSatsConversion.tokens)} Token → {formatNumber(upgrade.effect.tokenToSatsConversion.satoshis)} SATS/sec
            </div>
          )}
          {/* Display production/gains */}
          {(() => {
            // Check if this is an addictivity upgrade
            const isAddictivityUpgrade = UPGRADES.addictivity?.some(u => u.id === upgrade.id);
            
            // Show Overclocking effects (percentage-based: each level = 10%)
            if (isOverclockingUpgrade) {
              const overclockPercentage = currentLevel * 10; // Each level = 10%
              
              // Get Energy Efficiency Research level to calculate improved ratios
              const energyEfficiencyLevel = resources.upgradeLevels?.['energy-efficiency'] || 0;
              const efficiencyBonus = energyEfficiencyLevel * 0.1; // 10% improvement per level
              
              // Base values: +20% SATS generation, +10% token consumption per 10% overclock
              const baseSatsBonusPer10Percent = 20; // 20% base
              const baseTokenPenaltyPer10Percent = 10; // 10% base
              
              // Improved ratios based on Energy Efficiency Research
              const satsBonusPer10Percent = baseSatsBonusPer10Percent * (1 + efficiencyBonus); // Increases SATS bonus
              const tokenPenaltyPer10Percent = baseTokenPenaltyPer10Percent * (1 - efficiencyBonus * 0.5); // Decreases token penalty (half effect)
              
              // Calculate current values based on overclock percentage
              const currentSatsBonus = (overclockPercentage / 10) * satsBonusPer10Percent;
              const currentTokenPenalty = (overclockPercentage / 10) * tokenPenaltyPer10Percent;
              
              return (
                <div className="text-xs text-neon-green font-mono mb-3">
                  {isToggled && currentLevel > 0 ? (
                    <>
                      <div>+{formatNumber(currentSatsBonus)}% Satoshis Generation ({overclockPercentage}% Overclock)</div>
                      <div className="text-red-400">+{formatNumber(currentTokenPenalty)}% Token Consumption</div>
                      {energyEfficiencyLevel > 0 && (
                        <div className="text-gray-400 text-xs mt-1">Efficiency: {energyEfficiencyLevel} ({formatNumber(satsBonusPer10Percent)}% / {formatNumber(tokenPenaltyPer10Percent)}% per 10%)</div>
                      )}
                    </>
                  ) : currentLevel > 0 ? (
                    <>
                      <div className="text-gray-500">+{formatNumber(currentSatsBonus)}% Satoshis Generation ({overclockPercentage}% Overclock, OFF)</div>
                      <div className="text-gray-500">+{formatNumber(currentTokenPenalty)}% Token Consumption (OFF)</div>
                      {energyEfficiencyLevel > 0 && (
                        <div className="text-gray-400 text-xs mt-1">Efficiency: {energyEfficiencyLevel} ({formatNumber(satsBonusPer10Percent)}% / {formatNumber(tokenPenaltyPer10Percent)}% per 10%)</div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>+{formatNumber(satsBonusPer10Percent)}% Satoshis Generation per 10% Overclock</div>
                      <div className="text-red-400">+{formatNumber(tokenPenaltyPer10Percent)}% Token Consumption per 10% Overclock</div>
                      <div className="text-gray-400 mt-1">Current: 0% Overclock</div>
                      {energyEfficiencyLevel > 0 && (
                        <div className="text-gray-400 text-xs mt-1">Energy Efficiency: {energyEfficiencyLevel} (Improved ratios)</div>
                      )}
                    </>
                  )}
                </div>
              );
            }
            
            // For addictivity upgrades, exclude tokensPerSec from gains (shown as cost instead)
            const hasGains = isAddictivityUpgrade
              ? (upgrade.effect?.satoshisPerSec || upgrade.effect?.addictivityPerSec)
              : (upgrade.effect?.tokensPerSec || upgrade.effect?.tokensPerClick || upgrade.effect?.satoshisPerSec || upgrade.effect?.addictivityPerSec || upgrade.effect?.electricity || upgrade.effect?.processingPower);
            
            return hasGains ? (
              <div className="text-xs text-neon-green font-mono mb-3">
                {!isAddictivityUpgrade && upgrade.effect.tokensPerSec && (() => {
                  // Special case: Overseas Clickfarm uses Optimize AI level as multiplier
                  if (upgrade.id === 'indian-clickfarm') {
                    const optimizeAILevel = resources.upgradeLevels?.['basic-algorithm'] || 0;
                    // Apply stage/version multipliers to match actual generation
                    const stageMultiplier = STAGES[resources.stage || 0]?.multiplier || 1;
                    const [major, minor] = (resources.version || '0.1.0').split('.').map(Number);
                    const versionMultiplier = Math.pow(VERSION_MULTIPLIERS.major, major) * 
                                             Math.pow(VERSION_MULTIPLIERS.minor, minor);
                    const totalMultiplier = stageMultiplier * versionMultiplier;
                    // Per-level value with multipliers applied
                    const perLevelValue = upgrade.effect.tokensPerSec * optimizeAILevel * totalMultiplier;
                    const currentGeneration = perLevelValue * currentLevel;
                    return (
                      <div>
                        +{formatNumber(perLevelValue)} Tokens/sec (Lv {optimizeAILevel})
                        {currentLevel > 0 && <div className="text-gray-400">Currently: +{formatNumber(currentGeneration)} Tokens/sec</div>}
                      </div>
                    );
                  }
                  // Regular token upgrades also get multipliers
                  const stageMultiplier = STAGES[resources.stage || 0]?.multiplier || 1;
                  const [major, minor] = (resources.version || '0.1.0').split('.').map(Number);
                  const versionMultiplier = Math.pow(VERSION_MULTIPLIERS.major, major) * 
                                           Math.pow(VERSION_MULTIPLIERS.minor, minor);
                  const totalMultiplier = stageMultiplier * versionMultiplier;
                  const multipliedValue = upgrade.effect.tokensPerSec * totalMultiplier;
                  return <div>+{formatNumber(multipliedValue)} Tokens/sec</div>;
                })()}
                {upgrade.effect.tokensPerClick && (() => {
                  // Special case: Optimize AI shows per-level increase and current total
                  if (upgrade.id === 'basic-algorithm') {
                    // Apply stage/version multipliers to match actual click power calculation
                    const stageMultiplier = STAGES[resources.stage || 0]?.multiplier || 1;
                    const [major, minor] = (resources.version || '0.1.0').split('.').map(Number);
                    const versionMultiplier = Math.pow(VERSION_MULTIPLIERS.major, major) * 
                                             Math.pow(VERSION_MULTIPLIERS.minor, minor);
                    const totalMultiplier = stageMultiplier * versionMultiplier;
                    // Per-level value with multipliers applied
                    const perLevelValue = upgrade.effect.tokensPerClick * totalMultiplier;
                    const currentTotal = perLevelValue * currentLevel;
                    return (
                      <div>
                        +{formatNumber(perLevelValue)} Tokens/click
                        {currentLevel > 0 && <div className="text-gray-400">Currently: +{formatNumber(currentTotal)} Tokens/click</div>}
                      </div>
                    );
                  }
                  // For other upgrades with tokensPerClick, show base value
                  return <div>+{formatNumber(upgrade.effect.tokensPerClick)} Tokens/click</div>;
                })()}
                {upgrade.effect.processingPower && (
                  <div>+{formatNumber(upgrade.effect.processingPower)} FLOPS</div>
                )}
                {upgrade.effect.electricity && (
                  <div>+{formatElectricity(upgrade.effect.electricity)}</div>
                )}
                {upgrade.effect.satoshisPerSec && (() => {
                  // For addictivity upgrades, show post-multiplier SATS/sec per level
                  if (isAddictivityUpgrade) {
                    const stageMultiplier = STAGES[resources.stage || 0]?.multiplier || 1;
                    const [major, minor] = (resources.version || '0.1.0').split('.').map(Number);
                    const versionMultiplier = Math.pow(VERSION_MULTIPLIERS.major, major) * 
                                             Math.pow(VERSION_MULTIPLIERS.minor, minor);
                    const totalMultiplier = stageMultiplier * versionMultiplier;
                    
                    // Get overclock multiplier for SATS generation
                    const overclockLevel = resources.upgradeLevels?.['overclocking'] || 0;
                    const isOverclockToggled = resources.toggledUpgrades?.['overclocking'] !== false;
                    const overclockPercentage = overclockLevel * 10;
                    
                    // Calculate overclock multiplier (same logic as calculations.js)
                    const energyEfficiencyLevel = resources.upgradeLevels?.['energy-efficiency'] || 0;
                    const efficiencyBonus = energyEfficiencyLevel * 0.1;
                    const baseSatsBonusPer10Percent = 0.20;
                    const satsBonusPer10Percent = baseSatsBonusPer10Percent * (1 + efficiencyBonus);
                    
                    const overclockAddictivityMultiplier = isOverclockToggled && overclockLevel > 0
                      ? 1 + (overclockPercentage / 10 * satsBonusPer10Percent)
                      : 1;
                    
                    // Show value per level with overclock multiplier applied
                    const basePerLevel = upgrade.effect.satoshisPerSec * totalMultiplier;
                    const perLevelWithOverclock = basePerLevel * overclockAddictivityMultiplier;
                    const currentSatsPerSec = perLevelWithOverclock * currentLevel;
                    
                    return (
                      <div>
                        {overclockLevel > 0 && isOverclockToggled ? (
                          <>
                            <div>+{formatBitcoin(perLevelWithOverclock)}/sec <span className="text-neon-green">({formatNumber((overclockAddictivityMultiplier - 1) * 100)}% overclock)</span></div>
                            {currentLevel > 0 && (
                              <div className="text-gray-400">Currently: +{formatBitcoin(currentSatsPerSec)}/sec</div>
                            )}
                          </>
                        ) : (
                          <>
                            <div>+{formatBitcoin(basePerLevel)}/sec</div>
                            {currentLevel > 0 && (
                              <div className="text-gray-400">Currently: +{formatBitcoin(basePerLevel * currentLevel)}/sec</div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  }
                  // For other upgrades, show base value
                  return <div>+{formatBitcoin(upgrade.effect.satoshisPerSec)}/sec</div>;
                })()}
                {upgrade.effect.addictivityPerSec && (
                  <div>+{formatNumber(upgrade.effect.addictivityPerSec)} Addictivity/sec</div>
                )}
              </div>
            ) : null;
          })()}
          {/* Display token cost for addictivity upgrades (with overclock multiplier) */}
          {(() => {
            const isAddictivityUpgrade = UPGRADES.addictivity?.some(u => u.id === upgrade.id);
            if (isAddictivityUpgrade && upgrade.effect?.tokensPerSec) {
              // Get overclock multiplier for token consumption
              const overclockLevel = resources.upgradeLevels?.['overclocking'] || 0;
              const isOverclockToggled = resources.toggledUpgrades?.['overclocking'] !== false;
              const overclockPercentage = overclockLevel * 10;
              
              // Calculate overclock multiplier (same logic as calculations.js)
              const energyEfficiencyLevel = resources.upgradeLevels?.['energy-efficiency'] || 0;
              const efficiencyBonus = energyEfficiencyLevel * 0.1;
              const baseTokenPenaltyPer10Percent = 0.10;
              const tokenPenaltyPer10Percent = Math.max(0.001, baseTokenPenaltyPer10Percent * (1 - efficiencyBonus * 0.5));
              
              const overclockTokenConsumptionMultiplier = isOverclockToggled && overclockLevel > 0
                ? 1 + (overclockPercentage / 10 * tokenPenaltyPer10Percent)
                : 1;
              
              // Show per-level value and current total with overclock multiplier
              const perLevelCost = upgrade.effect.tokensPerSec;
              const currentCost = perLevelCost * currentLevel * overclockTokenConsumptionMultiplier;
              
              return (
                <div className="text-xs text-red-400 font-mono mb-3">
                  <div>-{formatNumber(perLevelCost)} Tokens/sec</div>
                  {currentLevel > 0 && (
                    <div className="text-gray-400">
                      Currently: -{formatNumber(currentCost)} Tokens/sec
                      {overclockLevel > 0 && isOverclockToggled && (
                        <span className="text-red-300"> ({formatNumber((overclockTokenConsumptionMultiplier - 1) * 100)}% from overclock)</span>
                      )}
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })()}
        </div>
        
        {/* Cost Section - Individual Cost Cards */}
        {(Object.keys(cost).length > 0 || upgrade.requiresProcessingPower || upgrade.costsGptMini || upgrade.costsGptPro || upgrade.costsNeuralNetworks) && (
          <div className="mb-3">
            {/* Cost Section Header */}
            <div className="mb-2">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Cost</span>
            </div>
            
            {/* Individual Cost Cards Container */}
            <div className="flex flex-row flex-wrap gap-2">
              {/* Resource costs - each in its own card */}
              {Object.keys(cost).length > 0 && (
                Object.entries(cost).map(([resource, amount]) => {
                  // Resource-specific styling
                  const resourceStyles = {
                    tokens: {
                      icon: '🪙',
                      bg: 'bg-cyan-900/30',
                      border: 'border-cyan-500/40',
                      text: 'text-cyan-300',
                      iconBg: 'bg-cyan-500/20',
                      accent: 'rgba(6, 182, 212, 0.3)',
                    },
                    satoshis: {
                      icon: '₿',
                      bg: 'bg-green-900/30',
                      border: 'border-green-500/40',
                      text: 'text-green-300',
                      iconBg: 'bg-green-500/20',
                      accent: 'rgba(34, 197, 94, 0.3)',
                    },
                    electricity: {
                      icon: '⚡',
                      bg: 'bg-yellow-900/30',
                      border: 'border-yellow-500/40',
                      text: 'text-yellow-300',
                      iconBg: 'bg-yellow-500/20',
                      accent: 'rgba(234, 179, 8, 0.3)',
                    },
                    storage: {
                      icon: '💾',
                      bg: 'bg-blue-900/30',
                      border: 'border-blue-500/40',
                      text: 'text-blue-300',
                      iconBg: 'bg-blue-500/20',
                      accent: 'rgba(59, 130, 246, 0.3)',
                    },
                    processingPower: {
                      icon: '💻',
                      bg: 'bg-purple-900/30',
                      border: 'border-purple-500/40',
                      text: 'text-purple-300',
                      iconBg: 'bg-purple-500/20',
                      accent: 'rgba(168, 85, 247, 0.3)',
                    },
                    addictivity: {
                      icon: '🧠',
                      bg: 'bg-pink-900/30',
                      border: 'border-pink-500/40',
                      text: 'text-pink-300',
                      iconBg: 'bg-pink-500/20',
                      accent: 'rgba(236, 72, 153, 0.3)',
                    },
                  };
                  
                  const style = resourceStyles[resource] || {
                    icon: '',
                    bg: 'bg-gray-700/30',
                    border: 'border-gray-500/40',
                    text: 'text-gray-300',
                    iconBg: 'bg-gray-500/20',
                    accent: 'rgba(107, 114, 128, 0.3)',
                  };
                  
                  const canAffordResource = (resources[resource] || 0) >= amount;
                  const textColor = canAffordResource ? style.text : 'text-red-400';
                  
                  return (
                    <div
                      key={resource}
                      className="internal-cost-card flex-shrink-0"
                      style={{
                        borderColor: style.border.includes('cyan') ? 'rgba(6, 182, 212, 0.4)' :
                                    style.border.includes('green') ? 'rgba(34, 197, 94, 0.4)' :
                                    style.border.includes('yellow') ? 'rgba(234, 179, 8, 0.4)' :
                                    style.border.includes('blue') ? 'rgba(59, 130, 246, 0.4)' :
                                    style.border.includes('purple') ? 'rgba(168, 85, 247, 0.4)' :
                                    style.border.includes('pink') ? 'rgba(236, 72, 153, 0.4)' :
                                    'rgba(107, 114, 128, 0.2)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {/* Icon with background */}
                        <div className={`
                          ${style.iconBg}
                          rounded
                          w-6
                          h-6
                          flex
                          items-center
                          justify-center
                          text-sm
                          flex-shrink-0
                        `}>
                          <span>{style.icon}</span>
                        </div>
                        
                        {/* Value */}
                        <span className={`text-xs font-semibold ${textColor} font-mono whitespace-nowrap`}>
                          {resource === 'satoshis' ? formatBitcoin(amount) : 
                           resource === 'electricity' ? formatElectricity(amount) :
                           resource === 'storage' ? formatStorage(amount) :
                           formatNumber(amount)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              
              {/* Requirements - each in its own card */}
              {upgrade.requiresProcessingPower && (
                <div 
                  className="internal-cost-card flex-shrink-0"
                  style={{ borderColor: 'rgba(168, 85, 247, 0.4)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="bg-purple-500/20 rounded w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">
                      <span>💻</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="text-[9px] text-gray-400 leading-tight">Requires</div>
                      <span className={`text-xs font-semibold font-mono leading-tight whitespace-nowrap ${
                        (resources.processingPower || 0) >= upgrade.requiresProcessingPower ? 'text-purple-300' : 'text-red-400'
                      }`}>
                        {upgrade.requiresProcessingPower} FLOPS
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {upgrade.costsGptMini && (
                <div 
                  className="internal-cost-card flex-shrink-0"
                  style={{ borderColor: 'rgba(234, 179, 8, 0.4)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="bg-yellow-500/20 rounded w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">
                      <span>🤖</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="text-[9px] text-gray-400 leading-tight">Costs</div>
                      <span className={`text-xs font-semibold font-mono leading-tight whitespace-nowrap ${
                        (resources.upgradeLevels || {})['gpt-mini'] >= upgrade.costsGptMini ? 'text-yellow-300' : 'text-red-400'
                      }`}>
                        {upgrade.costsGptMini} GPT Mini
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {upgrade.costsGptPro && (
                <div 
                  className="internal-cost-card flex-shrink-0"
                  style={{ borderColor: 'rgba(234, 179, 8, 0.4)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="bg-yellow-500/20 rounded w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">
                      <span>🤖</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="text-[9px] text-gray-400 leading-tight">Costs</div>
                      <span className={`text-xs font-semibold font-mono leading-tight whitespace-nowrap ${
                        (resources.upgradeLevels || {})['gpt-pro'] >= upgrade.costsGptPro ? 'text-yellow-300' : 'text-red-400'
                      }`}>
                        {upgrade.costsGptPro} GPT Pro
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {upgrade.costsNeuralNetworks && (
                <div 
                  className="internal-cost-card flex-shrink-0"
                  style={{ borderColor: 'rgba(234, 179, 8, 0.4)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="bg-yellow-500/20 rounded w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">
                      <span>🤖</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="text-[9px] text-gray-400 leading-tight">Costs</div>
                      <span className={`text-xs font-semibold font-mono leading-tight whitespace-nowrap ${
                        (resources.upgradeLevels || {})['neural-networks'] >= upgrade.costsNeuralNetworks ? 'text-yellow-300' : 'text-red-400'
                      }`}>
                        {upgrade.costsNeuralNetworks} Neural Networks
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* NSFW Upgrade or Overclocking: Quantity Controls + Max Button + Toggle */}
        {(isNsfwUpgrade || isOverclockingUpgrade) ? (
          <div className="flex items-center gap-2 w-full" style={{ flexWrap: 'nowrap' }}>
            <button
              onClick={handleDecrease}
              onMouseDown={handleDecreaseMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              disabled={currentLevel === 0}
              className={`cyberpunk-button-small cyberpunk-button-decrease ${isGlowingDecrease ? 'cyberpunk-button-holding' : ''}`}
              style={{ flexShrink: 0 }}
              title={`Decrease ${levelLabelFull.toLowerCase()} (hold to repeat)`}
            >
              <span className="terminal-text">-</span>
              {isGlowingDecrease && (
                <div className="cyberpunk-button-glow cyberpunk-button-glow-decrease"></div>
              )}
            </button>
            <div className="text-center px-3 py-2 rounded bg-gray-800/50 border border-neon-cyan/30 min-w-[60px]" style={{ flexShrink: 0 }}>
              {isOverclockingUpgrade ? (
                <span className="text-neon-cyan font-mono font-bold terminal-text">{currentLevel * 10}%</span>
              ) : (
                <span className="text-neon-cyan font-mono font-bold terminal-text">{currentLevel}</span>
              )}
            </div>
            <button
              onClick={handleIncrease}
              onMouseDown={handleIncreaseMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              disabled={!canBuy}
              className={`cyberpunk-button-small cyberpunk-button-increase ${isGlowingIncrease ? 'cyberpunk-button-holding' : ''}`}
              style={{ flexShrink: 0 }}
              title={`Increase ${levelLabelFull.toLowerCase()} (hold to repeat)`}
            >
              <span className="terminal-text">+</span>
              {isGlowingIncrease && (
                <div className="cyberpunk-button-glow cyberpunk-button-glow-increase"></div>
              )}
            </button>
            {!isOverclockingUpgrade && (
              <button
                onClick={handleMax}
                disabled={!canBuy || currentLevel >= maxLevel}
                className="cyberpunk-button-small cyberpunk-button-max"
                style={{ flexShrink: 0 }}
                title={`Buy up to ${levelLabelFull.toLowerCase()} ${maxLevel === Infinity ? 'max' : maxLevel}`}
              >
                <span className="terminal-text">MAX</span>
              </button>
            )}
            
            {/* Toggle Switch - Show if level > 0 and onToggle exists */}
            {currentLevel > 0 && onToggle ? (
              <div 
                className="cyberpunk-toggle-container" 
                style={{ flexShrink: 0, marginLeft: 'auto' }}
                onClick={handleToggleClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggleClick(e);
                  }
                }}
              >
                <div className={`cyberpunk-toggle-label ${isToggled ? 'cyberpunk-toggle-on' : 'cyberpunk-toggle-off'}`}>
                  <span className="cyberpunk-toggle-slider"></span>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          /* Regular Upgrade: Cyberpunk Buy Button + Toggle (if toggleable) */
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClick(e);
              }}
              disabled={!canBuy}
              className={`cyberpunk-buy-button flex-1 ${canBuy ? 'cyberpunk-buy-button-active' : 'cyberpunk-buy-button-disabled'}`}
            >
              <div className="cyberpunk-buy-button-content">
                <span className="terminal-text">[PURCHASE]</span>
                {currentLevel > 0 && (
                  <span className="cyberpunk-buy-button-level">{levelLabel} {currentLevel + 1}</span>
                )}
              </div>
              {canBuy && (
                <>
                  <div className="cyberpunk-buy-button-scanlines"></div>
                  <div className="cyberpunk-buy-button-glitch"></div>
                </>
              )}
            </button>
            
            {/* Toggle Switch - Show if toggleable, level > 0, and onToggle exists */}
            {upgrade.isToggleable && currentLevel > 0 && onToggle ? (
              <div 
                className="cyberpunk-toggle-container" 
                style={{ flexShrink: 0 }}
                onClick={handleToggleClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggleClick(e);
                  }
                }}
              >
                <div className={`cyberpunk-toggle-label ${isToggled ? 'cyberpunk-toggle-on' : 'cyberpunk-toggle-off'}`}>
                  <span className="cyberpunk-toggle-slider"></span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
      
      {/* Particle Effects - One per purchase click */}
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
