chrome.runtime.onInstalled.addListener(() => {
  const defaultSettings = {
    darkModeEnabled: true,
    mode: 'manual',
    scheduleStart: '20:00',
    scheduleEnd: '07:00',
    settings: {
      invert: 100,
      brightness: 100,
      contrast: 100,
      grayscale: 0
    },
    excludedSites: []
  };

  // Set default settings if not already defined
  chrome.storage.local.get(Object.keys(defaultSettings), (result) => {
    const toSet = {};
    for (const key in defaultSettings) {
      if (result[key] === undefined) {
        toSet[key] = defaultSettings[key];
      }
    }
    if (Object.keys(toSet).length > 0) {
      chrome.storage.local.set(toSet, () => {
        injectIntoAllTabs();
      });
    } else {
      injectIntoAllTabs();
    }
  });
});

function injectIntoAllTabs() {
  chrome.tabs.query({}, (tabs) => {
    for (const t of tabs) {
      if (t.url && 
          !t.url.startsWith('chrome://') && 
          !t.url.startsWith('edge://') && 
          !t.url.startsWith('about:') && 
          !t.url.startsWith('chrome-extension://') &&
          !t.url.startsWith('https://chrome.google.com/webstore') &&
          !t.url.startsWith('https://chromewebstore.google.com')) {
        chrome.scripting.executeScript({
          target: { tabId: t.id },
          files: ['content.js']
        }).catch(() => {
          // Ignore errors for tabs we don't have access to
        });
      }
    }
  });
}

