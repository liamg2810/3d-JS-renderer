#version 300 es

precision mediump float;
in highp vec2 vTextureCoord;
flat in uint vTexIndex;
in highp vec3 vLighting;
in highp vec3 vTint;
in highp vec2 vTintedTexCoord;
flat in uint vTintedTexIndex;
flat in uint vTintFlag;
flat in uint vAO;

uniform sampler2D uSampler;

out vec4 fragColor;

void main() {
	bool aoT = ((vAO >> 7) & 1u) != 0u;
	bool aoB = ((vAO >> 6) & 1u) != 0u;
	bool aoL = ((vAO >> 5) & 1u) != 0u;
	bool aoR = ((vAO >> 4) & 1u) != 0u;

	bool aoBL = ((vAO >> 3) & 1u) != 0u;
	bool aoBR = ((vAO >> 2) & 1u) != 0u;
	bool aoTL = ((vAO >> 1) & 1u) != 0u;
	bool aoTR = ((vAO >> 0) & 1u) != 0u;


    highp vec4 texelColor;

	uint col;
	uint row;
	float atlasCols = 7.0;
	float atlasRows = 32.0;

	vec2 tileScale = vec2(1.0 / atlasCols, 1.0 / atlasRows);

	
	vec2 localUV;

    if (vTintFlag == 1u) {
        texelColor = texture(uSampler, vTintedTexCoord);

        texelColor.rgb *= vTint;

		col = vTintedTexIndex % uint(atlasCols);
		
		row = vTintedTexIndex / uint(atlasCols);

		vec2 tileOrigin = vec2(col, row) * tileScale;
		
		localUV = (vTintedTexCoord - tileOrigin) / tileScale;

		if (texelColor.a == 0.0) {
        	texelColor = texture(uSampler, vTextureCoord);

			col = vTexIndex % uint(atlasCols);
			
			row = vTexIndex / uint(atlasCols);

			vec2 tileOrigin = vec2(col, row) * tileScale;
			
			localUV = (vTextureCoord - tileOrigin) / tileScale;
		}
    } else {
        texelColor = texture(uSampler, vTextureCoord);
		
		col = vTexIndex % uint(atlasCols);
		
		row = vTexIndex / uint(atlasCols);

		vec2 tileOrigin = vec2(col, row) * tileScale;
		
		localUV = (vTextureCoord - tileOrigin) / tileScale;
    }

    if (texelColor.a <= 0.0) { discard; }


	float aoSize = 0.5;
	float aoStrength = 0.5;

	float distBL = length(localUV - vec2(0.0, 0.0)); // bottom-left
	float distBR = length(localUV - vec2(1.0, 0.0)); // bottom-right
	float distTL = length(localUV - vec2(0.0, 1.0)); // top-left
	float distTR = length(localUV - vec2(1.0, 1.0)); // top-right

	float distLeft   = localUV.x;
	float distRight  = 1.0 - localUV.x;
	float distBottom = localUV.y;
	float distTop    = 1.0 - localUV.y;


	float cornerDist = 1e6; // large number

	if (aoBL)   cornerDist = min(cornerDist, distBL);
	if (aoBR)  cornerDist = min(cornerDist, distBR);
	if (aoTL) cornerDist = min(cornerDist, distTL);
	if (aoTR)    cornerDist = min(cornerDist, distTR);

	if (aoB)   cornerDist = min(cornerDist, distBottom);
	if (aoR)  cornerDist = min(cornerDist, distRight);
	if (aoT) cornerDist = min(cornerDist, distTop);
	if (aoL)    cornerDist = min(cornerDist, distLeft);

	if (cornerDist == 1e6) {
		// all edges disabled → no AO
		cornerDist = aoSize; // or 1.0
	}

	float darkness = smoothstep(0.0, aoSize, cornerDist);
	darkness = mix(1.0, darkness, aoStrength);

	texelColor.rgb *= darkness;

    fragColor = vec4(texelColor.rgb * vLighting, texelColor.a);
}
  