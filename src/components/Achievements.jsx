import { useEffect, useState } from 'react';
import { ACHIEVEMENTS, UPGRADES } from '../utils/constants.js';
import { compareVersions, formatNumber, formatBitcoin, formatStorage, formatElectricity } from '../utils/formatters.js';

export function Achievements({ gameState, gameActions }) {
  const [newAchievement, setNewAchievement] = useState(null);
  
  // Check for new achievements
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
      } else if (achievement.requirement.playTime) {
        unlocked = gameState.state.playTime >= achievement.requirement.playTime;
      } else if (achievement.requirement.upgrade) {
        unlocked = (gameState.state.upgradeLevels[achievement.requirement.upgrade] || 0) > 0;
      } else if (achievement.requirement.upgrades) {
        unlocked = Object.keys(gameState.state.upgradeLevels).length >= achievement.requirement.upgrades;
      }
      
      if (unlocked) {
        gameActions.unlockAchievement(achievement.id);
        setNewAchievement(achievement);
        setTimeout(() => setNewAchievement(null), 5000);
        break;
      }
    }
  }, [gameState.state, gameActions]);
  
  const unlockedAchievements = ACHIEVEMENTS.filter(a => 
    gameState.state.achievements.includes(a.id)
  );
  const lockedAchievements = ACHIEVEMENTS.filter(a => 
    !gameState.state.achievements.includes(a.id)
  );
  
  return (
    <div className="space-y-6">
      {/* Achievement Popup */}
      {newAchievement && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 achievement-popup">
          <div className="bg-gradient-to-r from-neon-cyan/90 to-neon-purple/90 rounded-lg p-6 border-2 border-neon-cyan shadow-2xl shadow-neon-cyan/50 min-w-[300px]">
            <div className="text-4xl mb-2">🏆</div>
            <div className="text-2xl font-bold text-white mb-1">{newAchievement.name}</div>
            <div className="text-sm text-gray-200">{newAchievement.description}</div>
          </div>
        </div>
      )}
      
      {/* Stats */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-neon-purple/30">
        <div className="text-lg font-bold text-neon-purple mb-2">Achievement Progress</div>
        <div className="text-2xl font-bold text-neon-cyan">
          {unlockedAchievements.length} / {ACHIEVEMENTS.length}
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
          <div
            className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan transition-all"
            style={{ width: `${(unlockedAchievements.length / ACHIEVEMENTS.length) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Unlocked Achievements */}
      <div>
        <h2 className="text-xl font-bold text-neon-cyan mb-4">Unlocked ({unlockedAchievements.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {unlockedAchievements.map(achievement => (
            <div
              key={achievement.id}
              className="bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 rounded-lg p-4 border border-neon-cyan/50"
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">🏆</div>
                <div className="flex-1">
                  <div className="font-bold text-neon-cyan">{achievement.name}</div>
                  <div className="text-sm text-gray-400 mb-2">{achievement.description}</div>
                  {achievement.reward && (
                    <div className="text-xs text-neon-green font-mono mt-2 pt-2 border-t border-neon-green/30">
                      <div className="text-neon-green/80 mb-1">Reward:</div>
                      <div className="space-y-1">
                        {achievement.reward.tokens && (
                          <div>+{formatNumber(achievement.reward.tokens)} Tokens</div>
                        )}
                        {achievement.reward.satoshis && (
                          <div>+{formatBitcoin(achievement.reward.satoshis)}</div>
                        )}
                        {achievement.reward.processingPower && (
                          <div>+{formatNumber(achievement.reward.processingPower)} FLOPS</div>
                        )}
                        {achievement.reward.electricity && (
                          <div>+{formatElectricity(achievement.reward.electricity)}</div>
                        )}
                        {achievement.reward.storage && (
                          <div>+{formatStorage(achievement.reward.storage)}</div>
                        )}
                        {achievement.reward.addictivity && (
                          <div>+{formatNumber(achievement.reward.addictivity)} Addictivity</div>
                        )}
                        {achievement.reward.upgradeLevels && Object.entries(achievement.reward.upgradeLevels).map(([upgradeId, levels]) => {
                          // Find upgrade name from UPGRADES
                          let upgradeName = upgradeId;
                          for (const category of Object.values(UPGRADES)) {
                            const upgrade = category.find(u => u.id === upgradeId);
                            if (upgrade) {
                              upgradeName = upgrade.name;
                              break;
                            }
                          }
                          return <div key={upgradeId}>+{levels}x {upgradeName}</div>;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Locked Achievements */}
      {lockedAchievements.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-500 mb-4">Locked ({lockedAchievements.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lockedAchievements.map(achievement => (
              <div
                key={achievement.id}
                className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50 opacity-60"
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">🔒</div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-500">{achievement.name}</div>
                    <div className="text-sm text-gray-600">{achievement.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
