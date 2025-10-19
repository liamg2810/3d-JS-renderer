#version 300 es

precision mediump float;

in highp vec3 vColor;

out vec4 fragColor;

void main(void) {
	fragColor = vec4(vColor, 1.0);
}
  