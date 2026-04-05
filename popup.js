document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggleKidShield');
  const statusMsg = document.getElementById('statusMsg');

  // Load the current state
  chrome.storage.sync.get(['enabled'], (result) => {
    // Default to true if not set
    const isEnabled = result.enabled !== false;
    toggle.checked = isEnabled;
    updateUI(isEnabled);
  });

  // Listen for clicks on the toggle
  toggle.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    
    // Save state
    chrome.storage.sync.set({ enabled: isEnabled }, () => {
      updateUI(isEnabled);
    });
  });

  function updateUI(isEnabled) {
    if (isEnabled) {
      statusMsg.textContent = "KidShield is ON";
      statusMsg.classList.remove('off');
    } else {
      statusMsg.textContent = "KidShield is OFF";
      statusMsg.classList.add('off');
    }
  }
});
