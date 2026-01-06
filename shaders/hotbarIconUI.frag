#version 300 es

precision mediump float;
in highp vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform uint uSelected;

out vec4 fragColor;

void main() {
	fragColor = texture(uSampler, vTextureCoord);
	
	if (fragColor.a == 0.0) {
		if (uSelected == 1u) {
			fragColor.a = 0.8;
		} else {
			fragColor.a = 0.6;
		}
	}
}