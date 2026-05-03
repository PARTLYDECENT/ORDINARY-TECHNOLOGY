// facilities.js
// High-tech sci-fi outposts layout logic and advanced InstancedMesh materials

const FacilityGen = {
    wallGeo: null, wallMat: null,
    floorGeo: null, floorMat: null,
    pillarGeo: null, pillarMat: null,

    init: function (config) {
        // High-Tech Cyberpunk Walls
        this.wallGeo = new THREE.BoxGeometry(config.cellSize, config.cellSize * 1.5, config.cellSize);
        this.wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.8, emissive: 0x00ffff, emissiveIntensity: 0.0 });
        this.wallMat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            this.wallMat.userData.shader = shader;
            shader.vertexShader = `
                varying vec3 vWorldPosOut;
                varying vec3 vLocalPosOut;
            ` + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>
                vLocalPosOut = position;
                `
            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <worldpos_vertex>`,
                `#include <worldpos_vertex>
                vWorldPosOut = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
                `
            );
            shader.fragmentShader = `
                uniform float uTime;
                varying vec3 vWorldPosOut;
                varying vec3 vLocalPosOut;
                float snoise(vec3 v) { return fract(sin(dot(v, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
            ` + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <color_fragment>`,
                `#include <color_fragment>
                float n = snoise(vWorldPosOut * 2.0);
                diffuseColor.rgb *= 0.6 + n * 0.4;
                // Add vertical high-tech panels
                float strip = smoothstep(0.9, 0.95, sin(vWorldPosOut.y * 10.0));
                diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.05, 0.1), strip * 0.8);
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <emissivemap_fragment>`,
                `#include <emissivemap_fragment>
                // Horizontal cyan neon stripes (Static for performance)
                float glowStrip = step(0.98, sin(vLocalPosOut.y * 3.14));
                totalEmissiveRadiance = vec3(0.0, 1.0, 1.0) * glowStrip * 1.5;
                `
            );
        };

        // High-Tech Hex Floor
        this.floorGeo = new THREE.PlaneGeometry(config.cellSize, config.cellSize);
        this.floorGeo.rotateX(-Math.PI / 2);
        this.floorGeo.translate(0, 0.05, 0); // slightly above dirt
        this.floorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.7, emissive: 0x00ffff, emissiveIntensity: 0.0 });
        this.floorMat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            this.floorMat.userData.shader = shader;
            shader.vertexShader = `
                varying vec3 vWorldPosOut;
                varying vec3 vLocalPosOut;
            ` + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>
                vLocalPosOut = position;
                `
            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <worldpos_vertex>`,
                `#include <worldpos_vertex>
                vWorldPosOut = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
                `
            );
            shader.fragmentShader = `
                uniform float uTime;
                varying vec3 vWorldPosOut;
                varying vec3 vLocalPosOut;
                
                // Hexagon distance function
                float hexDist(vec2 p) {
                    p = abs(p);
                    float c = dot(p, normalize(vec2(1.0, 1.73)));
                    return max(c, p.x);
                }
            ` + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <color_fragment>`,
                `#include <color_fragment>
                vec2 gridCenter = floor(vWorldPosOut.xz * 1.5) + 0.5;
                vec2 hp = (vWorldPosOut.xz * 1.5) - gridCenter;
                float dist = hexDist(hp);
                float border = smoothstep(0.45, 0.5, dist);
                diffuseColor.rgb = mix(vec3(0.1, 0.15, 0.2), vec3(0.02, 0.05, 0.08), border);
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <emissivemap_fragment>`,
                `#include <emissivemap_fragment>
                float hp2 = hexDist( (vWorldPosOut.xz * 1.5) - (floor(vWorldPosOut.xz * 1.5) + 0.5) );
                float hborder = smoothstep(0.45, 0.5, hp2);
                float pulse = 0.5; // Static for performance
                totalEmissiveRadiance = vec3(0.0, 0.3, 0.8) * hborder * pulse * 1.2;
                `
            );
        };
        // Pillars for corners and supports
        this.pillarGeo = new THREE.CylinderGeometry(config.cellSize * 0.25, config.cellSize * 0.35, config.cellSize * 1.8, 8);
        this.pillarGeo.translate(0, config.cellSize * 0.9, 0); // anchor to bottom
        this.pillarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.9, emissive: 0xff8800, emissiveIntensity: 0.0 });
        this.pillarMat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            this.pillarMat.userData.shader = shader;
            shader.vertexShader = `
                 varying vec3 vLocalPosOut;
             ` + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>
                vLocalPosOut = position;
                `
            );
            shader.fragmentShader = `
                 uniform float uTime;
                 varying vec3 vLocalPosOut;
             ` + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <emissivemap_fragment>`,
                `#include <emissivemap_fragment>
                float orangePulse = 0.0; // Static for performance
                totalEmissiveRadiance = vec3(1.0, 0.5, 0.0) * orangePulse * 3.0;
                `
            );
        };

        // Industrial Pipes
        this.pipeGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.0, 8);
        this.pipeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.85 });
        this.pipeMat.onBeforeCompile = (shader) => {
            shader.vertexShader = `varying vec3 vWorldPos;` + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(`#include <worldpos_vertex>`, `#include <worldpos_vertex>\nvWorldPos = worldPosition.xyz;`);
            shader.fragmentShader = `varying vec3 vWorldPos;` + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace(`#include <color_fragment>`, `#include <color_fragment>\nfloat stripe = step(0.9, fract(vWorldPos.x * 2.0 + vWorldPos.z * 2.0 + vWorldPos.y * 2.0));\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1, 0.12, 0.15), stripe * 0.5);`);
        };

        // Steam Vents
        this.steamGeo = new THREE.CylinderGeometry(0.02, 0.6, 2.5, 8, 4, true);
        this.steamGeo.translate(0, 1.25, 0);
        this.steamMat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 } },
            vertexShader: `
                varying vec2 vUv;
                varying float vY;
                uniform float uTime;
                void main() {
                    vUv = uv;
                    vY = position.y;
                    vec3 pos = position;
                    float offset = sin(uTime * 3.0 + vY * 2.0) * 0.15 * (vY / 2.5);
                    pos.x += offset;
                    pos.z += cos(uTime * 2.5 + vY * 1.5) * 0.1 * (vY / 2.5);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                varying float vY;
                uniform float uTime;
                float noise(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
                void main() {
                    float fade = smoothstep(0.0, 0.8, vY) * smoothstep(2.5, 1.2, vY);
                    float n = noise(vUv * 5.0 + vec2(0.0, uTime * 1.2));
                    gl_FragColor = vec4(0.9, 0.95, 1.0, fade * (0.2 + n * 0.3));
                }
            `,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });
    },

    update: function (delta) {
        if (this.wallMat && this.wallMat.userData && this.wallMat.userData.shader) {
            this.wallMat.userData.shader.uniforms.uTime.value += delta;
        }
        if (this.floorMat && this.floorMat.userData && this.floorMat.userData.shader) {
            this.floorMat.userData.shader.uniforms.uTime.value += delta;
        }
        if (this.pillarMat && this.pillarMat.userData && this.pillarMat.userData.shader) {
            this.pillarMat.userData.shader.uniforms.uTime.value += delta;
        }
        if (this.steamMat) {
            this.steamMat.uniforms.uTime.value += delta;
        }
    }
};
