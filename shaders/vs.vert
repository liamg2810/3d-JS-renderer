#version 300 es


// [TEXTURE][DIRECTION][CID][POSITION]
// [POSITION] = XXXXYYYYYYYYZZZZ = 16 bits
// CID = 0-7 = 3 bits
// DIRECTION = 0-5 = 3 bits
// TEXTURE = 0-63 = 8 bits
// TOTAL BITS = 30

// CORNER IDS = [TOP LEFT BACK, TOP RIGHT BACK, TOP LEFT FRONT, TOP RIGHT FRONT,
// 				BOTTOM LEFT BACK, BOTTOM RIGHT BACK, BOTTOM LEFT FRONT, BOTTOM RIGHT FRONT]

// NORMALS = [UP, DOWN, LEFT, RIGHT, FRONT, BACK]

in uint aVertex;

uniform vec2 uChunkPos;
uniform mat4 uNormalMatrix;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

const vec3 offsets[8] = vec3[](
	vec3(-0.5,0.5,-0.5), 
	vec3(0.5,0.5,-0.5), 
	vec3(-0.5, 0.5, 0.5), 
	vec3(0.5, 0.5, 0.5),
	vec3(-0.5,-0.5,-0.5), 
	vec3(0.5,-0.5,-0.5), 
	vec3(-0.5, -0.5, 0.5), 
	vec3(0.5, -0.5, 0.5));

// NORMALS = [UP, DOWN, LEFT, RIGHT, FRONT, BACK]
const vec3 normals[6] = vec3[](
	vec3(0.0, 1.0, 0.0),  // UP
	vec3(0.0, -1.0, 0.0), // DOWN
	vec3(-1.0, 0.0, 0.0), // LEFT
	vec3(1.0, 0.0, 0.0),  // RIGHT
	vec3(0.0, 0.0, 1.0),  // FRONT
	vec3(0.0, 0.0, -1.0)  // BACK
);

out highp vec2 vTextureCoord;
out highp vec3 vLighting;

vec2 getFaceUV(uint cID, uint dir) {
	// Base UVs for the corners of a face
	vec2 baseUVs[4];
	baseUVs[0] = vec2(0.0, 0.0); // bottom-left
	baseUVs[1] = vec2(1.0, 0.0); // bottom-right
	baseUVs[2] = vec2(0.0, 1.0); // top-left
	baseUVs[3] = vec2(1.0, 1.0); // top-right

	// Map corner ID to the face's UV index
	// Corner IDs: [0..7] = [TLB, TRB, TLF, TRF, BLB, BRB, BLF, BRF]
	// Each face uses 4 corners:
	// UP(0): 0,1,2,3
	// DOWN(1): 4,5,6,7
	// LEFT(2): 0,2,4,6
	// RIGHT(3): 1,3,5,7
	// FRONT(4): 2,3,6,7
	// BACK(5): 0,1,4,5

	uint idx = 0u;

	if (dir == 0u) { // UP
		if (cID == 0u) idx = 2u;
		else if (cID == 1u) idx = 3u;
		else if (cID == 2u) idx = 0u;
		else if (cID == 3u) idx = 1u;
	} else if (dir == 1u) { // DOWN
		if (cID == 4u) idx = 2u;
		else if (cID == 5u) idx = 3u;
		else if (cID == 6u) idx = 0u;
		else if (cID == 7u) idx = 1u;
	} else if (dir == 2u) { // LEFT
		if (cID == 0u) idx = 1u;
		else if (cID == 2u) idx = 0u;
		else if (cID == 4u) idx = 3u;
		else if (cID == 6u) idx = 2u;
	} else if (dir == 3u) { // RIGHT
		if (cID == 1u) idx = 1u;
		else if (cID == 3u) idx = 0u;
		else if (cID == 5u) idx = 3u;
		else if (cID == 7u) idx = 2u;
	} else if (dir == 4u) { // FRONT
		if (cID == 2u) idx = 1u;
		else if (cID == 3u) idx = 0u;
		else if (cID == 6u) idx = 3u;
		else if (cID == 7u) idx = 2u;
	} else if (dir == 5u) { // BACK
		if (cID == 0u) idx = 1u;
		else if (cID == 1u) idx = 0u;
		else if (cID == 4u) idx = 3u;
		else if (cID == 5u) idx = 2u;
	}

	return baseUVs[idx];
}

void main() {
	uint vertZ = aVertex & uint(0xF);
	uint vertY = (aVertex >> 4) & uint(0xFF);
	uint vertX = (aVertex >> 12) & uint(0xF);

	uint cID = (aVertex >> 16) & uint(0x7);
	uint dir = (aVertex >> 19) & uint(0x7);
	uint texture = (aVertex >> 22) & uint(0xFF);

	vec3 pos = vec3(float(vertX) + uChunkPos.x, float(vertY), float(vertZ) + uChunkPos.y) + offsets[cID];
	
	// Water
	if (texture == 6u) {
		pos = vec3(pos.x, pos.y - 0.2, pos.z);
	}

	vec4 vertexPos = vec4(pos, 1.0);

	vec4 mvPosition = uModelViewMatrix * vertexPos;
	gl_Position = uProjectionMatrix * mvPosition;

	uint atlasCols = 7u;
	uint atlasRows = 32u;

	uint col = texture % uint(atlasCols);
	uint row = texture / uint(atlasCols);

	vec2 tileOffset = vec2(float(col) / float(atlasCols), float(row) / float(atlasRows));
	vec2 tileScale = vec2(1.0 / float(atlasCols), 1.0 / float(atlasRows));

	vTextureCoord = tileOffset + (getFaceUV(cID, dir)) * tileScale;

	// Apply lighting effect

	vec3 normal = normals[dir];

	highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
	highp vec3 directionalLightColor = vec3(1, 1, 1);
	highp vec3 directionalVector = normalize(vec3(100, 100, 100));

	highp vec4 transformedNormal = uNormalMatrix * vec4(normal, 1.0);

	highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
	vLighting = ambientLight + (directionalLightColor * directional);
}