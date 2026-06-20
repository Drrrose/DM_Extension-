// Avoid double injection
if (!window.hasLagFreeDarkModeInjected) {
  window.hasLagFreeDarkModeInjected = true;

  const STYLE_ID = 'lag-free-dark-mode-style';
  let mediaObserver = null;
  let scanTimeout = null;

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

  // Heuristic to check if a CSS color value represents a grayscale color (black, white, gray)
  const isColorGrayscale = (color) => {
    if (!color) return false;
    const normalized = color.trim().toLowerCase();
    if (normalized === 'black' || normalized === 'white' || normalized === 'gray' || normalized === 'grey' || normalized === 'transparent') {
      return true;
    }
    
    // Hex code matching (e.g. #333, #333333, #1a1a1aff)
    if (normalized.startsWith('#')) {
      const hex = normalized.slice(1);
      if (hex.length === 3 || hex.length === 4) {
        return hex[0] === hex[1] && hex[1] === hex[2];
      }
      if (hex.length === 6 || hex.length === 8) {
        return hex.slice(0, 2) === hex.slice(2, 4) && hex.slice(2, 4) === hex.slice(4, 6);
      }
    }
    
    // RGB/RGBA matching (e.g. rgb(51, 51, 51), rgba(0,0,0,0.5))
    if (normalized.startsWith('rgb')) {
      const parts = normalized.match(/\d+/g);
      if (parts && parts.length >= 3) {
        return parts[0] === parts[1] && parts[1] === parts[2];
      }
    }
    
    return false;
  };

  // Inspect an SVG and mark it as .dm-no-revert if it is a monochrome icon
  const inspectSvg = (svg) => {
    if (svg.classList.contains('dm-no-revert') || svg.classList.contains('dm-preserve-bg')) return;
    
    const shapes = svg.querySelectorAll('[fill], [stroke]');
    const colors = new Set();
    
    for (let i = 0; i < shapes.length; i++) {
      const fill = shapes[i].getAttribute('fill');
      const stroke = shapes[i].getAttribute('stroke');
      
      if (fill && fill !== 'none' && fill !== 'currentColor' && !fill.startsWith('url')) {
        colors.add(fill);
      }
      if (stroke && stroke !== 'none' && stroke !== 'currentColor' && !stroke.startsWith('url')) {
        colors.add(stroke);
      }
    }
    
    // If it has 0 or 1 custom colors, or if all used colors are grayscale,
    // let it invert naturally (so black icons become white icons)
    if (colors.size <= 1) {
      svg.classList.add('dm-no-revert');
    } else {
      let allGrayscale = true;
      for (const color of colors) {
        if (!isColorGrayscale(color)) {
          allGrayscale = false;
          break;
        }
      }
      if (allGrayscale) {
        svg.classList.add('dm-no-revert');
      }
    }
  };

  // Inspect an Image and mark it as .dm-no-revert if it is a small transparent logo or icon
  const inspectImg = (img) => {
    if (img.classList.contains('dm-no-revert') || img.classList.contains('dm-preserve-bg')) return;
    
    const src = img.src || '';
    const className = img.className || '';
    const id = img.id || '';
    
    // Check if filename, classes, or IDs suggest it is a UI icon/logo
    const isIconOrLogo = /logo|icon|brand|search|arrow|chevron|close|menu|magnify|cart|settings/i.test(src) || 
                         /logo|icon|brand|search|arrow|chevron|close|menu|magnify|cart|settings/i.test(className) || 
                         /logo|icon|brand|search|arrow|chevron|close|menu|magnify|cart|settings/i.test(id);
    
    const width = img.naturalWidth || parseInt(img.getAttribute('width')) || img.clientWidth;
    const height = img.naturalHeight || parseInt(img.getAttribute('height')) || img.clientHeight;
    
    // Small transparent icons or logos are kept inverted to turn white/light (not re-inverted)
    if (isIconOrLogo && width > 0 && width <= 80 && height > 0 && height <= 80) {
      img.classList.add('dm-no-revert');
    }
  };

  // Lazy-scans the page for background images, SVGs, and images in chunks to avoid blocking threads
  const scanPageForExemptions = () => {
    const bgElements = document.querySelectorAll('div, section, header, footer, a, span, button');
    const bgLen = bgElements.length;
    const svgs = document.querySelectorAll('svg');
    const imgs = document.querySelectorAll('img');
    
    let bgIndex = 0;
    const chunkSize = 150;
    
    function processChunk() {
      const bgEnd = Math.min(bgIndex + chunkSize, bgLen);
      for (let i = bgIndex; i < bgEnd; i++) {
        const el = bgElements[i];
        if (el.classList.contains('dm-preserve-bg') || el.style.backgroundImage) continue;
        
        const computedStyle = window.getComputedStyle(el);
        const bgImg = computedStyle.backgroundImage;
        
        if (bgImg && bgImg !== 'none' && bgImg.startsWith('url')) {
          el.classList.add('dm-preserve-bg');
        }
      }
      bgIndex = bgEnd;
      
      if (bgIndex >= bgLen) {
        // SVGs
        for (let i = 0; i < svgs.length; i++) {
          inspectSvg(svgs[i]);
        }
        // Images
        for (let i = 0; i < imgs.length; i++) {
          const img = imgs[i];
          if (img.complete) {
            inspectImg(img);
          } else {
            img.addEventListener('load', () => inspectImg(img), { once: true });
          }
        }
      } else {
        if (window.requestIdleCallback) {
          window.requestIdleCallback(processChunk);
        } else {
          setTimeout(processChunk, 16);
        }
      }
    }
    
    if (window.requestIdleCallback) {
      window.requestIdleCallback(processChunk);
    } else {
      setTimeout(processChunk, 16);
    }
  };

  // Debounced wrapper for page scanning
  const triggerPageScan = () => {
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = setTimeout(scanPageForExemptions, 250);
  };

  // Manage MutationObserver activation based on dark mode status
  const startMediaObserver = () => {
    if (mediaObserver) return;
    mediaObserver = new MutationObserver((mutations) => {
      let shouldScan = false;
      for (let i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes.length > 0) {
          shouldScan = true;
          break;
        }
      }
      if (shouldScan) {
        triggerPageScan();
      }
    });
    mediaObserver.observe(document.documentElement, { childList: true, subtree: true });
    triggerPageScan(); // Initial scan
  };

  const stopMediaObserver = () => {
    if (mediaObserver) {
      mediaObserver.disconnect();
      mediaObserver = null;
    }
    if (scanTimeout) {
      clearTimeout(scanTimeout);
      scanTimeout = null;
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
      
      // Start observer to handle dynamic background images, SVGs, and transparent icons
      startMediaObserver();
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
      
      // Stop observer to free resources when dark mode is off
      stopMediaObserver();
    }
  };

  // Main evaluation logic
  window.evaluateAndApply = function() {
    chrome.storage.local.get(['darkModeEnabled', 'mode', 'scheduleStart', 'scheduleEnd', 'settings', 'excludedSites'], (result) => {
      const enabled = result.darkModeEnabled !== false;
      const mode = result.mode || 'manual';
      const scheduleStart = result.scheduleStart || '20:00';
      const scheduleEnd = result.scheduleEnd || '07:00';
      const settings = result.settings || { invert: 100, brightness: 100, contrast: 100, grayscale: 0 };
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
