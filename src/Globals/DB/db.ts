import { Dexie } from "dexie";

export var db = new Dexie("3d-renderer");

db.version(1).stores({
	chunks: "[chunkX+chunkZ], blocks, solidHeightmap, transparentHeightmap, lightSources",
});
