// Avoid double injection
if (!window.hasLagFreeDarkModeInjected) {
  window.hasLagFreeDarkModeInjected = true;

  const STYLE_ID = 'lag-free-dark-mode-style';

  // Helper to match domains (handles exact match & subdomains)
  const isSiteExcluded = (hostname, excludedSites) => {
    if (!excludedSites || !Array.isArray(excludedSites)) return false;
    const host = hostname.toLowerCase();
    return excludedSites.some(excluded => {
      const exc = excluded.toLowerCase();
      return host === exc || host.endsWith('.' + exc);
    });
  };

  // Helper to check if current time falls within the start/end schedule range
  const isTimeInSchedule = (startStr, endStr) => {
    if (!startStr || !endStr) return false;
    const now = new Date();
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    if (startMinutes < endMinutes) {
      // Overnight range not wrapping, e.g. 08:00 to 18:00
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Overnight range wrapping, e.g. 20:00 to 07:00
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  };

  // Setup periodic checker for schedule mode transition times
  const setupScheduleTimer = (mode) => {
    if (window.lagFreeDarkModeInterval) {
      clearInterval(window.lagFreeDarkModeInterval);
      window.lagFreeDarkModeInterval = null;
    }
    if (mode === 'schedule') {
      window.lagFreeDarkModeInterval = setInterval(window.evaluateAndApply, 30000); // Check every 30 seconds
    }
  };

  // Helper to apply or remove stylesheets and styles
  const applyStyling = (shouldApply, settings) => {
    let styleEl = document.getElementById(STYLE_ID);
    
    if (shouldApply) {
      if (!styleEl) {
        styleEl = document.createElement('link');
        styleEl.id = STYLE_ID;
        styleEl.rel = 'stylesheet';
        styleEl.type = 'text/css';
        styleEl.href = chrome.runtime.getURL('styles.css');
        document.documentElement.appendChild(styleEl);
      }
      
      if (settings) {
        const html = document.documentElement;
        html.style.setProperty('--dm-invert', `${settings.invert}%`);
        html.style.setProperty('--dm-brightness', `${settings.brightness}%`);
        html.style.setProperty('--dm-contrast', `${settings.contrast}%`);
        html.style.setProperty('--dm-grayscale', `${settings.grayscale}%`);
        
        // Calculate dynamic media contrast adjustment to preserve clarity
        const invertVal = settings.invert / 100;
        const diff = Math.abs(1 - 2 * invertVal);
        const mediaContrast = diff > 0.05 ? (1 / diff) : 1;
        const mediaContrastPercent = Math.round(mediaContrast * 100);
        
        html.style.setProperty('--dm-media-contrast', `${mediaContrastPercent}%`);
      }
    } else {
      if (styleEl) {
        styleEl.remove();
      }
      const html = document.documentElement;
      html.style.removeProperty('--dm-invert');
      html.style.removeProperty('--dm-brightness');
      html.style.removeProperty('--dm-contrast');
      html.style.removeProperty('--dm-grayscale');
      html.style.removeProperty('--dm-media-contrast');
    }
  };

  // Main evaluation logic
  window.evaluateAndApply = function() {
    chrome.storage.local.get(['darkModeEnabled', 'mode', 'scheduleStart', 'scheduleEnd', 'settings', 'excludedSites'], (result) => {
      const enabled = result.darkModeEnabled !== false;
      const mode = result.mode || 'manual';
      const scheduleStart = result.scheduleStart || '20:00';
      const scheduleEnd = result.scheduleEnd || '07:00';
      const settings = result.settings || { invert: 84.3, brightness: 105, contrast: 85, grayscale: 0 };
      const excludedSites = result.excludedSites || [];

      const hostname = window.location.hostname;
      
      setupScheduleTimer(mode);

      // Check site exclusions or master enable switch
      if (isSiteExcluded(hostname, excludedSites) || !enabled) {
        applyStyling(false);
        return;
      }

      let shouldApply = false;
      if (mode === 'manual') {
        shouldApply = true;
      } else if (mode === 'auto') {
        shouldApply = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else if (mode === 'schedule') {
        shouldApply = isTimeInSchedule(scheduleStart, scheduleEnd);
      }

      applyStyling(shouldApply, settings);
    });
  };

  // Run initial evaluation
  window.evaluateAndApply();

  // Storage listener to refresh page state on setting changes reactively
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      window.evaluateAndApply();
    }
  });

  // Listen to system prefers-color-scheme changes
  const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  try {
    systemDarkQuery.addEventListener('change', window.evaluateAndApply);
  } catch (e) {
    systemDarkQuery.addListener(window.evaluateAndApply);
  }
} else {
  // If script is loaded again (e.g. from background oninstall), trigger evaluation
  if (typeof window.evaluateAndApply === 'function') {
    window.evaluateAndApply();
  }
}
