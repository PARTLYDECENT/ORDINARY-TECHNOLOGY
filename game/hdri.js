// =====================
// HDRI Sky Loader Module
// =====================

// This function loads an HDRI image and applies it as the scene background and environment.
async function loadHDRISky(hdriPath = 'hdri.hdr') {
  return new Promise((resolve, reject) => {
    // Ensure the RGBELoader is available (it must be included in your project)
    if (!THREE.RGBELoader) {
      console.error('THREE.RGBELoader is required to load an HDRI sky.');
      return reject('THREE.RGBELoader not found.');
    }

    new THREE.RGBELoader()
      .setDataType(THREE.UnsignedByteType) // or FloatType if supported and desired
      .load(hdriPath, function (texture) {
        // Use equirectangular mapping so the HDRI wraps around the scene
        texture.mapping = THREE.EquirectangularReflectionMapping;
        // Set the scene's background and environment to the HDRI texture
        GAME.scene.background = texture;
        GAME.scene.environment = texture;
        console.log(`HDRI Sky loaded from: ${hdriPath}`);
        resolve(texture);
      }, undefined, function (error) {
        console.error('An error occurred loading the HDRI:', error);
        reject(error);
      });
  });
}

// Initialize the HDRI sky after the DOM content is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Replace 'hdri.hdr' with your HDRI file path
  loadHDRISky('hdri.hdr').then((texture) => {
    console.log('HDRI sky successfully applied.');
  }).catch((err) => {
    console.error('Failed to load HDRI sky:', err);
  });
});
