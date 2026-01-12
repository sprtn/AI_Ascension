import { formatNumber, formatBitcoin, formatElectricity } from '../utils/formatters.js';
import { calculateUpgradeCost, canAfford, calculateGeneration, calculateProcessingPowerConsumption } from '../utils/calculations.js';

export function UpgradeCard({ upgrade, level, resources, onPurchase, disabled, onToggle }) {
  const currentLevel = level || 0;
  const cost = calculateUpgradeCost(upgrade, currentLevel);
  
  // If cost is empty, it means the upgrade only requires GPT Mini (no resource cost)
  const hasResourceCost = Object.keys(cost).length > 0;
  
  // Calculate generation to check processing power requirements
  const generation = calculateGeneration(
    resources.upgradeLevels || {},
    resources.stage || 0,
    resources.version || '0.1.0',
    resources.toggledUpgrades || {}
  );
  
  // Calculate processing power consumption for excess calculation
  const processingPowerConsumption = calculateProcessingPowerConsumption(resources.upgradeLevels || {});
  const excessProcessingPower = Math.max(0, generation.processingPower - processingPowerConsumption);
  
  // Check affordability
  // If there's no resource cost, it's affordable if GPT Mini requirement is met
  let affordable = hasResourceCost ? canAfford(resources, cost) : true;
  
  // Check processing power requirement
  if (upgrade.requiresProcessingPower) {
    if (excessProcessingPower < upgrade.requiresProcessingPower) {
      affordable = false;
    }
  }
  
  // Check GPT Mini requirement
  if (upgrade.costsGptMini) {
    const gptMiniLevel = (resources.upgradeLevels || {})['gpt-mini'] || 0;
    if (gptMiniLevel < upgrade.costsGptMini) {
      affordable = false;
    }
  }
  
  const maxLevel = upgrade.maxLevel || Infinity;
  const canBuy = affordable && currentLevel < maxLevel && !disabled;
  
  // Check if upgrade is toggled (for toggleable upgrades like token conversion)
  const isToggled = upgrade.effect?.tokenToSatsConversion 
    ? (resources.toggledUpgrades?.[upgrade.id] !== false) // Default to true
    : false;
  
  const handleClick = () => {
    if (canBuy) {
      onPurchase(upgrade.id, currentLevel + 1, cost, upgrade.effect);
    }
  };
  
  const handleDecrease = (e) => {
    e.stopPropagation();
    if (currentLevel > 0 && onPurchase) {
      // Decrease level (no cost, just set level lower)
      // Note: In a full implementation, you'd want to refund resources
      onPurchase(upgrade.id, currentLevel - 1, {}, upgrade.effect);
    }
  };
  
  const handleIncrease = (e) => {
    e.stopPropagation();
    if (canBuy) {
      onPurchase(upgrade.id, currentLevel + 1, cost, upgrade.effect);
    }
  };
  
  const handleToggle = (e) => {
    if (e) {
      e.stopPropagation(); // Prevent card click
      e.preventDefault();
    }
    if (onToggle && currentLevel > 0) {
      onToggle(upgrade.id);
    }
  };
  
  const handleToggleClick = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    handleToggle(e);
  };
  
  // Check if this is the NSFW upgrade
  const isNsfwUpgrade = upgrade.id === 'nsfw-reddit-clickbait';
  
  // Determine color based on category (could be passed as prop in future)
  const cardColor = 'neon-cyan';
  
  return (
    <div 
      className={`upgrade-card ${canBuy && !isNsfwUpgrade ? 'upgrade-card-clickable' : 'upgrade-card-disabled'}`}
      data-color={cardColor}
      data-forbidden={upgrade.isForbidden ? 'true' : 'false'}
      onClick={canBuy && !isNsfwUpgrade ? handleClick : undefined}
    >
      <div className="upgrade-card-content">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-base font-bold text-neon-cyan">{upgrade.name}</h3>
          {currentLevel > 0 && (
            <span className="text-xs px-2 py-1 rounded bg-neon-purple/20 text-neon-purple">
              Lv {currentLevel}
            </span>
          )}
        </div>
        <div className="mb-3">
          <p className={`text-xs mb-3 ${upgrade.isForbidden ? 'text-red-300/80' : 'text-gray-400'}`}>
            {upgrade.description}
          </p>
          {upgrade.effect?.tokenToSatsConversion && (
            <div className="text-xs text-neon-green font-mono mb-3">
              Convert {formatNumber(upgrade.effect.tokenToSatsConversion.tokens)} Token → {formatNumber(upgrade.effect.tokenToSatsConversion.satoshis)} SATS/sec
            </div>
          )}
        </div>
        
        {/* Cost Section - Individual Cost Cards */}
        {(Object.keys(cost).length > 0 || upgrade.requiresProcessingPower || upgrade.costsGptMini) && (
          <div className="mb-3">
            {/* Cost Section Header */}
            <div className="mb-2">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Cost</span>
            </div>
            
            {/* Individual Cost Cards Container */}
            <div className="flex flex-row flex-wrap gap-2">
              {/* Resource costs - each in its own card */}
              {Object.keys(cost).length > 0 && (
                Object.entries(cost).map(([resource, amount]) => {
                  // Resource-specific styling
                  const resourceStyles = {
                    tokens: {
                      icon: '🪙',
                      bg: 'bg-cyan-900/30',
                      border: 'border-cyan-500/40',
                      text: 'text-cyan-300',
                      iconBg: 'bg-cyan-500/20',
                      accent: 'rgba(6, 182, 212, 0.3)',
                    },
                    satoshis: {
                      icon: '₿',
                      bg: 'bg-green-900/30',
                      border: 'border-green-500/40',
                      text: 'text-green-300',
                      iconBg: 'bg-green-500/20',
                      accent: 'rgba(34, 197, 94, 0.3)',
                    },
                    electricity: {
                      icon: '⚡',
                      bg: 'bg-yellow-900/30',
                      border: 'border-yellow-500/40',
                      text: 'text-yellow-300',
                      iconBg: 'bg-yellow-500/20',
                      accent: 'rgba(234, 179, 8, 0.3)',
                    },
                    storage: {
                      icon: '💾',
                      bg: 'bg-blue-900/30',
                      border: 'border-blue-500/40',
                      text: 'text-blue-300',
                      iconBg: 'bg-blue-500/20',
                      accent: 'rgba(59, 130, 246, 0.3)',
                    },
                    processingPower: {
                      icon: '💻',
                      bg: 'bg-purple-900/30',
                      border: 'border-purple-500/40',
                      text: 'text-purple-300',
                      iconBg: 'bg-purple-500/20',
                      accent: 'rgba(168, 85, 247, 0.3)',
                    },
                    addictivity: {
                      icon: '🧠',
                      bg: 'bg-pink-900/30',
                      border: 'border-pink-500/40',
                      text: 'text-pink-300',
                      iconBg: 'bg-pink-500/20',
                      accent: 'rgba(236, 72, 153, 0.3)',
                    },
                  };
                  
                  const style = resourceStyles[resource] || {
                    icon: '',
                    bg: 'bg-gray-700/30',
                    border: 'border-gray-500/40',
                    text: 'text-gray-300',
                    iconBg: 'bg-gray-500/20',
                    accent: 'rgba(107, 114, 128, 0.3)',
                  };
                  
                  const canAffordResource = (resources[resource] || 0) >= amount;
                  const textColor = canAffordResource ? style.text : 'text-red-400';
                  
                  return (
                    <div
                      key={resource}
                      className="internal-cost-card flex-shrink-0"
                      style={{
                        borderColor: style.border.includes('cyan') ? 'rgba(6, 182, 212, 0.4)' :
                                    style.border.includes('green') ? 'rgba(34, 197, 94, 0.4)' :
                                    style.border.includes('yellow') ? 'rgba(234, 179, 8, 0.4)' :
                                    style.border.includes('blue') ? 'rgba(59, 130, 246, 0.4)' :
                                    style.border.includes('purple') ? 'rgba(168, 85, 247, 0.4)' :
                                    style.border.includes('pink') ? 'rgba(236, 72, 153, 0.4)' :
                                    'rgba(107, 114, 128, 0.2)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {/* Icon with background */}
                        <div className={`
                          ${style.iconBg}
                          rounded
                          w-6
                          h-6
                          flex
                          items-center
                          justify-center
                          text-sm
                          flex-shrink-0
                        `}>
                          <span>{style.icon}</span>
                        </div>
                        
                        {/* Value */}
                        <span className={`text-xs font-semibold ${textColor} font-mono whitespace-nowrap`}>
                          {resource === 'satoshis' ? formatBitcoin(amount) : 
                           resource === 'electricity' ? formatElectricity(amount) :
                           formatNumber(amount)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              
              {/* Requirements - each in its own card */}
              {upgrade.requiresProcessingPower && (
                <div 
                  className="internal-cost-card flex-shrink-0"
                  style={{ borderColor: 'rgba(168, 85, 247, 0.4)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="bg-purple-500/20 rounded w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">
                      <span>💻</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="text-[9px] text-gray-400 leading-tight">Requires</div>
                      <span className={`text-xs font-semibold font-mono leading-tight whitespace-nowrap ${
                        excessProcessingPower >= upgrade.requiresProcessingPower ? 'text-purple-300' : 'text-red-400'
                      }`}>
                        {upgrade.requiresProcessingPower} FLOPS/s
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {upgrade.costsGptMini && (
                <div 
                  className="internal-cost-card flex-shrink-0"
                  style={{ borderColor: 'rgba(234, 179, 8, 0.4)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="bg-yellow-500/20 rounded w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">
                      <span>🤖</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="text-[9px] text-gray-400 leading-tight">Costs</div>
                      <span className={`text-xs font-semibold font-mono leading-tight whitespace-nowrap ${
                        (resources.upgradeLevels || {})['gpt-mini'] >= upgrade.costsGptMini ? 'text-yellow-300' : 'text-red-400'
                      }`}>
                        {upgrade.costsGptMini} GPT Mini
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* NSFW Upgrade: Quantity Controls + Toggle */}
        {isNsfwUpgrade ? (
          <div className="flex items-center gap-2 w-full" style={{ flexWrap: 'nowrap' }}>
            <button
              onClick={handleDecrease}
              disabled={currentLevel === 0}
              className="cyberpunk-button-small cyberpunk-button-decrease"
              style={{ flexShrink: 0 }}
              title="Decrease level"
            >
              <span className="terminal-text">-</span>
            </button>
            <div className="text-center px-3 py-2 rounded bg-gray-800/50 border border-neon-cyan/30 min-w-[60px]" style={{ flexShrink: 0 }}>
              <span className="text-neon-cyan font-mono font-bold terminal-text">{currentLevel}</span>
            </div>
            <button
              onClick={handleIncrease}
              disabled={!canBuy}
              className="cyberpunk-button-small cyberpunk-button-increase"
              style={{ flexShrink: 0 }}
              title="Increase level"
            >
              <span className="terminal-text">+</span>
            </button>
            
            {/* Toggle Switch - Show if level > 0 and onToggle exists */}
            {currentLevel > 0 && onToggle ? (
              <div 
                className="cyberpunk-toggle-container" 
                style={{ flexShrink: 0, marginLeft: 'auto' }}
                onClick={handleToggleClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggleClick(e);
                  }
                }}
              >
                <div className={`cyberpunk-toggle-label ${isToggled ? 'cyberpunk-toggle-on' : 'cyberpunk-toggle-off'}`}>
                  <span className="cyberpunk-toggle-slider"></span>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          /* Regular Upgrade: Cyberpunk Buy Button */
          <button
            onClick={handleClick}
            disabled={!canBuy}
            className={`cyberpunk-buy-button ${canBuy ? 'cyberpunk-buy-button-active' : 'cyberpunk-buy-button-disabled'}`}
          >
            <div className="cyberpunk-buy-button-content">
              <span className="terminal-text">[PURCHASE]</span>
              {currentLevel > 0 && (
                <span className="cyberpunk-buy-button-level">Lv {currentLevel + 1}</span>
              )}
            </div>
            {canBuy && (
              <>
                <div className="cyberpunk-buy-button-scanlines"></div>
                <div className="cyberpunk-buy-button-glitch"></div>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
