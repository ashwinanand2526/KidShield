// blocklist.js
// This file is injected into the webpage before content.js
// We map explicit words to their child-friendly replacements based on user feedback.

const EXPLICIT_WORD_MAP = {
  "sex": "hug",
  "violence": "conflict",
  "kill": "defeat"
};

// We create a regex to match any of the words globally, case-insensitively, and specifically bounded by word boundaries.
const wordsToMatch = Object.keys(EXPLICIT_WORD_MAP).join('|');
const BLOCK_REGEX = new RegExp(`\\b(${wordsToMatch})\\b`, 'gi');
