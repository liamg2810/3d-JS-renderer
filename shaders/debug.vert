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

in vec3 aVertex;
in vec3 aColor;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

out highp vec3 vColor;

void main() {
	vec4 mvPosition = uModelViewMatrix * vec4(aVertex, 1.0);
	gl_Position = uProjectionMatrix * mvPosition;

	vColor = aColor;
}