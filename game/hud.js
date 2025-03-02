function trackUranium() {
  const uraniumDisplay = document.getElementById("uranium-count");

  function checkUranium() {
    // Read uranium from the global game object (assuming it's stored in window.uraniumProduced)
    if (typeof window.uraniumProduced !== "undefined") {
      uraniumDisplay.textContent = window.uraniumProduced;

      // Check for the win condition
      if (window.uraniumProduced >= 500) {
        winGame();
      }
    }
    
    requestAnimationFrame(checkUranium); // Keep checking without interfering with main.js
  }

  checkUranium();
}

// Run this when the page loads
document.addEventListener("DOMContentLoaded", trackUranium);

// Win screen function (separate from main.js)
function winGame() {
  if (document.getElementById("win-screen")) return; // Prevent multiple triggers

  const winScreen = document.createElement("div");
  winScreen.id = "win-screen";
  Object.assign(winScreen.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: "2000"
  });

  winScreen.innerHTML = '<img src="assets/win-screen.png" alt="You Win!" style="max-width: 100%; max-height: 100%;">';
  document.body.appendChild(winScreen);
}
