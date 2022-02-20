// background.js

// Initialize global highlightPressed variable as false
let highlightPressed = false;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ "highlightPressed": highlightPressed }, function () {
    console.log("Initial highlightPressed value set to: " + highlightPressed);
  });
});

// set highlightPressed to false when tab changes
chrome.tabs.onActivated.addListener(() => {
  chrome.storage.sync.set({ "highlightPressed": false }, function () {
    console.log("Tab changed. Set highlightPressed value to false.");
  });
});
