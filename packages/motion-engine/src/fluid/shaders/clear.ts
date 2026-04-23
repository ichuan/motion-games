// Warm-start shader for pressure: multiplies existing pressure by a decay factor
// before each Jacobi solve. Preserves approximate solution from previous frame,
// speeding up convergence. (value ≈ 0.8 in practice)
export const clearSrc = /* glsl */`
precision highp float;
precision highp sampler2D;

varying vec2 vUv;

uniform sampler2D uTexture;
uniform float value;

void main() {
    gl_FragColor = value * texture2D(uTexture, vUv);
}
`;
