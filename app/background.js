chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get({ holdTime: 1, copyMode: "onRelease" }, (items) => {
    const toStore = {};
    if (typeof items.holdTime !== "number") {
      toStore.holdTime = 1; // Default to 1 second
    }
    if (!items.copyMode) {
      toStore.copyMode = "onRelease"; // Default mode
    }
    if (Object.keys(toStore).length > 0) {
      chrome.storage.sync.set(toStore);
    }
  });
});
