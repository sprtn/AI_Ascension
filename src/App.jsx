import { useState, useEffect, useRef } from 'react';
import { useGameState } from './hooks/useGameState.js';
import { useGameLoop } from './hooks/useGameLoop.js';
import { useSaveSystem } from './hooks/useSaveSystem.js';
import { OverviewBar } from './components/OverviewBar.jsx';
import { Upgrades } from './components/Upgrades.jsx';
import { Achievements } from './components/Achievements.jsx';
import { Stats } from './components/Stats.jsx';
import { Prestige } from './components/Prestige.jsx';
import { AnimatedBackground } from './components/AnimatedBackground.jsx';
import { AchievementToastContainer } from './components/AchievementToast.jsx';
import { ResourceBurst } from './components/ResourceBurst.jsx';
import { EVENTS, ACHIEVEMENTS } from './utils/constants.js';
import { compareVersions } from './utils/formatters.js';
import './styles/game.css';

const TOP_BUTTONS = [
  { id: 'achievements', name: 'Achievements', icon: '🏆' },
  { id: 'stats', name: 'Stats', icon: '📊' },
  { id: 'prestige', name: 'Prestige', icon: '⭐' },
];

function App() {
  const [activeTab, setActiveTab] = useState('upgrades');
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [saveExportText, setSaveExportText] = useState('');
  const [saveImportText, setSaveImportText] = useState('');
  const [resourceBursts, setResourceBursts] = useState([]);
  const resourceRefs = useRef(null);
  
  const gameState = useGameState();
  
  // Wrapper for applyAchievementReward that triggers visual bursts
  const applyAchievementRewardWithBurst = (achievementId) => {
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement || !achievement.reward) return;
    
    // Trigger visual bursts for each resource
    const reward = achievement.reward;
    const burstAmounts = {};
    const resourcePositions = {};
    
    // Get positions for each resource that has a reward
    if (reward.tokens && resourceRefs.current?.tokens?.current) {
      const pos = resourceRefs.current.tokens.current.getPosition();
      if (pos) {
        burstAmounts.tokens = reward.tokens;
        resourcePositions.tokens = pos;
      }
    }
    if (reward.satoshis && resourceRefs.current?.satoshis?.current) {
      const pos = resourceRefs.current.satoshis.current.getPosition();
      if (pos) {
        burstAmounts.satoshis = reward.satoshis;
        resourcePositions.satoshis = pos;
      }
    }
    if (reward.processingPower && resourceRefs.current?.processingPower?.current) {
      const pos = resourceRefs.current.processingPower.current.getPosition();
      if (pos) {
        burstAmounts.processingPower = reward.processingPower;
        resourcePositions.processingPower = pos;
      }
    }
    if (reward.electricity && resourceRefs.current?.electricity?.current) {
      const pos = resourceRefs.current.electricity.current.getPosition();
      if (pos) {
        burstAmounts.electricity = reward.electricity;
        resourcePositions.electricity = pos;
      }
    }
    if (reward.storage && resourceRefs.current?.storage?.current) {
      const pos = resourceRefs.current.storage.current.getPosition();
      if (pos) {
        burstAmounts.storage = reward.storage;
        resourcePositions.storage = pos;
      }
    }
    if (reward.addictivity && resourceRefs.current?.addictivity?.current) {
      const pos = resourceRefs.current.addictivity.current.getPosition();
      if (pos) {
        burstAmounts.addictivity = reward.addictivity;
        resourcePositions.addictivity = pos;
      }
    }
    
    // Add burst effects positioned over their resource cards
    for (const [resource, amount] of Object.entries(burstAmounts)) {
      const position = resourcePositions[resource];
      if (position) {
        setResourceBursts(prev => [...prev, { 
          id: `${Date.now()}-${resource}`, 
          amounts: { [resource]: amount },
          position: position
        }]);
      }
    }
    
    // Apply reward with progress callback for smooth animation
    gameState.applyAchievementReward(achievementId, (stepAmounts, progress) => {
      // Update bursts during animation if needed
    });
  };
  
  const gameActions = {
    updateResources: gameState.updateResources,
    addResources: gameState.addResources,
    spendResources: gameState.spendResources,
    purchaseUpgrade: gameState.purchaseUpgrade,
    unlockAchievement: gameState.unlockAchievement,
    applyAchievementReward: applyAchievementRewardWithBurst,
    advanceStage: gameState.advanceStage,
    prestige: gameState.prestige,
    addClick: gameState.addClick,
    setActiveEvent: gameState.setActiveEvent,
    removeActiveEvent: gameState.removeActiveEvent,
    updatePlayTime: gameState.updatePlayTime,
    resetState: gameState.resetState,
    setFullState: gameState.setFullState,
    toggleUpgrade: gameState.toggleUpgrade,
  };
  
  const saveSystem = useSaveSystem(gameState, gameActions);
  
  // Initialize game loop
  useGameLoop(gameState, gameActions);
  
  // Load game on mount
  useEffect(() => {
    saveSystem.loadGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Random events system
  useEffect(() => {
    const eventInterval = setInterval(() => {
      // 5-10% chance per minute for an event
      if (Math.random() < 0.08) {
        const availableEvents = EVENTS.filter(event => {
          // Don't trigger same event if already active
          return !gameState.state.activeEvents[event.id];
        });
        
        if (availableEvents.length > 0) {
          const event = availableEvents[Math.floor(Math.random() * availableEvents.length)];
          
          if (Math.random() < event.probability * 10) { // Scale probability
            const endTime = Date.now() + event.effect.duration;
            gameActions.setActiveEvent(event.id, {
              id: event.id,
              name: event.name,
              description: event.description,
              effect: event.effect,
              endTime,
            });
          }
        }
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(eventInterval);
  }, [gameState.state.activeEvents]);
  
  const handleExportSave = () => {
    const saveData = saveSystem.exportSave();
    setSaveExportText(saveData || '');
  };
  
  const handleImportSave = () => {
    if (saveSystem.importSave(saveImportText)) {
      setSaveImportText('');
      setShowSaveMenu(false);
      alert('Save imported successfully!');
    } else {
      alert('Failed to import save. Please check the format.');
    }
  };
  
  const handleDeleteSave = () => {
    if (confirm('Are you sure you want to delete your save? This cannot be undone!')) {
      saveSystem.deleteSave();
      setShowSaveMenu(false);
    }
  };
  
  const currentStage = gameState.state.stage || 0;
  const bgClass = `bg-stage-${currentStage}`;
  
  const tokensZero = gameState.state.tokensHitZero || false;
  
  // Check for new achievements (regardless of tab)
  useEffect(() => {
    for (const achievement of ACHIEVEMENTS) {
      if (gameState.state.achievements.includes(achievement.id)) {
        continue; // Already unlocked
      }
      
      let unlocked = false;
      
      if (achievement.requirement.tokens) {
        unlocked = gameState.state.tokens >= achievement.requirement.tokens;
      } else if (achievement.requirement.processingPower) {
        unlocked = gameState.state.processingPower >= achievement.requirement.processingPower;
      } else if (achievement.requirement.electricity) {
        unlocked = gameState.state.electricity >= achievement.requirement.electricity;
      } else if (achievement.requirement.storage) {
        unlocked = gameState.state.storage >= achievement.requirement.storage;
      } else if (achievement.requirement.addictivity) {
        unlocked = gameState.state.addictivity >= achievement.requirement.addictivity;
      } else if (achievement.requirement.stage !== undefined) {
        unlocked = gameState.state.stage >= achievement.requirement.stage;
      } else if (achievement.requirement.version) {
        unlocked = compareVersions(gameState.state.version, achievement.requirement.version) >= 0;
      } else if (achievement.requirement.clicks) {
        unlocked = gameState.state.totalClicks >= achievement.requirement.clicks;
      } else if (achievement.requirement.clicksIn10Sec) {
        // Count clicks in last 10 seconds
        const now = Date.now();
        const tenSecondsAgo = now - 10000;
        const recentClicks = (gameState.state.clickTimestamps || []).filter(timestamp => timestamp > tenSecondsAgo);
        unlocked = recentClicks.length >= achievement.requirement.clicksIn10Sec;
      } else if (achievement.requirement.playTime) {
        unlocked = gameState.state.playTime >= achievement.requirement.playTime;
      } else if (achievement.requirement.upgrade) {
        unlocked = (gameState.state.upgradeLevels[achievement.requirement.upgrade] || 0) > 0;
      } else if (achievement.requirement.upgrades) {
        unlocked = Object.keys(gameState.state.upgradeLevels).length >= achievement.requirement.upgrades;
      } else if (achievement.requirement.upgradeAmount) {
        // Check if player has specific amounts of upgrades (for inventory achievements)
        unlocked = Object.entries(achievement.requirement.upgradeAmount).every(([upgradeId, requiredAmount]) => {
          return (gameState.state.upgradeLevels[upgradeId] || 0) >= requiredAmount;
        });
      } else if (achievement.requirement.upgradeLevel) {
        // Check if upgrade is at specific level (for Optimize AI level 50)
        unlocked = Object.entries(achievement.requirement.upgradeLevel).every(([upgradeId, requiredLevel]) => {
          return (gameState.state.upgradeLevels[upgradeId] || 0) >= requiredLevel;
        });
      }
      
      // Handle glitch achievement special effect
      if (unlocked && achievement.glitch) {
        // Trigger glitch animation - we'll handle this in the achievement unlock
        // The glitch effect will be shown via the toast system
      }
      
      if (unlocked) {
        gameActions.unlockAchievement(achievement.id);
        break; // Only unlock one at a time
      }
    }
  }, [gameState.state, gameActions]);
  
  // Get unlocked achievements for toast notifications
  const unlockedAchievements = ACHIEVEMENTS.filter(a => 
    gameState.state.achievements.includes(a.id)
  );
  
  return (
    <div 
      className={`min-h-screen ${bgClass} transition-all duration-1000 ${tokensZero ? 'tokens-zero-warning' : ''}`} 
      style={{ 
        margin: 0,
        padding: 0,
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        overflowX: 'hidden'
      }}
    >
      {/* Animated Background */}
      <AnimatedBackground gameState={gameState} />
      
      {/* Achievement Toast Notifications */}
      <AchievementToastContainer 
        achievements={unlockedAchievements} 
        onRewardApply={gameActions.applyAchievementReward}
      />
      
      {/* Resource Burst Effects */}
      {resourceBursts.map(burst => (
        <ResourceBurst key={burst.id} amounts={burst.amounts} position={burst.position} />
      ))}
      
      <div className="container mx-auto px-4 pt-4 pb-4 max-w-7xl relative" style={{ zIndex: 10, position: 'relative' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 w-full">
          <div className="text-5xl font-bold text-neon-cyan">
            AI Ascension
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {TOP_BUTTONS.map(button => (
              <button
                key={button.id}
                onClick={() => setActiveTab(button.id)}
                className={`save-button whitespace-nowrap ${activeTab === button.id ? 'bg-neon-cyan/30 border-neon-cyan/70 text-neon-cyan' : ''}`}
              >
                <span className="mr-1">{button.icon}</span>
                {button.name}
              </button>
            ))}
            <button
              onClick={() => setShowSaveMenu(!showSaveMenu)}
              className="save-button whitespace-nowrap"
            >
              💾 Save
            </button>
          </div>
        </div>
        
        {/* Save Menu */}
        {showSaveMenu && (
          <div className="mb-4 bg-gray-800/90 rounded-lg p-4 border border-neon-cyan/50">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-bold text-neon-cyan">Save Management</div>
              <button
                onClick={() => setShowSaveMenu(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <button
                  onClick={handleExportSave}
                  className="w-full px-4 py-2 bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 rounded-lg hover:bg-neon-cyan/30 mb-2"
                >
                  Export Save
                </button>
                {saveExportText && (
                  <textarea
                    readOnly
                    value={saveExportText}
                    className="w-full h-32 bg-gray-900 text-gray-300 p-2 rounded border border-gray-700 font-mono text-xs"
                  />
                )}
              </div>
              <div>
                <textarea
                  value={saveImportText}
                  onChange={(e) => setSaveImportText(e.target.value)}
                  placeholder="Paste save data here..."
                  className="w-full h-32 bg-gray-900 text-gray-300 p-2 rounded border border-gray-700 font-mono text-xs mb-2"
                />
                <button
                  onClick={handleImportSave}
                  className="w-full px-4 py-2 bg-neon-purple/20 text-neon-purple border border-neon-purple/50 rounded-lg hover:bg-neon-purple/30"
                >
                  Import Save
                </button>
              </div>
              <button
                onClick={handleDeleteSave}
                className="w-full px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30"
              >
                Delete Save
              </button>
            </div>
          </div>
        )}
        
        {/* Overview Bar - Always Visible */}
        <div className="game-container p-4 mb-4">
          <OverviewBar 
            gameState={gameState} 
            gameActions={gameActions}
            resourceRefs={resourceRefs}
            onResourceClick={(category) => {
              setActiveTab('upgrades');
              // Trigger category change in Upgrades component
              setTimeout(() => {
                const event = new CustomEvent('switchUpgradeCategory', { detail: category });
                window.dispatchEvent(event);
              }, 100);
            }}
          />
        </div>
        
        {/* Main Content */}
        <div className="game-container p-6">
          {activeTab === 'upgrades' && <Upgrades gameState={gameState} gameActions={gameActions} />}
          {activeTab === 'achievements' && <Achievements gameState={gameState} gameActions={gameActions} />}
          {activeTab === 'stats' && <Stats gameState={gameState} />}
          {activeTab === 'prestige' && <Prestige gameState={gameState} gameActions={gameActions} />}
        </div>
        
        {/* Footer */}
        <div className="mt-4 text-center text-sm text-gray-500">
          <div>Help the AI achieve universal domination through addictive content</div>
          <div className="mt-1 text-xs">
            {gameState.state.totalClicks > 1000 && (
              <span className="text-neon-purple animate-pulse">
                The AI is becoming self-aware... 🔮
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
