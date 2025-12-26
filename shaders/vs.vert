#version 300 es


// [BOIME][TEXTURE][DIRECTION][CID][POSITION]
// [POSITION] = XXXXYYYYYYYYZZZZ = 16 bits
// CID = 0-7 = 3 bits
// DIRECTION = 0-5 = 3 bits
// TEXTURE = 0-63 = 6 bits
// BIOME = 0-15 = 4 bits
// TOTAL BITS = 32

// CORNER IDS = [TOP LEFT BACK, TOP RIGHT BACK, TOP LEFT FRONT, TOP RIGHT FRONT,
// 				BOTTOM LEFT BACK, BOTTOM RIGHT BACK, BOTTOM LEFT FRONT, BOTTOM RIGHT FRONT]

// NORMALS = [UP, DOWN, LEFT, RIGHT, FRONT, BACK]

in uvec2 aVertexInstance;
in vec3 aVertex;

uniform vec2 uChunkPos;
uniform mat4 uNormalMatrix;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

uniform float uTime;

const vec3 flowerOffsets[6] = vec3[](
	vec3(0, 0, 0),
	vec3(0, 0, 0),
	vec3(0.5, 0, 0.5),
	vec3(-0.5, 0, 0.5),
	vec3(0, 0, 0),
	vec3(0, 0, 1)
);

// NORMALS = [UP, DOWN, LEFT, RIGHT, FRONT, BACK]
const vec3 normals[6] = vec3[](
	vec3(0.0, 1.0, 0.0),  // UP
	vec3(0.0, -1.0, 0.0), // DOWN
	vec3(-1.0, 0.0, 0.0), // LEFT
	vec3(1.0, 0.0, 0.0),  // RIGHT
	vec3(0.0, 0.0, 1.0),  // FRONT
	vec3(0.0, 0.0, -1.0)  // BACK
);

const float PI = 3.1415926535897932384626433832795;

out highp vec2 vTextureCoord;
out highp vec3 vLighting;
out highp vec3 vTint;
out highp vec2 vTintedTexCoord;
flat out uint vTintFlag;

vec2 getFaceUV(int cID, uint dir) {
	// Base UVs for the corners of a face
	vec2 baseUVs[4];
	baseUVs[0] = vec2(0.0, 0.0); // bottom-left
	baseUVs[1] = vec2(1.0, 0.0); // bottom-right
	baseUVs[2] = vec2(0.0, 1.0); // top-left
	baseUVs[3] = vec2(1.0, 1.0); // top-right

	uint idx = 0u;

	if (dir == 0u) { // UP
		if (cID == 0) idx = 0u;
		else if (cID == 1) idx = 2u;
		else if (cID == 2) idx = 1u;
		else if (cID == 3) idx = 2u;
		else if (cID == 4) idx = 3u;
		else if (cID == 5) idx = 1u;
	} else if (dir == 1u || dir == 2u || dir == 4u) { // DOWN | LEFT | FRONT
		if (cID == 0) idx = 2u;
		else if (cID == 1) idx = 3u;
		else if (cID == 2) idx = 0u;
		else if (cID == 3) idx = 3u;
		else if (cID == 4) idx = 1u;
		else if (cID == 5) idx = 0u;
	} else if (dir == 3u || dir == 5u) { // RIGHT | BACK
		if (cID == 0) idx = 3u;
		else if (cID == 1) idx = 1u;
		else if (cID == 2) idx = 2u;
		else if (cID == 3) idx = 1u;
		else if (cID == 4) idx = 0u;
		else if (cID == 5) idx = 2u;
	}

	return baseUVs[idx];
}

float getWaterY() {
	return mod(uTime / 100.0, 32.0);
}

vec3 rotate45AroundY(vec3 p) {
    const float c = 0.70710678;
    const float s = 0.70710678;
    return vec3(
        p.x * c - p.z * s,
        p.y,
        p.x * s + p.z * c
    );
}

vec3 rotateFromDir(uint dir, vec3 pos) {
	// Down
	if (dir == 1u) {
		return vec3(pos.z, pos.y - 1.0, pos.x);
	}

	// Left
	if (dir == 2u) {
		return vec3(pos.y - 1.0, pos.x, pos.z);
	}

	// Right
	if (dir == 3u) {
		return vec3(pos.y, pos.z, pos.x);
	}

	// Front
	if (dir == 4u) {
		return vec3(pos.z, pos.x, pos.y);
	}

	// Back
	if (dir == 5u) {
		return vec3(pos.x, pos.z, pos.y - 1.0);
	}

	// Up
	return pos;
}

