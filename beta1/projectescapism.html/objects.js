/**
 * OBJECT FACTORY: High-Fidelity Environmental Debris & Special Effects
 */
const ObjectFactory = {
    _safeMerge: function (geometries) {
        if (!THREE.BufferGeometryUtils) return geometries[0];
        const sanitized = geometries.map(g => {
            let clone = g.index ? g.toNonIndexed() : g.clone();
            if (clone.attributes.uv) clone.deleteAttribute('uv');
            return clone;
        });
        return THREE.BufferGeometryUtils.mergeBufferGeometries(sanitized);
    },
    rockGeo: null,
    debrisGeo: null,
    barrelGeo: null,
    fireGeo: null,

    pukePuddleGeo: null,
    thrownRockGeo: null,
    weaponCrateGeo: null,

    init: function () {
        this.rockGeo = this._createRockGeo();
        this.debrisGeo = this._createDebrisGeo();
        this.barrelGeo = this._createBarrelGeo();
        this.fireGeo = this._createFireGeo();
        this.pukePuddleGeo = this._createPukePuddleGeo();
        this.thrownRockGeo = this._createThrownRockGeo();
        this.weaponCrateGeo = this._createWeaponCrateGeo();
    },

    getRockGeo: function () { return this.rockGeo || (this.rockGeo = this._createRockGeo()); },
    getDebrisGeo: function () { return this.debrisGeo || (this.debrisGeo = this._createDebrisGeo()); },
    getBarrelGeo: function () { return this.barrelGeo || (this.barrelGeo = this._createBarrelGeo()); },
    getFireGeo: function () { return this.fireGeo || (this.fireGeo = this._createFireGeo()); },
    getPukePuddleGeo: function () { return this.pukePuddleGeo || (this.pukePuddleGeo = this._createPukePuddleGeo()); },
    getThrownRockGeo: function () { return this.thrownRockGeo || (this.thrownRockGeo = this._createThrownRockGeo()); },
    getWeaponCrateGeo: function () { return this.weaponCrateGeo || (this.weaponCrateGeo = this._createWeaponCrateGeo()); },

    // --- Geometry Generators ---

    _createRockGeo: function () {
        const parts = [];
        const base = new THREE.IcosahedronGeometry(0.4, 3); // High poly for displacement
        base.translate(0, 0.2, 0);
        if (base.attributes.uv) base.deleteAttribute('uv');
        parts.push(base);

        for (let i = 0; i < 3; i++) {
            const chip = new THREE.BoxGeometry(0.2, 0.2, 0.2);
            chip.rotateX(Math.random() * Math.PI);
            chip.rotateY(Math.random() * Math.PI);
            chip.translate((Math.random() - 0.5) * 0.4, 0.2, (Math.random() - 0.5) * 0.4);
            if (chip.attributes.uv) chip.deleteAttribute('uv');
            parts.push(chip);
        }
        return this._safeMerge(parts);
    },

    _createDebrisGeo: function () {
        const parts = [];
        const concrete = new THREE.BoxGeometry(0.8, 0.15, 0.4);
        concrete.rotateY(0.5);
        if (concrete.attributes.uv) concrete.deleteAttribute('uv');
        parts.push(concrete);

        const rebar = new THREE.CylinderGeometry(0.015, 0.015, 1.2, 4);
        rebar.rotateZ(Math.PI / 2);
        rebar.translate(0, 0, 0.1);
        if (rebar.attributes.uv) rebar.deleteAttribute('uv');
        parts.push(rebar);

        const rebar2 = rebar.clone();
        rebar2.translate(0, 0, -0.2);
        rebar2.rotateY(0.3);
        parts.push(rebar2);

        return this._safeMerge(parts);
    },

    _createBarrelGeo: function () {
        const parts = [];
        const body = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 32);
        if (body.attributes.uv) body.deleteAttribute('uv');
        parts.push(body);

        const ring1 = new THREE.TorusGeometry(0.31, 0.02, 8, 16);
        ring1.rotateX(Math.PI / 2);
        ring1.translate(0, 0.2, 0);
        if (ring1.attributes.uv) ring1.deleteAttribute('uv');
        parts.push(ring1);

        const ring2 = ring1.clone();
        ring2.translate(0, -0.4, 0);
        parts.push(ring2);

        return this._safeMerge(parts);
    },

    _createFireGeo: function () {
        const parts = [];
        for (let i = 0; i < 3; i++) {
            const cone = new THREE.ConeGeometry(0.15 - i * 0.03, 0.6 + i * 0.2, 6);
            cone.translate(0, (0.3 + i * 0.1), 0);
            if (cone.attributes.uv) cone.deleteAttribute('uv');
            parts.push(cone);
        }
        return this._safeMerge(parts);
    },

    _createPukePuddleGeo: function () {
        const parts = [];
        const base = new THREE.CylinderGeometry(0.8, 0.8, 0.05, 12);
        base.translate(0, 0.025, 0);
        if (base.attributes.uv) base.deleteAttribute('uv');
        parts.push(base);

        for (let i = 0; i < 3; i++) {
            const blob = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 8);
            blob.translate((Math.random() - 0.5) * 0.8, 0.04, (Math.random() - 0.5) * 0.8);
            if (blob.attributes.uv) blob.deleteAttribute('uv');
            parts.push(blob);
        }
        return this._safeMerge(parts);
    },

    _createThrownRockGeo: function () {
        const parts = [];
        const base = new THREE.IcosahedronGeometry(0.2, 2);
        if (base.attributes.uv) base.deleteAttribute('uv');
        parts.push(base);
        for (let i = 0; i < 2; i++) {
            const chip = new THREE.BoxGeometry(0.15, 0.15, 0.15);
            chip.rotateX(Math.random() * Math.PI);
            chip.rotateY(Math.random() * Math.PI);
            chip.translate((Math.random() - 0.5) * 0.2, 0, (Math.random() - 0.5) * 0.2);
            if (chip.attributes.uv) chip.deleteAttribute('uv');
            parts.push(chip);
        }
        return this._safeMerge(parts);
    },

    _createWeaponCrateGeo: function () {
        const parts = [];
        const base = new THREE.BoxGeometry(0.8, 0.5, 0.4);
        base.translate(0, 0.25, 0);
        if (base.attributes.uv) base.deleteAttribute('uv');
        parts.push(base);

        // Straps/Bands
        const band1 = new THREE.BoxGeometry(0.85, 0.55, 0.05);
        band1.translate(0, 0.25, 0.1);
        if (band1.attributes.uv) band1.deleteAttribute('uv');
        parts.push(band1);

        const band2 = new THREE.BoxGeometry(0.85, 0.55, 0.05);
        band2.translate(0, 0.25, -0.1);
        if (band2.attributes.uv) band2.deleteAttribute('uv');
        parts.push(band2);

        return this._safeMerge(parts);
    },

    // --- Materials & Shaders ---

    getRockMat: function () {
        const mat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, metalness: 0.05 });
        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            mat.userData.shader = shader;
            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                varying vec3 vWorldPosOut;
                varying vec3 vLocalPosOut;
                float snoise(vec3 v) { return fract(sin(dot(v, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
                `
            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>
                vLocalPosOut = position;
                float n = snoise(position * 5.0 + instanceMatrix[3].xyz) * 0.15;
                transformed += normal * n;
                `
            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <worldpos_vertex>`,
                `#include <worldpos_vertex>
                vWorldPosOut = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>
                varying vec3 vWorldPosOut;
                varying vec3 vLocalPosOut;
                float snoise(vec3 v) { return fract(sin(dot(v, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <color_fragment>`,
                `#include <color_fragment>
                float bump = snoise(vWorldPosOut * 4.0);
                float microBump = snoise(vWorldPosOut * 20.0);
                diffuseColor.rgb *= 0.5 + bump * 0.4 + microBump * 0.1;
                if (vLocalPosOut.y < 0.2 && bump > 0.5) {
                    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1, 0.25, 0.1), 0.6); // Mossy base
                }
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <normal_fragment_maps>`,
                `#include <normal_fragment_maps>
                vec2 bp = vWorldPosOut.xz * 10.0;
                float h1 = snoise(vec3(bp, vWorldPosOut.y));
                float h2 = snoise(vec3(bp + vec2(0.1, 0.0), vWorldPosOut.y));
                float h3 = snoise(vec3(bp + vec2(0.0, 0.1), vWorldPosOut.y));
                vec3 detailNormal = normalize(vec3(h1 - h2, 1.0, h1 - h3));
                normal = normalize(normal + detailNormal * 0.8);
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <roughnessmap_fragment>`,
                `#include <roughnessmap_fragment>
                float mossMask = step(0.5, snoise(vWorldPosOut * 4.0)) * step(vLocalPosOut.y, 0.2);
                roughnessFactor = mix(0.85, 0.95, mossMask); // Moss is rougher
                `
            );
        };
        return mat;
    },

    getPukeMat: function () {
        const mat = new THREE.MeshStandardMaterial({
            color: 0x4ade80,
            emissive: 0x16a34a,
            emissiveIntensity: 0.5,
            roughness: 0.1,
            metalness: 0.2,
            transparent: true,
            opacity: 0.8
        });

        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>
                uniform float uTime;
                varying vec3 vWorldPosition;
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <emissivemap_fragment>`,
                `#include <emissivemap_fragment>
                totalEmissiveRadiance *= 1.0 + sin(uTime * 3.0 + vWorldPosition.x * 5.0) * 0.2;
                `
            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                varying vec3 vWorldPosition;
                `
            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <worldpos_vertex>`,
                `#include <worldpos_vertex>
                vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
                `
            );
            mat.userData.shader = shader;
        };
        return mat;
    },

    getThrownRockMat: function () {
        return new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 1.0, metalness: 0.0 });
    },

    getScrapMat: function () {
        const mat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7, metalness: 0.8 });
        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            mat.userData.shader = shader;
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>
                varying vec3 vWorldPosOut;
                float snoise(vec3 v) { return fract(sin(dot(v, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <color_fragment>`,
                `#include <color_fragment>
                float rust = snoise(vWorldPosOut * 6.0);
                if (rust > 0.6) {
                    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.5, 0.2, 0.1), smoothstep(0.6, 1.0, rust));
                }
                `
            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                varying vec3 vWorldPosOut;
                `
            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <worldpos_vertex>`,
                `#include <worldpos_vertex>
                vWorldPosOut = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
                `
            );
        };
        return mat;
    },

    getBarrelMat: function () {
        // Realistic rusted metal, no emissive glow
        const mat = new THREE.MeshStandardMaterial({ color: 0x8a1b22, roughness: 0.6, metalness: 0.8 });
        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            mat.userData.shader = shader;
            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                varying vec3 vWorldPosOut;
                varying vec3 vLocalPosOut;
                `
            );
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
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>
                uniform float uTime;
                varying vec3 vWorldPosOut;
                varying vec3 vLocalPosOut;
                float snoise(vec3 v) { return fract(sin(dot(v, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <color_fragment>`,
                `#include <color_fragment>
                float rust = snoise(vWorldPosOut * 4.0);
                float scratch = snoise(vWorldPosOut * 50.0);
                diffuseColor.rgb = mix(diffuseColor.rgb * (0.8 + scratch * 0.2), vec3(0.35, 0.15, 0.05), smoothstep(0.4, 0.8, rust));
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <roughnessmap_fragment>`,
                `#include <roughnessmap_fragment>
                float r_rust = snoise(vWorldPosOut * 4.0);
                float isSlimeLineR = smoothstep(0.8, 0.95, snoise(vWorldPosOut * 5.0 + uTime * 0.5)) * smoothstep(0.35, 0.45, vLocalPosOut.y);
                roughnessFactor = mix(0.4, 0.9, smoothstep(0.4, 0.8, r_rust)); // Rust is rough
                roughnessFactor = mix(roughnessFactor, 0.1, isSlimeLineR); // Slime is glossy
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <normal_fragment_maps>`,
                `#include <normal_fragment_maps>
                vec2 bp2 = vWorldPosOut.xy * 8.0;
                float hr1 = snoise(vec3(bp2, vWorldPosOut.z));
                float hr2 = snoise(vec3(bp2 + vec2(0.1, 0.0), vWorldPosOut.z));
                float hr3 = snoise(vec3(bp2 + vec2(0.0, 0.1), vWorldPosOut.z));
                vec3 rustNormal = normalize(vec3(hr1 - hr2, 1.0, hr1 - hr3));
                float normalMask = smoothstep(0.4, 0.8, snoise(vWorldPosOut * 4.0));
                normal = normalize(normal + rustNormal * 0.6 * normalMask);
                `
            );
        };
        return mat;
    },

    getFireMat: function () {
        const mat = new THREE.MeshStandardMaterial({
            color: 0xff4500, // Safety orange
            emissive: 0xff2200,
            emissiveIntensity: 2.0,
            transparent: true,
            opacity: 0.85
        });

        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                uniform float uTime;
                `
            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>
                float id = position.y * 10.0;
                transformed.x += sin(uTime * 12.0 + id) * 0.05 * position.y;
                transformed.z += cos(uTime * 15.0 + id) * 0.05 * position.y;
                transformed.y *= 1.0 + sin(uTime * 8.0) * 0.1;
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <emissivemap_fragment>`,
                `#include <emissivemap_fragment>
                totalEmissiveRadiance *= 1.0 + sin(uTime * 20.0) * 0.3; // Flicker
                `
            );
            mat.userData.shader = shader;
        };
        return mat;
    },

    getWeaponCrateMat: function () {
        const mat = new THREE.MeshStandardMaterial({
            color: 0x2233aa,
            emissive: 0x00aaff,
            emissiveIntensity: 0.8,
            roughness: 0.3,
            metalness: 0.8
        });

        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                uniform float uTime;
                varying vec3 vWorldPosition;
                `
            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <worldpos_vertex>`,
                `#include <worldpos_vertex>
                vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>
                uniform float uTime;
                varying vec3 vWorldPosition;
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <emissivemap_fragment>`,
                `#include <emissivemap_fragment>
                float pulse = (sin(uTime * 3.0) * 0.5 + 0.5);
                totalEmissiveRadiance *= 0.5 + pulse * 1.5;
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <roughnessmap_fragment>`,
                `#include <roughnessmap_fragment>
                roughnessFactor = 0.2; // High tech smooth plastic/metal
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <normal_fragment_maps>`,
                `#include <normal_fragment_maps>
                // Hexagon/grid pattern for crate
                vec2 hex = fract(vWorldPosition.xz * 15.0);
                float hx = smoothstep(0.4, 0.5, length(hex - 0.5));
                normal = normalize(normal + vec3(0.0, 1.0, 0.0) * hx * 0.15);
                `
            );
            mat.userData.shader = shader;
        };
        return mat;
    }
};
ObjectFactory.init();
