// Semi-Lagrangian advection: moves the source texture along the velocity field.
// Used twice per step: once for velocity self-advection, once for dye advection.
export const advectionSrc = /* glsl */`
precision highp float;
precision highp sampler2D;

varying vec2 vUv;

uniform sampler2D uVelocity;  // velocity field (simRes)
uniform sampler2D uSource;    // texture to advect (simRes for velocity, dyeRes for dye)
uniform vec2 texelSize;       // 1 / simRes — used to step along velocity
uniform vec2 dyeTexelSize;    // 1 / source texture size
uniform float dt;
uniform float dissipation;

// Manual bilinear interpolation for when linear filtering is not available on float textures.
vec4 bilerp(sampler2D sam, vec2 uv, vec2 tSize) {
    vec2 st = uv / tSize - 0.5;
    vec2 iuv = floor(st);
    vec2 fuv = fract(st);
    vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tSize);
    vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tSize);
    vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tSize);
    vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tSize);
    return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
}

void main() {
    // Trace particle backward along velocity field
    vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
    // Sample source texture at the traced position (with bilinear interp for accuracy)
    vec4 result = bilerp(uSource, coord, dyeTexelSize);
    // Apply dissipation: fluid naturally loses energy over time
    float decay = 1.0 + dissipation * dt;
    gl_FragColor = result / decay;
}
`;
