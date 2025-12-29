#version 300 es

precision mediump float;
in highp vec2 vTextureCoord;
in highp vec3 vTint;
in highp vec2 vTintedTexCoord;
flat in float vLighting;
flat in uint vTintFlag;

uniform sampler2D uSampler;

out vec4 fragColor;

void main() {
    highp vec4 texelColor;

    if (vTintFlag == 1u) {
        texelColor = texture(uSampler, vTintedTexCoord);


        texelColor.rgb *= vTint;

		if (texelColor.a == 0.0) {
        	texelColor = texture(uSampler, vTextureCoord);
		}
    } else {
        texelColor = texture(uSampler, vTextureCoord);
    }

    if (texelColor.a <= 0.0) { discard; }

    fragColor = vec4(texelColor.rgb * vLighting, texelColor.a);
}
  