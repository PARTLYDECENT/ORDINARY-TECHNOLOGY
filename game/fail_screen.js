document.addEventListener("DOMContentLoaded", () => {
  const waterDisplay = document.getElementById("water-count");
  if (!waterDisplay) {
    console.error("No element with ID 'water-count' found!");
    return;
  }

  let countdownInterval = null;
  let timeLeft = 30;

  // Create or return the countdown element.
  function getCountdownElement() {
    let el = document.getElementById("countdown");
    if (!el) {
      el = document.createElement("div");
      el.id = "countdown";
      Object.assign(el.style, {
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        color: "cyan",
        fontSize: "30px",
        fontFamily: "'Orbitron', sans-serif",
        zIndex: "2000",
        textAlign: "center"
      });
      document.body.appendChild(el);
    }
    return el;
  }

  // Update the countdown display.
  function updateCountdown() {
    const countdownEl = getCountdownElement();
    countdownEl.innerHTML = `Time Left: ${timeLeft}s`;
  }

  // Start the 30-second countdown.
  function startCountdown() {
    if (countdownInterval !== null) return; // Already running
    timeLeft = 30;
    updateCountdown();
    countdownInterval = setInterval(() => {
      timeLeft--;
      updateCountdown();
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        const cdEl = document.getElementById("countdown");
        if (cdEl) cdEl.remove();
      }
    }, 1000);
  }

  // Stop and remove the countdown.
  function stopCountdown() {
    if (countdownInterval !== null) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    const countdownEl = document.getElementById("countdown");
    if (countdownEl) countdownEl.remove();
  }

  // Poll every 250ms for changes in water count.
  setInterval(() => {
    const text = waterDisplay.textContent;
    let waterCount = parseInt(text, 10);
    if (isNaN(waterCount)) {
      waterCount = 0;
    }
    
    // If water count is 0, ensure the countdown is running.
    // If water count is 1 or more, cancel the countdown.
    if (waterCount === 0) {
      startCountdown();
    } else {
      stopCountdown();
    }
  }, 250);
});
