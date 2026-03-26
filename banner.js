(function() {
    const banner = document.querySelector('.announcement-banner');
    if (!banner) return;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '0'; // Behind text
    canvas.style.pointerEvents = 'none';
    banner.insertBefore(canvas, banner.firstChild);

    // Make content sit above the canvas
    const content = banner.querySelector('.announcement-content');
    if (content) {
        content.style.position = 'relative';
        content.style.zIndex = '1';
    }

    const gl = canvas.getContext('webgl');
    if (!gl) {
        console.warn('WebGL not supported for banner animation');
        return;
    }

    // Full screen quad vertex shader
    const vsSource = `
        attribute vec2 position;
        void main() {
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;

    // SDF Fluid Dripping Blood Shader
    const fsSource = `
        precision highp float;
        uniform vec2 u_resolution;
        uniform float u_time;

        const int MAX_MARCHING_STEPS = 60;
        const float MIN_DIST = 0.0;
        const float MAX_DIST = 100.0;
        const float EPSILON = 0.001;

        // Smooth min for metaball/viscous effects
        float opSmoothUnion( float d1, float d2, float k ) {
            float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
            return mix( d2, d1, h ) - k*h*(1.0-h);
        }

        float sdSphere( vec3 p, float s ) {
          return length(p)-s;
        }

        // Noise functions for organic movement
        float hash(float n) { return fract(sin(n)*43758.5453); }
        float noise(vec3 x) {
            vec3 p = floor(x);
            vec3 f = fract(x);
            f = f*f*(3.0-2.0*f);
            float n = p.x + p.y*57.0 + 113.0*p.z;
            return mix(mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
                           mix( hash(n+ 57.0), hash(n+ 58.0),f.x),f.y),
                       mix(mix( hash(n+113.0), hash(n+114.0),f.x),
                           mix( hash(n+170.0), hash(n+171.0),f.x),f.y),f.z);
        }

        float sceneSDF(vec3 p) {
            // Base plane slightly behind
            float plane = p.z + 1.0;
            
            // We want organic, viscous dripping
            float d = 100.0;
            
            // Multiple dripping drops
            for(int i = 0; i < 8; i++) {
                float fi = float(i);
                float speed = 0.5 + hash(fi) * 1.2;
                float offset = hash(fi * 13.0) * 10.0;
                
                // Spread drops across the screen
                float aspect = u_resolution.x / u_resolution.y;
                float xpos = (hash(fi * 27.0) * 2.0 - 1.0) * aspect * 2.0;

                // Flowing down loop
                float ypos = 2.5 - mod(u_time * speed + offset, 5.0);
                
                // Add organic wiggle using noise
                vec3 dropPos = p - vec3(xpos, ypos, 0.0);
                dropPos.x += sin(u_time * 1.5 + dropPos.y * 2.0) * 0.15;

                // Main drop head
                float radius = 0.15 + hash(fi)*0.1;
                float drop = sdSphere(dropPos, radius);

                // Elongated tail following the drop
                float tailLength = 1.0 + hash(fi)*1.5;
                float tailY = max(0.0, dropPos.y - tailLength);
                float tail = sdSphere(vec3(dropPos.x, tailY, dropPos.z), radius * 0.4);
                drop = opSmoothUnion(drop, tail, 0.8); // Blend head and tail

                d = opSmoothUnion(d, drop, 0.5); // Blend into collective surface
            }
            
            // Viscous "ceiling" pool of blood at the top
            float poolY = 1.0 + noise(p * 2.0 + vec3(u_time * 0.5, 0.0, 0.0)) * 0.4;
            float pool = p.y - poolY;
            
            d = opSmoothUnion(d, pool, 0.7);

            // Add some global noise distortion to make it look less perfect
            d += noise(p * 4.0 + vec3(u_time * 0.2)) * 0.05;

            return min(d, plane);
        }

        vec3 estimateNormal(vec3 p) {
            vec2 e = vec2(EPSILON, 0.0);
            return normalize(vec3(
                sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy),
                sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy),
                sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)
            ));
        }

        void main() {
            vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
            uv.x *= u_resolution.x / u_resolution.y;

            vec3 cameraPos = vec3(0.0, 0.0, 2.5);
            vec3 rayDir = normalize(vec3(uv, -1.0));

            float depth = MIN_DIST;
            vec3 p;
            for (int i = 0; i < MAX_MARCHING_STEPS; i++) {
                p = cameraPos + depth * rayDir;
                float dist = sceneSDF(p);
                if (dist < EPSILON) break;
                depth += dist;
                if (depth >= MAX_DIST) break;
            }

            // Deep dark void background
            vec3 col = vec3(0.02, 0.0, 0.0); 

            if (depth < MAX_DIST) {
                // Determine what surface we hit based on z position
                if (sceneSDF(p) < EPSILON && p.z > -0.9) {
                    vec3 normal = estimateNormal(p);
                    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
                    
                    // Exotic blood colors
                    vec3 bloodBase = vec3(0.4, 0.0, 0.0);
                    vec3 bloodHighlight = vec3(0.9, 0.1, 0.1);
                    vec3 shadowColor = vec3(0.05, 0.0, 0.0);

                    // Diffuse lighting
                    float diff = max(dot(normal, lightDir), 0.0);
                    
                    // Specular highlight for wetness
                    vec3 viewDir = normalize(cameraPos - p);
                    vec3 reflectDir = reflect(-lightDir, normal);
                    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
                    
                    // Rim lighting (SDF inner glow)
                    float rim = 1.0 - max(dot(normal, viewDir), 0.0);
                    rim = smoothstep(0.5, 1.0, rim);

                    col = mix(shadowColor, bloodBase, diff) + 
                          bloodHighlight * spec * 0.8 + 
                          vec3(0.7, 0.0, 0.0) * pow(rim, 2.0) * 0.6;
                }
            }

            // Output to screen with subtle vignette
            float vignette = length(uv) * 0.3;
            col -= vignette;

            gl_FragColor = vec4(col, 1.0);
        }
    `;

    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program error:', gl.getProgramInfoLog(program));
        return;
    }

    // Quad geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1.0,  1.0,
        -1.0, -1.0,
         1.0,  1.0,
         1.0, -1.0,
    ]), gl.STATIC_DRAW);

    const positionData = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionData);
    gl.vertexAttribPointer(positionData, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');

    gl.useProgram(program);

    let startTime = Date.now();

    function resize() {
        // High DPI canvas scaling
        const rect = banner.getBoundingClientRect();
        // Limit resolution scale for performance
        const scale = Math.min(window.devicePixelRatio, 1.5);
        canvas.width = rect.width * scale;
        canvas.height = rect.height * scale;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    // Re-check size occasionally to handle dynamic layout shifts
    setInterval(resize, 1000);

    function render() {
        const currentTime = (Date.now() - startTime) / 1000.0;
        
        gl.uniform2f(uResolution, canvas.width, canvas.height);
        gl.uniform1f(uTime, currentTime);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
    }

    render();
})();
