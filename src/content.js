let kidShieldEnabled = true;

const EXPLICIT_WORDS = [
  "sex", "sexual", 
  "violence", "violent",
  "kill", "killed", "killing", "kills", "killer",
  "murder", "murdered", "murdering", "murders", "murderer",
  "assassinate", "assassinated", "assassination",
  "blood", "bloody", "bleed",
  "porn", "rape", "raped"
];
const wordsToMatch = EXPLICIT_WORDS.join('|');
const BLOCK_REGEX = new RegExp(`\\b(${wordsToMatch})\\b`, 'i');
const GLOBAL_BLOCK_REGEX = new RegExp(`\\b(${wordsToMatch})\\b`, 'gi');

async function processTextNode(node) {
  if (!kidShieldEnabled) return;
  const text = node.nodeValue;
  if (!text || !text.trim()) return;

  // Fast check
  if (!BLOCK_REGEX.test(text)) return;

  // We clone the regex to find matches
  const localRegex = new RegExp(`\\b(${wordsToMatch})\\b`, 'gi');
  let match;
  let currentText = text;

  // Process the first match. If there are multiple, the MutationObserver 
  // will catch them on subsequent updates.
  if ((match = localRegex.exec(currentText)) !== null) {
    const originalWord = match[0];
    const maskedSentence = currentText.substring(0, match.index) + "[MASK]" + currentText.substring(match.index + originalWord.length);

    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'replaceWord',
          sentence: maskedSentence,
          originalWord: originalWord
        }, (res) => {
          if (chrome.runtime.lastError) {
             reject(chrome.runtime.lastError);
          } else {
             resolve(res);
          }
        });
      });

      if (response && response.replacement) {
        let replacement = response.replacement;
        
        // Try to preserve case
        if (originalWord === originalWord.toUpperCase() && originalWord.length > 1) {
          replacement = replacement.toUpperCase();
        } else if (originalWord[0] === originalWord[0].toUpperCase()) {
          replacement = replacement.charAt(0).toUpperCase() + replacement.slice(1);
        }

        currentText = currentText.substring(0, match.index) + replacement + currentText.substring(match.index + originalWord.length);
        
        // Update DOM node
        node.nodeValue = currentText;
      }
    } catch (e) {
      console.warn("KidShield: Could not get AI replacement.", e);
      // Fallback
      currentText = currentText.substring(0, match.index) + "***" + currentText.substring(match.index + originalWord.length);
      node.nodeValue = currentText;
    }
  }
}

// Walk through all text nodes in a given root node
function scanAndReplace(rootNode) {
  if (!kidShieldEnabled) return;

  const walker = document.createTreeWalker(
    rootNode,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  const nodesToProcess = [];
  while (node = walker.nextNode()) {
    if (node.parentElement && ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.parentElement.nodeName)) {
      continue;
    }
    nodesToProcess.push(node);
  }
  
  for (const n of nodesToProcess) {
    processTextNode(n);
  }
}

// Setup MutationObserver
const observer = new MutationObserver((mutations) => {
  if (!kidShieldEnabled) return;

  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      for (const addedNode of mutation.addedNodes) {
        if (addedNode.nodeType === Node.TEXT_NODE) {
          processTextNode(addedNode);
        } else if (addedNode.nodeType === Node.ELEMENT_NODE) {
          scanAndReplace(addedNode);
        }
      }
    } else if (mutation.type === 'characterData') {
      processTextNode(mutation.target);
    }
  }
});

// Init
chrome.storage.sync.get(['enabled'], (result) => {
  if (result.enabled !== undefined) {
    kidShieldEnabled = result.enabled;
  }
  
  if (kidShieldEnabled) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
    scanAndReplace(document.body);
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.enabled) {
    kidShieldEnabled = changes.enabled.newValue;
    if (kidShieldEnabled) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
      scanAndReplace(document.body);
    } else {
      observer.disconnect();
    }
  }
});
