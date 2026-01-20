import { UPGRADES, STAGES, VERSION_MULTIPLIERS } from './constants.js';

/**
 * Calculate NSFW token drain rate per second (with multipliers)
 * @param {Object} upgradeLevels - Map of upgrade IDs to levels
 * @param {number} stage - Current stage
 * @param {string} version - Current version string
 * @param {Object} toggledUpgrades - Map of upgrade IDs to their toggle state
 * @returns {Object} { tokenDrainPerSec, satsPerSec } - Drain rates per second
 */
export function calculateNSFWDrain(upgradeLevels, stage, version, toggledUpgrades = {}) {
  let totalTokenDrainPerSec = 0;
  let totalSatsPerSec = 0;
  
  // NSFW conversion is a fixed 1:1 conversion rate - NOT affected by multipliers
  // It converts tokens to SATS, so multipliers should not apply
  
  for (const upgrade of UPGRADES.addictivity || []) {
    if (upgrade.effect?.tokenToSatsConversion) {
      const level = upgradeLevels[upgrade.id] || 0;
      const isToggled = toggledUpgrades[upgrade.id] !== false; // Default to true
      if (isToggled && level > 0) {
        const conversion = upgrade.effect.tokenToSatsConversion;
        // Fixed conversion rate - no multipliers applied
        totalTokenDrainPerSec += conversion.tokens * level;
        totalSatsPerSec += conversion.satoshis * level;
      }
    }
  }
  
  return { tokenDrainPerSec: totalTokenDrainPerSec, satsPerSec: totalSatsPerSec };
}

/**
 * Calculate the cost of an upgrade at a given level
 * @param {Object} upgrade - Upgrade definition
 * @param {number} level - Current level of the upgrade
 * @returns {Object} Cost object with resource requirements
 */
export function calculateUpgradeCost(upgrade, level) {
  const cost = {};
  const multiplier = Math.pow(upgrade.costMultiplier, level);
  
  for (const [resource, baseAmount] of Object.entries(upgrade.baseCost)) {
    cost[resource] = Math.floor(baseAmount * multiplier);
  }
  
  return cost;
}

/**
 * Check if player can afford an upgrade
 * @param {Object} resources - Current resources
 * @param {Object} cost - Required cost
 * @returns {boolean} True if affordable
 */
export function canAfford(resources, cost) {
  for (const [resource, amount] of Object.entries(cost)) {
    if ((resources[resource] || 0) < amount) {
      return false;
    }
  }
  return true;
}

/**
 * Calculate resource generation per second based on upgrades
 * @param {Object} upgradeLevels - Map of upgrade IDs to levels
 * @param {number} stage - Current stage
 * @param {string} version - Current version string
 * @param {Object} toggledUpgrades - Map of upgrade IDs to their toggle state (true/false)
 * @returns {Object} Generation rates per resource
 */
