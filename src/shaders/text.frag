#version 300 es

precision mediump float;
in highp vec2 vTextureCoord;

uniform sampler2D uSampler;

out vec4 fragColor;

void main() {
	fragColor = texture(uSampler, vTextureCoord);
	fragColor.a *= fragColor.r + 0.8;
}