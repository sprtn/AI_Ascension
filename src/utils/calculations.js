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
    processingPower: 0,
    electricity: 0,
    storage: 0,
    addictivity: 0,
    satoshis: 0,
  };
  
  // Get stage multiplier
  const stageMultiplier = STAGES[stage]?.multiplier || 1;
  
  // Get version multiplier
  const [major, minor] = version.split('.').map(Number);
  const versionMultiplier = Math.pow(VERSION_MULTIPLIERS.major, major) * 
                           Math.pow(VERSION_MULTIPLIERS.minor, minor);
  
  const totalMultiplier = stageMultiplier * versionMultiplier;
  
  // Count GPT Mini models consumed by addictivity upgrades
  let gptMiniConsumed = 0;
  
  // First pass: calculate all generation and count GPT Mini consumption
  for (const [category, upgrades] of Object.entries(UPGRADES)) {
    for (const upgrade of upgrades) {
      const level = upgradeLevels[upgrade.id] || 0;
      if (level === 0) continue;
      
      // Calculate effect per level
      if (upgrade.effect.tokensPerSec) {
        generation.tokens += upgrade.effect.tokensPerSec * level * totalMultiplier;
      }
      if (upgrade.effect.processingPowerPerSec) {
        generation.processingPower += upgrade.effect.processingPowerPerSec * level * totalMultiplier;
      }
      if (upgrade.effect.electricityPerSec) {
        generation.electricity += upgrade.effect.electricityPerSec * level * totalMultiplier;
      }
      if (upgrade.effect.addictivityPerSec) {
        generation.addictivity += upgrade.effect.addictivityPerSec * level * totalMultiplier;
      }
      if (upgrade.effect.satoshisPerSec) {
        generation.satoshis += upgrade.effect.satoshisPerSec * level * totalMultiplier;
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
          generation.addictivity += upgrade.effect.satoshisPerSec * level * totalMultiplier;
        }
      }
      
      // Note: Token to SATS conversion is handled separately in useGameLoop.js
      // It drains from actual token balance, not from generation rates
      
      // Track GPT Mini consumption from addictivity upgrades
      if (upgrade.costsGptMini) {
        gptMiniConsumed += upgrade.costsGptMini;
      }
      
      // Handle multipliers
      if (upgrade.effect.processingPowerMultiplier) {
        generation.processingPower *= Math.pow(upgrade.effect.processingPowerMultiplier, level);
      }
      if (upgrade.effect.electricityCostMultiplier) {
        // This affects costs, not generation directly
      }
    }
  }
  
  // Reduce token generation based on GPT Mini models consumed by addictivity
  const gptMiniLevel = upgradeLevels['gpt-mini'] || 0;
  if (gptMiniConsumed > 0 && gptMiniLevel > 0) {
    const gptMiniUpgrade = UPGRADES.tokens.find(u => u.id === 'gpt-mini');
    if (gptMiniUpgrade && gptMiniUpgrade.effect.tokensPerSec) {
      const consumed = Math.min(gptMiniConsumed, gptMiniLevel);
      const lostTokens = gptMiniUpgrade.effect.tokensPerSec * consumed * totalMultiplier;
      generation.tokens = Math.max(0, generation.tokens - lostTokens);
    }
  }
  
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
 * Calculate processing power consumption per second
 * Processing power is consumed by token generation upgrades
 * @param {Object} upgradeLevels - Map of upgrade IDs to levels
 * @returns {number} Processing power consumed per second
 */
export function calculateProcessingPowerConsumption(upgradeLevels) {
  let consumption = 0;
  
  // Token generation upgrades consume processing power
  for (const upgrade of UPGRADES.tokens) {
    const level = upgradeLevels[upgrade.id] || 0;
    if (level === 0) continue;
    
    // Each token upgrade consumes a small amount of processing power
    // Based on the upgrade's processing power cost
    if (upgrade.baseCost.processingPower) {
      const baseConsumption = (upgrade.baseCost.processingPower || 0) * 0.01; // 1% of base cost per second
      consumption += baseConsumption * level;
    }
  }
  
  return consumption;
}

/**
 * Calculate electricity consumption per second
 * @param {Object} upgradeLevels - Map of upgrade IDs to levels
 * @returns {number} Electricity consumed per second
 */
export function calculateElectricityConsumption(upgradeLevels) {
  let consumption = 0;
  
  // Base consumption from processing upgrades (only if they require electricity)
  for (const upgrade of UPGRADES.processingPower) {
    const level = upgradeLevels[upgrade.id] || 0;
    if (level === 0) continue;
    
    // Skip overclocking - it's handled separately
    if (upgrade.id === 'overclocking') continue;
    
    // Only processing upgrades that cost electricity consume it
    if (upgrade.baseCost.electricity) {
      // Each processing upgrade consumes a small amount based on its cost
      const baseConsumption = (upgrade.baseCost.electricity || 0) * 0.03; // 3% of base cost per second
      consumption += baseConsumption * level;
    }
  }
  
  // Overclocking increases consumption of other processing upgrades
  const overclockLevel = upgradeLevels['overclocking'] || 0;
  if (overclockLevel > 0) {
    const overclockUpgrade = UPGRADES.processingPower.find(u => u.id === 'overclocking');
    if (overclockUpgrade && overclockUpgrade.effect.electricityCostMultiplier) {
      consumption *= Math.pow(overclockUpgrade.effect.electricityCostMultiplier, overclockLevel);
    }
  }
  
  // Energy efficiency reduces consumption
  const efficiencyLevel = upgradeLevels['energy-efficiency'] || 0;
  if (efficiencyLevel > 0) {
    const reduction = Math.pow(0.9, efficiencyLevel); // 10% reduction per level
    consumption *= reduction;
  }
  
  return consumption;
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
