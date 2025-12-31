mod lighting;
use lighting::do_calculate_light;

mod mesh;
use mesh::do_mesh_gen;

use wasm_bindgen::{prelude::*};

#[wasm_bindgen]
pub fn calculate_light(light_map: &mut [u8], blocks: &[u16], neighbours: &[u16], transparent: &[u16], light_sources: &[u16]) {
	do_calculate_light(light_map, blocks, neighbours, transparent, light_sources)
}

#[wasm_bindgen]
pub fn mesh_gen(blocks: &mut [u16], light_map: &[u8], neighbour_blocks: &[u16], immediate_neighbour_light_map: &[u8], textures: &[u8], transparent_blocks: &[u8], verts: &mut [u32], water_verts: &mut [u32], vi: &mut [u32]) {
	do_mesh_gen(blocks, light_map, neighbour_blocks, immediate_neighbour_light_map, textures, transparent_blocks, verts, water_verts, vi)
}
