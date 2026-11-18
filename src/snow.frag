precision highp float;
varying vec2 v_tex_coord;
uniform vec2 u_resolution;
uniform vec2 u_origin;
uniform float u_elapsed;
uniform float u_reduced;
uniform float u_opacity;

    vec2 snowHash(vec2 p) {
        return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
    }
    void main() {
        vec2 px = v_tex_coord * u_resolution;
        vec2 origin = u_origin * u_resolution;
        float t = max(0.0, u_elapsed - 0.7);
        float still = u_reduced;
        float motionTime = mix(t, 2.0, still);
        float snow = 0.0;
        float rim = 0.0;
        for (int layer = 0; layer < 3; layer++) {
            float depth = float(layer);
            float cell = 58.0 + depth * 19.0;
            vec2 drift = vec2(motionTime * (9.0 + depth * 7.0), motionTime * (38.0 + depth * 31.0));
            vec2 grid = (px + drift) / cell;
            vec2 base = floor(grid);
            for (int ix = -1; ix <= 1; ix++) {
                for (int iy = -1; iy <= 1; iy++) {
                    vec2 id = base + vec2(float(ix), float(iy));
                    vec2 random = snowHash(id + depth * 31.0);
                    vec2 center = (id + 0.2 + random * 0.6) * cell - drift;
                    center.x += sin(motionTime * 0.8 + random.y * 6.28) * (7.0 + depth * 4.0);
                    float radius = 1.1 + depth * 1.0 + random.x * 1.7;
                    vec2 delta = px - center;
                    float dist = length(delta);
                    float angle = atan(delta.y, delta.x) + random.y * 6.28 + motionTime * 0.2;
                    float shape = radius * (0.82 + 0.18 * cos(angle * 6.0));
                    float keep = step(0.38, random.y);
                    float alpha = (0.45 + depth * 0.2) * keep;
                    snow += (1.0 - smoothstep(shape * 0.45, shape, dist)) * alpha;
                    rim += (1.0 - smoothstep(shape, shape + 1.4, dist)) * alpha;
                }
            }
        }
        // Вихрь поднимается от снеговичка. Раскрытие следует за его взмахом.
        float reveal = mix(smoothstep(length(px - origin) - 100.0, length(px - origin) + 100.0, t * 650.0), 1.0, still);
        float burst = 0.0;
        for (int i = 0; i < 12; i++) {
            float seed = float(i);
            float age = t - seed * 0.035;
            float live = step(0.0, age) * (1.0 - smoothstep(0.65, 1.45, age)) * (1.0 - still);
            vec2 center = origin + vec2(sin(seed * 2.4) * age * 135.0,
                                       age * (200.0 + seed * 12.0) - age * age * 75.0);
            float dot = 1.0 - smoothstep(1.3, 4.0, length(px - center));
            burst += dot * live;
        }
        float opacity = u_opacity * mix(1.0, 0.38, still);
        float core = clamp(snow * reveal + burst, 0.0, 1.0);
        float edge = clamp(rim * reveal + burst, 0.0, 1.0);
        float alpha = clamp(edge * 0.8, 0.0, 0.9) * opacity;
        vec3 color = mix(vec3(0.48, 0.65, 0.79), vec3(0.98, 0.995, 1.0), core / max(edge, 0.001));
        gl_FragColor = vec4(color * alpha, alpha);
    }
    