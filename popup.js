// Default settings definitions (Pitch Black)
const DEFAULTS = {
  invert: 100,
  brightness: 100,
  contrast: 100,
  grayscale: 0
};

// Preset configurations
const PRESETS = {
  soft: {
    invert: 84.3,
    brightness: 105,
    contrast: 85,
    grayscale: 0
  },
  pitch: {
    invert: 100,
    brightness: 100,
    contrast: 100,
    grayscale: 0
  }
};

let currentDomain = null;

// Debounce helper to prevent writing to storage too frequently during slider drag
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Initial initialization on popup load
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  detectActiveTab();
  setupEventListeners();
});

// Load settings from storage and populate the UI
function loadSettings() {
  chrome.storage.local.get(['darkModeEnabled', 'mode', 'scheduleStart', 'scheduleEnd', 'settings', 'excludedSites'], (result) => {
    // Master toggle
    document.getElementById('master-toggle').checked = result.darkModeEnabled !== false;
    
    // Mode UI
    const activeMode = result.mode || 'manual';
    updateModeUI(activeMode);

    // Schedule inputs
    document.getElementById('time-start').value = result.scheduleStart || '20:00';
    document.getElementById('time-end').value = result.scheduleEnd || '07:00';

    // Sliders
    const settings = result.settings || DEFAULTS;
    updateSliderUI('invert', settings.invert);
    updateSliderUI('brightness', settings.brightness);
    updateSliderUI('contrast', settings.contrast);
    updateSliderUI('grayscale', settings.grayscale);

    // Preset indicator
    highlightPreset(settings);

    // Excluded sites list
    renderExclusions(result.excludedSites || []);
  });
}

// Detect current active tab URL and extract domain
function detectActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && tab.url) {
      try {
        const urlObj = new URL(tab.url);
        const hostname = urlObj.hostname;
        
        // Exclude system pages and browser internal URLs
        if (hostname && 
            !tab.url.startsWith('chrome://') && 
            !tab.url.startsWith('edge://') && 
            !tab.url.startsWith('about:') && 
            !tab.url.startsWith('chrome-extension://') &&
            !tab.url.startsWith('https://chrome.google.com/webstore') &&
            !tab.url.startsWith('https://chromewebstore.google.com')) {
          currentDomain = hostname.toLowerCase();
          document.getElementById('current-domain').textContent = hostname;
          
          chrome.storage.local.get(['excludedSites'], (result) => {
            const excludedSites = result.excludedSites || [];
            const isExcluded = excludedSites.includes(currentDomain);
            
            const siteToggle = document.getElementById('site-toggle');
            siteToggle.checked = !isExcluded;
            
            const statusEl = document.getElementById('current-status');
            if (isExcluded) {
              statusEl.textContent = 'Disabled on this site';
              statusEl.style.color = 'var(--text-muted)';
            } else {
              statusEl.textContent = 'Active on this site';
              statusEl.style.color = 'var(--accent-color)';
            }
          });
        } else {
          disableSiteToggleControl("Unavailable on browser pages");
        }
      } catch (e) {
        disableSiteToggleControl("Invalid page URL");
      }
    } else {
      disableSiteToggleControl("No active page detected");
    }
  });
}

// Disable the "current site" box when on chrome:// pages, webstores etc.
function disableSiteToggleControl(message) {
  document.getElementById('current-domain').textContent = "Browser / Internal page";
  document.getElementById('current-status').textContent = message;
  document.getElementById('current-status').style.color = 'var(--text-muted)';
  document.getElementById('site-toggle').disabled = true;
  document.getElementById('active-site-box').style.opacity = '0.5';
  document.getElementById('active-site-box').style.pointerEvents = 'none';
}

// Update UI and value labels for a specific slider
function updateSliderUI(id, val) {
  const slider = document.getElementById(`range-${id}`);
  const label = document.getElementById(`val-${id}`);
  
  if (slider) slider.value = val;
  if (label) {
    if (id === 'invert') {
      label.textContent = `${Math.round(val)}%`;
    } else {
      label.textContent = `${val}%`;
    }
  }
}

// Save slider values to local storage
const saveSliderSettings = debounce(() => {
  const settings = {
    invert: parseFloat(document.getElementById('range-invert').value),
    brightness: parseInt(document.getElementById('range-brightness').value),
    contrast: parseInt(document.getElementById('range-contrast').value),
    grayscale: parseInt(document.getElementById('range-grayscale').value)
  };
  chrome.storage.local.set({ settings }, () => {
    highlightPreset(settings);
  });
}, 80);

// Highlight current matching theme preset
function highlightPreset(settings) {
  const softBtn = document.getElementById('preset-soft');
  const pitchBtn = document.getElementById('preset-pitch');
  if (!softBtn || !pitchBtn) return;

  softBtn.classList.remove('active');
  pitchBtn.classList.remove('active');

  const isSoft = Math.abs(settings.invert - PRESETS.soft.invert) < 0.1 &&
                 Math.abs(settings.brightness - PRESETS.soft.brightness) < 0.1 &&
                 Math.abs(settings.contrast - PRESETS.soft.contrast) < 0.1 &&
                 Math.abs(settings.grayscale - PRESETS.soft.grayscale) < 0.1;

  const isPitch = Math.abs(settings.invert - PRESETS.pitch.invert) < 0.1 &&
                  Math.abs(settings.brightness - PRESETS.pitch.brightness) < 0.1 &&
                  Math.abs(settings.contrast - PRESETS.pitch.contrast) < 0.1 &&
                  Math.abs(settings.grayscale - PRESETS.pitch.grayscale) < 0.1;

  if (isSoft) {
    softBtn.classList.add('active');
  } else if (isPitch) {
    pitchBtn.classList.add('active');
  }
}

