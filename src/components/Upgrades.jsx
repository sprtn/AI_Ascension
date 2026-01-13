import { useState, useEffect } from 'react';
import { UpgradeCard } from './UpgradeCard.jsx';
import { UPGRADES } from '../utils/constants.js';

const UPGRADE_CATEGORIES = [
  { id: 'tokens', name: 'Tokens', icon: '🪙' },
  { id: 'processingPower', name: 'Processing', icon: '💻' },
  { id: 'electricity', name: 'Electricity', icon: '⚡' },
  { id: 'storage', name: 'Storage', icon: '💾' },
  { id: 'addictivity', name: 'Addictivity', icon: '🧠' },
];

// Keep this for reference but tabs are removed - category switching happens via resource card clicks

export function Upgrades({ gameState, gameActions }) {
  const [activeCategory, setActiveCategory] = useState('tokens');
  
  // Listen for category switch events from resource card clicks
  useEffect(() => {
    const handleCategorySwitch = (event) => {
      const category = event.detail;
      if (UPGRADES[category]) {
        setActiveCategory(category);
      }
    };
    
    window.addEventListener('switchUpgradeCategory', handleCategorySwitch);
    return () => {
      window.removeEventListener('switchUpgradeCategory', handleCategorySwitch);
    };
  }, []);
  
  const handlePurchase = (upgradeId, newLevel, cost, effect) => {
    try {
      const currentLevel = gameState.state.upgradeLevels[upgradeId] || 0;
      
      // If decreasing level, just set the level (no cost, no refund for simplicity)
      if (newLevel < currentLevel) {
        gameActions.purchaseUpgrade(upgradeId, newLevel);
        // Note: In a full implementation, you'd want to refund resources
        // For now, we just decrease the level without refunding
      } else if (newLevel > currentLevel) {
        // Find the upgrade definition to check for consumption costs
        let upgradeDef = null;
        for (const category of Object.values(UPGRADES)) {
          const found = category.find(u => u.id === upgradeId);
          if (found) {
            upgradeDef = found;
            break;
          }
        }
        
        // Check and consume GPT Mini, GPT Pro, and Neural Networks
        if (upgradeDef) {
          const upgradeLevels = gameState.state.upgradeLevels || {};
          
          // Consume GPT Mini
          if (upgradeDef.costsGptMini) {
            const gptMiniLevel = upgradeLevels['gpt-mini'] || 0;
            const required = upgradeDef.costsGptMini;
            if (gptMiniLevel >= required) {
              gameActions.purchaseUpgrade('gpt-mini', Math.max(0, gptMiniLevel - required));
            } else {
              throw new Error('Not enough GPT Mini');
            }
          }
          
          // Consume GPT Pro
          if (upgradeDef.costsGptPro) {
            const gptProLevel = upgradeLevels['gpt-pro'] || 0;
            const required = upgradeDef.costsGptPro;
            if (gptProLevel >= required) {
              gameActions.purchaseUpgrade('gpt-pro', Math.max(0, gptProLevel - required));
            } else {
              throw new Error('Not enough GPT Pro');
            }
          }
          
          // Consume Neural Networks
          if (upgradeDef.costsNeuralNetworks) {
            const neuralNetworksLevel = upgradeLevels['neural-networks'] || 0;
            const required = upgradeDef.costsNeuralNetworks;
            if (neuralNetworksLevel >= required) {
              gameActions.purchaseUpgrade('neural-networks', Math.max(0, neuralNetworksLevel - required));
            } else {
              throw new Error('Not enough Neural Networks');
            }
          }
        }
        
        // Normal purchase - spend resources and upgrade
        // Only spend if there's actually a cost
        if (cost && Object.keys(cost).length > 0) {
          gameActions.spendResources(cost);
        }
        gameActions.purchaseUpgrade(upgradeId, newLevel);
        
        // Handle storage upgrades (add capacity directly)
        if (effect && effect.storage) {
          gameActions.addResources({ storage: effect.storage });
        }
        
        // Auto-enable token to SATS conversion on first purchase
        if (effect && effect.tokenToSatsConversion && newLevel === 1) {
          // Default to enabled (toggledUpgrades[upgradeId] will be undefined, which we treat as true)
          // No need to explicitly set it
        }
      }
    } catch (error) {
      console.error('Error in handlePurchase:', error);
    }
  };
  
  const handleToggle = (upgradeId) => {
    if (gameActions.toggleUpgrade) {
      gameActions.toggleUpgrade(upgradeId);
    }
  };
  
  const currentUpgrades = UPGRADES[activeCategory] || [];
  const availableUpgrades = currentUpgrades.filter(
    upgrade => gameState.state.stage >= upgrade.unlockStage
  );
  
  // Get category name for display
  const categoryInfo = UPGRADE_CATEGORIES.find(cat => cat.id === activeCategory);
  const categoryName = categoryInfo ? categoryInfo.name : 'Upgrades';
  
  // Group storage upgrades by tier
  const groupedUpgrades = activeCategory === 'storage' 
    ? availableUpgrades.reduce((groups, upgrade) => {
        const tier = upgrade.storageTier || 'other';
        if (!groups[tier]) groups[tier] = [];
        groups[tier].push(upgrade);
        return groups;
      }, {})
    : { all: availableUpgrades };
  
  return (
    <div className="space-y-4">
      {/* Category Header */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-bold text-neon-cyan">
          <span className="text-2xl">{categoryInfo?.icon || '⬆️'}</span>
          {categoryName}
        </h2>
      </div>
      
      {/* Upgrades List */}
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {availableUpgrades.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No upgrades available in this category yet. Progress further to unlock more!
          </div>
        ) : activeCategory === 'storage' ? (
          // Storage display: GB cards on first row, TB cards on second row
          <>
            {/* GB Tier - Single Row */}
            {groupedUpgrades['GB'] && groupedUpgrades['GB'].length > 0 && (
              <div className="upgrade-grid mb-4">
                {groupedUpgrades['GB'].map(upgrade => (
                  <UpgradeCard
                    key={upgrade.id}
                    upgrade={upgrade}
                    level={gameState.state.upgradeLevels[upgrade.id] || 0}
                    resources={gameState.state}
                    onPurchase={handlePurchase}
                    onToggle={handleToggle}
                    disabled={gameState.state.stage < upgrade.unlockStage}
                  />
                ))}
              </div>
            )}
            {/* TB Tier - Single Row */}
            {groupedUpgrades['TB'] && groupedUpgrades['TB'].length > 0 && (
              <div className="upgrade-grid mb-4">
                {groupedUpgrades['TB'].map(upgrade => (
                  <UpgradeCard
                    key={upgrade.id}
                    upgrade={upgrade}
                    level={gameState.state.upgradeLevels[upgrade.id] || 0}
                    resources={gameState.state}
                    onPurchase={handlePurchase}
                    onToggle={handleToggle}
                    disabled={gameState.state.stage < upgrade.unlockStage}
                  />
                ))}
              </div>
            )}
            {/* PB Tier and others */}
            {Object.entries(groupedUpgrades)
              .filter(([tier]) => tier !== 'GB' && tier !== 'TB' && tier !== 'all')
              .map(([tier, upgrades]) => (
                <div key={tier} className="space-y-2 mb-4">
                  <div className="text-sm font-semibold text-neon-purple mb-2">
                    {tier} Tier
                  </div>
                  <div className="upgrade-grid">
                    {upgrades.map(upgrade => (
                      <UpgradeCard
                        key={upgrade.id}
                        upgrade={upgrade}
                        level={gameState.state.upgradeLevels[upgrade.id] || 0}
                        resources={gameState.state}
                        onPurchase={handlePurchase}
                        onToggle={handleToggle}
                        disabled={gameState.state.stage < upgrade.unlockStage}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </>
        ) : (
          // Grid layout for all other categories - responsive with max-width
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 upgrade-grid">
            {availableUpgrades.map(upgrade => (
              <UpgradeCard
                key={upgrade.id}
                upgrade={upgrade}
                level={gameState.state.upgradeLevels[upgrade.id] || 0}
                resources={gameState.state}
                onPurchase={handlePurchase}
                onToggle={handleToggle}
                disabled={gameState.state.stage < upgrade.unlockStage}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
