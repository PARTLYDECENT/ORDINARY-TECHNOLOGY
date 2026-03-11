/**
 * HGT25.JS — Void Symbiote (Apex WebGL Entity)
 * A metaball-based fluid entity with node-spring physics (Verlet Integration),
 * traveling sine waves, and GPU-driven bioluminescent rendering.
 * Lives as an overlay alongside the Canvas 2D organism ecosystem.
 */

class VoidSymbiote {
    constructor(options = {}) {
        this.id = `symbiote-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        this.alive = true;
        this.canvas = null;
        this.gl = null;
        this.program = null;
        this.width = 0;
        this.height = 0;

        // Physics
        this.nodes = [];
        this.links = [];
        this.MAX_NODES = 115;
        this.TENTACLES = 8;
        this.NODES_PER_TENTACLE = 12;

        // AI
        this.time = 0;
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.aiState = 0;
        this.stateTimer = 0;
        this.currentIntensity = 0.0;
        this.targetIntensity = 0.0;
        this.stateName = 'AUTONOMOUS DRIFT';

        // GPU data buffers
        this.nodesData = new Float32Array(this.MAX_NODES * 2);
        this.radiiData = new Float32Array(this.MAX_NODES);

        // Uniform locations
        this.uniforms = {};

        this.init();
        console.log(`🕳️ Void Symbiote spawned: ${this.id}`);
    }

    init() {
        // Create overlay canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'symbiote-canvas';
        this.canvas.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            pointer-events: none; z-index: 998; mix-blend-mode: screen;
        `;
        document.body.appendChild(this.canvas);

        this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
        if (!this.gl) {
            console.error('🕳️ Void Symbiote: WebGL unavailable');
            return;
        }

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);

        this.compileProgram();
        this.setupGeometry();
        this.resize();
        this.buildBody();

        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    // ─── SHADERS ─────────────────────────────────────────
    get vertexShader() {
        return `
            attribute vec2 a_position;
            varying vec2 v_coord;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_coord = a_position;
            }
        `;
    }

    get fragmentShader() {
        return `
            precision highp float;
            #define MAX_NODES 115

            uniform vec2 u_nodes[MAX_NODES];
            uniform float u_radii[MAX_NODES];
            uniform int u_nodeCount;
            uniform vec2 u_resolution;
            uniform float u_time;
            uniform float u_intensity;

            varying vec2 v_coord;

            vec3 palette(float t) {
                vec3 a = vec3(0.5, 0.5, 0.5);
                vec3 b = vec3(0.5, 0.5, 0.5);
                vec3 c = vec3(2.0, 1.0, 0.0);
                vec3 d = vec3(0.50, 0.20, 0.25);
                return a + b * cos(6.28318 * (c * t + d));
            }

            float calculateField(vec2 uv) {
                float field = 0.0;
                for (int i = 0; i < MAX_NODES; i++) {
                    if (i < u_nodeCount) {
                        vec2 d = uv - u_nodes[i];
                        float r = u_radii[i];
                        float distSq = dot(d, d);
                        field += (r * r) / (distSq + 0.00005);
                    }
                }
                return field;
            }

            vec3 getNormal(vec2 uv) {
                vec2 e = vec2(0.005, 0.0);
                float dx = calculateField(uv + e.xy) - calculateField(uv - e.xy);
                float dy = calculateField(uv + e.yx) - calculateField(uv - e.yx);
                float timeP = u_time * (2.0 + u_intensity);
                float ripple = sin(uv.x * 30.0 + timeP) * cos(uv.y * 30.0 - timeP * 0.8) * 0.015
                             + sin(uv.x * 120.0 - timeP * 2.0) * cos(uv.y * 120.0 + timeP * 1.5) * 0.005;
                return normalize(vec3(-dx + ripple, -dy + ripple, 100.0));
            }

            void main() {
                vec2 uv = v_coord;
                uv.x *= u_resolution.x / u_resolution.y;

                float field = calculateField(uv);
                float threshold = 1.0;
                float edge = smoothstep(threshold - 0.15, threshold + 0.01, field);
                float innerDense = smoothstep(threshold + 1.0, threshold + 4.0, field);

                if (edge <= 0.01) {
                    // Transparent background — let the site show through
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
                    return;
                }

                vec3 normal = getNormal(uv);
                vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));

                vec3 lightKey = normalize(vec3(0.8, 0.8, 0.6));
                vec3 lightRim = normalize(vec3(-1.0, -0.5, 0.1));
                vec3 lightGlow = normalize(vec3(0.0, -1.0, 0.5));

                float diffKey = max(dot(normal, lightKey), 0.0);
                float diffRim = max(dot(normal, lightRim), 0.0);
                float diffGlow = max(dot(normal, lightGlow), 0.0);

                vec3 halfKey = normalize(lightKey + viewDir);
                float spec = pow(max(dot(normal, halfKey), 0.0), 256.0);

                float fresnelFactor = pow(1.0 - max(dot(normal, viewDir), 0.0), 1.5);
                vec3 fresnelColor = palette(fresnelFactor - u_time * 0.5 + u_intensity * 0.5);

                vec3 baseColor = mix(vec3(0.0, 0.0, 0.02), vec3(0.05, 0.0, 0.08), innerDense);

                float veins = sin(field * 15.0 - u_time * (5.0 + u_intensity * 10.0)) * 0.5 + 0.5;
                vec3 activeVeinColor = mix(vec3(0.2, 0.0, 0.8), vec3(1.0, 0.3, 0.0), u_intensity);
                vec3 veinColor = activeVeinColor * veins * innerDense * (0.6 + u_intensity);

                vec3 col = baseColor + veinColor;
                col += vec3(1.0) * diffKey * 0.15;
                col += fresnelColor * diffRim * (1.0 + u_intensity * 1.5);
                col += vec3(0.0, 1.0, 0.8) * diffGlow * 0.2;
                col += vec3(1.0, 0.9, 0.8) * spec * (2.0 + u_intensity);
                col += fresnelColor * fresnelFactor * edge * field * 0.2;

                gl_FragColor = vec4(col, edge * 0.85);
            }
        `;
    }

