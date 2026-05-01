chrome.runtime.onInstalled.addListener(() => {
  // Set default state to ON when installed
  chrome.storage.local.set({ darkModeEnabled: true }, () => {
    // Inject content.js into all existing tabs so it applies without needing a refresh
    chrome.tabs.query({}, (tabs) => {
      for (let t of tabs) {
        if (t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('edge://') && !t.url.startsWith('about:')) {
          chrome.scripting.executeScript({
            target: { tabId: t.id },
            files: ['content.js']
          }).catch(() => {
            // Ignore errors for tabs that cannot be injected into
          });
        }
      }
    });
  });
});

chrome.action.onClicked.addListener((tab) => {
  // Toggle the dark mode state in storage
  chrome.storage.local.get(['darkModeEnabled'], (result) => {
    const newState = !result.darkModeEnabled;
    chrome.storage.local.set({ darkModeEnabled: newState }, () => {
      // Notify all tabs to update their styling immediately
      chrome.tabs.query({}, (tabs) => {
        for (let t of tabs) {
          chrome.tabs.sendMessage(t.id, { action: 'updateDarkMode', isEnabled: newState }).catch(() => {
            // Error handling for tabs where the content script hasn't been injected
          });
        }
      });
    });
  });
});
