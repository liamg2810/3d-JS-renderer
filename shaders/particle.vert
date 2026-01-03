#version 300 es

in vec3 aVertex;
in vec2 aTexCoord;
in vec4 aTexOffsets;
in vec4 aParticleOrigin;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

out highp vec2 vTextureCoord;

void main() {
	vec4 viewOrigin = uModelViewMatrix * vec4(aParticleOrigin.xyz, 1.0);
	gl_Position = uProjectionMatrix * vec4(viewOrigin.xyz + aVertex * aParticleOrigin.w, 1.0);

	vTextureCoord = aTexOffsets.xy + aTexCoord * aTexOffsets.zw;
}