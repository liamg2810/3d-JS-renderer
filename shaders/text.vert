#version 300 es

in vec3 aVertex;
in vec2 aTextureCoord;
in vec3 aCharOrigin;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraUp;
uniform vec3 uCameraRight;
uniform vec3 uTextOrigin;

out highp vec2 vTextureCoord;

void main() {
	// vec3 finalPosition = aCharOrigin + aVertex.x * uCameraRight + aVertex.y * uCameraUp;
	vec3 finalPosition = uTextOrigin + (aCharOrigin.x + aVertex.x) * uCameraRight + (aCharOrigin.y + aVertex.y) * uCameraUp;

	vec4 mvPosition = uModelViewMatrix * vec4(finalPosition, 1.0);
	gl_Position = uProjectionMatrix * mvPosition;

	vTextureCoord = aTextureCoord;
}