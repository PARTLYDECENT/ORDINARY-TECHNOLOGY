/* truckview.js
   Custom camera view system for the Cyber-Truck driving mode.
*/
(function(){
  let cameraTruck = null;

  function initCamera() {
    if (cameraTruck) return;
    cameraTruck = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    window.cameraTruck = cameraTruck;
  }

  function updateCamera(dt, truck) {
    if (!cameraTruck) initCamera();
    if (!truck) return;

    // Follow the truck from behind and slightly above
    const relativeCameraOffset = new THREE.Vector3(0, 3.8, 7.5);
    const cameraOffset = relativeCameraOffset.applyMatrix4(truck.matrixWorld);
    
    // Smoothly lerp camera position
    cameraTruck.position.lerp(cameraOffset, 8.0 * dt);
    
    // Look at the truck cab area
    const lookTarget = truck.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    cameraTruck.lookAt(lookTarget);
  }

  function resize(width, height) {
    if (cameraTruck) {
      cameraTruck.aspect = width / height;
      cameraTruck.updateProjectionMatrix();
    }
  }

  window.addEventListener('resize', () => {
    resize(window.innerWidth, window.innerHeight);
  });

  window.TruckView = {
    initCamera,
    updateCamera,
    resize,
    get camera() { return cameraTruck; }
  };

  console.log('[TruckView] Truck driving camera system loaded');
})();
