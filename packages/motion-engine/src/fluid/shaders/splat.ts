// Splat shader: injects a radial Gaussian impulse into a field at a given point.
// Used to inject both velocity (from hand gesture) and dye color.
export const splatSrc = /* glsl */`
precision highp float;
precision highp sampler2D;

varying vec2 vUv;

uniform sampler2D uTarget;    // current field (velocity or dye)
uniform float aspectRatio;    // canvas width / height (corrects splat shape)
uniform vec3 color;           // velocity delta (dx, dy, 0) or dye color (r, g, b)
uniform vec2 point;           // splat center in normalized [0,1] coords
uniform float radius;         // Gaussian radius (normalized, corrected for aspect)

void main() {
    vec2 p = vUv - point;
    p.x *= aspectRatio;       // stretch x to keep splat circular
    float splat = exp(-dot(p, p) / radius);
    vec3 base = texture2D(uTarget, vUv).xyz;
    gl_FragColor = vec4(base + splat * color, 1.0);
}
`;
