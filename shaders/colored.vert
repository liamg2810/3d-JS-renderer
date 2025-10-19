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

in uint aVertex;

uniform vec2 uChunkPos;
uniform mat4 uNormalMatrix;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

const vec3 offsets[8] = vec3[](vec3(-0.5,0.5,-0.5), vec3(0.5,0.5,-0.5), vec3(-0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5),
	vec3(-0.5,-0.5,-0.5), vec3(0.5,-0.5,-0.5), vec3(-0.5, -0.5, 0.5), vec3(0.5, -0.5, 0.5));

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
out highp vec3 vLighting;

vec3 GetColor(uint c) {
	if (c == 0u) {
		return vec3(0, 0, 0);
	}
	else if (c == 1u) {
		return vec3(255, 0, 0);
	}

	return vec3(255, 255, 255);
}

void main() {
	uint vertZ = aVertex & uint(0xF);
	uint vertY = (aVertex >> 4) & uint(0xFF);
	uint vertX = (aVertex >> 12) & uint(0xF);

	uint cID = (aVertex >> 16) & uint(0x7);
	uint dir = (aVertex >> 19) & uint(0x7);
	uint color = (aVertex >> 22) & uint(0xF);

	vec3 pos = vec3(float(vertX) + uChunkPos.x, float(vertY), float(vertZ) + uChunkPos.y);

	vec4 vertexPos = vec4(pos, 1.0);

	vec4 mvPosition = uModelViewMatrix * vertexPos;
	gl_Position = uProjectionMatrix * mvPosition;

	vColor = GetColor(color);

	vec3 normal = normals[dir];

	highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
	highp vec3 directionalLightColor = vec3(1, 1, 1);
	highp vec3 directionalVector = normalize(vec3(100, 100, 100));

	highp vec4 transformedNormal = uNormalMatrix * vec4(normal, 1.0);

	highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
	vLighting = ambientLight + (directionalLightColor * directional);
}