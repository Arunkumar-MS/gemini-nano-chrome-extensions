// Background script for Chrome AI Chat Extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('Chrome AI Chat Extension installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    // The popup will handle the main functionality
    console.log('Extension clicked');
});