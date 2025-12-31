use std::collections::VecDeque;

const CHUNK_SIZE: usize = 16 * 16 * 256;

pub struct LightQueue {
	x: i16,
	y: i16,
	z: i16,
	light: u8
}

pub struct Neighbours {
	nx: [u16; (CHUNK_SIZE) as usize],
	px: [u16; (CHUNK_SIZE) as usize],
	nz: [u16; (CHUNK_SIZE) as usize],
	pz: [u16; (CHUNK_SIZE) as usize]
}

const NEIGH: [i16; 18] = [0, 1, 0, 0, -1, 0, -1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -1];

pub fn bfs_light(light_map: &mut [u8], blocks: &[u16], mut queue: VecDeque<LightQueue>, transparent: &[u16]) {
	while queue.len() > 0 {
		let l: LightQueue = queue.pop_front().unwrap();

		if l.light <= 0 {
			continue;
		}

		if l.x < 0 || l.x > 15 {
			continue;
		}
		if l.y < 0 || l.y > 255 {
			continue;
		}
		if l.z < 0 || l.z > 15 {
			continue;
		}

		let idx = (l.x as usize) + (l.z as usize) * 16 + (l.y as usize) * 256;
	
		let data = blocks[idx];
		let block = data & 0xff;

		if !transparent.contains(&block) {
			continue;
		}
	

		let light_level = light_map[idx];

		if light_level >= l.light {
			continue;
		}

		light_map[idx] = l.light;

		for dir in 0..6 {
			let dx = NEIGH[dir * 3];
			let dy = NEIGH[dir * 3 + 1];
			let dz = NEIGH[dir * 3 + 2];

			let nx = l.x + dx;
			let ny = l.y + dy;
			let nz = l.z + dz;

			queue.push_back(LightQueue { x: (nx), y: (ny), z: (nz), light: (l.light - 1) })
		}


	}
}

pub fn do_calculate_light(light_map: &mut [u8], blocks: &[u16], neighbours: &[u16], transparent: &[u16], light_sources: &[u16]) {
	std::panic::set_hook(Box::new(console_error_panic_hook::hook));

	// if neighbours.len() != CHUNK_SIZE * 4 {
	// 	return;
	// }

	if blocks.len() != CHUNK_SIZE {return;}

	if light_map.len() != CHUNK_SIZE {return;}

	let neighbour_light = Neighbours {
		nx: neighbours[0..CHUNK_SIZE].try_into().unwrap(),
		px: neighbours[CHUNK_SIZE..CHUNK_SIZE*2].try_into().unwrap(),
		nz: neighbours[CHUNK_SIZE*2..CHUNK_SIZE*3].try_into().unwrap(),
		pz: neighbours[CHUNK_SIZE*3..CHUNK_SIZE*4].try_into().unwrap()
	};

	let mut queue: VecDeque<LightQueue> = VecDeque::new();

	for x in 0..16 {
		for z in 0..16 {
			let mut is_sky = true;

			for y in (0..256).rev() {
				let idx = (x as usize) + (z as usize) * 16 + (y as usize) * 256;

				let data = blocks[idx];
				let block = data & 0xff;

				if is_sky && transparent.contains(&block) {
					queue.push_back(LightQueue {x: x, y: y, z: z, light: 14})
				}

				if light_sources.contains(&block) {
					queue.push_back(LightQueue { x: x, y: y, z: z, light: 15 });
				}

				if !transparent.contains(&block) {
					if is_sky {
						queue.push_back(LightQueue { x: x, y: y, z: z, light: 15 });
					}

					is_sky = false;
					continue;
				}

				if !is_sky {
					if x == 0 {
						let l = neighbour_light.nx[(15 + z * 16 + y * 256) as usize];

						if l > 0 {
							queue.push_back(LightQueue { x, y, z, light: (l - 1) as u8 })
						}
					} else if x == 15 {
						let l = neighbour_light.px[(z * 16 + y * 256) as usize];

						if l > 0 {
							queue.push_back(LightQueue { x, y, z, light: (l - 1) as u8 })
						}
					}else if z == 0 {
						let l = neighbour_light.nz[(x + 15 * 16 + y * 256) as usize];

						if l > 0 {
							queue.push_back(LightQueue { x, y, z, light: (l - 1) as u8 })
						}
					}else if z == 15 {
						let l = neighbour_light.pz[(x + y * 256) as usize];

						if l > 0 {
							queue.push_back(LightQueue { x, y, z, light: (l - 1) as u8 })
						}
					}
				}
			}
		}
	}

	bfs_light(light_map, blocks, queue, transparent);
}
