// =================================================================================================
// [SYSTEM BOOTSTRAP] :: IMMEDIATE-INVOKED FUNCTION EXPRESSION (IIFE)
// Alien Encounters WebGL rendering system with real-world alien event narratives
// Only the `window.updateShader` function is intentionally exposed for external control.
// =================================================================================================
(function() {
    "use strict";

    // --- Core Variable Declarations ---
    const webglCanvas = document.getElementById('webglCanvas');
    let gl = null;
    let program = null;
    let animationFrameId = null;
    let currentShaderIndex = 0;
    let shaderTransitionTime = 0;
    let lastShaderChange = 0;

    // --- Error Handling and Initialization Check ---
    if (!webglCanvas) {
        console.error("[FATAL] WebGL Canvas element with id 'webglCanvas' not found in DOM. Aborting.");
        return;
    }

    // =================================================================================================
    // [ALIEN ENCOUNTERS DATABASE] :: REAL-WORLD EVENTS AND NARRATIVES
    // =================================================================================================
    const alienEncounters = [
        {
            name: "Betty and Barney Hill Abduction",
            year: 1961,
            location: "New Hampshire, USA",
            description: "The first widely publicized alien abduction case. Betty and Barney Hill claimed to have been taken aboard a spacecraft by grey aliens who performed medical examinations. Their account, revealed through hypnosis, became the template for countless abduction stories.",
            keywords: ["grey aliens", "medical examination", "hypnosis", "star map", "missing time"]
        },
        {
            name: "Travis Walton Abduction",
            year: 1975,
            location: "Arizona, USA",
            description: "Logger Travis Walton disappeared for five days after encountering a UFO. He claimed to have awakened on an alien craft, describing tall pale beings and advanced technology. Six witnesses saw the initial encounter.",
            keywords: ["logger", "five days", "tall beings", "advanced technology", "multiple witnesses"]
        },
        {
            name: "Roswell Incident",
            year: 1947,
            location: "New Mexico, USA",
            description: "A military balloon crash was initially reported as a 'flying disc' recovery. Decades later, conspiracy theories emerged claiming alien bodies were recovered and covered up by the government.",
            keywords: ["military", "flying disc", "government coverup", "alien bodies", "conspiracy"]
        },
        {
            name: "Phoenix Lights",
            year: 1997,
            location: "Arizona, USA",
            description: "Thousands witnessed a massive V-shaped craft with lights moving silently across the Phoenix sky. The military claimed it was flares, but many witnesses described a solid craft blocking out stars.",
            keywords: ["V-shaped craft", "thousands of witnesses", "silent movement", "blocking stars", "flares explanation"]
        },
        {
            name: "Rendlesham Forest Incident",
            year: 1980,
            location: "Suffolk, England",
            description: "US military personnel at RAF Bentwaters reported encountering a triangular craft in the forest. Deputy Base Commander Charles Halt recorded strange lights and radiation readings over multiple nights.",
            keywords: ["military personnel", "triangular craft", "radiation readings", "multiple nights", "forest encounter"]
        },
        {
            name: "Belgian UFO Wave",
            year: 1989,
            location: "Belgium",
            description: "Over 13,000 people reported triangular UFOs over Belgium. F-16 jets were scrambled to intercept, with radar operators confirming objects performing impossible maneuvers at incredible speeds.",
            keywords: ["13000 witnesses", "triangular UFOs", "F-16 intercept", "impossible maneuvers", "radar confirmation"]
        },
        {
            name: "Antônio Vilas-Boas Encounter",
            year: 1957,
            location: "Brazil",
            description: "Brazilian farmer claimed to have been abducted and subjected to medical experiments, including alleged breeding attempts with a humanoid female. One of the earliest detailed abduction accounts.",
            keywords: ["Brazilian farmer", "medical experiments", "breeding attempts", "humanoid female", "early abduction"]
        },
        {
            name: "Miracle of the Sun",
            year: 1917,
            location: "Fátima, Portugal",
            description: "70,000 people witnessed the sun appear to dance and change colors in the sky. While officially a religious miracle, some ufologists interpret it as a mass UFO sighting.",
            keywords: ["70000 witnesses", "dancing sun", "changing colors", "religious miracle", "mass sighting"]
        },
        {
            name: "Kenneth Arnold Sighting",
            year: 1947,
            location: "Washington State, USA",
            description: "Pilot Kenneth Arnold reported nine crescent-shaped objects flying at incredible speeds near Mount Rainier. His description of their movement as 'like saucers skipping on water' coined the term 'flying saucer'.",
            keywords: ["pilot witness", "crescent-shaped", "incredible speeds", "Mount Rainier", "flying saucer term"]
        },
        {
            name: "Foo Fighters",
            year: 1944,
            location: "European Theater, WWII",
            description: "Allied pilots reported mysterious glowing orbs following their aircraft during bombing missions. These 'foo fighters' displayed intelligent behavior and were immune to weapons fire.",
            keywords: ["WWII pilots", "glowing orbs", "following aircraft", "intelligent behavior", "immune to weapons"]
        }
    ];

    // =================================================================================================
    // [CONTEXT INITIALIZATION] :: ATTEMPT TO SECURE WEBGL2/WEBGL1 CONTEXT
    // =================================================================================================
    try {
        webglCanvas.width = window.innerWidth;
        webglCanvas.height = window.innerHeight;

        gl = webglCanvas.getContext('webgl2') ||
             webglCanvas.getContext('webgl') ||
             webglCanvas.getContext('experimental-web-gl');

        if (!gl) {
            throw new Error("WebGL is not supported or the context could not be created.");
        }

        if (gl instanceof WebGL2RenderingContext) {
            console.log("[INFO] Alien encounter visualization (WebGL2) initialized successfully.");
        } else {
            console.log("[WARN] Basic encounter rendering (WebGL1) detected. Some effects may be limited.");
        }
    } catch (e) {
        console.error("[FATAL] Dimensional rift error:", e);
        if (document.body) document.body.style.backgroundColor = '#050511';
        return;
    }

    // =================================================================================================
    // [SHADER SOURCE CODE] :: GLSL 3.00 ES - ALIEN ENCOUNTER EFFECTS
    // =================================================================================================

    const vertexShaderSource = `#version 300 es
        in vec4 a_position;
        void main() {
            gl_Position = a_position;
        }
    `;

    const fragmentShaderSource = `#version 300 es
        precision highp float;

        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        uniform float u_intensity;
        uniform float u_speed;
        uniform int u_shader_index;
        uniform float u_transition;

        out vec4 outColor;

        const float PI = 3.14159265359;
        const float TWO_PI = 6.28318530718;

        // =========================================================================================
        // [UTILITY FUNCTIONS]
        // =========================================================================================
        
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        
        float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                       mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
        }
        
        float fbm(vec2 p) {
            float v = 0.0, a = 0.5;
            for(int i = 0; i < 6; i++) {
                v += a * noise(p);
                p *= 2.0; a *= 0.5;
            }
            return v;
        }
        
        mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }

        // =========================================================================================
        // [ALIEN ENCOUNTER COLOR PALETTES]
        // =========================================================================================
        vec3 greyAlienSkin = vec3(0.7, 0.75, 0.8);
        vec3 alienEyes = vec3(0.1, 0.1, 0.1);
        vec3 ufoMetal = vec3(0.6, 0.65, 0.7);
        vec3 plasmaBlue = vec3(0.2, 0.6, 1.0);
        vec3 energyGreen = vec3(0.3, 0.9, 0.4);
        vec3 warningRed = vec3(1.0, 0.2, 0.1);
        vec3 starfield = vec3(0.9, 0.95, 1.0);
        vec3 deepSpace = vec3(0.02, 0.02, 0.05);
        vec3 abductionBeam = vec3(0.8, 0.9, 1.0);
        vec3 forestGreen = vec3(0.1, 0.3, 0.1);

        // =========================================================================================
        // [SHADER 1: BETTY AND BARNEY HILL - GREY ALIEN EXAMINATION]
        // =========================================================================================
        vec3 greyAlienExamination(vec2 uv, float t) {
            // Medical examination room atmosphere
            vec2 p = uv * 2.0;
            
            // Sterile white examination light
            float examLight = exp(-length(p) * 0.8) * (sin(t * 4.0) * 0.1 + 0.9);
            
            // Grey alien silhouettes
            vec2 alienPos1 = vec2(-0.8, 0.2) + vec2(sin(t * 0.3), cos(t * 0.2)) * 0.1;
            vec2 alienPos2 = vec2(0.8, -0.1) + vec2(cos(t * 0.4), sin(t * 0.3)) * 0.1;
            
            float alien1 = exp(-length(p - alienPos1) * 3.0);
            float alien2 = exp(-length(p - alienPos2) * 2.5);
            
            // Large black eyes
            vec2 eye1 = alienPos1 + vec2(0.0, 0.1);
            vec2 eye2 = alienPos2 + vec2(0.0, 0.1);
            float eyes = exp(-length(p - eye1) * 15.0) + exp(-length(p - eye2) * 15.0);
            
            // Medical instruments scanning
            float scan = sin(p.x * 10.0 + t * 3.0) * sin(p.y * 8.0 + t * 2.0);
            scan = smoothstep(0.7, 1.0, scan) * 0.3;
            
            vec3 base = mix(deepSpace, greyAlienSkin, examLight * 0.3);
            vec3 aliens = greyAlienSkin * (alien1 + alien2);
            vec3 eyeColor = alienEyes * eyes * 2.0;
            vec3 scanColor = plasmaBlue * scan;
            
            return base + aliens + eyeColor + scanColor + abductionBeam * examLight * 0.2;
        }

        // =========================================================================================
        // [SHADER 2: TRAVIS WALTON - FOREST ABDUCTION BEAM]
        // =========================================================================================
        vec3 forestAbduction(vec2 uv, float t) {
            vec2 p = uv * 1.5;
            
            // Forest silhouette
            float trees = 0.0;
            for(int i = 0; i < 8; i++) {
                float x = float(i) * 0.3 - 1.2;
                float treeHeight = 0.5 + sin(float(i)) * 0.3;
                float tree = smoothstep(0.05, 0.0, abs(p.x - x)) * 
                           smoothstep(treeHeight, treeHeight - 0.1, p.y + 0.8);
                trees += tree;
            }
            
            // UFO hovering above
            vec2 ufoPos = vec2(sin(t * 0.2) * 0.3, 0.6);
            float ufo = smoothstep(0.15, 0.1, length(p - ufoPos));
            
            // Abduction beam
            float beamWidth = 0.3 + sin(t * 2.0) * 0.1;
            float beam = smoothstep(beamWidth, beamWidth - 0.05, abs(p.x - ufoPos.x));
            beam *= smoothstep(ufoPos.y, ufoPos.y - 0.1, p.y);
            beam *= smoothstep(-0.8, -0.6, p.y);
            
            // Human figure in beam
            vec2 humanPos = vec2(ufoPos.x, -0.3 + sin(t * 1.0) * 0.1);
            float human = exp(-length(p - humanPos) * 8.0);
            
            // Particle effects in beam
            float particles = 0.0;
            for(int i = 0; i < 5; i++) {
                vec2 particlePos = vec2(ufoPos.x + sin(t * 2.0 + float(i)) * 0.1, 
                                      -0.8 + mod(t * 0.5 + float(i) * 0.2, 1.4));
                particles += exp(-length(p - particlePos) * 20.0);
            }
            
            vec3 base = mix(deepSpace, forestGreen, trees);
            vec3 ufoColor = ufoMetal * ufo * 2.0;
            vec3 beamColor = abductionBeam * beam * 0.8;
            vec3 humanColor = vec3(0.8, 0.6, 0.4) * human;
            vec3 particleColor = starfield * particles;
            
            return base + ufoColor + beamColor + humanColor + particleColor;
        }

        // =========================================================================================
        // [SHADER 3: ROSWELL - CRASHED UFO AND GOVERNMENT COVERUP]
        // =========================================================================================
        vec3 roswellCrash(vec2 uv, float t) {
            vec2 p = uv * 2.0;
            
            // Desert landscape
            float desert = smoothstep(-0.5, -0.3, p.y) * 
                          (noise(p * 3.0) * 0.3 + 0.7);
            
            // Crashed UFO debris
            vec2 crashSite = vec2(0.2, -0.2);
            float wreckage = 0.0;
            for(int i = 0; i < 6; i++) {
                vec2 debrisPos = crashSite + vec2(sin(float(i)) * 0.4, cos(float(i)) * 0.2);
                float debris = exp(-length(p - debrisPos) * 4.0) * 
                              (noise(debrisPos * 10.0 + t) * 0.5 + 0.5);
                wreckage += debris;
            }
            
            // Military vehicles
            vec2 militaryPos1 = vec2(-0.8, -0.4);
            vec2 militaryPos2 = vec2(0.8, -0.3);
            float military = smoothstep(0.1, 0.05, length(p - militaryPos1)) +
                           smoothstep(0.1, 0.05, length(p - militaryPos2));
            
            // Searchlights
            float searchlight1 = max(0.0, dot(normalize(p - militaryPos1), vec2(0.7, 0.7))) * 
                               exp(-length(p - militaryPos1) * 1.5);
            float searchlight2 = max(0.0, dot(normalize(p - militaryPos2), vec2(-0.7, 0.7))) * 
                               exp(-length(p - militaryPos2) * 1.5);
            
            // Alien body (covered)
            vec2 bodyPos = crashSite + vec2(0.1, 0.1);
            float alienBody = exp(-length(p - bodyPos) * 12.0) * 
                            sin(t * 3.0 + length(p - bodyPos) * 10.0);
            
            vec3 base = mix(deepSpace, vec3(0.4, 0.3, 0.2), desert);
            vec3 wreckageColor = ufoMetal * wreckage;
            vec3 militaryColor = vec3(0.2, 0.4, 0.2) * military;
            vec3 lightColor = abductionBeam * (searchlight1 + searchlight2) * 0.5;
            vec3 bodyColor = greyAlienSkin * abs(alienBody) * 0.3;
            
            return base + wreckageColor + militaryColor + lightColor + bodyColor;
        }

        // =========================================================================================
        // [SHADER 4: PHOENIX LIGHTS - MASSIVE V-SHAPED CRAFT]
        // =========================================================================================
        vec3 phoenixLights(vec2 uv, float t) {
            vec2 p = uv * 1.2;
            
            // City skyline silhouette
            float city = 0.0;
            for(int i = 0; i < 12; i++) {
                float x = float(i) * 0.2 - 1.2;
                float buildingHeight = 0.2 + sin(float(i) * 2.0) * 0.3;
                float building = smoothstep(0.02, 0.0, abs(p.x - x)) * 
                               smoothstep(buildingHeight, buildingHeight - 0.05, p.y + 0.8);
                city += building;
            }
            
            // V-shaped craft
            vec2 craftCenter = vec2(0.0, 0.3);
            float vShape = 0.0;
            
            // Left wing of V
            for(int i = 0; i < 5; i++) {
                vec2 lightPos = craftCenter + vec2(-0.8 + float(i) * 0.2, -float(i) * 0.1);
                float light = exp(-length(p - lightPos) * 8.0);
                vShape += light;
            }
            
            // Right wing of V
            for(int i = 0; i < 5; i++) {
                vec2 lightPos = craftCenter + vec2(0.8 - float(i) * 0.2, -float(i) * 0.1);
                float light = exp(-length(p - lightPos) * 8.0);
                vShape += light;
            }
            
            // Craft body blocking stars
            float craftBody = 0.0;
            for(int i = 0; i < 10; i++) {
                vec2 bodyPos = craftCenter + vec2((float(i) - 4.5) * 0.15, -abs(float(i) - 4.5) * 0.05);
                craftBody += smoothstep(0.08, 0.05, length(p - bodyPos));
            }
            
            // Stars being blocked
            float stars = 0.0;
            for(int i = 0; i < 20; i++) {
                vec2 starPos = vec2(hash(vec2(float(i))) * 2.0 - 1.0, 
                                  hash(vec2(float(i) + 100.0)) * 2.0 - 1.0);
                stars += exp(-length(p - starPos) * 50.0) * (1.0 - craftBody);
            }
            
            vec3 base = mix(deepSpace, vec3(0.1, 0.1, 0.2), city * 0.5);
            vec3 craftLights = warningRed * vShape * 2.0;
            vec3 starColor = starfield * stars;
            vec3 cityLights = vec3(1.0, 0.8, 0.4) * city * 0.3;
            
            return base + craftLights + starColor + cityLights;
        }

        // =========================================================================================
        // [SHADER 5: RENDLESHAM FOREST - TRIANGULAR CRAFT IN WOODS]
        // =========================================================================================
        vec3 rendleshamForest(vec2 uv, float t) {
            vec2 p = uv * 2.0;
            
            // Dense forest
            float forest = 0.0;
            for(int i = 0; i < 15; i++) {
                vec2 treePos = vec2(sin(float(i) * 2.3) * 1.5, cos(float(i) * 1.7) * 1.2);
                float tree = exp(-length(p - treePos) * 2.0) * 
                           (noise(treePos * 5.0) * 0.5 + 0.5);
                forest += tree;
            }
            
            // Triangular craft
            vec2 craftPos = vec2(sin(t * 0.1) * 0.2, 0.1);
            
            // Triangle vertices
            vec2 v1 = craftPos + vec2(0.0, 0.2);
            vec2 v2 = craftPos + vec2(-0.2, -0.1);
            vec2 v3 = craftPos + vec2(0.2, -0.1);
            
            float triangle = exp(-length(p - v1) * 15.0) + 
                           exp(-length(p - v2) * 15.0) + 
                           exp(-length(p - v3) * 15.0);
            
            // Craft interior glow
            float interior = 0.0;
            vec2 center = (v1 + v2 + v3) / 3.0;
            interior = exp(-length(p - center) * 5.0);
            
            // Military personnel with flashlights
            vec2 soldier1 = vec2(-0.5, -0.4) + vec2(sin(t * 0.5), 0.0) * 0.1;
            vec2 soldier2 = vec2(0.6, -0.3) + vec2(cos(t * 0.4), 0.0) * 0.1;
            
            float flashlight1 = max(0.0, dot(normalize(p - soldier1), normalize(craftPos - soldier1))) * 
                              exp(-length(p - soldier1) * 2.0);
            float flashlight2 = max(0.0, dot(normalize(p - soldier2), normalize(craftPos - soldier2))) * 
                              exp(-length(p - soldier2) * 2.0);
            
            // Radiation effect
            float radiation = sin(length(p - craftPos) * 10.0 - t * 5.0) * 
                            exp(-length(p - craftPos) * 3.0) * 0.3;
            
            vec3 base = mix(deepSpace, forestGreen, forest * 0.8);
            vec3 craftColor = energyGreen * (triangle + interior) * 1.5;
            vec3 lightColor = abductionBeam * (flashlight1 + flashlight2) * 0.4;
            vec3 radiationColor = warningRed * abs(radiation);
            
            return base + craftColor + lightColor + radiationColor;
        }

        // =========================================================================================
        // [SHADER 6: BELGIAN UFO WAVE - F-16 INTERCEPT]
        // =========================================================================================
        vec3 belgianWave(vec2 uv, float t) {
            vec2 p = uv * 1.8;
            
            // Night sky with clouds
            float clouds = fbm(p * 2.0 + t * 0.1) * 0.3;
            
            // Large triangular UFO
            vec2 ufoPos = vec2(sin(t * 0.3) * 0.4, 0.2);
            
            // Triangle with lights at corners
            vec2 tri1 = ufoPos + vec2(0.0, 0.3);
            vec2 tri2 = ufoPos + vec2(-0.25, -0.15);
            vec2 tri3 = ufoPos + vec2(0.25, -0.15);
            
            float triLights = exp(-length(p - tri1) * 12.0) + 
                            exp(-length(p - tri2) * 12.0) + 
                            exp(-length(p - tri3) * 12.0);
            
            // UFO body
            float ufoBody = smoothstep(0.3, 0.25, length(p - ufoPos));
            
            // F-16 jets pursuing
            vec2 jet1Pos = ufoPos + vec2(-0.8, -0.5) + vec2(sin(t * 2.0), cos(t * 1.5)) * 0.2;
            vec2 jet2Pos = ufoPos + vec2(0.8, -0.6) + vec2(cos(t * 1.8), sin(t * 1.3)) * 0.2;
            
            float jets = exp(-length(p - jet1Pos) * 25.0) + exp(-length(p - jet2Pos) * 25.0);
            
            // Jet exhaust
            float exhaust1 = exp(-length(p - (jet1Pos - vec2(0.1, 0.0))) * 15.0);
            float exhaust2 = exp(-length(p - (jet2Pos - vec2(0.1, 0.0))) * 15.0);
            
            // Radar sweep effect
            float angle = atan(p.y - ufoPos.y, p.x - ufoPos.x);
            float radar = sin(angle * 4.0 + t * 8.0) * 
                         exp(-length(p - ufoPos) * 1.0) * 0.2;
            
            // Impossible maneuver trail
            float trail = 0.0;
            for(int i = 0; i < 8; i++) {
                float ti = t - float(i) * 0.1;
                vec2 trailPos = vec2(sin(ti * 2.0) * 0.5, cos(ti * 3.0) * 0.3);
                trail += exp(-length(p - trailPos) * 8.0) * (1.0 - float(i) / 8.0);
            }
            
            vec3 base = mix(deepSpace, vec3(0.05, 0.05, 0.1), clouds);
            vec3 ufoColor = energyGreen * (triLights + ufoBody) * 2.0;
            vec3 jetColor = starfield * jets * 3.0;
            vec3 exhaustColor = warningRed * (exhaust1 + exhaust2) * 2.0;
            vec3 radarColor = plasmaBlue * abs(radar);
            vec3 trailColor = energyGreen * trail * 0.5;
            
            return base + ufoColor + jetColor + exhaustColor + radarColor + trailColor;
        }

        // =========================================================================================
        // [SHADER 7: ANTÔNIO VILAS-BOAS - BRAZILIAN FARM ENCOUNTER]
        // =========================================================================================
        vec3 brazilianEncounter(vec2 uv, float t) {
            vec2 p = uv * 2.0;
            
            // Farm landscape
            float farmland = smoothstep(-0.6, -0.4, p.y) * 
                           (noise(p * 4.0) * 0.2 + 0.8);
            
            // Farmhouse silhouette
            vec2 housePos = vec2(-0.8, -0.3);
            float house = smoothstep(0.1, 0.08, length(p - housePos));
            
            // UFO landing
            vec2 ufoPos = vec2(0.3, -0.1);
            float ufo = smoothstep(0.2, 0.15, length(p - ufoPos));
            
            // Landing legs
            for(int i = 0; i < 3; i++) {
                float angle = float(i) * TWO_PI / 3.0;
                vec2 legPos = ufoPos + vec2(cos(angle), sin(angle)) * 0.15;
                legPos.y -= 0.1;
                ufo += smoothstep(0.02, 0.01, length(p - legPos));
            }
            
            // Humanoid figures
            vec2 alien1 = ufoPos + vec2(-0.2, -0.2);
            vec2 alien2 = ufoPos + vec2(0.2, -0.25);
            vec2 farmer = vec2(0.0, -0.4) + vec2(sin(t * 2.0), 0.0) * 0.05;
            
            float beings = exp(-length(p - alien1) * 10.0) + 
                          exp(-length(p - alien2) * 10.0) + 
                          exp(-length(p - farmer) * 8.0);
            
            // Strange lights from UFO
            float lights = 0.0;
            for(int i = 0; i < 6; i++) {
                float angle = float(i) * TWO_PI / 6.0 + t;
                vec2 lightPos = ufoPos + vec2(cos(angle), sin(angle)) * 0.1;
                lights += exp(-length(p - lightPos) * 20.0);
            }
            
            // Tractor beam effect
            float beam = smoothstep(0.15, 0.1, abs(p.x - ufoPos.x)) * 
                        smoothstep(ufoPos.y, ufoPos.y - 0.1, p.y) * 
                        smoothstep(-0.5, -0.3, p.y);
            
            vec3 base = mix(deepSpace, vec3(0.2, 0.3, 0.1), farmland);
            vec3 ufoColor = ufoMetal * ufo * 2.0;
            vec3 beingColor = vec3(0.8, 0.6, 0.4) * beings;
            vec3 lightColor = energyGreen * lights * 2.0;
            vec3 beamColor = abductionBeam * beam * 0.6;
            vec3 houseColor = vec3(0.3, 0.2, 0.1) * house;
            
            return base + ufoColor + beingColor + lightColor + beamColor + houseColor;
        }

        // =========================================================================================
        // [SHADER 8: MIRACLE OF THE SUN - MASS SIGHTING]
        // =========================================================================================
        vec3 miracleOfSun(vec2 uv, float t) {
            vec2 p = uv * 1.5;
            
            // Crowd of people
            float crowd = 0.0;
            for(int i = 0; i < 20; i++) {
                vec2 personPos = vec2((float(i) - 10.0) * 0.15, -0.6 + sin(float(i)) * 0.1);
                crowd += exp(-length(p - personPos) * 15.0);
            }
            
            // Dancing sun
            vec2 sunPos = vec2(sin(t * 0.5) * 0.3, 0.4 + cos(t * 0.7) * 0.2);
            float sun = exp(-length(p - sunPos) * 2.0);
            
            // Color changes
            float colorCycle = sin(t * 2.0) * 0.5 + 0.5;
            vec3 sunColor = mix(vec3(1.0, 1.0, 0.3), vec3(1.0, 0.3, 0.3), colorCycle);
            sunColor = mix(sunColor, vec3(0.3, 1.0, 0.3), sin(t * 3.0 + PI) * 0.5 + 0.5);
            
            // Rays emanating
            float rays = 0.0;
            for(int i = 0; i < 12; i++) {
                float angle = float(i) * TWO_PI / 12.0 + t;
                vec2 rayDir = vec2(cos(angle), sin(angle));
                float ray = max(0.0, dot(normalize(p - sunPos), rayDir)) * 
                           exp(-length(p - sunPos) * 0.8);
                rays += ray;
            }
            
            // Spiral motion
            float spiral = sin(length(p - sunPos) * 8.0 - t * 4.0) * 
                          exp(-length(p - sunPos) * 1.5) * 0.3;
            
            // Atmospheric distortion
            vec2 distorted = p + vec2(sin(p.y * 5.0 + t * 2.0), cos(p.x * 4.0 + t * 1.5)) * 0.1;
            float atmosphere = fbm(distorted * 3.0) * 0.2;
            
            vec3 base = mix(vec3(0.6, 0.8, 1.0), vec3(0.9, 0.9, 0.7), atmosphere);
            vec3 sunEffect = sunColor * (sun * 3.0 + rays * 0.5);
            vec3 spiralColor = sunColor * abs(spiral);
            vec3 crowdColor = vec3(0.2, 0.1, 0.05) * crowd;
            
            return base + sunEffect + spiralColor + crowdColor;
        }

        // =========================================================================================
        // [SHADER 9: KENNETH ARNOLD - FLYING SAUCERS]
        // =========================================================================================
        vec3 flyingSaucers(vec2 uv, float t) {
            vec2 p = uv * 2.0;
            
            // Mountain silhouette (Mount Rainier)
            float mountains = 0.0;
            for(int i = 0; i < 8; i++) {
                float x = float(i) * 0.3 - 1.2;
                float height = 0.3 + sin(float(i) * 1.5) * 0.4;
                float mountain = smoothstep(height, height - 0.1, p.y + 0.8) * 
                               exp(-pow(p.x - x, 2.0) * 8.0);
                mountains += mountain;
            }
            
            // Nine crescent-shaped objects
            float saucers = 0.0;
            for(int i = 0; i < 9; i++) {
                float formation = float(i) - 4.0;
                vec2 saucerPos = vec2(formation * 0.2 + sin(t * 2.0 + float(i)) * 0.1, 
                                    0.2 + cos(t * 1.5 + float(i) * 0.5) * 0.1);
                
                // Crescent shape
                float saucer = smoothstep(0.08, 0.05, length(p - saucerPos));
                float cutout = smoothstep(0.06, 0.03, length(p - (saucerPos + vec2(0.02, 0.0))));
                saucer = saucer - cutout * 0.7;
                
                saucers += max(0.0, saucer);
            }
            
            // Motion blur effect
            float blur = 0.0;
            for(int i = 0; i < 9; i++) {
                for(int j = 0; j < 5; j++) {
                    float formation = float(i) - 4.0;
                    float timeOffset = float(j) * 0.02;
                    vec2 blurPos = vec2(formation * 0.2 + sin(t * 2.0 + float(i) - timeOffset) * 0.1, 
                                      0.2 + cos(t * 1.5 + float(i) * 0.5 - timeOffset) * 0.1);
                    blur += exp(-length(p - blurPos) * 20.0) * (1.0 - float(j) / 5.0) * 0.3;
                }
            }
            
            // Pilot's aircraft
            vec2 planePos = vec2(-0.8, -0.2);
            float plane = smoothstep(0.05, 0.03, length(p - planePos));
            
            // Sky gradient
            float skyGradient = smoothstep(-1.0, 1.0, p.y);
            
            vec3 base = mix(vec3(0.4, 0.6, 0.9), vec3(0.8, 0.9, 1.0), skyGradient);
            vec3 mountainColor = vec3(0.2, 0.3, 0.4) * mountains;
            vec3 saucerColor = ufoMetal * saucers * 3.0;
            vec3 blurColor = ufoMetal * blur;
            vec3 planeColor = vec3(0.6, 0.6, 0.6) * plane * 2.0;
            
            return base + mountainColor + saucerColor + blurColor + planeColor;
        }

        // =========================================================================================
        // [SHADER 10: FOO FIGHTERS - WWII AERIAL MYSTERY]
        // =========================================================================================
        vec3 fooFighters(vec2 uv, float t) {
            vec2 p = uv * 2.0;
            
            // Bomber aircraft formation
            float bombers = 0.0;
            for(int i = 0; i < 5; i++) {
                vec2 bomberPos = vec2((float(i) - 2.0) * 0.3, -0.1 + sin(float(i) + t * 0.5) * 0.05);
                bombers += smoothstep(0.06, 0.04, length(p - bomberPos));
            }
            
            // Foo fighter orbs
            float fooFighters = 0.0;
            for(int i = 0; i < 8; i++) {
                vec2 fooPos = vec2(sin(t * 1.5 + float(i)) * 0.8, 
                                 cos(t * 1.2 + float(i) * 0.7) * 0.6);
                
                // Glowing orb
                float orb = exp(-length(p - fooPos) * 8.0);
                
                // Pulsing effect
                orb *= sin(t * 4.0 + float(i)) * 0.3 + 0.7;
                
                fooFighters += orb;
            }
            
            // Anti-aircraft fire
            float aaFire = 0.0;
            for(int i = 0; i < 6; i++) {
                vec2 firePos = vec2((float(i) - 2.5) * 0.4, -0.8 + mod(t * 2.0 + float(i), 1.0) * 1.6);
                aaFire += exp(-length(p - firePos) * 12.0) * 
                         (1.0 - mod(t * 2.0 + float(i), 1.0));
            }
            
            // Explosions (ineffective against foo fighters)
            float explosions = 0.0;
            for(int i = 0; i < 4; i++) {
                vec2 explPos = vec2(sin(t * 3.0 + float(i) * 2.0) * 0.6, 
                                  cos(t * 2.5 + float(i) * 1.5) * 0.4);
                float expl = exp(-length(p - explPos) * 5.0) * 
                           sin(t * 8.0 + float(i)) * 0.5 + 0.5;
                explosions += expl;
            }
            
            // Night sky with searchlights
            float searchlights = 0.0;
            for(int i = 0; i < 3; i++) {
                float angle = float(i) * TWO_PI / 3.0 + t * 0.5;
                vec2 lightDir = vec2(cos(angle), sin(angle));
                searchlights += max(0.0, dot(normalize(p), lightDir)) * 
                              exp(-length(p) * 0.5) * 0.3;
            }
            
            vec3 base = mix(deepSpace, vec3(0.05, 0.05, 0.1), searchlights);
            vec3 bomberColor = vec3(0.4, 0.4, 0.4) * bombers * 2.0;
            vec3 fooColor = energyGreen * fooFighters * 2.0;
            vec3 fireColor = warningRed * aaFire;
            vec3 explColor = vec3(1.0, 0.6, 0.2) * explosions;
            
            return base + bomberColor + fooColor + fireColor + explColor;
        }

        // =========================================================================================
        // [MAIN SHADER LOGIC WITH TRANSITIONS]
        // =========================================================================================
        void main() {
            vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.y, u_resolution.x);
            
            float time_warp = u_time * 0.3 * u_speed;
            
            vec3 color = deepSpace;
            
            // Shader selection based on index
            if (u_shader_index == 0) {
                color = greyAlienExamination(uv, time_warp);
            } else if (u_shader_index == 1) {
                color = forestAbduction(uv, time_warp);
            } else if (u_shader_index == 2) {
                color = roswellCrash(uv, time_warp);
            } else if (u_shader_index == 3) {
                color = phoenixLights(uv, time_warp);
            } else if (u_shader_index == 4) {
                color = rendleshamForest(uv, time_warp);
            } else if (u_shader_index == 5) {
                color = belgianWave(uv, time_warp);
            } else if (u_shader_index == 6) {
                color = brazilianEncounter(uv, time_warp);
            } else if (u_shader_index == 7) {
                color = miracleOfSun(uv, time_warp);
            } else if (u_shader_index == 8) {
                color = flyingSaucers(uv, time_warp);
            } else if (u_shader_index == 9) {
                color = fooFighters(uv, time_warp);
            }
            
            // Apply intensity and transition effects
            color *= u_intensity;
            
            // Smooth transition between shaders
            color = mix(color, color * 1.2, u_transition);
            
            // Final color output
            outColor = vec4(color, 1.0);
        }
    `;

    // =================================================================================================
    // [SHADER COMPILATION AND PROGRAM CREATION]
    // =================================================================================================
    function createShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const infoLog = gl.getShaderInfoLog(shader);
            console.error('>>> SHADER COMPILE ERROR:', infoLog);
            gl.deleteShader(shader);
            throw new Error("Shader compilation failed.");
        }
        return shader;
    }

    function createProgram(vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const infoLog = gl.getProgramInfoLog(program);
            console.error('>>> PROGRAM LINK ERROR:', infoLog);
            gl.deleteProgram(program);
            throw new Error("Shader program linking failed.");
        }
        return program;
    }

    // =================================================================================================
    // [WEBGL STATE & SETUP]
    // =================================================================================================

    let positionAttributeLocation = -1;
    let timeUniformLocation = null;
    let resolutionUniformLocation = null;
    let mouseUniformLocation = null;
    let intensityUniformLocation = null;
    let speedUniformLocation = null;
    let shaderIndexUniformLocation = null;
    let transitionUniformLocation = null;
    let positionBuffer = null;
    let startTime = performance.now();

    function setupWebGL() {
        let vs = null;
        let fs = null;
        try {
            vs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
            fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
            program = createProgram(vs, fs);

            positionAttributeLocation = gl.getAttribLocation(program, "a_position");
            timeUniformLocation = gl.getUniformLocation(program, "u_time");
            resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
            mouseUniformLocation = gl.getUniformLocation(program, "u_mouse");
            intensityUniformLocation = gl.getUniformLocation(program, "u_intensity");
            speedUniformLocation = gl.getUniformLocation(program, "u_speed");
            shaderIndexUniformLocation = gl.getUniformLocation(program, "u_shader_index");
            transitionUniformLocation = gl.getUniformLocation(program, "u_transition");

            positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            const positions = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

            return true;
        } catch (error) {
            console.error(">>> Failed during WebGL setup:", error);
            if (program) gl.deleteProgram(program);
            program = null;
            return false;
        } finally {
            if (vs) gl.deleteShader(vs);
            if (fs) gl.deleteShader(fs);
        }
    }

    // =================================================================================================
    // [RENDER LOOP WITH SHADER CYCLING]
    // =================================================================================================
    function render(now) {
        if (!program) {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            return;
        }

        let time = (now - startTime) * 0.001;

        // Auto-cycle through shaders every 15 seconds
        if (time - lastShaderChange > 15.0) {
            currentShaderIndex = (currentShaderIndex + 1) % 10;
            lastShaderChange = time;
            shaderTransitionTime = time;
            
            // Display encounter info
            const encounter = alienEncounters[currentShaderIndex];
            console.log(`[ENCOUNTER] ${encounter.year} - ${encounter.name} (${encounter.location})`);
            console.log(`[DESCRIPTION] ${encounter.description}`);
        }

        // Calculate transition effect
        let transition = Math.min(1.0, (time - shaderTransitionTime) / 2.0);

        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;
        if (webglCanvas.width !== currentWidth || webglCanvas.height !== currentHeight) {
            webglCanvas.width = currentWidth;
            webglCanvas.height = currentHeight;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        }

        gl.useProgram(program);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

        gl.uniform1f(timeUniformLocation, time);
        gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

        let mx = window.shaderMouse ? window.shaderMouse.x : 0.5;
        let my = window.shaderMouse ? window.shaderMouse.y : 0.5;
        gl.uniform2f(mouseUniformLocation, mx, my);
        gl.uniform1f(intensityUniformLocation, window.shaderIntensity !== undefined ? window.shaderIntensity : 1.0);
        gl.uniform1f(speedUniformLocation, window.shaderSpeed !== undefined ? window.shaderSpeed : 1.0);
        gl.uniform1i(shaderIndexUniformLocation, currentShaderIndex);
        gl.uniform1f(transitionUniformLocation, transition);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        animationFrameId = requestAnimationFrame(render);
    }

    // =================================================================================================
    // [GLOBAL INTERFACE & EVENT LISTENERS]
    // =================================================================================================

    window.updateShader = function(shaderIndex) {
        if (shaderIndex >= 0 && shaderIndex < 10) {
            currentShaderIndex = shaderIndex;
            shaderTransitionTime = performance.now() * 0.001 - startTime * 0.001;
            lastShaderChange = shaderTransitionTime;
            
            const encounter = alienEncounters[currentShaderIndex];
            console.log(`[MANUAL SWITCH] ${encounter.year} - ${encounter.name} (${encounter.location})`);
        }
    };

    window.getEncounterInfo = function(index) {
        if (index >= 0 && index < alienEncounters.length) {
            return alienEncounters[index];
        }
        return null;
    };

    window.getAllEncounters = function() {
        return alienEncounters;
    };

    window.shaderMouse = { x: 0.5, y: 0.5 };
    window.addEventListener('mousemove', (e) => {
        window.shaderMouse.x = e.clientX / window.innerWidth;
        window.shaderMouse.y = 1.0 - (e.clientY / window.innerHeight);
    });

    // Keyboard controls for manual shader switching
    window.addEventListener('keydown', (e) => {
        if (e.key >= '0' && e.key <= '9') {
            const index = parseInt(e.key);
            if (index < 10) {
                window.updateShader(index);
            }
        }
    });

    if (setupWebGL()) {
        console.log("[INFO] Alien encounter visualization system initialized successfully.");
        console.log("[CONTROLS] Press 0-9 to manually switch between encounters, or wait for auto-cycling.");
        animationFrameId = requestAnimationFrame(render);
    } else {
        console.error("[FATAL] Failed to establish alien encounter visualization. Reality remains mundane.");
    }

})();
