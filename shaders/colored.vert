#version 300 es


// [COLOR][DIRECTION][CID][POSITION]
// [POSITION] = XXXXYYYYYYYYZZZZ = 16 bits
// CID = 0-7 = 3 bits
// DIRECTION = 0-5 = 3 bits
// COLOR = 0-15 = 4 bits
// TOTAL BITS = 26

// CORNER IDS = [TOP LEFT BACK, TOP RIGHT BACK, TOP LEFT FRONT, TOP RIGHT FRONT,
// 				BOTTOM LEFT BACK, BOTTOM RIGHT BACK, BOTTOM LEFT FRONT, BOTTOM RIGHT FRONT]

// NORMALS = [UP, DOWN, LEFT, RIGHT, FRONT, BACK]

in uvec2 aVertex;

uniform vec2 uChunkPos;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

const vec3 offsets[8] = vec3[](
	vec3(-0.5, 0.5, -0.5),  // 0: TOP LEFT BACK
	vec3(0.5, 0.5, -0.5),   // 1: TOP RIGHT BACK
	vec3(-0.5, 0.5, 0.5),   // 2: TOP LEFT FRONT
	vec3(0.5, 0.5, 0.5),    // 3: TOP RIGHT FRONT
	vec3(-0.5, -0.5, -0.5), // 4: BOTTOM LEFT BACK
	vec3(0.5, -0.5, -0.5),  // 5: BOTTOM RIGHT BACK
	vec3(-0.5, -0.5, 0.5),  // 6: BOTTOM LEFT FRONT
	vec3(0.5, -0.5, 0.5)    // 7: BOTTOM RIGHT FRONT
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

out highp vec3 vColor;

vec3 GetColor(uint c) {
	if (c == 0u) {
		return vec3(0, 0, 0);
	}
	else if (c == 1u) {
		return vec3(255, 0, 0);
	}
	else if (c == 2u) {
		return vec3(0, 255, 0);
	}
	else if (c == 3u) {
		return vec3(0, 0, 255);
	}
	else if (c == 4u) {
		return vec3(255, 255, 255);
	}
	else if (c == 5u) {
		return vec3(255, 255, 0);
	} else if (c == 6u) {
		return vec3(25, 25, 25);
	}

	return vec3(255, 255, 255);
}

void main() {
	uint lowBits = aVertex.y;

	uint vertZ = lowBits & uint(0xF);
	uint vertY = (lowBits >> 4) & uint(0xFF);
	uint vertX = (lowBits >> 12) & uint(0xF);

	uint cID = (lowBits >> 16) & uint(0x7);
	uint dir = (lowBits >> 19) & uint(0x7);
	uint color = (lowBits >> 22) & uint(0xF);

	vec3 pos =  offsets[cID];

	pos += vec3(float(vertX) + uChunkPos.x, float(vertY), float(vertZ) + uChunkPos.y);

	vec4 vertexPos = vec4(pos, 1.0);

	vec4 mvPosition = uModelViewMatrix * vertexPos;
	gl_Position = uProjectionMatrix * mvPosition;

	vColor = GetColor(color);
}