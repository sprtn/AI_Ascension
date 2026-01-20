import { useState, useEffect, useRef } from 'react';
import { formatNumber, formatBitcoin, formatStorage, formatElectricity } from '../utils/formatters.js';
import { UPGRADES } from '../utils/constants.js';

export function AchievementToast({ achievement, onDismiss, index = 0, onRewardApply }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [rewardApplied, setRewardApplied] = useState(false);
  
  useEffect(() => {
    // Slide in
    setTimeout(() => setIsVisible(true), 50);
    
    // Auto-dismiss after 6 seconds
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        // Apply reward before dismissing if not already applied
        if (!rewardApplied && achievement?.reward && onRewardApply) {
          onRewardApply(achievement.id);
          setRewardApplied(true);
        }
        if (onDismiss) onDismiss();
      }, 300);
    }, 6000);
    
    return () => clearTimeout(timer);
  }, [onDismiss, rewardApplied, achievement, onRewardApply]);
  
  const handleClick = () => {
    // Apply reward immediately when clicked (before dismissing)
    if (!rewardApplied && achievement?.reward && onRewardApply) {
      onRewardApply(achievement.id);
      setRewardApplied(true);
    }
    setIsExiting(true);
    setTimeout(() => {
      if (onDismiss) onDismiss();
    }, 300);
  };
  
  if (!achievement) return null;
  
  return (
    <div
      className={`achievement-toast ${isVisible && !isExiting ? 'achievement-toast-visible' : 'achievement-toast-exiting'} ${achievement.glitch ? 'achievement-toast-glitch-effect' : ''}`}
      style={{ bottom: `${20 + index * 90}px` }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="achievement-toast-content">
        <div className="achievement-toast-icon">{achievement.glitch ? '⚠️' : '🏆'}</div>
        <div className="achievement-toast-text">
          <div className="achievement-toast-name">{achievement.name}</div>
          <div className="achievement-toast-description">{achievement.description}</div>
          {achievement.reward && (
            <div className="achievement-toast-reward" style={{ marginTop: '4px', fontSize: '10px', color: '#00ff88' }}>
              {achievement.reward.tokens && `+${formatNumber(achievement.reward.tokens)} Tokens `}
              {achievement.reward.satoshis && `+${formatBitcoin(achievement.reward.satoshis)} `}
              {achievement.reward.processingPower && `+${formatNumber(achievement.reward.processingPower)} FLOPS `}
              {achievement.reward.electricity && `+${formatElectricity(achievement.reward.electricity)} `}
              {achievement.reward.storage && `+${formatStorage(achievement.reward.storage)} `}
              {achievement.reward.addictivity && `+${formatNumber(achievement.reward.addictivity)} Addictivity `}
              {achievement.reward.upgradeLevels && Object.entries(achievement.reward.upgradeLevels).map(([upgradeId, levels]) => {
                let upgradeName = upgradeId;
                for (const category of Object.values(UPGRADES)) {
                  const upgrade = category.find(u => u.id === upgradeId);
                  if (upgrade) {
                    upgradeName = upgrade.name;
                    break;
                  }
                }
                return `+${levels}x ${upgradeName} `;
              })}
            </div>
          )}
        </div>
      </div>
      <div className="achievement-toast-glow"></div>
      <div className="achievement-toast-glitch"></div>
    </div>
  );
}

export function AchievementToastContainer({ achievements, onRewardApply }) {
  const [activeToasts, setActiveToasts] = useState([]);
  // Track which achievement IDs we've already shown to avoid duplicates
  const shownAchievementIdsRef = useRef(new Set());
  const prevAchievementIdsRef = useRef(new Set());
  const isInitializedRef = useRef(false);
  
  useEffect(() => {
    // Get current achievement IDs
    const currentIds = new Set(achievements.map(a => a.id));
    
    // On first mount, mark all current achievements as shown (don't show toasts for pre-existing achievements)
    if (!isInitializedRef.current) {
      shownAchievementIdsRef.current = new Set(currentIds);
      prevAchievementIdsRef.current = new Set(currentIds);
      isInitializedRef.current = true;
      return;
    }
    
    // Find newly unlocked achievements (in current but not in previous)
    const newAchievementIds = [...currentIds].filter(id => 
      !prevAchievementIdsRef.current.has(id) && 
      !shownAchievementIdsRef.current.has(id)
    );
    
    // Get the full achievement objects for new IDs
    const newAchievements = achievements.filter(a => newAchievementIds.includes(a.id));
    
    // Add new achievements to toasts
    if (newAchievements.length > 0) {
      setActiveToasts(prev => {
        // Filter out any duplicates and add new ones
        const existingIds = new Set(prev.map(t => t.id));
        const toAdd = newAchievements.filter(a => !existingIds.has(a.id));
        return [...prev, ...toAdd];
      });
      
      // Mark as shown
      newAchievements.forEach(a => {
        shownAchievementIdsRef.current.add(a.id);
      });
    }
    
    // Update ref for next comparison
    prevAchievementIdsRef.current = new Set(currentIds);
  }, [achievements]);
  
  const handleDismiss = (achievementId) => {
    setActiveToasts(prev => prev.filter(a => a.id !== achievementId));
  };
  
  return (
    <div className="achievement-toast-container">
      {activeToasts.map((achievement, index) => (
        <AchievementToast
          key={achievement.id}
          achievement={achievement}
          index={activeToasts.length - 1 - index}
          onDismiss={() => handleDismiss(achievement.id)}
          onRewardApply={onRewardApply}
        />
      ))}
    </div>
  );
}
