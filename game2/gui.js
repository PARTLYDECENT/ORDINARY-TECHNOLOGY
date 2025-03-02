(function() {
    // Helper: Wait for the Babylon scene to be available (assumes it's assigned to window.scene)
    function waitForScene(callback) {
        if (window.scene) {
            callback(window.scene);
        } else {
            setTimeout(() => waitForScene(callback), 100);
        }
    }

    waitForScene(function(scene) {
        // Create a full-screen UI for Babylon's GUI
        var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);

        // Create an image control
        var pngImage = new BABYLON.GUI.Image("injectImage", "welcome.png");
        
        // Position the image in the upper right corner
        pngImage.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        pngImage.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        
        // Use percentage values for scalable dimensions
        pngImage.width = "15%";    // Adjust as needed
        pngImage.height = "15%";   // Adjust as needed
        
        // Optional: add some padding from the edges
        pngImage.paddingRight = "10px";
        pngImage.paddingTop = "10px";
        
        // Add the image control to the UI
        advancedTexture.addControl(pngImage);

        console.log("✅ PNG image injected into the upper right corner.");
    });
})();