export function calculateGeneration(upgradeLevels, stage, version, toggledUpgrades = {}) {
  const generation = {
    tokens: 0,
    storage: 0,
    addictivity: 0,
    satoshis: 0,
  };
  
  // Separate token generation and consumption for proper multiplier application
  let tokenGeneration = 0;
  let tokenConsumption = 0;
  
  // Get stage multiplier
  const stageMultiplier = STAGES[stage]?.multiplier || 1;
  
  // Get version multiplier
  const [major, minor] = version.split('.').map(Number);
  const versionMultiplier = Math.pow(VERSION_MULTIPLIERS.major, major) * 
                           Math.pow(VERSION_MULTIPLIERS.minor, minor);
  
  const totalMultiplier = stageMultiplier * versionMultiplier;
  
  // Calculate Overclocking multiplier (if toggled on)
  // Initialize these variables at the start to ensure they're always defined
  const overclockLevel = upgradeLevels['overclocking'] || 0;
  const isOverclockToggled = toggledUpgrades['overclocking'] !== false; // Default to true
  const overclockPercentage = overclockLevel * 10; // Each level = 10%
  
  // Get Energy Efficiency Research level to improve overclocking ratios
  const energyEfficiencyLevel = upgradeLevels['energy-efficiency'] || 0;
  const efficiencyBonus = energyEfficiencyLevel * 0.1; // 10% improvement per level
  
  // Base values: +20% SATS generation, +10% token consumption per 10% overclock
  // Energy Efficiency increases SATS bonus and decreases token consumption penalty
  const baseSatsBonusPer10Percent = 0.20; // 20% base per 10% overclock
  const baseTokenPenaltyPer10Percent = 0.10; // 10% base per 10% overclock
  
  // Improved ratios based on Energy Efficiency Research
  // Efficiency bonus increases SATS generation bonus and decreases token consumption penalty
  const satsBonusPer10Percent = baseSatsBonusPer10Percent * (1 + efficiencyBonus); // Increases SATS bonus
  const tokenPenaltyPer10Percent = Math.max(0.001, baseTokenPenaltyPer10Percent * (1 - efficiencyBonus * 0.5)); // Decreases token penalty (half effect), minimum 0.1%
  
  // Calculate multipliers: each 10% overclock gives the improved percentage
  const overclockAddictivityMultiplier = isOverclockToggled && overclockLevel > 0
    ? 1 + (overclockPercentage / 10 * satsBonusPer10Percent) // Apply improved SATS bonus
    : 1;
  const overclockTokenConsumptionMultiplier = isOverclockToggled && overclockLevel > 0
    ? 1 + (overclockPercentage / 10 * tokenPenaltyPer10Percent) // Apply improved token penalty
    : 1;
  
  // Count GPT Mini, GPT Pro, and Neural Networks models consumed by addictivity upgrades
  let gptMiniConsumed = 0;
  let gptProConsumed = 0;
  let neuralNetworksConsumed = 0;
  
  // First pass: calculate all generation and count consumption
  for (const [category, upgrades] of Object.entries(UPGRADES)) {
    for (const upgrade of upgrades) {
      const level = upgradeLevels[upgrade.id] || 0;
      if (level === 0) continue;
      
      // Calculate effect per level
      if (upgrade.effect.tokensPerSec) {
        // For addictivity upgrades, tokensPerSec is a cost (subtract tokens)
        // Token cost for addictivity upgrades is affected by overclocking multiplier
        // For other upgrades, tokensPerSec is a gain (add tokens)
        if (category === 'addictivity') {
          tokenConsumption += upgrade.effect.tokensPerSec * level * overclockTokenConsumptionMultiplier;
        } else {
          // Special case: Overseas Clickfarm uses Optimize AI level as multiplier
          if (upgrade.id === 'indian-clickfarm') {
            const optimizeAILevel = upgradeLevels['basic-algorithm'] || 0;
            tokenGeneration += upgrade.effect.tokensPerSec * level * optimizeAILevel;
          } else {
            tokenGeneration += upgrade.effect.tokensPerSec * level;
          }
        }
      }
      if (upgrade.effect.addictivityPerSec) {
        generation.addictivity += upgrade.effect.addictivityPerSec * level * totalMultiplier;
      }
      if (upgrade.effect.satoshisPerSec) {
        // Apply overclocking multiplier to addictivity upgrades' SATS generation
        const isAddictivityUpgrade = category === 'addictivity';
        const satoshisMultiplier = isAddictivityUpgrade ? overclockAddictivityMultiplier : 1;
        generation.satoshis += upgrade.effect.satoshisPerSec * level * totalMultiplier * satoshisMultiplier;
      }
      
      // For addictivity category: sum all SATS/sec values to show as Addictivity
      // Only include NSFW if it's toggled on
      if (category === 'addictivity') {
        if (upgrade.id === 'nsfw-reddit-clickbait') {
          // Only include NSFW if it's toggled on (default to true if not explicitly false)
          const isToggled = toggledUpgrades[upgrade.id] !== false;
          if (isToggled && upgrade.effect.tokenToSatsConversion) {
            // NSFW converts tokens to SATS: 1 token = 1 SAT/sec per level
            // Show the SATS/sec rate it would produce (1 SAT/sec per level)
            // NSFW conversion is a fixed rate - NOT affected by multipliers
            const conversionRate = upgrade.effect.tokenToSatsConversion.satoshis || 1;
            generation.addictivity += conversionRate * level;
          }
        } else if (upgrade.effect.satoshisPerSec) {
          // All other addictivity upgrades contribute their SATS/sec to addictivity display
          // Apply overclocking multiplier to addictivity generation
          generation.addictivity += upgrade.effect.satoshisPerSec * level * totalMultiplier * overclockAddictivityMultiplier;
        }
      }
      
      // Note: Token to SATS conversion is handled separately in useGameLoop.js
      // It drains from actual token balance, not from generation rates
      
      // Track consumption from addictivity upgrades
      if (upgrade.costsGptMini) {
        gptMiniConsumed += upgrade.costsGptMini * level;
      }
      if (upgrade.costsGptPro) {
        gptProConsumed += upgrade.costsGptPro * level;
      }
      if (upgrade.costsNeuralNetworks) {
        neuralNetworksConsumed += upgrade.costsNeuralNetworks * level;
      }
      
      // Handle multipliers (only if upgrade is toggled on, or if not toggleable)
      const isToggleable = upgrade.isToggleable || upgrade.effect?.tokenToSatsConversion;
      const isToggledOn = isToggleable 
        ? (toggledUpgrades[upgrade.id] !== false) // Default to true if not explicitly false
        : true; // Not toggleable, so always "on"
      
      if (isToggledOn) {
        if (upgrade.effect.electricityCostMultiplier) {
          // This affects costs, not generation directly
        }
      }
    }
  }
  
  // Reduce token generation based on GPT Mini models consumed by addictivity
  // Note: GPT Mini, GPT Pro, and Neural Networks don't currently generate tokens,
  // but we track consumption for consistency and potential future use
  const gptMiniLevel = upgradeLevels['gpt-mini'] || 0;
  if (gptMiniConsumed > 0 && gptMiniLevel > 0) {
    const gptMiniUpgrade = UPGRADES.tokens.find(u => u.id === 'gpt-mini');
    if (gptMiniUpgrade && gptMiniUpgrade.effect.tokensPerSec) {
      const consumed = Math.min(gptMiniConsumed, gptMiniLevel);
      // GPT Mini consumption reduces generation, so subtract from tokenGeneration
      tokenGeneration = Math.max(0, tokenGeneration - (gptMiniUpgrade.effect.tokensPerSec * consumed));
    }
  }
  
  // Store base token generation and consumption separately
  // Token generation gets multipliers, token consumption from addictivity is FLAT (no multipliers)
  // Ensure values are numbers, default to 0 if undefined/NaN
  generation.tokenGeneration = isNaN(tokenGeneration) || !isFinite(tokenGeneration) ? 0 : tokenGeneration;
  generation.tokenConsumption = isNaN(tokenConsumption) || !isFinite(tokenConsumption) ? 0 : tokenConsumption;
  
  // Calculate net tokens with stage/version multipliers applied to generation only
  // Token consumption from addictivity upgrades is FLAT (not multiplied)
  // Validate multiplier
  const safeTotalMultiplier = isNaN(totalMultiplier) || !isFinite(totalMultiplier) ? 1 : totalMultiplier;
  const netTokens = (generation.tokenGeneration * safeTotalMultiplier) - generation.tokenConsumption;
  generation.tokens = isNaN(netTokens) || !isFinite(netTokens) ? 0 : netTokens;
  
  // Validate all other generation values
  generation.storage = isNaN(generation.storage) || !isFinite(generation.storage) ? 0 : generation.storage;
  generation.addictivity = isNaN(generation.addictivity) || !isFinite(generation.addictivity) ? 0 : generation.addictivity;
  generation.satoshis = isNaN(generation.satoshis) || !isFinite(generation.satoshis) ? 0 : generation.satoshis;
  
  return generation;
}

