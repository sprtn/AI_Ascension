import { useState, useCallback } from 'react';
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
      
      // Find the achievement to get its reward
      const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
      const reward = achievement?.reward || {};
      
      // Apply rewards
      const updated = {
        ...prev,
        achievements: [...prev.achievements, achievementId],
      };
      
      // Add resource rewards
      if (reward.tokens) updated.tokens = (updated.tokens || 0) + reward.tokens;
      if (reward.satoshis) updated.satoshis = (updated.satoshis || 0) + reward.satoshis;
      if (reward.processingPower) updated.processingPower = (updated.processingPower || 0) + reward.processingPower;
      if (reward.electricity) updated.electricity = (updated.electricity || 0) + reward.electricity;
      if (reward.storage) updated.storage = (updated.storage || 0) + reward.storage;
      if (reward.addictivity) updated.addictivity = (updated.addictivity || 0) + reward.addictivity;
      
      // Apply upgrade level rewards
      if (reward.upgradeLevels) {
        updated.upgradeLevels = { ...updated.upgradeLevels };
        for (const [upgradeId, levels] of Object.entries(reward.upgradeLevels)) {
          updated.upgradeLevels[upgradeId] = (updated.upgradeLevels[upgradeId] || 0) + levels;
        }
      }
      
      return updated;
    });
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
