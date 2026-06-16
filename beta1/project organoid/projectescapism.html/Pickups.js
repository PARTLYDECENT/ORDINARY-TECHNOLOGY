class HealthPack extends THREE.Group {
    constructor() {
        super();
        
        // Procedural Health Pack Box
        const bodyGeo = new THREE.BoxGeometry(0.5, 0.4, 0.3);
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, 
            roughness: 0.6, 
            metalness: 0.1 
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        
        // Red Cross Detailing
        const crossGeo1 = new THREE.BoxGeometry(0.3, 0.1, 0.32);
        const crossGeo2 = new THREE.BoxGeometry(0.1, 0.3, 0.32);
        const crossMat = new THREE.MeshStandardMaterial({ 
            color: 0xff0000, 
            emissive: 0xaa0000, 
            emissiveIntensity: 0.5,
            roughness: 0.4 
        });
        
        const cross1 = new THREE.Mesh(crossGeo1, crossMat);
        const cross2 = new THREE.Mesh(crossGeo2, crossMat);
        
        body.add(cross1);
        body.add(cross2);
        
        this.add(body);
        
        // Soft red pulsing glow light
        this.light = new THREE.PointLight(0xff0000, 1.5, 3.0);
        this.add(this.light);
        
        this.scale.set(0.8, 0.8, 0.8);
    }
}

class AmmoCan extends THREE.Group {
    constructor() {
        super();
        
        // Procedural Ammo Can Body
        const bodyGeo = new THREE.BoxGeometry(0.3, 0.5, 0.6);
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: 0x3b5323, // Olive drab
            roughness: 0.8, 
            metalness: 0.5 
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        
        // Metallic Latch
        const latchGeo = new THREE.BoxGeometry(0.32, 0.1, 0.1);
        const latchMat = new THREE.MeshStandardMaterial({ 
            color: 0x222222, 
            roughness: 0.7, 
            metalness: 0.8 
        });
        const latch = new THREE.Mesh(latchGeo, latchMat);
        latch.position.set(0, 0.2, 0.3);
        
        body.add(latch);
        this.add(body);
        
        // Soft yellow pulsing glow light
        this.light = new THREE.PointLight(0xaaaa00, 1.0, 3.0);
        this.add(this.light);
        
        this.scale.set(0.8, 0.8, 0.8);
    }
}

window.HealthPack = HealthPack;
window.AmmoCan = AmmoCan;
