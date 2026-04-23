// Computes the divergence of the velocity field.
// Non-zero divergence means fluid is being created/destroyed at that point.
// The pressure solver will remove this divergence to enforce incompressibility.
export const divergenceSrc = /* glsl */`
precision mediump float;
precision mediump sampler2D;

varying vec2 vUv;

uniform sampler2D uVelocity;
uniform vec2 texelSize;

void main() {
    // Sample velocity components at the four face neighbors (staggered grid approximation)
    float l = texture2D(uVelocity, vUv - vec2(texelSize.x, 0.0)).x;
    float r = texture2D(uVelocity, vUv + vec2(texelSize.x, 0.0)).x;
    float t = texture2D(uVelocity, vUv + vec2(0.0, texelSize.y)).y;
    float b = texture2D(uVelocity, vUv - vec2(0.0, texelSize.y)).y;

    // Enforce zero normal velocity at domain boundaries
    vec2 c = texture2D(uVelocity, vUv).xy;
    if (vUv.x - texelSize.x < 0.0) l = -c.x;
    if (vUv.x + texelSize.x > 1.0) r = -c.x;
    if (vUv.y + texelSize.y > 1.0) t = -c.y;
    if (vUv.y - texelSize.y < 0.0) b = -c.y;

    float div = 0.5 * (r - l + t - b);
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}
`;