/**
 * Calculate tokens per click
 * @param {Object} upgradeLevels - Map of upgrade IDs to levels
 * @param {number} stage - Current stage
 * @param {string} version - Current version string
 * @returns {number} Tokens per click
 */
export function calculateClickPower(upgradeLevels, stage, version) {
  let clickPower = 100; // Base click power
  
  // Get stage multiplier
  const stageMultiplier = STAGES[stage]?.multiplier || 1;
  
  // Get version multiplier
  const [major, minor] = version.split('.').map(Number);
  const versionMultiplier = Math.pow(VERSION_MULTIPLIERS.major, major) * 
                           Math.pow(VERSION_MULTIPLIERS.minor, minor);
  
  const totalMultiplier = stageMultiplier * versionMultiplier;
  
  // Calculate from token upgrades
  for (const upgrade of UPGRADES.tokens) {
    const level = upgradeLevels[upgrade.id] || 0;
    if (level === 0) continue;
    
    if (upgrade.effect.tokensPerClick) {
      clickPower += upgrade.effect.tokensPerClick * level;
    }
  }
  
  return Math.floor(clickPower * totalMultiplier);
}



/**
 * Calculate stage progress percentage
 * @param {Object} resources - Current resources
 * @param {number} currentStage - Current stage index
 * @returns {number} Progress percentage (0-100)
 */
export function calculateStageProgress(resources, currentStage) {
  if (currentStage >= 15) return 100; // Max stage
  
  // This would need STAGE_REQUIREMENTS imported
  // For now, return a simple calculation
  return 0; // Will be calculated in the component
}

/**
 * Increment version number (semantic versioning)
 * @param {string} currentVersion - Current version (e.g., "1.2.3")
 * @param {boolean} isMajor - True for major version, false for minor
 * @returns {string} New version string
 */
export function incrementVersion(currentVersion, isMajor) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  if (isMajor) {
    return `${major + 1}.0.0`;
  } else {
    return `${major}.${minor + 1}.0`;
  }
}
