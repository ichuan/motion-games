// Computes the curl (z-component of rotation) of the velocity field.
// Used for vorticity confinement to add swirling detail to the fluid.
export const curlSrc = /* glsl */`
precision mediump float;
precision mediump sampler2D;

varying vec2 vUv;

uniform sampler2D uVelocity;
uniform vec2 texelSize;

void main() {
    // Sample velocity at the four neighbors
    float l = texture2D(uVelocity, vUv - vec2(texelSize.x, 0.0)).y;
    float r = texture2D(uVelocity, vUv + vec2(texelSize.x, 0.0)).y;
    float t = texture2D(uVelocity, vUv + vec2(0.0, texelSize.y)).x;
    float b = texture2D(uVelocity, vUv - vec2(0.0, texelSize.y)).x;

    // curl = dvy/dx - dvx/dy (finite difference)
    float curl = 0.5 * ((r - l) - (t - b));
    gl_FragColor = vec4(curl, 0.0, 0.0, 1.0);
}
`;
