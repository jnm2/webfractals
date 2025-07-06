#version 300 es
precision highp float;
uniform vec2 offset;
uniform float scale;

uniform int shadingMode;
const int SHADINGMODE_NONE = 0;
const int SHADINGMODE_STEPPED = 1;
const int SHADINGMODE_SMOOTH = 2;

out vec4 fragColor;

const vec2 roots[4] = vec2[](
    vec2(0.848975394258353, 0),
    vec2(-0.848975394258353, 0),
    vec2(0, 1.177890439184729),
    vec2(0, -1.177890439184729)
);

const vec4 palette[4] = vec4[](
    vec4(1.0, 1.0, 0.0, 1.0),
    vec4(0.0, 1.0, 0.0, 1.0),
    vec4(0.0, 0.0, 1.0, 1.0),
    vec4(1.0, 0.0, 0.0, 1.0)
);

#define cx_mul(a, b) vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x)
#define cx_div(a, b) vec2((a.x * b.x + a.y * b.y) / (b.x * b.x + b.y * b.y), (a.y * b.x - a.x * b.y) / (b.x * b.x + b.y * b.y))

// z⁴ + ⅔z² - 1
vec2 f(vec2 z) {
    vec2 z2 = cx_mul(z, z);
    return cx_mul((z2 + vec2(2.0 / 3.0, 0.0)), z2) - vec2(1, 0);
}
// 4z³ + 1⅓z
vec2 df(vec2 z) { return cx_mul((4.0 * cx_mul(z, z) + vec2(4.0 / 3.0, 0)), z); }

float lengthSquared(vec2 v) { return dot(v, v); }

void main() {
    float rootPrecision = scale;
    vec2 z = (gl_FragCoord.xy + offset) * scale;

    int rootIndex = -1;
    int iterationCount = 0;

    vec2 change, prevChange;

    for (iterationCount = 0; iterationCount < 100; iterationCount++) {
        prevChange = change;
        change = cx_div(f(z), df(z));
        z -= change;

        if (iterationCount == 0)
        {
            // At least two iterations are needed to smooth the iteration count to estimate at which iteration the convergence precision was crossed.
            continue;
        }

        if (dot(change, change) <= rootPrecision * rootPrecision) {
            // Stop based on the step size going underneath the convergence threshold, not based on being near a root.
            // - This allows the convergence-smoothing to work, which is based on the step size and not based on distance to the root.
            // - This allows us to stop knowing roots before running.

            rootIndex = 0;
            float minDistance = lengthSquared(z - roots[0]);

            for (int i = 1; i < roots.length(); i++) {
                if (lengthSquared(z - roots[i]) < minDistance) {
                    rootIndex = i;
                    minDistance = lengthSquared(z - roots[i]);
                }
            }

            break;
        }
    }

    if (rootIndex == -1) {
        fragColor = vec4(0, 0, 0, 1);
        return;
    }

    vec4 resultColor = palette[rootIndex];

    if (shadingMode == SHADINGMODE_STEPPED || shadingMode == SHADINGMODE_SMOOTH) {
        float shadingLevel = float(iterationCount - 1);

        if (shadingMode == SHADINGMODE_SMOOTH && iterationCount >= 2) {
            // Estimate how much more precise we got in the last iteration than we need to get to hit the precision threshold,
            // and remove that fractional part of the last iteration.
            float logOfSquaredLengthOfChange = log(lengthSquared(change));
            shadingLevel -=
                (log(rootPrecision * rootPrecision) - logOfSquaredLengthOfChange)
                / (log(lengthSquared(prevChange)) - logOfSquaredLengthOfChange);
        }

        resultColor = vec4(resultColor.xyz * pow(1.06, -shadingLevel), 1);
    }

    fragColor = resultColor;
}
