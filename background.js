chrome.action.onClicked.addListener((tab) => {
  // Toggle the dark mode state in storage
  chrome.storage.local.get(['darkModeEnabled'], (result) => {
    const newState = !result.darkModeEnabled;
    chrome.storage.local.set({ darkModeEnabled: newState }, () => {
      // Notify all tabs to update their styling immediately
      chrome.tabs.query({}, (tabs) => {
        for (let t of tabs) {
          chrome.tabs.sendMessage(t.id, { action: 'updateDarkMode', isEnabled: newState }).catch(() => {
            // Error handling for tabs where the content script hasn't been injected (e.g. chrome:// pages)
          });
        }
      });
    });
  });
});
