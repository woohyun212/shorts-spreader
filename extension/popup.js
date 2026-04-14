const statusElement = document.getElementById('status');
const pingButton = document.getElementById('ping-button');

pingButton?.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'bootstrap_ping' }, (response) => {
    if (chrome.runtime.lastError) {
      statusElement.textContent = chrome.runtime.lastError.message;
      return;
    }

    statusElement.textContent = response?.ok ? 'Background reachable' : 'No response';
  });
});
