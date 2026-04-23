// Projects the velocity field to be divergence-free by subtracting
// the gradient of the solved pressure field.
// This is the "correction" step of the Helmholtz-Hodge decomposition.
export const gradientSubtractSrc = /* glsl */`
precision highp float;
precision highp sampler2D;

varying vec2 vUv;

uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 texelSize;

void main() {
    float l = texture2D(uPressure, vUv - vec2(texelSize.x, 0.0)).x;
    float r = texture2D(uPressure, vUv + vec2(texelSize.x, 0.0)).x;
    float t = texture2D(uPressure, vUv + vec2(0.0, texelSize.y)).x;
    float b = texture2D(uPressure, vUv - vec2(0.0, texelSize.y)).x;

    // Subtract pressure gradient from velocity to make it incompressible
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity -= vec2(r - l, t - b) * 0.5;
    gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`;
