
```javascript
(function() {
    "use strict";
    
    const webglCanvas = document.getElementById('webglCanvas');
    let gl = null;
    let program = null;
    let animationFrameId = null;
    
    if (!webglCanvas) {
        console.error("[FATAL] WebGL Canvas element with id 'webglCanvas' not found in DOM. Aborting.");
        return;
    }
    
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
            console.log("[INFO] WebGL2 Rendering Context initialized successfully.");
        } else {
            console.log("[WARN] WebGL1 Rendering Context initialized. Some GLSL 3.00 ES features may not be supported.");
        }
    } catch (e) {
        console.error("[FATAL] WebGL Initialization Error:", e);
        if (document.body) document.body.style.backgroundColor = '#050511';
        return;
    }
    
    const vertexShaderSource = "#version 300 es\n" +
        "in vec4 a_position;\n" +
        "void main() {\n" +
        "    gl_Position = a_position;\n" +
        "}\n";
    
    const fragmentShaderSource = "#version 300 es\n" +
        "precision highp float;\n\n" +
        "uniform float u_time;\n" +
        "uniform vec2 u_resolution;\n" +
        "uniform vec2 u_mouse;\n" +
        "uniform float u_intensity;\n" +
        "uniform float u_speed;\n\n" +
        "out vec4 outColor;\n\n" +
        "const float PI = 3.14159265359;\n" +
        "const float TWO_PI = 6.28318530718;\n" +
        "const float TOTAL_PHASES_F = 15.0;\n\n" +
        "float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n\n" +
        "float noise(vec2 p) {\n" +
        "    vec2 i = floor(p), f = fract(p);\n" +
        "    f = f * f * (3.0 - 2.0 * f);\n" +
        "    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),\n" +
        "               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);\n" +
        "}\n\n" +
        "float fbm(vec2 p) {\n" +
        "    float v = 0.0, a = 0.5;\n" +
        "    for(int i = 0; i < 4; i++) {\n" +
        "        v += a * noise(p);\n" +
        "        p *= 2.0; a *= 0.5;\n" +
        "    }\n" +
        "    return v;\n" +
        "}\n\n" +
        "mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }\n\n" +
        "vec3 backroomsYellow = vec3(0.9, 0.85, 0.6);\n" +
        "vec3 backroomsBrown = vec3(0.4, 0.3, 0.2);\n" +
        "vec3 alienGreen = vec3(0.3, 0.8, 0.4);\n" +
        "vec3 alienPurple = vec3(0.6, 0.3, 0.8);\n" +
        "vec3 alienPink = vec3(0.9, 0.4, 0.6);\n" +
        "vec3 darkVoid = vec3(0.05, 0.05, 0.1);\n" +
        "vec3 sicklyGreen = vec3(0.5, 0.7, 0.3);\n" +
        "vec3 eerieBlue = vec3(0.3, 0.5, 0.8);\n\n" +
        "vec3 endlessCorridors(vec2 uv, float t) {\n" +
        "    float corridor = abs(sin(uv.x * 5.0));\n" +
        "    corridor *= abs(sin(uv.y * 2.0));\n" +
        "    corridor = pow(corridor, 0.2);\n" +
        "    vec3 wallColor = mix(backroomsBrown, backroomsYellow, corridor);\n" +
        "    float distance = length(uv);\n" +
        "    wallColor *= 1.0 - distance * 0.3;\n" +
        "    return wallColor;\n" +
        "}\n\n" +
        "vec3 flickeringLights(vec2 uv, float t) {\n" +
        "    float flicker = sin(t * 15.0) * 0.5 + 0.5;\n" +
        "    flicker = pow(flicker, 3.0);\n" +
        "    flicker *= sin(uv.x * 20.0) * sin(uv.y * 20.0);\n" +
        "    vec3 lightColor = backroomsYellow * flicker;\n" +
        "    vec3 baseColor = backroomsBrown * 0.3;\n" +
        "    return baseColor + lightColor;\n" +
        "}\n\n" +
        "vec3 alienGrowth(vec2 uv, float t) {\n" +
        "    vec2 p = uv * 5.0;\n" +
        "    float growth = fbm(p + t * 0.1);\n" +
        "    growth = pow(growth, 0.5);\n" +
        "    vec3 growthColor = mix(alienGreen, alienPurple, growth);\n" +
        "    float pulse = sin(t * 2.0 + growth * 10.0) * 0.2 + 0.8;\n" +
        "    return growthColor * pulse;\n" +
        "}\n\n" +
        "vec3 distortedWalls(vec2 uv, float t) {\n" +
        "    vec2 p = uv;\n" +
        "    p.x += sin(p.y * 10.0 + t * 2.0) * 0.05;\n" +
        "    p.y += cos(p.x * 8.0 + t * 1.5) * 0.05;\n" +
        "    float pattern = sin(p.x * 20.0) * sin(p.y * 20.0);\n" +
        "    vec3 wallColor = mix(backroomsBrown, backroomsYellow, pattern * 0.5 + 0.5);\n" +
        "    return wallColor;\n" +
        "}\n\n" +
        "vec3 entityPresence(vec2 uv, float t) {\n" +
        "    float presence = 0.0;\n" +
        "    for(int i = 0; i < 3; i++) {\n" +
        "        vec2 offset = vec2(hash(vec2(float(i))), hash(vec2(float(i) + 50.0))) * 2.0 - 1.0;\n" +
        "        offset.x += sin(t * 0.3 + float(i)) * 0.3;\n" +
        "        offset.y += cos(t * 0.4 + float(i)) * 0.3;\n" +
        "        presence += exp(-length(uv - offset) * 3.0);\n" +
        "    }\n" +
        "    float flicker = sin(t * 10.0) * 0.5 + 0.5;\n" +
        "    vec3 shadow = vec3(0.1) * presence * flicker;\n" +
        "    vec3 base = backroomsBrown * 0.5;\n" +
        "    return base + shadow;\n" +
        "}\n\n" +
        "vec3 liminalSpace(vec2 uv, float t) {\n" +
        "    float threshold = 0.5 + sin(t * 0.5) * 0.1;\n" +
        "    float space = step(threshold, fbm(uv * 3.0 + t * 0.1));\n" +
        "    vec3 colorA = backroomsYellow;\n" +
        "    vec3 colorB = darkVoid;\n" +
        "    return mix(colorA, colorB, space);\n" +
        "}\n\n" +
        "vec3 bioluminescentGlow(vec2 uv, float t) {\n" +
        "    vec2 p = uv * 8.0;\n" +
        "    float glow = 0.0;\n" +
        "    for(int i = 0; i < 5; i++) {\n" +
        "        vec2 pos = vec2(hash(vec2(float(i))), hash(vec2(float(i) + 50.0)));\n" +
        "        float size = 0.2 + hash(vec2(float(i) + 100.0)) * 0.3;\n" +
        "        glow += exp(-length(p - pos) / size) * (sin(t * 2.0 + float(i)) * 0.5 + 0.5);\n" +
        "    }\n" +
        "    vec3 baseColor = darkVoid;\n" +
        "    vec3 glowColor = mix(alienGreen, alienPink, sin(t + length(uv)) * 0.5 + 0.5);\n" +
        "    return baseColor + glowColor * glow;\n" +
        "}\n\n" +
        "vec3 staticNoise(vec2 uv, float t) {\n" +
        "    float staticNoise = hash(uv + t);\n" +
        "    staticNoise = step(0.95, staticNoise);\n" +
        "    vec3 baseColor = backroomsBrown * 0.7;\n" +
        "    vec3 staticColor = vec3(1.0) * staticNoise;\n" +
        "    return mix(baseColor, staticColor, staticNoise);\n" +
        "}\n\n" +
        "vec3 nonEuclideanGeometry(vec2 uv, float t) {\n" +
        "    float angle = atan(uv.y, uv.x);\n" +
        "    float radius = length(uv);\n" +
        "    angle += sin(radius * 5.0 - t * 2.0) * 2.0;\n" +
        "    radius += sin(angle * 3.0 + t) * 0.2;\n" +
        "    vec2 p = vec2(cos(angle), sin(angle)) * radius;\n" +
        "    float pattern = sin(p.x * 10.0) * sin(p.y * 10.0);\n" +
        "    return mix(backroomsYellow, alienPurple, pattern * 0.5 + 0.5);\n" +
        "}\n\n" +
        "vec3 hummingResonance(vec2 uv, float t) {\n" +
        "    float hum = sin(uv.x * 30.0 + t * 5.0) * sin(uv.y * 30.0 + t * 5.0);\n" +
        "    hum = pow(abs(hum), 0.2);\n" +
        "    vec3 baseColor = backroomsBrown * 0.5;\n" +
        "    vec3 humColor = backroomsYellow * hum;\n" +
        "    return baseColor + humColor;\n" +
        "}\n\n" +
        "vec3 carpetTexture(vec2 uv, float t) {\n" +
        "    float carpet = sin(uv.x * 20.0) * sin(uv.y * 20.0);\n" +
        "    carpet = pow(abs(carpet), 0.3);\n" +
        "    vec3 carpetColor = mix(vec3(0.8, 0.5, 0.3), vec3(0.9, 0.7, 0.4), carpet);\n" +
        "    vec3 baseColor = backroomsBrown * 0.3;\n" +
        "    return baseColor + carpetColor * 0.7;\n" +
        "}\n\n" +
        "vec3 wallMold(vec2 uv, float t) {\n" +
        "    vec2 p = uv * 10.0;\n" +
        "    float mold = fbm(p + t * 0.05);\n" +
        "    mold = pow(mold, 0.4);\n" +
        "    vec3 moldColor = mix(sicklyGreen, eerieBlue, mold);\n" +
        "    vec3 baseColor = backroomsBrown * 0.6;\n" +
        "    return mix(baseColor, moldColor, mold * 0.7);\n" +
        "}\n\n" +
        "void main() {\n" +
        "    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.y, u_resolution.x);\n" +
        "    vec2 originalUV = gl_FragCoord.xy / u_resolution.xy;\n\n" +
        "    float time_warp = u_time * 0.4 * u_speed;\n" +
        "    float phase = mod(time_warp, TOTAL_PHASES_F);\n" +
        "    float phaseProgress = fract(phase);\n" +
        "    int phaseIndex = int(floor(phase));\n\n" +
        "    vec3 color = darkVoid;\n\n" +
        "    if (phaseIndex == 0) {\n" +
        "        color = endlessCorridors(uv, u_time);\n" +
        "    }\n" +
        "    else if (phaseIndex == 1) {\n" +
        "        color = flickeringLights(uv, u_time);\n" +
        "    }\n" +
        "    else if (phaseIndex == 2) {\n" +
        "        color = alienGrowth(uv, u_time);\n" +
        "    }\n" +
        "    else if (phaseIndex == 3) {\n" +
        "        color = distortedWalls(uv, u_time);\n" +
        "    }\n" +
        "    else if (phaseIndex == 4) {\n" +
        "        color = entityPresence(uv, u_time);\n" +
        "    }\n" +
        "    else if (phaseIndex == 5) {\n" +
        "        color = liminalSpace(uv, u_time);\n" +
        "    }\n" +
        "    else if (phaseIndex == 6) {\n" +
        "        color = bioluminescentGlow(uv, u_time);\n" +
        "    }\n" +
        "    else if (phaseIndex == 7) {\n" +
        "        color = staticNoise(uv, u_time);\n" +
        "    }\n" +
        "    else if (phaseIndex == 8) {\n" +
        "        color = nonEuclideanGeometry(uv, u_time);\n" +
        "    }\n" +
        "    else if (phaseIndex == 9) {\n" +
        "        color = hummingResonance(uv, u_time);\n" +
        "    }\n" +
        "    else if (phaseIndex == 10) {\n" +
        "        color = carpetTexture(uv, u_time);\n" +
        "    }\n" +
        "    else if (phaseIndex == 11) {\n" +
        "        color = wallMold(uv, u_time);\n" +
        "    }\n" +
        "    else if (phaseIndex >= 12) {\n" +
        "        float selector = mod(float(phaseIndex - 12), 3.0);\n" +
        "        if (selector < 1.0) {\n" +
        "            color = mix(endlessCorridors(uv, u_time), flickeringLights(uv * 0.5, u_time), 0.5);\n" +
        "        } else if (selector < 2.0) {\n" +
        "            color = mix(alienGrowth(uv, u_time), entityPresence(uv, u_time), sin(u_time) * 0.5 + 0.5);\n" +
        "        } else {\n" +
        "            color = mix(distortedWalls(uv, u_time), wallMold(uv * 1.5, u_time), 0.7);\n" +
        "        }\n" +
        "    }\n\n" +
        "    vec2 mouse_pos = u_mouse * 2.0 - 1.0;\n" +
        "    mouse_pos.y *= -1.0;\n" +
        "    float mouse_dist = length(uv - mouse_pos);\n" +
        "    float mouse_effect = exp(-mouse_dist * 3.0) * u_intensity * 0.5;\n" +
        "    color += alienPink * mouse_effect;\n\n" +
        "    color *= u_intensity;\n\n" +
        "    float vignette = smoothstep(1.8, 0.5, length(uv));\n" +
        "    color *= vignette;\n\n" +
        "    float scanline = sin(originalUV.y * u_resolution.y * 1.5) * 0.02 + 0.98;\n" +
        "    color *= scanline;\n\n" +
        "    outColor = vec4(clamp(color, 0.0, 1.0), 1.0);\n" +
        "}\n";
    
    function createShader(type, source) {
        const shader = gl.createShader(type);
        if (!shader) { throw new Error(`Failed to create shader object (type: ${type})`); }
        
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
            const infoLog = gl.getShaderInfoLog(shader);
            const sourceWithLines = source.split('\n').map((line, index) => `${index + 1}: ${line}`).join('\n');
            console.error(`>>> SHADER COMPILE ERROR (${shaderType}):\n${infoLog}`);
            console.error(`--- Shader Source (${shaderType}) ---\n${sourceWithLines}\n---`);
            gl.deleteShader(shader);
            throw new Error(`Shader compilation failed: ${shaderType}`);
        }
        return shader;
    }
    
    function createProgram(vertexShader, fragmentShader) {
        const program = gl.createProgram();
        if (!program) { throw new Error("Failed to create shader program object."); }
        
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
    
    let positionAttributeLocation = -1;
    let timeUniformLocation = null;
    let resolutionUniformLocation = null;
    let mouseUniformLocation = null;
    let intensityUniformLocation = null;
    let speedUniformLocation = null;
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
    
    function render(now) {
        if (!program) {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            return;
        }
        
        let time = (now - startTime) * 0.001;
        
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
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        animationFrameId = requestAnimationFrame(render);
    }
    
    window.updateShader = function(newShaderCode) {
        console.warn("Dynamic shader updates are complex and not fully implemented in this version.");
    };
    
    window.shaderMouse = { x: 0.5, y: 0.5 };
    window.addEventListener('mousemove', (e) => {
        window.shaderMouse.x = e.clientX / window.innerWidth;
        window.shaderMouse.y = 1.0 - (e.clientY / window.innerHeight);
    });
    
    if (setupWebGL()) {
        console.log("[INFO] WebGL setup successful. Starting render loop.");
        animationFrameId = requestAnimationFrame(render);
    } else {
        console.error("[FATAL] WebGL setup failed. Render loop will not start.");
    }
    
})();
```
