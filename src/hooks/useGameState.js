import { useState, useCallback } from 'react';

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
  
  // Update resources
  const updateResources = useCallback((updates) => {
    setState(prev => ({
      ...prev,
      ...updates,
    }));
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
  
  // Unlock achievement
  const unlockAchievement = useCallback((achievementId) => {
    setState(prev => {
      if (prev.achievements.includes(achievementId)) {
        return prev; // Already unlocked
      }
      return {
        ...prev,
        achievements: [...prev.achievements, achievementId],
      };
    });
  }, []);
  
  // Advance stage
  const advanceStage = useCallback(() => {
    setState(prev => ({
      ...prev,
      stage: Math.min(prev.stage + 1, 15),
    }));
  }, []);
  
  // Prestige (version up)
  const prestige = useCallback((newVersion) => {
    setState(prev => ({
      ...prev,
      version: newVersion,
      // Reset resources but keep upgrades and achievements
      tokens: 0,
      processingPower: 0,
      electricity: 0,
      storage: 0,
      addictivity: 0,
      stage: 0,
      // Keep total stats for achievements
      // totalClicks, totalTokensGenerated, playTime, achievements, upgradeLevels are kept
    }));
  }, []);
  
  // Add click
  const addClick = useCallback(() => {
    setState(prev => ({
      ...prev,
      totalClicks: prev.totalClicks + 1,
    }));
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
