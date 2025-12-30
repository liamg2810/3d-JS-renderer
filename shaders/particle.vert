#version 300 es

in vec3 aVertex;
in vec2 aTexCoord;

uniform float uSize;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uParticleOrigin;

out highp vec2 vTextureCoord;

void main() {
	vec4 viewOrigin = uModelViewMatrix * vec4(uParticleOrigin, 1.0);
	gl_Position = uProjectionMatrix * vec4(viewOrigin.xyz + aVertex * uSize, 1.0);

	vTextureCoord = aTexCoord;
}