#version 300 es

precision mediump float;
in highp vec2 vTextureCoord;
in highp vec3 vLighting;

uniform sampler2D uSampler;

out vec4 fragColor;

void main(void) {
	highp vec4 texelColor = texture(uSampler, vTextureCoord);

		if (texelColor.a <= 0.0) { discard; }
	fragColor = vec4(texelColor.rgb * vLighting, texelColor.a);
}
  