#version 300 es


// [TEXTURE][DIRECTION][POSITION]
// [POSITION] = XXXXYYYYYYYYZZZZ = 16 bits
// DIRECTION = 0-5 = 3 bits
// TEXTURE = 0-63 = 6 bits
// -- High bits
// LIGHT = 0-15 = 4 bits
// HEIGHT = 0-7 * 4 verts = 12 bits
// TOTAL BITS = 37

// NORMALS = [UP, DOWN, LEFT, RIGHT, FRONT, BACK]

in uvec2 aVertexInstance;
in vec3 aVertex;

uniform vec2 uChunkPos;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

uniform float uTime;

out highp vec2 vTextureCoord;
flat out float vLighting;

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

float GetYOffset(uint dir, float[6] heights) {
	if (dir == 1u) return 0.0;

	if (dir == 0u) return heights[gl_VertexID];

	if (dir == 2u) {
		if (gl_VertexID == 4) return heights[1];
		if (gl_VertexID == 2 || gl_VertexID == 5) return heights[0];
		return 0.0;
	}

	if (dir == 3u) {
		if (gl_VertexID == 4) return heights[gl_VertexID];
		if (gl_VertexID == 1 || gl_VertexID == 3) return heights[2];
		return 0.0;
	}

	if (dir == 4u) {
		if (gl_VertexID == 4) return heights[4];
		if (gl_VertexID == 2 || gl_VertexID == 5) return heights[1];
		return 0.0;
	}

	if (dir == 5u) {
		if (gl_VertexID == 4) return heights[2];
		if (gl_VertexID == 3 || gl_VertexID == 1) return heights[0];
		return 0.0;
	}

	return 0.0;
}

void main() {
	uint lowBits = aVertexInstance.y;
	uint highBits = aVertexInstance.x;

	uint vertZ = lowBits & uint(0xF);
	uint vertY = (lowBits >> 4) & uint(0xFF);
	uint vertX = (lowBits >> 12) & uint(0xF);
	uint dir = (lowBits >> 16) & uint(0x7);
	uint texture = (lowBits >> 19) & uint(0x3F);

	float light = float(((highBits) & uint(0xF)) + 1u) / 16.0;
	uint vertHeights = (highBits >> 4) & uint(0xFFF);

	float TLHeight = (1.0 + float(vertHeights & uint(0x7))) / 8.0;
	float TRHeight = (1.0 + float((vertHeights >> 3) & uint(0x7))) / 8.0;
	float BLHeight = (1.0 + float((vertHeights >> 6) & uint(0x7))) / 8.0;
	float BRHeight = (1.0 + float((vertHeights >> 9) & uint(0x7))) / 8.0;

	vLighting = light;

	int cID = gl_VertexID;

	vec3 pos = aVertex;
	pos = rotateFromDir(dir, pos);

	pos += vec3(float(vertX) + uChunkPos.x, float(vertY), float(vertZ) + uChunkPos.y);

	float[6] heights = float[6](BLHeight, TLHeight, BRHeight, TLHeight, TRHeight, BRHeight);

	float yOff = GetYOffset(dir, heights);

	pos.y = float(vertY - 1u) + yOff;
 
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

	float u = float(col) / float(atlasCols);
	float v = float(row) / float(atlasRows);

	float yScale = 1.0;

	vec2 tileOffset = vec2(u, v);
	vec2 tileScale = vec2(1.0 / float(atlasCols), yScale / float(atlasRows));
	vTextureCoord = tileOffset + (paddingRatio + getFaceUV(cID, dir) * innerRatio) * tileScale;
}