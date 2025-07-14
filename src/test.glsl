#version 400 es
precision lowp float;
uniform vec2 offset;
uniform float scale;

uniform int shadingMode;
const int SHADINGMODE_NONE = 0;
const int SHADINGMODE_STEPPED = 1;
const int SHADINGMODE_SMOOTH = 2;

out vec4 fragColor;

float lengthSquared(vec2 v) { return dot(v, v); }

void main() {
    const float escapeRadius = 4.0;
    vec2 c = (gl_FragCoord.xy + offset) * scale;

    int iterationCount = 0;

    vec2 z = vec2(0, 0);

    for (iterationCount = 0; iterationCount < 1000; iterationCount++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;

        if (dot(z, z) > escapeRadius * escapeRadius) {
            float shade = mod((float(iterationCount) / 50.0), 2.0);
            if (shade > 1.0) {
                shade = 2.0 - shade;
            }
            fragColor = vec4(shade, shade, shade, 1);
            return;
        }
    }

    fragColor = vec4(0, 0, 0, 1);
}
