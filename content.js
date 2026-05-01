const STYLE_ID = 'lag-free-dark-mode-style';

function applyDarkMode(isEnabled) {
  let styleEl = document.getElementById(STYLE_ID);
  
  if (isEnabled) {
    if (!styleEl) {
      styleEl = document.createElement('link');
      styleEl.id = STYLE_ID;
      styleEl.rel = 'stylesheet';
      styleEl.type = 'text/css';
      // Load CSS securely from the extension's resources
      styleEl.href = chrome.runtime.getURL('styles.css');
      document.documentElement.appendChild(styleEl);
    }
  } else {
    if (styleEl) {
      styleEl.remove();
    }
  }
}

// Initial check on page load to apply styles as early as possible
chrome.storage.local.get(['darkModeEnabled'], (result) => {
  applyDarkMode(result.darkModeEnabled === true);
});

// Listen for messages from the background worker to toggle dynamically
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateDarkMode') {
    applyDarkMode(request.isEnabled);
  }
});
