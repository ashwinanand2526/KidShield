import { pipeline, env } from '@xenova/transformers';

// Configure environment so models execute locally in the browser cache
env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL(''); // Ensure wasm files are fetched locally
env.backends.onnx.wasm.numThreads = 1; // Service workers cannot use URL.createObjectURL for Web Workers

class PipelineSingleton {
  static task = 'fill-mask';
  static model = 'Xenova/albert-base-v2';
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

const EXPLICIT_WORDS = [
  "sex", "sexual", 
  "violence", "violent",
  "kill", "killed", "killing", "kills", "killer",
  "murder", "murdered", "murdering", "murders", "murderer",
  "assassinate", "assassinated", "assassination",
  "blood", "bloody", "bleed",
  "porn", "rape", "raped"
];

// Pre-load the model when the service worker starts (optional, but helps speed up first use)
PipelineSingleton.getInstance();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'replaceWord') {
    processReplacement(request.sentence, request.originalWord)
      .then(sendResponse)
      .catch(err => {
        console.error("Replacement failed:", err);
        sendResponse({ replacement: "***" });
      });
    return true; // Indicates asynchronous response
  }
});

async function processReplacement(sentence, originalWord) {
  const maskPipe = await PipelineSingleton.getInstance();
  
  // Predict masked words
  const results = await maskPipe(sentence, { topk: 10 });
  
  // Pick the most probable word that doesn't belong to the explicit list
  // Note: ALBERT predictions often contain a leading special space character ' ' (U+2581)
  for (const res of results) {
    // Strip everything except standard letters
    let candidate = res.token_str.replace(/[^a-zA-Z]/g, "").toLowerCase();
    
    // Ignore punctuation predictions or empty words
    if (!candidate || candidate.length < 2) continue;
    
    if (!EXPLICIT_WORDS.includes(candidate)) {
      // Return the best semantic replacement
      return { replacement: candidate };
    }
  }
  
  return { replacement: "***" }; // fallback
}
