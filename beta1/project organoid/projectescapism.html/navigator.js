/**
 * HUD NAVIGATOR SYSTEM
 * Handles 3D-to-2D projection for objective markers and off-screen arrows.
 */

class HUDNavigator {
    constructor(scene, camera, spawnNodes) {
        this.scene = scene;
        this.camera = camera;
        this.spawnNodes = spawnNodes;
        this.container = document.createElement('div');
        this.container.id = 'hud-navigator';
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.pointerEvents = 'none';
        this.container.style.zIndex = '80';
        document.body.appendChild(this.container);

        this.markers = new Map();
        this.tempVec = new THREE.Vector3();
    }

    update(player) {
        if (!player) return;

        let activeNodes = [];
        if (window.objectivePhase >= 2) {
            activeNodes = this.spawnNodes.filter(n => n.active);
        }
        
        // Remove markers for nodes no longer active
        for (const [node, marker] of this.markers) {
            if (!node.active) {
                this.container.removeChild(marker.element);
                this.markers.delete(node);
            }
        }

        activeNodes.forEach(node => {
            let marker = this.markers.get(node);
            if (!marker) {
                marker = this.createMarker();
                this.markers.set(node, marker);
                this.container.appendChild(marker.element);
            }

            this.updateMarker(marker, node, player);
        });
    }

    createMarker() {
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.transform = 'translate(-50%, -50%)';
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
        el.style.alignItems = 'center';
        el.style.transition = 'opacity 0.2s';
        
        // Marker Icon
        const icon = document.createElement('div');
        icon.className = 'nav-icon';
        icon.innerHTML = '◈';
        icon.style.color = '#ef4444';
        icon.style.fontSize = '24px';
        icon.style.fontWeight = 'bold';
        icon.style.textShadow = '0 0 10px rgba(239, 68, 68, 0.8)';
        
        // Arrow (for off-screen)
        const arrow = document.createElement('div');
        arrow.className = 'nav-arrow';
        arrow.innerHTML = '▲';
        arrow.style.color = '#ef4444';
        arrow.style.fontSize = '18px';
        arrow.style.position = 'absolute';
        arrow.style.top = '-25px';
        arrow.style.display = 'none';

        // Distance Text
        const distText = document.createElement('div');
        distText.style.color = 'white';
        distText.style.fontSize = '12px';
        distText.style.fontFamily = 'monospace';
        distText.style.marginTop = '4px';
        distText.style.background = 'rgba(0,0,0,0.5)';
        distText.style.padding = '2px 6px';
        distText.style.borderRadius = '4px';

        el.appendChild(arrow);
        el.appendChild(icon);
        el.appendChild(distText);

        return { element: el, icon, arrow, distText };
    }

    updateMarker(marker, node, player) {
        this.tempVec.set(node.x, 2, node.z);
        const distance = player.position.distanceTo(this.tempVec);
        
        // Project to screen
        this.tempVec.project(this.camera);

        const x = (this.tempVec.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-this.tempVec.y * 0.5 + 0.5) * window.innerHeight;

        const isOffScreen = this.tempVec.z > 1 || x < 0 || x > window.innerWidth || y < 0 || y > window.innerHeight;

        if (isOffScreen) {
            marker.arrow.style.display = 'block';
            marker.icon.style.opacity = '0.4';
            marker.distText.style.display = 'none';

            // Constraint to edges
            let edgeX = x;
            let edgeY = y;
            
            // Handle clip
            if (this.tempVec.z > 1) {
                edgeX = window.innerWidth - x;
                edgeY = window.innerHeight - y;
            }

            const padding = 40;
            edgeX = Math.max(padding, Math.min(window.innerWidth - padding, edgeX));
            edgeY = Math.max(padding, Math.min(window.innerHeight - padding, edgeY));

            marker.element.style.left = `${edgeX}px`;
            marker.element.style.top = `${edgeY}px`;

            // Rotate arrow
            const angle = Math.atan2(edgeY - window.innerHeight / 2, edgeX - window.innerWidth / 2);
            marker.arrow.style.transform = `rotate(${angle + Math.PI / 2}rad)`;
        } else {
            marker.arrow.style.display = 'none';
            marker.icon.style.opacity = '1';
            marker.distText.style.display = 'block';
            marker.element.style.left = `${x}px`;
            marker.element.style.top = `${y}px`;
            marker.distText.innerText = `${Math.floor(distance)}m`;
        }
        
        // Scale based on distance
        const scale = Math.max(0.5, Math.min(1.2, 100 / distance));
        marker.element.style.transform = `translate(-50%, -50%) scale(${scale})`;
    }

    clear() {
        this.container.innerHTML = '';
        this.markers.clear();
    }
}

window.HUDNavigator = HUDNavigator;
