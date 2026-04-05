// content.js
// Runs on every page. Relies on EXPLICIT_WORD_MAP and BLOCK_REGEX from blocklist.js

let kidShieldEnabled = true;

// A simple function to figure out the replacement while preserving case if possible
// E.g. "Kill" -> "Defeat", "kill" -> "defeat", "KILL" -> "DEFEAT"
function getReplacement(match) {
  const lowerMatch = match.toLowerCase();
  const replacement = EXPLICIT_WORD_MAP[lowerMatch];
  
  if (!replacement) return match; // fallback
  
  // Try to preserve case
  if (match === match.toUpperCase() && match.length > 1) {
    return replacement.toUpperCase();
  } else if (match[0] === match[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function processTextNode(node) {
  const text = node.nodeValue;
  if (!text) return;
  
  // Fast check before doing regex replace
  BLOCK_REGEX.lastIndex = 0; // Reset just in case
  if (BLOCK_REGEX.test(text)) {
    // Reset regex index before replace
    BLOCK_REGEX.lastIndex = 0;
    node.nodeValue = text.replace(BLOCK_REGEX, getReplacement);
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
    // Skip script, style, and noscript tags
    if (node.parentElement && ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.parentElement.nodeName)) {
      continue;
    }
    nodesToProcess.push(node);
  }
  
  for (const n of nodesToProcess) {
    processTextNode(n);
  }
}

// 1. Setup MutationObserver for dynamically added content BEFORE initial scan
const observer = new MutationObserver((mutations) => {
  if (!kidShieldEnabled) return;

  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      for (const addedNode of mutation.addedNodes) {
        // If it's a text node, process it directly
        if (addedNode.nodeType === Node.TEXT_NODE) {
          processTextNode(addedNode);
        } else if (addedNode.nodeType === Node.ELEMENT_NODE) {
          // If it's an element, scan its descendants
          scanAndReplace(addedNode);
        }
      }
    } else if (mutation.type === 'characterData') {
      processTextNode(mutation.target);
    }
  }
});

// 2. Listen for changes from the extension popup and get initial state
chrome.storage.sync.get(['enabled'], (result) => {
  if (result.enabled !== undefined) {
    kidShieldEnabled = result.enabled;
  }
  
  if (kidShieldEnabled) {
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
    // Initial scan on load
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
      scanAndReplace(document.body); // Re-scan if someone turns it on
    } else {
      observer.disconnect(); // Stop watching completely
    }
  }
});
