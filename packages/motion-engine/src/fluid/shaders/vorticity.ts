// Vorticity confinement: amplifies existing rotational forces to restore
// small-scale swirling detail that is lost due to numerical dissipation.
// Higher `curl` values produce more dramatic whirlpool-like water motion.
export const vorticitySrc = /* glsl */`
precision highp float;
precision highp sampler2D;

varying vec2 vUv;

uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform vec2 texelSize;
uniform float curl;   // vorticity confinement strength (25-35 for water jutsu)
uniform float dt;

void main() {
    // Sample curl magnitude at neighbors to get gradient direction
    float curlL = texture2D(uCurl, vUv - vec2(texelSize.x, 0.0)).x;
    float curlR = texture2D(uCurl, vUv + vec2(texelSize.x, 0.0)).x;
    float curlT = texture2D(uCurl, vUv + vec2(0.0, texelSize.y)).x;
    float curlB = texture2D(uCurl, vUv - vec2(0.0, texelSize.y)).x;
    float curlC = texture2D(uCurl, vUv).x;

    // Force = normalized gradient of curl magnitude, rotated 90°
    vec2 force = 0.5 * vec2(abs(curlT) - abs(curlB), abs(curlR) - abs(curlL));
    force /= length(force) + 1.0e-5;
    // Apply force perpendicular to gradient (creates swirling)
    force *= curl * curlC;
    force.y *= -1.0; // flip y for screen-space coordinates

    vec2 velocity = texture2D(uVelocity, vUv).xy;
    gl_FragColor = vec4(velocity + force * dt, 0.0, 1.0);
}
`;
