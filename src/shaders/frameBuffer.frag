#version 300 es

precision mediump float;
in highp vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform uint uUnderWater;

out vec4 fragColor;

void main() {
	fragColor = texture(uSampler, vTextureCoord);
	
	if (uUnderWater == 1u) {
		fragColor.b += 0.75;
	}
}