import { useEffect, useRef } from 'react';
import { calculateGeneration, calculateClickPower, calculateElectricityConsumption, calculateProcessingPowerConsumption, calculateNSFWDrain } from '../utils/calculations.js';
import { STAGE_REQUIREMENTS, UPGRADES } from '../utils/constants.js';

const TICK_INTERVAL = 1000 / 60; // 60 FPS

export function useGameLoop(gameState, gameActions) {
  const lastTickRef = useRef(Date.now());
  const accumulatedTimeRef = useRef(0);
  const gameActionsRef = useRef(gameActions);
  const gameStateRef = useRef(gameState.state);
  
  // Keep refs up to date
  useEffect(() => {
    gameActionsRef.current = gameActions;
    gameStateRef.current = gameState.state;
  }, [gameActions, gameState.state]);
  
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const deltaTime = now - lastTickRef.current;
      lastTickRef.current = now;
      
      // Accumulate time for smooth updates
      accumulatedTimeRef.current += deltaTime;
      
      // Update every ~100ms for smoother updates
      // Process in fixed chunks to maintain accuracy
      const PROCESS_INTERVAL = 100; // ms
      while (accumulatedTimeRef.current >= PROCESS_INTERVAL) {
        const seconds = PROCESS_INTERVAL / 1000; // Always 0.1 seconds for consistency
        accumulatedTimeRef.current -= PROCESS_INTERVAL;
        
        // Get current state from ref (always latest)
        const currentState = gameStateRef.current;
        
        // Calculate generation rates
        const generation = calculateGeneration(
          currentState.upgradeLevels,
          currentState.stage,
          currentState.version,
          currentState.toggledUpgrades || {}
        );
        
        // Calculate consumption
        const electricityConsumption = calculateElectricityConsumption(
          currentState.upgradeLevels
        );
        const processingPowerConsumption = calculateProcessingPowerConsumption(
          currentState.upgradeLevels
        );
        
        // Apply active event multipliers
        let productionMultiplier = 1;
        let addictivityMultiplier = 1;
        
        for (const eventData of Object.values(currentState.activeEvents)) {
          if (eventData.effect.productionMultiplier) {
            productionMultiplier *= eventData.effect.productionMultiplier;
          }
          if (eventData.effect.addictivityMultiplier) {
            addictivityMultiplier *= eventData.effect.addictivityMultiplier;
          }
          
          // Check if event expired
          if (now >= eventData.endTime) {
            gameActionsRef.current.removeActiveEvent(eventData.id);
          }
        }
        
        // Apply multipliers
        generation.tokens *= productionMultiplier;
        generation.processingPower *= productionMultiplier;
        generation.electricity *= productionMultiplier;
        generation.addictivity *= addictivityMultiplier;
        
        // Calculate excess values (generation - consumption)
        // Processing Power and Electricity show excess only, not accumulated
        const excessProcessingPower = Math.max(0, generation.processingPower - processingPowerConsumption);
        const excessElectricity = Math.max(0, generation.electricity - electricityConsumption);
        
        // Calculate token to SATS conversion drain BEFORE updating resources
        const toggledUpgrades = currentState.toggledUpgrades || {};
        const currentTokens = currentState.tokens || 0;
        const tokensGenerated = generation.tokens * seconds;
        const tokensAfterGeneration = currentTokens + tokensGenerated;
        
        // Calculate total token drain per second from all active NSFW generators (with multipliers)
        const nsfwDrain = calculateNSFWDrain(
          currentState.upgradeLevels,
          currentState.stage,
          currentState.version,
          toggledUpgrades
        );
        const totalTokenDrainPerSec = nsfwDrain.tokenDrainPerSec;
        const totalSatsPerSec = nsfwDrain.satsPerSec;
        
        // Calculate drain for this tick
        const tokenDrainThisTick = totalTokenDrainPerSec * seconds;
        const tokensAfterDrain = tokensAfterGeneration - tokenDrainThisTick;
        
        // If tokens would go to 0 or below, disable all NSFW generators
        if (tokensAfterDrain <= 0 && totalTokenDrainPerSec > 0) {
          // Turn off all NSFW generators
          const newToggledUpgrades = { ...toggledUpgrades };
          for (const upgrade of UPGRADES.addictivity || []) {
            if (upgrade.effect?.tokenToSatsConversion) {
              newToggledUpgrades[upgrade.id] = false;
            }
          }
          // Set tokensHitZero flag to trigger pulsing effect
          gameActionsRef.current.updateResources({ 
            toggledUpgrades: newToggledUpgrades,
            tokensHitZero: true,
          });
          
          // Clear the flag after 5 seconds
          setTimeout(() => {
            gameActionsRef.current.updateResources({ tokensHitZero: false });
          }, 5000);
          
          // Only drain what we have (don't go negative)
          if (tokensAfterGeneration > 0) {
            const actualDrain = tokensAfterGeneration;
            const actualSatsProduced = (actualDrain / tokenDrainThisTick) * (totalSatsPerSec * seconds);
            gameActionsRef.current.addResources({
              tokens: tokensGenerated - actualDrain,
              addictivity: generation.addictivity * seconds,
              satoshis: generation.satoshis * seconds + actualSatsProduced,
              totalTokensGenerated: generation.tokens * seconds,
            });
          } else {
            // No tokens to drain
            gameActionsRef.current.addResources({
              tokens: tokensGenerated,
              addictivity: generation.addictivity * seconds,
              satoshis: generation.satoshis * seconds,
              totalTokensGenerated: generation.tokens * seconds,
            });
          }
        } else {
          // Update resources normally, then apply conversion
          // Combine all updates into a single call to avoid batching issues
          const tokenChange = tokensGenerated - (totalTokenDrainPerSec > 0 ? tokenDrainThisTick : 0);
          const satsChange = generation.satoshis * seconds + (totalTokenDrainPerSec > 0 ? totalSatsPerSec * seconds : 0);
          
          gameActionsRef.current.addResources({
            tokens: tokenChange,
            addictivity: generation.addictivity * seconds,
            satoshis: satsChange,
            totalTokensGenerated: generation.tokens * seconds,
          });
        }
        
        // Set Processing Power and Electricity to excess values (not accumulated)
        gameActionsRef.current.updateResources({
          processingPower: excessProcessingPower,
          electricity: excessElectricity,
        });
        
        // Check stage progression (use functional update to get latest state)
        if (currentState.stage < 15) {
          const requirements = STAGE_REQUIREMENTS[currentState.stage + 1];
          let canAdvance = true;
          
          // Check against current state
          for (const [resource, required] of Object.entries(requirements)) {
            if ((gameStateRef.current[resource] || 0) < required) {
              canAdvance = false;
              break;
            }
          }
          
          if (canAdvance) {
            gameActionsRef.current.advanceStage();
          }
        }
        
      }
      
      // Update play time once per frame (not per processed interval)
      const currentState = gameStateRef.current;
      const playTime = (now - currentState.startTime) / 1000;
      gameActionsRef.current.updatePlayTime(playTime);
      
      requestAnimationFrame(tick);
    };
    
    const animationId = requestAnimationFrame(tick);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []); // Empty dependency array - effect only runs once
}
