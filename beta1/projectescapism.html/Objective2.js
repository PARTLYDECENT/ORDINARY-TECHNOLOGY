// Objective2.js - "Synaptic Severance"
class Objective2 {
    constructor(scene, player, camera, spawnNodes, onComplete) {
        this.scene = scene;
        this.player = player;
        this.camera = camera;
        this.spawnNodes = spawnNodes;
        this.onComplete = onComplete;
        this.targets = [];
        this.active = true;
        this.hivesDestroyedCount = 0;

        this.init();
    }

    init() {
        // Select 2 active nodes as targets for this objective
        const activeNodes = this.spawnNodes.filter(n => n.active);
        
        // Take up to 2
        const selection = activeNodes.slice(0, 2);
        
        selection.forEach((node, idx) => {
            this.targets.push({
                node: node,
                marker: this.createMarker(`HIVE_NODE_${idx + 1}`)
            });
        });

        if (window.NeuralConsole) {
            window.NeuralConsole.log("OBJ_INIT: SYNAPTIC_SEVERANCE_REQUIRED.", 'sys');
            window.NeuralConsole.log(`DATA: ${this.targets.length}_HIVE_NODES_DESIGNATED_FOR_PURGE.`, 'res');
        }
    }

    createMarker(name) {
        const div = document.createElement('div');
        div.className = 'obj-marker';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = '#ff3300'; // Scary red
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '10px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.textShadow = '0 0 5px #ff3300';
        div.style.zIndex = '9999';

        div.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 2px;">▼</div>
            <div style="background: rgba(0,0,0,0.7); padding: 2px 6px; border: 1px solid #ff3300;">${name}</div>
            <div class="marker-dist" style="font-size: 9px; margin-top: 2px;">0m</div>
        `;
        document.body.appendChild(div);
        return div;
    }

    update(delta, elapsedTime) {
        if (!this.active) return;

        let allDestroyed = true;
        let currentDestroyedCount = 0;

        this.targets.forEach(target => {
            if (!target.node.active) {
                target.marker.style.display = 'none';
                currentDestroyedCount++;
                return;
            }
            
            allDestroyed = false;

            const pos = new THREE.Vector3(target.node.x, 2, target.node.z);
            const dist = this.player.position.distanceTo(pos);
            
            // Update UI Marker
            const vec = pos.clone().project(this.camera);
            if (vec.z > 1) {
                target.marker.style.display = 'none';
            } else {
                target.marker.style.display = 'flex';
                const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-vec.y * 0.5 + 0.5) * window.innerHeight;
                target.marker.style.left = `${x}px`;
                target.marker.style.top = `${y}px`;
                target.marker.querySelector('.marker-dist').textContent = `${Math.round(dist)}m`;
                
                // Pulsate marker
                const s = 1.0 + Math.sin(elapsedTime * 5) * 0.1;
                target.marker.style.transform = `translate(-50%, -50%) scale(${s})`;
            }
        });

        if (allDestroyed && this.targets.length > 0) {
            this.complete();
        }
    }

    complete() {
        this.active = false;
        this.targets.forEach(t => t.marker.remove());
        
        if (window.NeuralConsole) {
            window.NeuralConsole.log("OBJ_COMPLETED: SECTOR_STABILIZED.", 'sys');
            window.NeuralConsole.log("MEM_PURGE: THREAT_LEVEL_REDUCED. DATA_STREAM_CLEAN.", 'res');
        }
        
        this.onComplete();
    }
}
