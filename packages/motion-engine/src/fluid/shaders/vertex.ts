// Shared vertex shader for all fluid simulation passes.
// Renders a full-screen quad mapped to NDC via orthographic camera.
export const vertexSrc = /* glsl */`
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
