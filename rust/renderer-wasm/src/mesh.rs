const ESTIMATED_MAX_VERTS: usize = 16 * 16 * 256 * 3;

const AIR: u8 = 0;
const WATER: u8 = 4;
const ICE: u8 = 13;

const NEIGH: [i16; 18] = [0, 1, 0, 0, -1, 0, -1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -1];

const CHUNK_SIZE: usize = 16 * 16 * 256;
const IMMEDIATE_SIZE: usize = 16*256;

pub struct Neighbours {
	nx: [u16; (CHUNK_SIZE) as usize],
	px: [u16; (CHUNK_SIZE) as usize],
	nz: [u16; (CHUNK_SIZE) as usize],
	pz: [u16; (CHUNK_SIZE) as usize]
}

pub struct ImmediateNeighbourLight {
	nx: [u8; (IMMEDIATE_SIZE) as usize],
	px: [u8; (IMMEDIATE_SIZE) as usize],
	nz: [u8; (IMMEDIATE_SIZE) as usize],
	pz: [u8; (IMMEDIATE_SIZE) as usize]
}

fn cube(verts: &mut [u32], start_vi: u32, x: usize, y: usize, z: usize, tex_index: u8, culled_faces: i32, biome: u16, light: &[u8; 6], textures: &[u8]) -> u32 {
	if x > 15 {
		return 0;
	}
	if z > 15 {
		return 0;
	}
	if y > 255 {
		return 0;
	}

	let postition = (x << 12) | (y << 4) | z;

	let mut v = 0;

	for dir in 0..6 {
		if ((culled_faces >> dir) & 0b1) == 0 {
			continue;
		}

		let vert: u32 = (biome as u32) << 25 | (textures[(tex_index * 6 + dir) as usize] as u32) << 19 | (dir as u32) << 16 | (postition as u32);
		let upper: u32 = light[dir as usize] as u32;

		verts[(start_vi + v) as usize] = upper;
		verts[(start_vi + v + 1) as usize] = vert;
		v += 2;
	}

	return v;
}

pub fn do_mesh_gen(blocks: &mut [u16], light_map: &[u8], neighbour_blocks: &[u16], immediate_neighbour_light_map: &[u8], textures: &[u8], transparent_blocks: &[u8], verts: &mut [u32], water_verts: &mut [u32], vi: &mut [u32]) {
	if verts.len() != ESTIMATED_MAX_VERTS {
		return;
	}

	if water_verts.len() != ESTIMATED_MAX_VERTS / 6 {
		return;
	}

	if neighbour_blocks.len() != CHUNK_SIZE * 4 {
		return;
	}

	if immediate_neighbour_light_map.len() != IMMEDIATE_SIZE * 4 {
		return;
	}

	if blocks.len() != CHUNK_SIZE {
		return;
	}
	std::panic::set_hook(Box::new(console_error_panic_hook::hook));

	let mut x = 0;
	let mut y = 0;
	let mut z = 0;

	let mut first = true;

	let neighbours = Neighbours {
		nx: neighbour_blocks[0..CHUNK_SIZE].try_into().unwrap(),
		px: neighbour_blocks[CHUNK_SIZE..CHUNK_SIZE*2].try_into().unwrap(),
		nz: neighbour_blocks[CHUNK_SIZE*2..CHUNK_SIZE*3].try_into().unwrap(),
		pz: neighbour_blocks[CHUNK_SIZE*3..CHUNK_SIZE*4].try_into().unwrap()
	};

	let immediate_light = ImmediateNeighbourLight {
		nx: immediate_neighbour_light_map[0..IMMEDIATE_SIZE].try_into().unwrap(),
		px: immediate_neighbour_light_map[IMMEDIATE_SIZE..IMMEDIATE_SIZE*2].try_into().unwrap(),
		nz: immediate_neighbour_light_map[IMMEDIATE_SIZE*2..IMMEDIATE_SIZE*3].try_into().unwrap(),
		pz: immediate_neighbour_light_map[IMMEDIATE_SIZE*3..IMMEDIATE_SIZE*4].try_into().unwrap(),
	};

	for i in 0..blocks.len() {
		let block = blocks[i];

		if !first {
			x += 1;
		} else {
			first = false;
		}
		
		if x == 16 {
			x = 0;
			z += 1;
		}

		if z == 16 {
			z = 0;
			y += 1;
		}

		let b = (block & 0xff) as u8;

		if b == AIR {
			continue;
		}

		if b == WATER {
			let above = (blocks[x + z * 16 + (y + 1) * 256] & 0xff) as u8;

			if above != WATER && above != ICE {
				// TODO implement water mesh gen
				vi[1] += 1;
			}

			continue;
		}

		let biome = block >> 8;
		let mut culled = 0b111111;
		let mut light_levels = [0, 0, 0, 0, 0, 0];

		let is_transparent = transparent_blocks[b as usize] == 1;

		if is_transparent {
			light_levels.fill(light_map[x + z * 16 + y * 256]);
		} else {
			for dir in 0..6 {
				let dx = NEIGH[dir * 3];
				let dy = NEIGH[dir * 3 + 1];
				let dz = NEIGH[dir * 3 + 2];

				let nx = (x as i16) + dx;
				let ny = (y as i16) + dy;
				let nz = (z as i16) + dz;

				let nb;
				let mut light = 0;

				if ny < 0 || ny >= 256 {
					nb = AIR;
				} else if nx < 0 {
					let ix = 15 + (nz as usize) * 16 + (ny as usize) * 256;
					
					nb = (neighbours.px[ix] & 0xff) as u8;
					
					let nix = (nz as usize)  + (ny as usize) * 256;
					if transparent_blocks[(nb & 0xf) as usize] == 1 && nix < immediate_light.px.len() {
						light = immediate_light.px[nix];
					}
				} else if nx >= 16 {
					let ix = (nz as usize) * 16 + (ny as usize) * 256;
					let nix = (nz as usize)  + (ny as usize) * 256;

					nb = (neighbours.nx[ix] & 0xff) as u8;

					if transparent_blocks[(nb & 0xf) as usize] == 1 && nix < immediate_light.nx.len() {
						light = immediate_light.nx[nix];
					}
				} else if nz < 0 {
					let ix = (nx as usize) + 15 * 16 + (ny as usize) * 256;
					let nix = (nx as usize)  + (ny as usize) * 256;

					nb = (neighbours.nz[ix] & 0xff) as u8;

					if transparent_blocks[(nb & 0xf) as usize] == 1 && nix < immediate_light.nz.len() {
						light = immediate_light.nz[nix];
					}
				} else if nz >= 16 {
					let ix = (nx as usize) + (ny as usize) * 256;
					let nix = (nx as usize)  + (ny as usize) * 256;

					nb = (neighbours.pz[ix] & 0xff) as u8;

					if transparent_blocks[(nb & 0xf) as usize] == 1 && nix < immediate_light.pz.len() {
						light = immediate_light.pz[nix];
					}
				} else {
					let ix = (nx as usize) + (nz as usize) * 16 + (ny as usize) * 256;

					nb = (blocks[ix] & 0xff) as u8;

					if transparent_blocks[(nb & 0xf) as usize] == 1 {
						light = light_map[ix];
					}
				}

				light_levels[dir] = light;
	
				if transparent_blocks[(nb & 0xf) as usize] == 0 {
					culled &= !(1 << dir);
				}
			}
		}

		if b == ICE {
			vi[1] += cube(water_verts, vi[1], x, y, z, b, culled, biome, &light_levels, textures);
		} else {
			vi[0] += cube(verts, vi[0], x, y, z, b, culled, biome, &light_levels, textures);
		}
	}
}