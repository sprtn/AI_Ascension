import { useState } from 'react';
import { formatNumber } from '../utils/formatters.js';
import { VERSION_REQUIREMENTS, VERSION_MULTIPLIERS } from '../utils/constants.js';
import { incrementVersion } from '../utils/calculations.js';

export function Prestige({ gameState, gameActions }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isMajor, setIsMajor] = useState(false);
  
  const currentVersion = gameState.state.version;
  const [major, minor] = currentVersion.split('.').map(Number);
  
  // Calculate requirements
  const minorRequirements = VERSION_REQUIREMENTS.minor(currentVersion);
  const majorRequirements = VERSION_REQUIREMENTS.major(currentVersion);
  
  // Check if can prestige
  const canMinorPrestige = Object.entries(minorRequirements).every(
    ([resource, required]) => (gameState.state[resource] || 0) >= required
  );
  
  const canMajorPrestige = Object.entries(majorRequirements).every(
    ([resource, required]) => (gameState.state[resource] || 0) >= required
  );
  
  const handlePrestige = (major) => {
    const newVersion = incrementVersion(currentVersion, major);
    gameActions.prestige(newVersion);
    setShowConfirm(false);
  };
  
  // Calculate multiplier from version
  const versionMultiplier = Math.pow(VERSION_MULTIPLIERS.major, major) * 
                           Math.pow(VERSION_MULTIPLIERS.minor, minor);
  
  return (
    <div className="space-y-6">
      <div className="text-2xl font-bold text-neon-cyan mb-4">Versioning System</div>
      
      {/* Current Version Info */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-neon-purple/30">
        <div className="text-lg font-bold text-neon-purple mb-2">Current Version</div>
        <div className="text-3xl font-bold text-neon-cyan mb-2">v{currentVersion}</div>
        <div className="text-sm text-gray-400">
          Current multiplier: {formatNumber(versionMultiplier)}x
        </div>
      </div>
      
      {/* Minor Version Upgrade */}
      <div className={`bg-gray-800/50 rounded-lg p-4 border ${
        canMinorPrestige ? 'border-neon-green/50' : 'border-gray-700/50'
      }`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-lg font-bold text-neon-cyan mb-1">
              Minor Version: v{incrementVersion(currentVersion, false)}
            </div>
            <div className="text-sm text-gray-400">
              Grants {formatNumber(VERSION_MULTIPLIERS.minor)}x multiplier boost
            </div>
          </div>
          <button
            onClick={() => {
              setIsMajor(false);
              setShowConfirm(true);
            }}
            disabled={!canMinorPrestige}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              canMinorPrestige
                ? 'bg-neon-green/20 text-neon-green border border-neon-green/50 hover:bg-neon-green/30 hover:shadow-lg hover:shadow-neon-green/50'
                : 'bg-gray-700/50 text-gray-500 border border-gray-700 cursor-not-allowed'
            }`}
          >
            Prestige
          </button>
        </div>
        
        <div className="space-y-1 text-xs text-gray-400">
          {Object.entries(minorRequirements).map(([resource, required]) => {
            const current = gameState.state[resource] || 0;
            const met = current >= required;
            return (
              <div key={resource} className="flex justify-between">
                <span className="capitalize">{resource}:</span>
                <span className={met ? 'text-neon-green' : 'text-gray-500'}>
                  {formatNumber(current)} / {formatNumber(required)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Major Version Upgrade */}
      <div className={`bg-gray-800/50 rounded-lg p-4 border ${
        canMajorPrestige ? 'border-neon-purple/50' : 'border-gray-700/50'
      }`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-lg font-bold text-neon-purple mb-1">
              Major Version: v{incrementVersion(currentVersion, true)}
            </div>
            <div className="text-sm text-gray-400">
              Grants {formatNumber(VERSION_MULTIPLIERS.major)}x multiplier boost
            </div>
            <div className="text-xs text-yellow-400 mt-1">
              ⚠️ Resets all resources and stage, but keeps upgrades and achievements
            </div>
          </div>
          <button
            onClick={() => {
              setIsMajor(true);
              setShowConfirm(true);
            }}
            disabled={!canMajorPrestige}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              canMajorPrestige
                ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/50 hover:bg-neon-purple/30 hover:shadow-lg hover:shadow-neon-purple/50'
                : 'bg-gray-700/50 text-gray-500 border border-gray-700 cursor-not-allowed'
            }`}
          >
            Prestige
          </button>
        </div>
        
        <div className="space-y-1 text-xs text-gray-400">
          {Object.entries(majorRequirements).map(([resource, required]) => {
            const current = gameState.state[resource] || 0;
            const met = current >= required;
            return (
              <div key={resource} className="flex justify-between">
                <span className="capitalize">{resource}:</span>
                <span className={met ? 'text-neon-purple' : 'text-gray-500'}>
                  {formatNumber(current)} / {formatNumber(required)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 border border-neon-cyan/50 max-w-md">
            <div className="text-xl font-bold text-neon-cyan mb-4">
              Confirm Prestige
            </div>
            <div className="text-gray-300 mb-4">
              {isMajor ? (
                <>
                  Are you sure you want to prestige to v{incrementVersion(currentVersion, true)}?
                  <br />
                  <br />
                  This will reset all resources and your stage, but you'll keep all upgrades and achievements.
                  <br />
                  <br />
                  You'll gain a {formatNumber(VERSION_MULTIPLIERS.major)}x permanent multiplier!
                </>
              ) : (
                <>
                  Prestige to v{incrementVersion(currentVersion, false)}?
                  <br />
                  <br />
                  You'll gain a {formatNumber(VERSION_MULTIPLIERS.minor)}x permanent multiplier!
                </>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handlePrestige(isMajor)}
                className="flex-1 px-4 py-2 bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 rounded-lg hover:bg-neon-cyan/30 font-semibold"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-600 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
