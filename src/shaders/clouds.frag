#version 300 es

precision mediump float;
in highp vec2 vTextureCoord;
in highp vec2 vPos;

uniform sampler2D uSampler;

out vec4 fragColor;

void main() {
	float size = 4096.0;

	fragColor = texture(uSampler, vTextureCoord);

	if (fragColor.a != 1.0) {discard; }

	float dx = ((vPos.x + size) / (size * 2.0)) - 0.5;
	float dy = ((vPos.y + size) / (size * 2.0)) - 0.5;

	float d = sqrt(pow(dx, 2.0) + pow(dy, 2.0));

	fragColor.a *= 0.75 - (d  / 0.5);
}