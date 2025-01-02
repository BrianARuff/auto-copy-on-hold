document.addEventListener("DOMContentLoaded", () => {
  const holdTimeInput = document.getElementById("holdTimeInput");
  const modeRadios = document.getElementsByName("copyMode");
  const saveBtn = document.getElementById("saveBtn");
  const statusMessage = document.getElementById("statusMessage");

  // Load existing settings from storage
  chrome.storage.sync.get({ holdTime: 1, copyMode: "onRelease" }, (items) => {
    holdTimeInput.value = items.holdTime;

    // Set the correct radio button
    for (let radio of modeRadios) {
      if (radio.value === items.copyMode) {
        radio.checked = true;
      }
    }
  });

  // Save settings to storage
  saveBtn.addEventListener("click", () => {
    const newHoldTime = parseFloat(holdTimeInput.value);
    if (isNaN(newHoldTime) || newHoldTime < 0) {
      showStatusMessage("Please enter a valid number for hold time.", true);
      return;
    }

    let newCopyMode = "onRelease"; // Default to onRelease
    for (let radio of modeRadios) {
      if (radio.checked) {
        newCopyMode = radio.value;
        break;
      }
    }

    // Save the new settings
    chrome.storage.sync.set(
      { holdTime: newHoldTime, copyMode: newCopyMode },
      () => {
        showStatusMessage("Settings saved!", false);
      }
    );
  });

  // Function to display status messages
  function showStatusMessage(message, isError) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? "#b00" : "#0a6";
    statusMessage.style.display = "block";

    if (!isError) {
      setTimeout(() => {
        statusMessage.style.display = "none";
      }, 2000);
    }
  }
});
