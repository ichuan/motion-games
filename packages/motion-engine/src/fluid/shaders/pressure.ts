// One iteration of the Jacobi pressure solver.
// Solves: ∇²P = div(velocity) (Poisson equation).
// Run this shader ~20 times per frame for a visually stable solution.
export const pressureSrc = /* glsl */`
precision mediump float;
precision mediump sampler2D;

varying vec2 vUv;

uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 texelSize;

void main() {
    float l = texture2D(uPressure, vUv - vec2(texelSize.x, 0.0)).x;
    float r = texture2D(uPressure, vUv + vec2(texelSize.x, 0.0)).x;
    float t = texture2D(uPressure, vUv + vec2(0.0, texelSize.y)).x;
    float b = texture2D(uPressure, vUv - vec2(0.0, texelSize.y)).x;
    float divergence = texture2D(uDivergence, vUv).x;

    // Jacobi relaxation: average neighbors minus divergence term
    float pressure = (l + r + b + t - divergence) * 0.25;
    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`;
