// Display shader: renders the dye field with water-style color mapping.
// Deep areas: dark blue. Active flow: bright cyan. High-density peaks: white foam.
// Alpha channel: transparent where no fluid, opaque where water is present.
// Mix-blend-mode:screen on the canvas makes this layer additively combine with layers below.
export const displaySrc = /* glsl */`
precision highp float;
precision highp sampler2D;

varying vec2 vUv;

uniform sampler2D uDye;
uniform sampler2D uVelocity;

// Map fluid density to a water color palette
vec3 waterColor(float density) {
    // Three-stop gradient: transparent deep → cyan mid → white foam
    vec3 deep  = vec3(0.0,  0.18, 0.55);
    vec3 mid   = vec3(0.05, 0.65, 0.95);
    vec3 foam  = vec3(0.80, 0.96, 1.00);
    if (density < 0.5) {
        return mix(deep, mid, density * 2.0);
    } else {
        return mix(mid, foam, (density - 0.5) * 2.0);
    }
}

void main() {
    vec4 dye      = texture2D(uDye, vUv);
    float density = clamp(length(dye.rgb), 0.0, 1.0);

    vec3 color = waterColor(density);

    // Bloom: extra brightness on high-density peaks (foam/spray)
    float bloom = max(density - 0.55, 0.0) * 3.0;
    color += vec3(0.75, 0.95, 1.0) * bloom;

    // Velocity shimmer: subtle shimmer where fluid moves fast
    vec2 vel    = texture2D(uVelocity, vUv).xy;
    float speed = clamp(length(vel) * 0.003, 0.0, 0.35);
    color += vec3(0.3, 0.7, 1.0) * speed * density;

    // Alpha: transparent where density is low, opaque at high density
    float alpha = clamp(density * 1.8, 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
}
`;
