// Number formatting utilities

const suffixes = [
  { value: 1e18, suffix: 'Qi' }, // Quintillion
  { value: 1e15, suffix: 'Qa' }, // Quadrillion
  { value: 1e12, suffix: 'T' },  // Trillion
  { value: 1e9, suffix: 'B' },   // Billion
  { value: 1e6, suffix: 'M' },   // Million
  { value: 1e3, suffix: 'K' },  // Thousand
];

/**
 * Format a number with appropriate suffix (K, M, B, T, etc.)
 * @param {number} num - The number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted number string
 */
export function formatNumber(num, decimals = 2) {
  if (num === 0) return '0';
  if (num < 0) return '-' + formatNumber(-num, decimals);
  
  // Handle very small numbers
  if (num < 1 && num > 0) {
    if (num < 0.01) {
      return num.toExponential(2);
    }
    return num.toFixed(decimals);
  }
  
  // Find appropriate suffix
  for (const { value, suffix } of suffixes) {
    if (num >= value) {
      // Always show 2 decimal places for numbers with suffixes (K, M, B, etc.)
      const formatted = (num / value).toFixed(2);
      return formatted + suffix;
    }
  }
  
  // For numbers less than 1000, show with appropriate decimals
  if (num < 1000) {
    return num.toFixed(decimals === 2 && num < 1 ? 2 : 0);
  }
  
  // For extremely large numbers, use scientific notation
  if (num >= 1e18) {
    return num.toExponential(2);
  }
  
  return num.toFixed(0);
}

/**
 * Format storage size (GB, TB, PB)
 * @param {number} gb - Size in GB
 * @returns {string} Formatted string (e.g., "1 GB", "1.5 TB", "2 PB")
 */
export function formatStorage(gb) {
  if (gb === 0) return '0 GB';
  
  const TB = 1000; // 1 TB = 1000 GB
  const PB = 1000 * 1000; // 1 PB = 1000 TB = 1,000,000 GB
  
  if (gb >= PB) {
    return (gb / PB).toFixed(2).replace(/\.?0+$/, '') + ' PB';
  } else if (gb >= TB) {
    return (gb / TB).toFixed(2).replace(/\.?0+$/, '') + ' TB';
  } else {
    return formatNumber(gb, 0) + ' GB';
  }
}

/**
 * Format electricity (kWh, mWh, gWh, tWh, etc.)
 * @param {number} kwh - Amount in kWh
 * @returns {string} Formatted string (e.g., "1 kWh", "1.5 mWh", "2 gWh")
 */
export function formatElectricity(kwh) {
  if (kwh === 0) return '0 kWh';
  
  const mWh = 1000; // 1 mWh = 1000 kWh
  const gWh = 1000 * 1000; // 1 gWh = 1000 mWh = 1,000,000 kWh
  const tWh = 1000 * 1000 * 1000; // 1 tWh = 1000 gWh = 1,000,000,000 kWh
  const pWh = 1000 * 1000 * 1000 * 1000; // 1 pWh = 1000 tWh
  
  if (kwh >= pWh) {
    return (kwh / pWh).toFixed(2).replace(/\.?0+$/, '') + ' pWh';
  } else if (kwh >= tWh) {
    return (kwh / tWh).toFixed(2).replace(/\.?0+$/, '') + ' tWh';
  } else if (kwh >= gWh) {
    return (kwh / gWh).toFixed(2).replace(/\.?0+$/, '') + ' gWh';
  } else if (kwh >= mWh) {
    return (kwh / mWh).toFixed(2).replace(/\.?0+$/, '') + ' mWh';
  } else {
    return formatNumber(kwh, 2) + ' kWh';
  }
}

/**
 * Format a number for display with full precision when needed
 * @param {number} num - The number to format
 * @returns {string} Formatted number string
 */
export function formatNumberFull(num) {
  if (num === 0) return '0';
  if (num < 1e6) {
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  return formatNumber(num);
}

/**
 * Parse a formatted number string back to a number
 * @param {string} str - Formatted number string
 * @returns {number} Parsed number
 */
export function parseFormattedNumber(str) {
  if (!str || str === '0') return 0;
  
  const trimmed = str.trim().toUpperCase();
  const suffix = trimmed.slice(-1);
  const numberPart = parseFloat(trimmed.slice(0, -1));
  
  if (isNaN(numberPart)) return 0;
  
  const suffixMap = {
    'K': 1e3,
    'M': 1e6,
    'B': 1e9,
    'T': 1e12,
    'QA': 1e15,
    'QI': 1e18,
  };
  
  const multiplier = suffixMap[suffix] || 1;
  return numberPart * multiplier;
}

/**
 * Format version number (semantic versioning)
 * @param {string} version - Version string (e.g., "1.2.3")
 * @returns {string} Formatted version string
 */
export function formatVersion(version) {
  return `v${version}`;
}

/**
 * Format Bitcoin (SATS to BTC)
 * 1 BTC = 100,000,000 SATS
 * @param {number} satoshis - Amount in satoshis
 * @returns {string} Formatted string (e.g., "1.5 BTC" or "50M SATS")
 */
export function formatBitcoin(satoshis) {
  const BTC_CONVERSION = 100000000; // 1 BTC = 100M SATS
  
  if (satoshis === 0) return '0 SATS';
  
  if (satoshis >= BTC_CONVERSION) {
    const btc = satoshis / BTC_CONVERSION;
    if (btc >= 1000) {
      return formatNumber(btc) + ' BTC';
    }
    return btc.toFixed(8).replace(/\.?0+$/, '') + ' BTC';
  }
  
  return formatNumber(satoshis) + ' SATS';
}

/**
 * Compare two version strings
 * @param {string} v1 - First version
 * @param {string} v2 - Second version
 * @returns {number} -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }
  
  return 0;
}
