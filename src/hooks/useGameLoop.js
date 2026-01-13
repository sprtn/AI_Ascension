import { useEffect, useRef } from 'react';
import { calculateGeneration, calculateClickPower, calculateElectricityConsumption, calculateProcessingPowerConsumption, calculateNSFWDrain } from '../utils/calculations.js';
import { STAGE_REQUIREMENTS, UPGRADES, STAGES, VERSION_MULTIPLIERS } from '../utils/constants.js';

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
          currentState.upgradeLevels,
          currentState.toggledUpgrades || {}
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
        // generation.tokens already has stage/version multipliers applied from calculateGeneration
        // We just need to apply event multipliers (productionMultiplier) to the net value
        // generation.tokenGeneration and generation.tokenConsumption are base values (pre-multiplier)
        // So we need to apply both totalMultiplier (from calculateGeneration) and productionMultiplier
        
        // Get stage/version multipliers to apply them consistently
        const stageMultiplier = STAGES[currentState.stage || 0]?.multiplier || 1;
        const [major, minor] = (currentState.version || '0.1.0').split('.').map(Number);
        const versionMultiplier = Math.pow(VERSION_MULTIPLIERS.major, major) * 
                                 Math.pow(VERSION_MULTIPLIERS.minor, minor);
        const totalMultiplier = stageMultiplier * versionMultiplier;
        
        // Apply all multipliers to base generation and consumption
        // Validate values to prevent NaN/Infinity
        const baseTokenGeneration = generation.tokenGeneration ?? 0;
        const baseTokenConsumption = generation.tokenConsumption ?? 0;
        
        // Ensure multipliers are valid numbers
        const safeTotalMultiplier = isNaN(totalMultiplier) || !isFinite(totalMultiplier) ? 1 : totalMultiplier;
        const safeProductionMultiplier = isNaN(productionMultiplier) || !isFinite(productionMultiplier) ? 1 : productionMultiplier;
        const safeAddictivityMultiplier = isNaN(addictivityMultiplier) || !isFinite(addictivityMultiplier) ? 1 : addictivityMultiplier;
        
        // Token generation gets multipliers, but token consumption from addictivity upgrades is FLAT (not multiplied)
        const tokenGenerationWithMultipliers = baseTokenGeneration * safeTotalMultiplier * safeProductionMultiplier;
        const tokenConsumptionFlat = baseTokenConsumption; // Flat - no multipliers applied
        
        // Validate final result
        generation.tokens = isNaN(tokenGenerationWithMultipliers - tokenConsumptionFlat) 
          ? 0 
          : tokenGenerationWithMultipliers - tokenConsumptionFlat;
        
        // Validate and apply multipliers to other resources
        
        generation.processingPower = (generation.processingPower || 0) * safeProductionMultiplier;
        generation.electricity = (generation.electricity || 0) * safeProductionMultiplier;
        generation.addictivity = (generation.addictivity || 0) * safeAddictivityMultiplier;
        
        // Validate all generation values
        generation.tokens = isNaN(generation.tokens) || !isFinite(generation.tokens) ? 0 : generation.tokens;
        generation.processingPower = isNaN(generation.processingPower) || !isFinite(generation.processingPower) ? 0 : generation.processingPower;
        generation.electricity = isNaN(generation.electricity) || !isFinite(generation.electricity) ? 0 : generation.electricity;
        generation.addictivity = isNaN(generation.addictivity) || !isFinite(generation.addictivity) ? 0 : generation.addictivity;
        generation.satoshis = isNaN(generation.satoshis) || !isFinite(generation.satoshis) ? 0 : generation.satoshis;
        
        // Debug logging (remove after fixing)
        if (isNaN(generation.tokens) || !isFinite(generation.tokens) || 
            isNaN(generation.tokenGeneration) || !isFinite(generation.tokenGeneration) ||
            isNaN(generation.tokenConsumption) || !isFinite(generation.tokenConsumption)) {
          console.error('Invalid generation values detected:', {
            tokens: generation.tokens,
            tokenGeneration: generation.tokenGeneration,
            tokenConsumption: generation.tokenConsumption,
            totalMultiplier,
            productionMultiplier,
            stage: currentState.stage,
            version: currentState.version
          });
        }
        
        // Calculate excess values (generation - consumption)
        // Processing Power and Electricity show excess only, not accumulated
        const excessProcessingPower = Math.max(0, generation.processingPower - processingPowerConsumption);
        const excessElectricity = Math.max(0, generation.electricity - electricityConsumption);
        
        // Calculate token to SATS conversion drain BEFORE updating resources
        const toggledUpgrades = currentState.toggledUpgrades || {};
        const currentTokens = currentState.tokens || 0;
        
        // Validate generation.tokens before using it
        const safeTokensPerSec = isNaN(generation.tokens) || !isFinite(generation.tokens) ? 0 : generation.tokens;
        const tokensGenerated = safeTokensPerSec * seconds;
        const tokensAfterGeneration = currentTokens + tokensGenerated;
        
        // Calculate total token drain per second from all active NSFW generators
        const nsfwDrain = calculateNSFWDrain(
          currentState.upgradeLevels,
          currentState.stage,
          currentState.version,
          toggledUpgrades
        );
        
        // Validate NSFW drain values
        const safeNsfwTokenDrain = isNaN(nsfwDrain.tokenDrainPerSec) || !isFinite(nsfwDrain.tokenDrainPerSec) ? 0 : nsfwDrain.tokenDrainPerSec;
        const safeNsfwSatsPerSec = isNaN(nsfwDrain.satsPerSec) || !isFinite(nsfwDrain.satsPerSec) ? 0 : nsfwDrain.satsPerSec;
        
        // Apply multipliers to NSFW drain (all values should reflect post-multiplier values)
        const totalTokenDrainPerSec = safeNsfwTokenDrain * safeProductionMultiplier;
        const totalSatsPerSec = safeNsfwSatsPerSec * safeProductionMultiplier;
        
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
          // Validate all values before adding
          const safeSatoshisPerSec = isNaN(generation.satoshis) || !isFinite(generation.satoshis) ? 0 : generation.satoshis;
          const safeAddictivityPerSec = isNaN(generation.addictivity) || !isFinite(generation.addictivity) ? 0 : generation.addictivity;
          
          const tokenChange = tokensGenerated - (totalTokenDrainPerSec > 0 ? tokenDrainThisTick : 0);
          const satsChange = safeSatoshisPerSec * seconds + (totalTokenDrainPerSec > 0 ? totalSatsPerSec * seconds : 0);
          
          // Final validation before adding resources
          const safeTokenChange = isNaN(tokenChange) || !isFinite(tokenChange) ? 0 : tokenChange;
          const safeSatsChange = isNaN(satsChange) || !isFinite(satsChange) ? 0 : satsChange;
          const safeAddictivityChange = safeAddictivityPerSec * seconds;
          const safeTotalTokensGenerated = safeTokensPerSec * seconds;
          
          gameActionsRef.current.addResources({
            tokens: safeTokenChange,
            addictivity: safeAddictivityChange,
            satoshis: safeSatsChange,
            totalTokensGenerated: safeTotalTokensGenerated,
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
    
    // Debug: Log that game loop started
    console.log('Game loop started');
    
    return () => {
      cancelAnimationFrame(animationId);
      console.log('Game loop stopped');
    };
  }, []); // Empty dependency array - effect only runs once
}
