chrome.runtime.onInstalled.addListener(() => {
  console.log('Shorts Spreader extension bootstrap installed.');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'bootstrap_ping') {
    sendResponse({ ok: true, from: 'background', tabId: sender.tab?.id ?? null });
  }

  return true;
});
