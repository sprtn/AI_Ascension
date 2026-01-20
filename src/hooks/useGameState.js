import { useState, useCallback, useRef, useEffect } from 'react';
import { ACHIEVEMENTS } from '../utils/constants.js';

const INITIAL_STATE = {
  // Resources
  tokens: 0,
  processingPower: 0,
  electricity: 0,
  storage: 0,
  addictivity: 0,
  satoshis: 0, // Bitcoin in satoshis (1 BTC = 100,000,000 SATS)
  
  // Progression
  stage: 0,
  version: '0.1.0',
  
  // Upgrades (map of upgrade ID to level)
  upgradeLevels: {},
  
  // Achievements (array of achievement IDs)
  achievements: [],
  
  // Statistics
  totalClicks: 0,
  clickTimestamps: [], // Track click timestamps for speed achievements
  totalTokensGenerated: 0,
  playTime: 0,
  startTime: Date.now(),
  lastSaveTime: Date.now(),
  
  // Active events
  activeEvents: {},
  
  // Toggled upgrades (for upgrades that can be turned on/off)
  toggledUpgrades: {},
  
  // Track if tokens hit zero (for pulsing effect)
  tokensHitZero: false,
};

export function useGameState(initialState = null) {
  const [state, setState] = useState(initialState || INITIAL_STATE);
  const stateRef = useRef(state);
  
  // Keep ref in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  
  // Update resources
  const updateResources = useCallback((updates) => {
    setState(prev => {
      const updated = { ...prev, ...updates };
      stateRef.current = updated;
      return updated;
    });
  }, []);
  
  // Add resources
  const addResources = useCallback((amounts) => {
    setState(prev => {
      const updated = { ...prev };
      for (const [resource, amount] of Object.entries(amounts)) {
        updated[resource] = (updated[resource] || 0) + amount;
      }
      return updated;
    });
  }, []);
  
  // Spend resources
  const spendResources = useCallback((costs) => {
    setState(prev => {
      const updated = { ...prev };
      for (const [resource, amount] of Object.entries(costs)) {
        updated[resource] = Math.max(0, (updated[resource] || 0) - amount);
      }
      return updated;
    });
  }, []);
  
  // Purchase upgrade
  const purchaseUpgrade = useCallback((upgradeId, level) => {
    setState(prev => ({
      ...prev,
      upgradeLevels: {
        ...prev.upgradeLevels,
        [upgradeId]: level,
      },
    }));
  }, []);
  
  // Unlock achievement (only marks as unlocked, rewards applied separately)
  const unlockAchievement = useCallback((achievementId) => {
    setState(prev => {
      if (prev.achievements.includes(achievementId)) {
        return prev; // Already unlocked
      }
      
      // Only mark as unlocked, don't apply rewards yet
      return {
        ...prev,
        achievements: [...prev.achievements, achievementId],
      };
    });
  }, []);
  
  // Apply achievement reward with visual burst effect
  const applyAchievementReward = useCallback((achievementId, onProgress) => {
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement || !achievement.reward) return;
    
    const reward = achievement.reward;
    const duration = 800; // 800ms animation
    const steps = 20;
    const stepDuration = duration / steps;
    
    // Capture starting values from current state
    const currentState = stateRef.current;
    const startValues = {};
    const targetValues = {};
    
    if (reward.tokens) {
      startValues.tokens = currentState.tokens || 0;
      targetValues.tokens = startValues.tokens + reward.tokens;
    }
    if (reward.satoshis) {
      startValues.satoshis = currentState.satoshis || 0;
      targetValues.satoshis = startValues.satoshis + reward.satoshis;
    }
    if (reward.processingPower) {
      startValues.processingPower = currentState.processingPower || 0;
      targetValues.processingPower = startValues.processingPower + reward.processingPower;
    }
    if (reward.electricity) {
      startValues.electricity = currentState.electricity || 0;
      targetValues.electricity = startValues.electricity + reward.electricity;
    }
    if (reward.storage) {
      startValues.storage = currentState.storage || 0;
      targetValues.storage = startValues.storage + reward.storage;
    }
    if (reward.addictivity) {
      startValues.addictivity = currentState.addictivity || 0;
      targetValues.addictivity = startValues.addictivity + reward.addictivity;
    }
    
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      
      // Calculate current values based on progress from start to target
      const currentValues = {};
      for (const [resource, start] of Object.entries(startValues)) {
        const progress = currentStep / steps;
        const current = Math.floor(start + (targetValues[resource] - start) * progress);
        currentValues[resource] = current;
      }
      
      // Update state with interpolated values
      setState(prev => {
        const updated = { ...prev };
        for (const [resource, currentValue] of Object.entries(currentValues)) {
          updated[resource] = currentValue;
        }
        stateRef.current = updated; // Update ref
        return updated;
      });
      
      // Call progress callback for visual effects
      if (onProgress && currentStep > 0) {
        const stepAmounts = {};
        for (const [resource, currentValue] of Object.entries(currentValues)) {
          const prevValue = currentStep === 1 ? startValues[resource] : 
            Math.floor(startValues[resource] + (targetValues[resource] - startValues[resource]) * ((currentStep - 1) / steps));
          stepAmounts[resource] = currentValue - prevValue;
        }
        onProgress(stepAmounts, currentStep / steps);
      }
      
      if (currentStep >= steps) {
        clearInterval(interval);
        // Set exact target values to ensure no rounding errors
        setState(prev => {
          const updated = { ...prev };
          for (const [resource, target] of Object.entries(targetValues)) {
            updated[resource] = target;
          }
          
          // Apply upgrade level rewards (instant, no animation)
          if (reward.upgradeLevels) {
            updated.upgradeLevels = { ...updated.upgradeLevels };
            for (const [upgradeId, levels] of Object.entries(reward.upgradeLevels)) {
              updated.upgradeLevels[upgradeId] = (updated.upgradeLevels[upgradeId] || 0) + levels;
            }
          }
          
          stateRef.current = updated; // Update ref
          return updated;
        });
      }
    }, stepDuration);
  }, []);
  
  // Advance stage
  const advanceStage = useCallback(() => {
    setState(prev => {
      const newStage = Math.min(prev.stage + 1, 15);
      // Auto-increment minor version when advancing stages
      const [major, minor] = prev.version.split('.').map(Number);
      const newVersion = `${major}.${minor + 1}.0`;
      
      return {
        ...prev,
        stage: newStage,
        version: newVersion,
      };
    });
  }, []);
  
  // Prestige (version up)
  const prestige = useCallback((newVersion) => {
    setState(prev => ({
      ...prev,
      version: newVersion,
      // Reset everything except version (which provides the multiplier)
      tokens: 0,
      processingPower: 0,
      electricity: 0,
      storage: 0,
      addictivity: 0,
      satoshis: 0,
      stage: 0,
      upgradeLevels: {},
      achievements: [],
      totalClicks: 0,
      clickTimestamps: [],
      totalTokensGenerated: 0,
      playTime: 0,
      startTime: Date.now(),
      lastSaveTime: Date.now(),
      activeEvents: {},
      toggledUpgrades: {},
      tokensHitZero: false,
    }));
  }, []);
  
  // Add click
  const addClick = useCallback(() => {
    const now = Date.now();
    setState(prev => {
      // Keep only clicks from last 10 seconds
      const tenSecondsAgo = now - 10000;
      const recentClicks = (prev.clickTimestamps || []).filter(timestamp => timestamp > tenSecondsAgo);
      
      return {
        ...prev,
        totalClicks: prev.totalClicks + 1,
        clickTimestamps: [...recentClicks, now],
      };
    });
  }, []);
  
  // Set active event
  const setActiveEvent = useCallback((eventId, eventData) => {
    setState(prev => ({
      ...prev,
      activeEvents: {
        ...prev.activeEvents,
        [eventId]: eventData,
      },
    }));
  }, []);
  
  // Remove active event
  const removeActiveEvent = useCallback((eventId) => {
    setState(prev => {
      const updated = { ...prev.activeEvents };
      delete updated[eventId];
      return {
        ...prev,
        activeEvents: updated,
      };
    });
  }, []);
  
  // Update play time
  const updatePlayTime = useCallback((time) => {
    setState(prev => ({
      ...prev,
      playTime: time,
    }));
  }, []);
  
  // Reset state (for testing or new game)
  const resetState = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);
  
  // Set full state (for loading saves)
  const setFullState = useCallback((newState) => {
    setState(newState);
  }, []);
  
  // Toggle upgrade on/off state (for upgrades like token conversion)
  const toggleUpgrade = useCallback((upgradeId) => {
    setState(prev => {
      const currentToggleState = prev.toggledUpgrades?.[upgradeId];
      return {
        ...prev,
        toggledUpgrades: {
          ...prev.toggledUpgrades,
          [upgradeId]: currentToggleState === false ? true : false, // Toggle between true and false
        },
      };
    });
  }, []);
  
  return {
    state,
    updateResources,
    addResources,
    spendResources,
    purchaseUpgrade,
    unlockAchievement,
    applyAchievementReward,
    advanceStage,
    prestige,
    addClick,
    setActiveEvent,
    removeActiveEvent,
    updatePlayTime,
    resetState,
    setFullState,
    toggleUpgrade,
  };
}
