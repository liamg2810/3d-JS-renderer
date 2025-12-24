#version 300 es

in vec3 aVertex;
in vec2 aTextureCoord;


out highp vec2 vTextureCoord;

void main() {
	gl_Position = vec4(aVertex, 1.0);

	vTextureCoord = aTextureCoord;
}