import { useEffect, useRef } from 'react';
import { calculateGeneration } from '../utils/calculations.js';

const SAVE_KEY = 'aiAscensionSave';
const SAVE_VERSION = '1.0.0';
const AUTO_SAVE_INTERVAL = 10000; // 10 seconds

export function useSaveSystem(gameState, gameActions) {
  const lastSaveRef = useRef(Date.now());
  const saveTimeoutRef = useRef(null);
  
  // Auto-save every 10 seconds
  useEffect(() => {
    const autoSave = () => {
      const now = Date.now();
      if (now - lastSaveRef.current >= AUTO_SAVE_INTERVAL) {
        try {
          const saveData = {
            version: SAVE_VERSION,
            timestamp: Date.now(),
            state: {
              ...gameState.state,
              lastSaveTime: Date.now(),
            },
          };
          localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
        } catch (error) {
          console.error('Failed to save game:', error);
        }
        lastSaveRef.current = now;
      }
      saveTimeoutRef.current = setTimeout(autoSave, AUTO_SAVE_INTERVAL);
    };
    
    saveTimeoutRef.current = setTimeout(autoSave, AUTO_SAVE_INTERVAL);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [gameState.state]);
  
  // Save game to localStorage
  const saveGame = () => {
    try {
      const saveData = {
        version: SAVE_VERSION,
        timestamp: Date.now(),
        state: {
          ...gameState.state,
          lastSaveTime: Date.now(),
        },
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch (error) {
      console.error('Failed to save game:', error);
    }
  };
  
  // Load game from localStorage
  const loadGame = () => {
    try {
      const saveDataStr = localStorage.getItem(SAVE_KEY);
      if (!saveDataStr) return false;
      
      const saveData = JSON.parse(saveDataStr);
      
      // Calculate offline earnings
      const now = Date.now();
      const offlineTime = (now - saveData.timestamp) / 1000; // seconds
      
      if (offlineTime > 0 && offlineTime < 86400) { // Max 24 hours offline
        const generation = calculateGeneration(
          saveData.state.upgradeLevels,
          saveData.state.stage,
          saveData.state.version,
          saveData.state.toggledUpgrades || {}
        );
        
        // Apply offline earnings (capped at reasonable amount)
        const maxOfflineTime = 3600; // 1 hour max
        const effectiveTime = Math.min(offlineTime, maxOfflineTime);
        
        const offlineEarnings = {
          tokens: generation.tokens * effectiveTime,
          processingPower: generation.processingPower * effectiveTime,
          electricity: generation.electricity * effectiveTime,
          storage: (generation.storage || 0) * effectiveTime,
          addictivity: generation.addictivity * effectiveTime,
        };
        
        // Add offline earnings to saved state
        saveData.state.tokens += offlineEarnings.tokens;
        saveData.state.processingPower += offlineEarnings.processingPower;
        saveData.state.electricity += offlineEarnings.electricity;
        saveData.state.storage += offlineEarnings.storage;
        saveData.state.addictivity += offlineEarnings.addictivity;
        saveData.state.totalTokensGenerated += offlineEarnings.tokens;
      }
      
      // Restore state
      gameActions.setFullState(saveData.state);
      return true;
    } catch (error) {
      console.error('Failed to load game:', error);
      return false;
    }
  };
  
  // Export save data as JSON string
  const exportSave = () => {
    try {
      const saveData = {
        version: SAVE_VERSION,
        timestamp: Date.now(),
        state: gameState.state,
      };
      return JSON.stringify(saveData, null, 2);
    } catch (error) {
      console.error('Failed to export save:', error);
      return null;
    }
  };
  
  // Import save data from JSON string
  const importSave = (saveDataStr) => {
    try {
      const saveData = JSON.parse(saveDataStr);
      if (saveData.version && saveData.state) {
        gameActions.setFullState(saveData.state);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import save:', error);
      return false;
    }
  };
  
  // Delete save
  const deleteSave = () => {
    try {
      localStorage.removeItem(SAVE_KEY);
      gameActions.resetState();
      return true;
    } catch (error) {
      console.error('Failed to delete save:', error);
      return false;
    }
  };
  
  return {
    saveGame,
    loadGame,
    exportSave,
    importSave,
    deleteSave,
  };
}
