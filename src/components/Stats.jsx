import { formatNumber, formatNumberFull } from '../utils/formatters.js';
import { calculateGeneration, calculateClickPower } from '../utils/calculations.js';
import { STAGES } from '../utils/constants.js';

export function Stats({ gameState }) {
  const generation = calculateGeneration(
    gameState.state.upgradeLevels,
    gameState.state.stage,
    gameState.state.version,
    gameState.state.toggledUpgrades || {}
  );
  
  const clickPower = calculateClickPower(
    gameState.state.upgradeLevels,
    gameState.state.stage,
    gameState.state.version
  );
  
  const currentStage = STAGES[gameState.state.stage];
  const playTimeHours = Math.floor(gameState.state.playTime / 3600);
  const playTimeMinutes = Math.floor((gameState.state.playTime % 3600) / 60);
  const playTimeSeconds = Math.floor(gameState.state.playTime % 60);
  
  return (
    <div className="space-y-6">
      <div className="text-2xl font-bold text-neon-cyan mb-4">Statistics</div>
      
      {/* Generation Rates */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-neon-purple/30">
        <div className="text-lg font-bold text-neon-purple mb-3">Generation Rates (per second)</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Tokens:</span>
            <span className="text-neon-cyan font-mono">{formatNumber(generation.tokens)}/s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Processing Power:</span>
            <span className="text-neon-purple font-mono">{formatNumber(generation.processingPower)}/s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Electricity:</span>
            <span className="text-neon-green font-mono">{formatNumber(generation.electricity)}/s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Storage:</span>
            <span className="text-neon-cyan font-mono">Capacity: {formatNumber(gameState.state.storage)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Addictivity:</span>
            <span className="text-neon-purple font-mono">{formatNumber(generation.addictivity)}/s</span>
          </div>
        </div>
      </div>
      
      {/* Current Stats */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-neon-cyan/30">
        <div className="text-lg font-bold text-neon-cyan mb-3">Current Stats</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Click Power:</span>
            <span className="text-neon-cyan font-mono">+{formatNumber(clickPower)} tokens</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Current Stage:</span>
            <span className="text-neon-purple">{currentStage.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Version:</span>
            <span className="text-neon-cyan">v{gameState.state.version}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Upgrades Purchased:</span>
            <span className="text-neon-green">
              {Object.keys(gameState.state.upgradeLevels).length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Achievements:</span>
            <span className="text-neon-purple">
              {gameState.state.achievements.length}
            </span>
          </div>
        </div>
      </div>
      
      {/* Lifetime Stats */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-neon-green/30">
        <div className="text-lg font-bold text-neon-green mb-3">Lifetime Statistics</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Total Clicks:</span>
            <span className="text-neon-cyan font-mono">{formatNumberFull(gameState.state.totalClicks)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Total Tokens Generated:</span>
            <span className="text-neon-purple font-mono">{formatNumber(gameState.state.totalTokensGenerated)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Play Time:</span>
            <span className="text-neon-green">
              {playTimeHours}h {playTimeMinutes}m {playTimeSeconds}s
            </span>
          </div>
        </div>
      </div>
      
      {/* Active Events */}
      {Object.keys(gameState.state.activeEvents).length > 0 && (
        <div className="bg-yellow-500/20 rounded-lg p-4 border border-yellow-500/50">
          <div className="text-lg font-bold text-yellow-400 mb-3">Active Events</div>
          <div className="space-y-2">
            {Object.values(gameState.state.activeEvents).map(event => (
              <div key={event.id} className="text-sm text-yellow-300">
                <div className="font-bold">{event.name}</div>
                <div className="text-yellow-400/80">{event.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
