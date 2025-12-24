#version 300 es

in vec3 aVertex;
in vec3 aColor;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

out highp vec3 vColor;

void main() {
	vec4 mvPosition = uModelViewMatrix * vec4(aVertex, 1.0);
	gl_Position = uProjectionMatrix * mvPosition;

	vColor = aColor;
}