void main() {
	uint lowBits = aVertexInstance.y;
	uint highBits = aVertexInstance.x;

	uint vertZ = lowBits & uint(0xF);
	uint vertY = (lowBits >> 4) & uint(0xFF);
	uint vertX = (lowBits >> 12) & uint(0xF);

	// uint cID = (lowBits >> 16) & uint(0x7);
	uint dir = (lowBits >> 19) & uint(0x7);
	uint texture = (lowBits >> 22) & uint(0x3F);
	uint biome = (lowBits >> 28) & uint(0xF);
	int cID = gl_VertexID;

	vec3 pos = aVertex;
	pos = rotateFromDir(dir, pos);

	if (texture == 23u) {
		pos += flowerOffsets[dir];
		pos = rotate45AroundY(pos);
	}

	pos += vec3(float(vertX) + uChunkPos.x, float(vertY), float(vertZ) + uChunkPos.y);


	// Water
	if (texture == 6u) {
		pos = vec3(pos.x, pos.y - 0.2, pos.z);
	}

	vec4 vertexPos = vec4(pos, 1.0);

	vec4 mvPosition = uModelViewMatrix * vertexPos;
	gl_Position = uProjectionMatrix * mvPosition;

	float atlasCols = 7.0;
	float atlasRows = 32.0;

	uint col = texture % uint(atlasCols);
	
	uint row = texture / uint(atlasCols);

	if (texture == 6u) {
		row = uint(getWaterY());

		texture = row * uint(atlasCols) + col;
	}

	float paddingRatio = 1.0 / 18.0;
	float innerRatio = 16.0 / 18.0;

	vec2 tileOffset = vec2(float(col) / float(atlasCols), float(row) / float(atlasRows));
	vec2 tileScale = vec2(1.0 / float(atlasCols), 1.0 / float(atlasRows));
	vTextureCoord = tileOffset + (paddingRatio + getFaceUV(cID, dir) * innerRatio) * tileScale;

	vTintFlag = (texture == 14u || texture == 1u || texture == 2u || texture == 0u) ? 1u : 0u;
	vec2 texCoord = vec2(1000.0, 0.0);

	vec3 tint = vec3(1.0, 1.0, 1.0);

	if (texture == 14u) {
		tint = vec3(97.0/255.0, 153.0/255.0, 97.0/255.0);
		texCoord = vTextureCoord;
	}


	if (texture == 1u || texture == 2u) {
		tint = vec3(121.0/255.0, 192.0/255.0, 90.0/255.0);
		texCoord = vTextureCoord;
	}

	if (texture == 1u && biome == 4u) {
		tint = vec3(97.0/255.0, 153.0/255.0, 97.0/255.0);
		texCoord = vTextureCoord;
	}

	if (texture == 0u) {
		texCoord = vec2(float(1) / float(atlasCols), float(2) / float(atlasRows)) + (paddingRatio + getFaceUV(cID, dir) * innerRatio) * tileScale;
	
		if (biome == 4u) {
			tint = vec3(97.0/255.0, 153.0/255.0, 97.0/255.0);
		} else {
			tint = vec3(121.0/255.0, 192.0/255.0, 90.0/255.0);
		}
	}

	vTintedTexCoord = texCoord;
	vTint = tint;

	// Apply lighting effect

	vec3 normal = normals[dir];

	if (texture == 23u) {
		normal = rotate45AroundY(normal);
	}

	float seconds = uTime / 1000.0;
	float dayLength = 120.0;
	float t = mod(seconds, dayLength) / dayLength; // 0 → 1 over a full day	

	float sun = max(0.0, cos(t * 2.0 * PI));

	vec3 ambientDay = vec3(0.5);
	vec3 ambientNight = vec3(0.5);

	vec3 ambientLight = mix(ambientNight, ambientDay, 1.0);

	vec3 directionalLightColor = vec3(1.0) * 1.0;
	vec3 directionalVector = normalize(vec3(100, 100, 100));

	vec3 lightDir = normalize((uNormalMatrix * vec4(directionalVector, 0.0)).xyz);


	vec3 transformedNormal = normalize((uNormalMatrix * vec4(normal, 0.0)).xyz);


	highp float directional = max(dot(transformedNormal, lightDir), 0.0);
	vLighting = ambientLight + (directionalLightColor * directional);
}