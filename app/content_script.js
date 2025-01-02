(() => {
  /************************************************************
   * GLOBAL DEFAULT & CONSTANTS
   ************************************************************/
  const DEFAULT_HOLD_TIME_SECONDS = 1; // The one place to set the default

  /************************************************************
   * STATE
   ************************************************************/
  let isMouseDown = false;
  let selectedText = "";

  // Hold time and mode from storage; fallback to default
  let holdTimeSeconds = DEFAULT_HOLD_TIME_SECONDS;
  let copyMode = "onRelease"; // "onRelease" or "immediate"

  // Timers & flags
  let copyTimerId = null;
  let canceled = false;
  let originalClipboardContent = "";
  let didCopy = false;
  let copyAllowed = false; // For onRelease mode

  // Cursor position for "Copied!" indicator
  let cursorX = 0;
  let cursorY = 0;

  /************************************************************
   * 1) LOAD SETTINGS FROM STORAGE
   ************************************************************/
  chrome.storage.sync.get(
    { holdTime: DEFAULT_HOLD_TIME_SECONDS, copyMode: "onRelease" },
    (result) => {
      if (typeof result.holdTime === "number") {
        holdTimeSeconds = result.holdTime;
      }
      if (typeof result.copyMode === "string") {
        copyMode = result.copyMode;
      }
    }
  );

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync") {
      if (changes.holdTime && typeof changes.holdTime.newValue === "number") {
        holdTimeSeconds = changes.holdTime.newValue;
      }
      if (changes.copyMode && typeof changes.copyMode.newValue === "string") {
        copyMode = changes.copyMode.newValue;
      }
    }
  });

  /************************************************************
   * 2) MOUSE EVENTS
   ************************************************************/
  document.addEventListener("mousemove", (evt) => {
    cursorX = evt.clientX;
    cursorY = evt.clientY;

    if (isMouseDown) {
      selectedText = window.getSelection().toString();
    }
  });

  // Left Mouse Down
  document.addEventListener("mousedown", async (evt) => {
    if (evt.button === 0) {
      // Left-click
      isMouseDown = true;
      canceled = false;
      didCopy = false;
      copyAllowed = false;
      holdTimerId = null;

      // Attempt to read the current clipboard (for revert if canceled)
      try {
        originalClipboardContent = await navigator.clipboard.readText();
      } catch (err) {
        originalClipboardContent = "";
        console.warn("Could not read clipboard:", err);
      }

      selectedText = window.getSelection().toString();

      // Start hold timer
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

  // Left Mouse Up (onRelease logic)
  document.addEventListener("mouseup", (evt) => {
    if (evt.button === 0 && isMouseDown) {
      // Left-click release
      isMouseDown = false;

      // If in onRelease mode and copyAllowed, perform copy
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

      // Clear hold timer
      if (copyTimerId) {
        clearTimeout(copyTimerId);
        copyTimerId = null;
      }
    }
  });

  // Right Mouse Down => Cancel
  document.addEventListener("mousedown", (evt) => {
    if (evt.button === 2 && isMouseDown) {
      // Right-click while holding left-click
      canceled = true;
      isMouseDown = false;

      // Clear hold timer if active
      if (copyTimerId) {
        clearTimeout(copyTimerId);
        copyTimerId = null;
      }

      // Revert clipboard to original content if copy was already done
      if (didCopy) {
        revertClipboard();
      }
    }
  });

  /************************************************************
   * 3) COPY & REVERT HELPERS
   ************************************************************/
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error("Failed to copy text:", err);
    });
  }

  function revertClipboard() {
    navigator.clipboard.writeText(originalClipboardContent).catch((err) => {
      console.error("Failed to revert clipboard content:", err);
    });
  }

  function showCopyIndicator(x, y) {
    const indicator = document.createElement("div");
    indicator.innerText = "Copied!";
    indicator.style.position = "fixed";
    indicator.style.left = `${x + 15}px`;
    indicator.style.top = `${y - 20}px`;
    indicator.style.zIndex = "999999";
    indicator.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    indicator.style.color = "#fff";
    indicator.style.padding = "4px 8px";
    indicator.style.borderRadius = "4px";
    indicator.style.fontSize = "13px";
    indicator.style.fontFamily = "sans-serif";
    indicator.style.boxShadow = "0 2px 5px rgba(0,0,0,0.3)";
    indicator.style.transition = "opacity 0.3s ease-in-out";
    indicator.style.opacity = "1";

    document.body.appendChild(indicator);

    setTimeout(() => {
      indicator.style.opacity = "0";
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    }, 1000);
  }
})();