// Helper to update sliders and save settings
function applyPresetSettings(settings) {
  updateSliderUI('invert', settings.invert);
  updateSliderUI('brightness', settings.brightness);
  updateSliderUI('contrast', settings.contrast);
  updateSliderUI('grayscale', settings.grayscale);
  
  chrome.storage.local.set({ settings }, () => {
    highlightPreset(settings);
  });
}

// Setup event listeners for elements in popup
function setupEventListeners() {
  // Master Switch
  document.getElementById('master-toggle').addEventListener('change', (e) => {
    chrome.storage.local.set({ darkModeEnabled: e.target.checked });
  });

  // Preset theme buttons
  document.getElementById('preset-soft').addEventListener('click', () => {
    applyPresetSettings(PRESETS.soft);
  });
  document.getElementById('preset-pitch').addEventListener('click', () => {
    applyPresetSettings(PRESETS.pitch);
  });

  // Site Exclusion Toggle
  document.getElementById('site-toggle').addEventListener('change', (e) => {
    if (!currentDomain) return;
    
    chrome.storage.local.get(['excludedSites'], (result) => {
      let excludedSites = result.excludedSites || [];
      const isEnabledOnSite = e.target.checked;
      const statusEl = document.getElementById('current-status');
      
      if (isEnabledOnSite) {
        // Remove from excluded list
        excludedSites = excludedSites.filter(s => s !== currentDomain);
        statusEl.textContent = 'Active on this site';
        statusEl.style.color = 'var(--accent-color)';
      } else {
        // Add to excluded list
        if (!excludedSites.includes(currentDomain)) {
          excludedSites.push(currentDomain);
        }
        statusEl.textContent = 'Disabled on this site';
        statusEl.style.color = 'var(--text-muted)';
      }
      
      chrome.storage.local.set({ excludedSites }, () => {
        renderExclusions(excludedSites);
      });
    });
  });

  // Mode Options Selector
  document.querySelectorAll('.mode-option').forEach(option => {
    option.addEventListener('click', (e) => {
      const mode = e.target.dataset.mode;
      updateModeUI(mode);
      chrome.storage.local.set({ mode });
    });
  });

  // Schedule Time inputs
  document.getElementById('time-start').addEventListener('change', (e) => {
    chrome.storage.local.set({ scheduleStart: e.target.value });
  });
  document.getElementById('time-end').addEventListener('change', (e) => {
    chrome.storage.local.set({ scheduleEnd: e.target.value });
  });

  // Sliders Input Events
  ['invert', 'brightness', 'contrast', 'grayscale'].forEach(id => {
    const slider = document.getElementById(`range-${id}`);
    slider.addEventListener('input', (e) => {
      updateSliderUI(id, e.target.value);
      saveSliderSettings();
    });

    // Reset Buttons
    document.getElementById(`reset-${id}`).addEventListener('click', () => {
      const defaultVal = DEFAULTS[id];
      updateSliderUI(id, defaultVal);
      saveSliderSettings();
    });
  });

  // Storage listener to refresh excluded sites list dynamically if changed elsewhere
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      if (changes.excludedSites) {
        renderExclusions(changes.excludedSites.newValue || []);
        if (currentDomain) {
          const isExcluded = (changes.excludedSites.newValue || []).includes(currentDomain);
          document.getElementById('site-toggle').checked = !isExcluded;
          const statusEl = document.getElementById('current-status');
          if (isExcluded) {
            statusEl.textContent = 'Disabled on this site';
            statusEl.style.color = 'var(--text-muted)';
          } else {
            statusEl.textContent = 'Active on this site';
            statusEl.style.color = 'var(--accent-color)';
          }
        }
      }
    }
  });
}

// Render list of website exclusions dynamically
function renderExclusions(excludedSites) {
  const listEl = document.getElementById('exclusions-list');
  if (!listEl) return;
  
  listEl.innerHTML = '';
  
  if (!excludedSites || excludedSites.length === 0) {
    listEl.innerHTML = '<div class="exclusions-empty">No excluded websites</div>';
    return;
  }
  
  excludedSites.forEach(site => {
    const item = document.createElement('div');
    item.className = 'exclusion-item';
    
    const hostSpan = document.createElement('span');
    hostSpan.className = 'exclusion-host';
    hostSpan.textContent = site;
    hostSpan.title = site;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.title = `Remove ${site}`;
    deleteBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    `;
    
    deleteBtn.addEventListener('click', () => {
      chrome.storage.local.get(['excludedSites'], (result) => {
        const list = result.excludedSites || [];
        const newList = list.filter(s => s !== site);
        chrome.storage.local.set({ excludedSites: newList });
      });
    });
    
    item.appendChild(hostSpan);
    item.appendChild(deleteBtn);
    listEl.appendChild(item);
  });
}

// Update Mode selection pill background colors & toggle Schedule Panel visibility
function updateModeUI(activeMode) {
  document.querySelectorAll('.mode-option').forEach(opt => {
    if (opt.dataset.mode === activeMode) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }
  });

  const schedulePanel = document.getElementById('schedule-panel');
  if (schedulePanel) {
    if (activeMode === 'schedule') {
      schedulePanel.classList.add('visible');
    } else {
      schedulePanel.classList.remove('visible');
    }
  }
}
