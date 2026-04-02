import { RULES } from './rules.js';
import { WEAPON } from './weapon.js';
import { ARM_SHADER } from './arm.js';
import { E2C_SHADER } from './e2c.js';
import { ENEMY_SHADER } from './enemy.js';
import { HEALTHBAR_SHADER } from './healthbar.js';

/**
 * Translator for the Genesis Kernel engine.
 * Assembles the shader snippets into valid GLSL.
 */

export const Translator = {
    assembleVertexShader() {
        return `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `;
    },

    assembleFragmentShader() {
        return `
            uniform vec2 u_resolution;
            uniform float u_time;
            uniform vec3 u_cameraPos;
            uniform vec2 u_cameraRot;
            uniform float u_fireTime;

            #define MAX_STEPS 120
            #define MAX_DIST 150.0
            #define SURF_DIST 0.005
            
            float globalGlow = 0.0; // For gun plasma

            ${RULES.rotation}
            ${RULES.sdBox}
            ${RULES.sdGyroid}
            ${RULES.smin}
            ${RULES.stateIron}
            ${RULES.stateSplat}
            ${RULES.stateFlora}

            ${WEAPON.helpers}
            ${WEAPON.text}
            ${WEAPON.mapGun}
            ${WEAPON.rayMarchGun}
            ${WEAPON.shadeGun}

            ${ARM_SHADER.helpers}
            ${ARM_SHADER.uniforms}
            ${ARM_SHADER.map}
            ${ARM_SHADER.shade}

            ${HEALTHBAR_SHADER.uniforms}
            ${HEALTHBAR_SHADER.composite}

            ${E2C_SHADER.uniforms}
            ${E2C_SHADER.map}

            ${ENEMY_SHADER.helpers}
            ${ENEMY_SHADER.uniforms}
            ${ENEMY_SHADER.map}

            // Rename rules.mapFunction internally
            ${RULES.mapFunction.replace('map(vec3 p, float time)', 'map_internal(vec3 p, float time)')}

            // Wrapper to match previous map signature
            vec2 map(vec3 p) {
                vec2 m1 = map_internal(p, u_time);
                vec2 m2 = mapE2C(p);
                vec2 m3 = mapEnemies(p);
                
                vec2 res = (m1.x < m2.x) ? m1 : m2;
                return (res.x < m3.x) ? res : m3;
            }

            // Raymarcher
            vec2 rayMarch(vec3 ro, vec3 rd) {
                float dO = 0.0;
                float matID = 0.0;
                for(int i = 0; i < MAX_STEPS; i++) {
                    vec3 p = ro + rd * dO;
                    vec2 res = map(p);
                    if(abs(res.x) < SURF_DIST) {
                        matID = res.y;
                        break;
                    }
                    dO += res.x;
                    if(dO > MAX_DIST) break;
                }
                return vec2(dO, matID);
            }

            // Normal Calculation
            vec3 getNormal(vec3 p) {
                vec2 e = vec2(0.01, 0.0);
                vec3 n = vec3(
                    map(p + e.xyy).x - map(p - e.xyy).x,
                    map(p + e.yxy).x - map(p - e.yxy).x,
                    map(p + e.yyx).x - map(p - e.yyx).x
                );
                return normalize(n);
            }

            void main() {
                vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

                float waveZ = u_time * 12.0;
                vec3 ro = u_cameraPos;

                float yaw = u_cameraRot.x; 
                float pitch = u_cameraRot.y; 

                vec3 rd = normalize(vec3(uv.x, uv.y, 1.0)); 
                vec3 gunRd = rd; // Save view-space rd for gun
                rd.yz *= rot(-pitch);
                rd.xz *= rot(-yaw);

                vec2 rm = rayMarch(ro, rd);
                float d = rm.x;
                float matID = rm.y;

                vec3 col = vec3(0.0);
                vec3 bgCol = vec3(0.01, 0.02, 0.03);

                if(d < MAX_DIST) {
                    vec3 p = ro + rd * d;
                    vec3 n = getNormal(p);
                    vec3 viewDir = normalize(ro - p);

                    vec3 albedo = vec3(0.0);
                    vec3 emission = vec3(0.0);
                    float roughness = 1.0;

                    if (matID < 0.5) {
                        albedo = vec3(0.1, 0.12, 0.15);
                        roughness = 0.4;
                    } 
                    else if (matID >= 0.5 && matID < 1.5) {
                        float splatEnergy = sin(p.x*10.0 + u_time*5.0) * 0.5 + 0.5;
                        albedo = vec3(0.1);
                        emission = mix(vec3(1.0, 0.0, 0.5), vec3(0.0, 1.0, 1.0), splatEnergy) * 3.0;
                    } 
                    else if (matID >= 1.5 && matID < 2.5) {
                        albedo = vec3(0.05, 0.2, 0.1);
                        roughness = 0.8;
                        float bioGlow = smoothstep(0.6, 1.0, sin(p.y * 5.0 - u_time * 2.0));
                        emission = vec3(0.0, 1.0, 0.5) * bioGlow * 1.5;
                        float sss = pow(clamp(1.0 - dot(n, viewDir), 0.0, 1.0), 3.0);
                        emission += vec3(0.1, 0.4, 0.2) * sss;
                    }
                    else {
                        albedo = vec3(0.05);
                        vec2 grid = fract(p.xz * 0.5);
                        if(min(grid.x, grid.y) < 0.02) albedo = vec3(0.0);
                        roughness = 0.2;
                    }

                    ${E2C_SHADER.shade}
                    ${ENEMY_SHADER.shade}

                    vec3 waveCenter = vec3(0.0, 0.0, waveZ);
                    vec3 lightDir = normalize(waveCenter - p);
                    float distToLight = length(waveCenter - p);
                    float attenuation = 200.0 / (1.0 + distToLight * distToLight * 0.1);
                    float dif = max(dot(n, lightDir), 0.0);
                    vec3 halfDir = normalize(lightDir + viewDir);
                    float spec = pow(max(dot(n, halfDir), 0.0), mix(10.0, 100.0, 1.0 - roughness));
                    vec3 ambient = albedo * 0.05;
                    vec3 waveLightColor = vec3(0.5, 0.8, 1.0);
                    col = ambient + (albedo * dif + spec * waveLightColor) * attenuation + emission;
                }

                float fogFactor = 1.0 - exp(-0.0001 * d * d);
                fogFactor = fogFactor * 0.8;
                col = mix(col, bgCol, fogFactor);

                // --- FPS ARM COMPOSITING (rendered first, then gun on top, then arm on top of gun) ---
                vec3 gunRo = vec3(0.0);
                
                // March the gun
                vec3 gunRm = marchFPSGun(gunRo, gunRd);
                
                // March the arm
                vec3 armRo = vec3(0.0);
                vec3 armRm = marchFPSArm(armRo, gunRd);
                
                // Composite: gun first
                if (gunRm.z > 0.5 && gunRm.x < d) { 
                    vec3 gunP = gunRo + gunRd * gunRm.x;
                    vec3 gunN = getNormalGun(gunP);
                    vec3 gunCol = getGunColor(gunP, gunN, gunRd, gunRm.y);
                    gunCol += globalGlow * vec3(1.0, 0.2, 0.02) * 0.2;
                    col = gunCol;
                } else {
                    col += globalGlow * vec3(1.0, 0.2, 0.02) * 0.1;
                }
                
                // Composite: arm ALWAYS on top where it hits
                // The arm wraps the grip, so it must paint over the gun
                if (armRm.z > 0.5) {
                    vec3 armP = armRo + gunRd * armRm.x;
                    vec3 armN = getNormalArm(armP);
                    vec3 armCol = getArmColor(armP, armN, gunRd, armRm.y);
                    col = armCol;
                }


                // Global Glow from gun muzzle (if fired) onto screen edges
                float fireAnim = exp(-u_fireTime * 15.0);
                if(fireAnim > 0.01) {
                    float muzzleScreenTint = pow(max(1.0 - length(uv - vec2(0.5, -0.5)), 0.0), 2.0);
                    col += vec3(1.0, 0.5, 0.1) * muzzleScreenTint * fireAnim * 0.15;
                }

                float distFromCenter = length(uv);
                col *= smoothstep(1.5, 0.5, distFromCenter);
                col = col * (2.51 * col + 0.03) / (col * (2.43 * col + 0.59) + 0.14);

                // ─── HUD: HEALTH BAR ───
                col = compositeHealthBar(uv, col);

                col = pow(col, vec3(1.0 / 2.2));

                if (distFromCenter < 0.01 && distFromCenter > 0.005) {
                    col = vec3(1.0) - col; // Crosshair dot
                }

                gl_FragColor = vec4(col, 1.0);
            }
        `;
    }
};
