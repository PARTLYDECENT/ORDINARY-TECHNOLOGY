/**
 * PROJECT ESCAPISM — ROTARY DNA LAB TENTACLE SYSTEM
 * Procedurally generates and animates organic, wiggling, purple-black tendrils sprouting from the DNA strands.
 */

const LabTentacles = {
    lab: null,
    tentacleGroup: null,
    tentacles: [],
    pointsPerTentacle: 12,

    init: function (labInstance) {
        this.lab = labInstance;
        this.tentacles = [];

        // Create group to contain tentacles
        this.tentacleGroup = new THREE.Group();
        this.lab.dnaGroup.add(this.tentacleGroup);
    },

    update: function (time, depth) {
        if (!this.lab || !this.tentacleGroup) return;

        // Only sprout tentacles below 1000m depth
        if (depth < 1000) {
            this.tentacleGroup.visible = false;
            // Clear existing elements to save memory
            this.clearTentacles();
            return;
        }

        this.tentacleGroup.visible = true;

        // If tentacles are empty, initialize them from DNA base pair nodes
        if (this.tentacles.length === 0) {
            this.spawnTentacles();
        }

        // Calculate length scale based on depth (max growth at 5000m)
        const depthFactor = Math.min(1.0, (depth - 1000) / 4000);
        const maxLen = 0.4 + depthFactor * 1.5;

        // Animate each tentacle
        this.tentacles.forEach((tentacle) => {
            const node = tentacle.nodeRef;
            if (!node || !node.mesh) return;

            // Get absolute position of node
            const basePos = node.mesh.position.clone();
            
            // Tentacle direction points outwards from helix axis
            const dir = new THREE.Vector3(basePos.x, 0, basePos.z).normalize();
            // Add a slight vertical fan angle
            dir.y = Math.sin(node.baseAngle) * 0.35;
            dir.normalize();

            // Grow current length toward max target length
            tentacle.currentLength += (maxLen - tentacle.currentLength) * 0.08;

            const positions = tentacle.line.geometry.attributes.position.array;

            // Update procedural wiggle curve points
            for (let i = 0; i < this.pointsPerTentacle; i++) {
                const ratio = i / (this.pointsPerTentacle - 1);
                const len = ratio * tentacle.currentLength;

                // Complex organic sine-wave wiggling
                const wiggleFreq = 4.5 + ratio * 5.0;
                const wiggleAmp = 0.06 * ratio * (1.0 + depthFactor * 1.5);
                const wiggleX = Math.sin(time * wiggleFreq + node.baseAngle) * wiggleAmp;
                const wiggleY = Math.cos(time * (wiggleFreq - 1.2) + node.baseAngle * 2) * wiggleAmp;

                const pt = basePos.clone().addScaledVector(dir, len);
                pt.x += wiggleX;
                pt.y += wiggleY;

                positions[i * 3] = pt.x;
                positions[i * 3 + 1] = pt.y;
                positions[i * 3 + 2] = pt.z;
            }

            tentacle.line.geometry.attributes.position.needsUpdate = true;

            // Shift colors to deep blackish purple as depth increases
            const ratioMat = Math.min(1.0, (depth - 1000) / 3000);
            tentacle.line.material.color.lerpColors(new THREE.Color(0xa855f7), new THREE.Color(0x31004a), ratioMat);
        });
    },

    spawnTentacles: function () {
        this.clearTentacles();

        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(this.pointsPerTentacle * 3);
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.LineBasicMaterial({
            color: 0xa855f7,
            transparent: true,
            opacity: 0.8,
            linewidth: 3 // thicker visual representation
        });

        // Spawn one tentacle from each Strand A node
        this.lab.nodesA.forEach((node, idx) => {
            if (idx % 2 === 0) { // Limit to alternate base pairs to prevent mesh crowding
                const line = new THREE.Line(geom.clone(), mat.clone());
                this.tentacleGroup.add(line);
                this.tentacles.push({
                    nodeRef: node,
                    line: line,
                    currentLength: 0
                });
            }
        });

        // Spawn one tentacle from each Strand B node
        this.lab.nodesB.forEach((node, idx) => {
            if (idx % 2 === 0) {
                const line = new THREE.Line(geom.clone(), mat.clone());
                this.tentacleGroup.add(line);
                this.tentacles.push({
                    nodeRef: node,
                    line: line,
                    currentLength: 0
                });
            }
        });
    },

    clearTentacles: function () {
        this.tentacles.forEach((t) => {
            if (t.line) {
                this.tentacleGroup.remove(t.line);
                t.line.geometry.dispose();
                t.line.material.dispose();
            }
        });
        this.tentacles = [];
    },

    destroy: function () {
        this.clearTentacles();
        if (this.tentacleGroup && this.tentacleGroup.parentNode) {
            this.tentacleGroup.parentNode.removeChild(this.tentacleGroup);
        }
        this.tentacleGroup = null;
        this.lab = null;
    }
};

window.LabTentacles = LabTentacles;
