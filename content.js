if (typeof window.applyLagFreeDarkMode === 'undefined') {
  window.applyLagFreeDarkMode = function(isEnabled) {
    const STYLE_ID = 'lag-free-dark-mode-style';
    let styleEl = document.getElementById(STYLE_ID);
    
    if (isEnabled) {
      if (!styleEl) {
        styleEl = document.createElement('link');
        styleEl.id = STYLE_ID;
        styleEl.rel = 'stylesheet';
        styleEl.type = 'text/css';
        styleEl.href = chrome.runtime.getURL('styles.css');
        document.documentElement.appendChild(styleEl);
      }
    } else {
      if (styleEl) {
        styleEl.remove();
      }
    }
  };

  // Check state and apply on load (defaults to true if not explicitly disabled)
  chrome.storage.local.get(['darkModeEnabled'], (result) => {
    const isEnabled = result.darkModeEnabled !== false;
    window.applyLagFreeDarkMode(isEnabled);
  });

  // Listen for toggle messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateDarkMode') {
      window.applyLagFreeDarkMode(request.isEnabled);
    }
  });
} else {
  // Script was already injected (e.g., from manifest + manual injection)
  // Just apply the latest state immediately
  chrome.storage.local.get(['darkModeEnabled'], (result) => {
    window.applyLagFreeDarkMode(result.darkModeEnabled !== false);
  });
}