    // ─── WEBGL SETUP ─────────────────────────────────────
    compileShader(source, type) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('🕳️ Shader Error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    compileProgram() {
        const gl = this.gl;
        const vs = this.compileShader(this.vertexShader, gl.VERTEX_SHADER);
        const fs = this.compileShader(this.fragmentShader, gl.FRAGMENT_SHADER);
        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);
        gl.useProgram(this.program);

        this.uniforms = {
            resolution: gl.getUniformLocation(this.program, 'u_resolution'),
            time: gl.getUniformLocation(this.program, 'u_time'),
            nodes: gl.getUniformLocation(this.program, 'u_nodes'),
            radii: gl.getUniformLocation(this.program, 'u_radii'),
            nodeCount: gl.getUniformLocation(this.program, 'u_nodeCount'),
            intensity: gl.getUniformLocation(this.program, 'u_intensity'),
        };
    }

    setupGeometry() {
        const gl = this.gl;
        const verts = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
        const pos = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    }

    resize() {
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight;
        if (this.gl) {
            this.gl.viewport(0, 0, this.width, this.height);
            this.gl.uniform2f(this.uniforms.resolution, this.width, this.height);
        }
    }

    // ─── PHYSICS BODY ────────────────────────────────────
    buildBody() {
        const w = this.width, h = this.height;

        class PhysNode {
            constructor(x, y, radius, isCore = false) {
                this.x = x; this.y = y;
                this.vx = 0; this.vy = 0;
                this.radius = radius;
                this.targetRadius = radius;
                this.isCore = isCore;
            }
            applyForce(fx, fy) { this.vx += fx; this.vy += fy; }
            update(w, h) {
                this.vx *= 0.88; this.vy *= 0.88;
                this.x += this.vx; this.y += this.vy;
                this.radius += (this.targetRadius - this.radius) * 0.1;
                const pad = 50;
                if (this.x < pad) { this.x = pad; this.vx *= -1; }
                if (this.x > w - pad) { this.x = w - pad; this.vx *= -1; }
                if (this.y < pad) { this.y = pad; this.vy *= -1; }
                if (this.y > h - pad) { this.y = h - pad; this.vy *= -1; }
            }
        }

        this.PhysNode = PhysNode;
        this.nodes = [];
        this.links = [];

        const core = new PhysNode(w / 2, h / 2, 0.22, true);
        this.nodes.push(core);

        for (let m = 0; m < 3; m++) {
            this.nodes.push(new PhysNode(core.x, core.y, 0.15));
        }

        for (let i = 0; i < this.TENTACLES; i++) {
            let prev = core;
            const angle = (Math.PI * 2 / this.TENTACLES) * i;
            let lenMul = 1.0;
            if (i === 0 || i === 4) lenMul = 1.6;
            else if (i === 2 || i === 6) lenMul = 1.3;
            else lenMul = 0.6;

            for (let j = 1; j <= this.NODES_PER_TENTACLE; j++) {
                const size = (0.1 - (j * 0.008)) * Math.min(lenMul, 1.2);
                const n = new PhysNode(
                    core.x + Math.cos(angle) * (j * 15),
                    core.y + Math.sin(angle) * (j * 15),
                    Math.max(0.005, size)
                );
                this.nodes.push(n);
                this.links.push({ n1: prev, n2: n, rest: 18 * lenMul, stiffness: 0.7 - (j * 0.05) });
                prev = n;
            }
        }
    }

    // ─── PHYSICS SOLVER ──────────────────────────────────
    solveLinks() {
        const core = this.nodes[0];
        for (let m = 1; m <= 3; m++) {
            let dx = this.nodes[m].x - core.x;
            let dy = this.nodes[m].y - core.y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
            let diff = (10 - dist) / dist;
            this.nodes[m].applyForce(dx * diff * 0.1, dy * diff * 0.1);
        }

        for (const link of this.links) {
            let dx = link.n2.x - link.n1.x;
            let dy = link.n2.y - link.n1.y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
            let diff = (link.rest - dist) / dist;
            let fx = dx * diff * link.stiffness;
            let fy = dy * diff * link.stiffness;
            let m1 = link.n1.isCore ? 0.05 : 0.6;
            let m2 = link.n2.isCore ? 0.05 : 0.6;
            link.n1.applyForce(-fx * m1, -fy * m1);
            link.n2.applyForce(fx * m2, fy * m2);
        }
    }

    // ─── AI BEHAVIOR ─────────────────────────────────────
    updateAI() {
        this.time += 0.012;
        this.stateTimer -= 1;
        const core = this.nodes[0];

        if (this.stateTimer <= 0) {
            const r = Math.random();
            if (r < 0.4) {
                this.aiState = 0;
                this.stateTimer = 250 + Math.random() * 300;
                this.targetIntensity = 0.1;
                this.stateName = 'AUTONOMOUS DRIFT';
            } else if (r < 0.7) {
                this.aiState = 1;
                this.stateTimer = 80 + Math.random() * 60;
                this.wanderAngle += (Math.random() - 0.5) * Math.PI;
                this.targetIntensity = 1.0;
                this.stateName = 'KINETIC BURST';
            } else {
                this.aiState = 2;
                this.stateTimer = 180 + Math.random() * 150;
                this.targetIntensity = 0.5;
                this.stateName = 'ENVIRONMENTAL MAPPING';
            }
        }

        this.currentIntensity += (this.targetIntensity - this.currentIntensity) * 0.05;

        // Edge avoidance
        const margin = 200;
        if (core.x < margin || core.x > this.width - margin || core.y < margin || core.y > this.height - margin) {
            const angleToCenter = Math.atan2(this.height / 2 - core.y, this.width / 2 - core.x);
            let diff = angleToCenter - this.wanderAngle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.wanderAngle += diff * 0.03;
        }

        const swimPerpX = Math.cos(this.wanderAngle + Math.PI / 2);
        const swimPerpY = Math.sin(this.wanderAngle + Math.PI / 2);

        if (this.aiState === 0) {
            // Drifting
            this.wanderAngle += (Math.random() - 0.5) * 0.03;
            core.applyForce(Math.cos(this.wanderAngle) * 0.8, Math.sin(this.wanderAngle) * 0.8);
            for (let i = 0; i < this.TENTACLES; i++) {
                for (let j = 1; j <= this.NODES_PER_TENTACLE; j++) {
                    const idx = 4 + (i * this.NODES_PER_TENTACLE) + j - 1;
                    if (this.nodes[idx]) {
                        this.nodes[idx].targetRadius = this.nodes[idx].radius + Math.sin(this.time * 3 + j * 0.5) * 0.002;
                        const wf = Math.sin(this.time * 4 - j * 0.6 + (i % 2) * Math.PI) * 0.3;
                        this.nodes[idx].applyForce(swimPerpX * wf, swimPerpY * wf);
                    }
                }
            }
        } else if (this.aiState === 1) {
            // Kinetic Burst
            this.wanderAngle += (Math.random() - 0.5) * 0.015;
            core.applyForce(Math.cos(this.wanderAngle) * 6.0, Math.sin(this.wanderAngle) * 6.0);
            for (let i = 0; i < this.TENTACLES; i++) {
                for (let j = 1; j <= this.NODES_PER_TENTACLE; j++) {
                    const idx = 4 + (i * this.NODES_PER_TENTACLE) + j - 1;
                    if (this.nodes[idx]) {
                        const wf = Math.sin(this.time * 12 - j * 0.8 + (i % 2) * Math.PI) * 1.5;
                        this.nodes[idx].applyForce(swimPerpX * wf, swimPerpY * wf);
                        this.nodes[idx].applyForce(-Math.cos(this.wanderAngle) * 0.5, -Math.sin(this.wanderAngle) * 0.5);
                    }
                }
            }
        } else if (this.aiState === 2) {
            // Sensory Expansion
            this.wanderAngle += (Math.random() - 0.5) * 0.1;
            core.applyForce(Math.cos(this.wanderAngle) * 0.15, Math.sin(this.wanderAngle) * 0.15);
            for (let i = 0; i < this.TENTACLES; i++) {
                const tipIdx = 4 + (i * this.NODES_PER_TENTACLE) + this.NODES_PER_TENTACLE - 1;
                if (this.nodes[tipIdx]) {
                    let dx = this.nodes[tipIdx].x - core.x;
                    let dy = this.nodes[tipIdx].y - core.y;
                    let dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    let reach = 1.5 + Math.cos(this.time * 6 + i) * 1.0;
                    this.nodes[tipIdx].applyForce((dx / dist) * reach, (dy / dist) * reach);
                }
            }
        }

        // Core breathing
        core.targetRadius = 0.20 + Math.sin(this.time * 4) * 0.04;
        for (let m = 1; m <= 3; m++) {
            this.nodes[m].targetRadius = 0.14 + Math.cos(this.time * 4 + m) * 0.03;
        }

        // Inter-node repulsion
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                let dx = this.nodes[j].x - this.nodes[i].x;
                let dy = this.nodes[j].y - this.nodes[i].y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 30) {
                    if (dist === 0) {
                        dx = (Math.random() - 0.5) * 0.1;
                        dy = (Math.random() - 0.5) * 0.1;
                        dist = Math.sqrt(dx * dx + dy * dy);
                    }
                    const force = (30 - dist) * 0.05;
                    this.nodes[i].applyForce(-dx / dist * force, -dy / dist * force);
                    this.nodes[j].applyForce(dx / dist * force, dy / dist * force);
                }
            }
        }
    }

    // ─── RENDER LOOP ─────────────────────────────────────
    animate() {
        if (!this.alive || !this.gl) return;

        this.updateAI();
        this.solveLinks();

        const gl = this.gl;
        const aspect = this.width / this.height;

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i].update(this.width, this.height);
            this.nodesData[i * 2] = ((this.nodes[i].x / this.width) * 2.0 - 1.0) * aspect;
            this.nodesData[i * 2 + 1] = ((this.height - this.nodes[i].y) / this.height) * 2.0 - 1.0;
            this.radiiData[i] = this.nodes[i].radius;
        }

        gl.uniform1f(this.uniforms.time, this.time);
        gl.uniform1f(this.uniforms.intensity, this.currentIntensity);
        gl.uniform1i(this.uniforms.nodeCount, this.nodes.length);
        gl.uniform2fv(this.uniforms.nodes, this.nodesData);
        gl.uniform1fv(this.uniforms.radii, this.radiiData);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(() => this.animate());
    }

    // ─── DESTROY ─────────────────────────────────────────
    destroy() {
        this.alive = false;
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        console.log(`🕳️ Void Symbiote destroyed: ${this.id}`);
    }
}

// Auto-init
if (typeof window !== 'undefined') {
    window.VoidSymbiote = VoidSymbiote;
    console.log('🕳️ hgt25.js loaded — use new VoidSymbiote() to spawn');
}
