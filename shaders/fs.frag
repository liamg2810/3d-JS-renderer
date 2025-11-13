#version 300 es

precision mediump float;
in highp vec2 vTextureCoord;
in highp vec3 vLighting;
in highp vec3 vTint;

uniform sampler2D uSampler;

out vec4 fragColor;

void main() {
	highp vec4 texelColor = texture(uSampler, vTextureCoord);

	texelColor.rgb *= vTint;


	if (texelColor.a <= 0.0) { discard; }

	fragColor = vec4(texelColor.rgb * vLighting, texelColor.a);
}
  