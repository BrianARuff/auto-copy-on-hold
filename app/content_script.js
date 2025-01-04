(() => {
  const DEFAULT_HOLD_TIME_SECONDS = 1;

  // Create a container for our shadow root once at initialization
  const container = document.createElement("div");
  container.id = "auto-copy-extension-container";
  document.body.appendChild(container);

  // Create shadow root
  const shadow = container.attachShadow({ mode: "closed" });

  // Add styles to shadow DOM
  const style = document.createElement("style");
  style.textContent = `
    .copy-indicator {
      position: fixed;
      background-color: rgba(0, 0, 0, 0.8);
      color: #fff;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 13px;
      font-family: system-ui, -apple-system, sans-serif;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      transition: opacity 0.3s ease-in-out;
      opacity: 1;
      z-index: 2147483647;
      pointer-events: none;
    }
  `;
  shadow.appendChild(style);

  let isMouseDown = false;
  let selectedText = "";
  let holdTimeSeconds = DEFAULT_HOLD_TIME_SECONDS;
  let copyMode = "onRelease";
  let copyTimerId = null;
  let canceled = false;
  let didCopy = false;
  let copyAllowed = false;
  let cursorX = 0;
  let cursorY = 0;

  // Load settings from storage
  chrome.storage.sync.get(
    { holdTime: DEFAULT_HOLD_TIME_SECONDS, copyMode: "onRelease" },
    (result) => {
      holdTimeSeconds = result.holdTime;
      copyMode = result.copyMode;
    }
  );

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync") {
      if (changes.holdTime?.newValue)
        holdTimeSeconds = changes.holdTime.newValue;
      if (changes.copyMode?.newValue) copyMode = changes.copyMode.newValue;
    }
  });

  function copyToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.style.cssText = "position:fixed;top:-9999px;left:-9999px;";
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand("copy");
    } catch (err) {
      console.warn("Copy failed:", err);
    }

    document.body.removeChild(textArea);
  }

  function showCopyIndicator(x, y) {
    // Remove any existing indicators
    const existingIndicators = shadow.querySelectorAll(".copy-indicator");
    existingIndicators.forEach((el) => el.remove());

    // Create new indicator in shadow DOM
    const indicator = document.createElement("div");
    indicator.className = "copy-indicator";
    indicator.textContent = "Copied!";
    indicator.style.left = `${x + 15}px`;
    indicator.style.top = `${y - 20}px`;

    shadow.appendChild(indicator);

    // Fade out and remove
    setTimeout(() => {
      indicator.style.opacity = "0";
      setTimeout(() => indicator.remove(), 300);
    }, 1000);
  }

  document.addEventListener("mousemove", (evt) => {
    cursorX = evt.clientX;
    cursorY = evt.clientY;
    if (isMouseDown) {
      selectedText = window.getSelection().toString();
    }
  });

  document.addEventListener("mousedown", (evt) => {
    if (evt.button === 0) {
      isMouseDown = true;
      canceled = false;
      didCopy = false;
      copyAllowed = false;
      selectedText = window.getSelection().toString();

      copyTimerId = setTimeout(() => {
        if (isMouseDown && !canceled && selectedText.trim().length > 0) {
          if (copyMode === "immediate") {
            copyToClipboard(selectedText);
            showCopyIndicator(cursorX, cursorY);
            didCopy = true;
          } else if (copyMode === "onRelease") {
            copyAllowed = true;
          }
        }
      }, holdTimeSeconds * 1000);
    }
  });

  document.addEventListener("mouseup", (evt) => {
    if (evt.button === 0 && isMouseDown) {
      isMouseDown = false;

      if (
        !canceled &&
        copyMode === "onRelease" &&
        copyAllowed &&
        selectedText.trim().length > 0
      ) {
        copyToClipboard(selectedText);
        showCopyIndicator(cursorX, cursorY);
        didCopy = true;
      }

      if (copyTimerId) {
        clearTimeout(copyTimerId);
        copyTimerId = null;
      }
    }
  });

  document.addEventListener("mousedown", (evt) => {
    if (evt.button === 2 && isMouseDown) {
      canceled = true;
      isMouseDown = false;

      if (copyTimerId) {
        clearTimeout(copyTimerId);
        copyTimerId = null;
      }
    }
  });
})();
