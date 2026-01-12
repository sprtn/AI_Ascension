import { useState, useEffect } from 'react';

export function AchievementToast({ achievement, onDismiss, index = 0 }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  useEffect(() => {
    // Slide in
    setTimeout(() => setIsVisible(true), 50);
    
    // Auto-dismiss after 6 seconds
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        if (onDismiss) onDismiss();
      }, 300);
    }, 6000);
    
    return () => clearTimeout(timer);
  }, [onDismiss]);
  
  const handleClick = () => {
    setIsExiting(true);
    setTimeout(() => {
      if (onDismiss) onDismiss();
    }, 300);
  };
  
  if (!achievement) return null;
  
  return (
    <div
      className={`achievement-toast ${isVisible && !isExiting ? 'achievement-toast-visible' : 'achievement-toast-exiting'}`}
      style={{ bottom: `${20 + index * 100}px` }}
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
        <div className="achievement-toast-icon">🏆</div>
        <div className="achievement-toast-text">
          <div className="achievement-toast-name">{achievement.name}</div>
          <div className="achievement-toast-description">{achievement.description}</div>
        </div>
      </div>
      <div className="achievement-toast-glow"></div>
      <div className="achievement-toast-glitch"></div>
    </div>
  );
}

export function AchievementToastContainer({ achievements }) {
  const [activeToasts, setActiveToasts] = useState([]);
  // Initialize with achievements that are already in the list (from saved state)
  // so we don't show toasts for achievements that were unlocked before mount
  const [shownAchievements, setShownAchievements] = useState(() => 
    new Set(achievements.map(a => a.id))
  );
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    // On first mount, mark as initialized but don't show toasts for existing achievements
    if (!isInitialized) {
      setIsInitialized(true);
      return;
    }
    
    // After initialization, only show toasts for NEW achievements
    achievements.forEach(achievement => {
      if (!shownAchievements.has(achievement.id) && !activeToasts.find(t => t.id === achievement.id)) {
        setActiveToasts(prev => [...prev, achievement]);
        setShownAchievements(prev => new Set([...prev, achievement.id]));
      }
    });
  }, [achievements, activeToasts, shownAchievements, isInitialized]);
  
  const handleDismiss = (achievementId) => {
    setActiveToasts(prev => prev.filter(a => a.id !== achievementId));
  };
  
  return (
    <div className="achievement-toast-container">
      {activeToasts.map((achievement, index) => (
        <AchievementToast
          key={achievement.id}
          achievement={achievement}
          index={index}
          onDismiss={() => handleDismiss(achievement.id)}
        />
      ))}
    </div>
  );
}
