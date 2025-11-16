from PIL import Image

TILE_SIZE = 16
BORDER = 1

src = Image.open("dev_textures.png")
src_w, src_h = src.size

tiles_x = src_w // TILE_SIZE
tiles_y = src_h // TILE_SIZE

new_tile = TILE_SIZE + BORDER * 2

dst = Image.new("RGBA", (tiles_x * new_tile, tiles_y * new_tile))

for ty in range(tiles_y):
    for tx in range(tiles_x):
        x0 = tx * TILE_SIZE
        y0 = ty * TILE_SIZE
        tile = src.crop((x0, y0, x0 + TILE_SIZE, y0 + TILE_SIZE))

        padded = Image.new("RGBA", (new_tile, new_tile))
        padded.paste(tile, (BORDER, BORDER))

        # Top
        padded.paste(tile.crop((0, 0, TILE_SIZE, 1)), (BORDER, 0))
        # Bottom
        padded.paste(tile.crop((0, TILE_SIZE - 1, TILE_SIZE, TILE_SIZE)), (BORDER, BORDER + TILE_SIZE))
        # Left
        padded.paste(tile.crop((0, 0, 1, TILE_SIZE)), (0, BORDER))
        # Right
        padded.paste(tile.crop((TILE_SIZE - 1, 0, TILE_SIZE, TILE_SIZE)), (BORDER + TILE_SIZE, BORDER))

        # Corners
        c_tl = tile.getpixel((0, 0))
        if c_tl is None:
            c_tl = (0, 0, 0, 0)
        c_tr = tile.getpixel((TILE_SIZE - 1, 0))
        if c_tr is None:
            c_tr = (0, 0, 0, 0)
        c_bl = tile.getpixel((0, TILE_SIZE - 1))
        if c_bl is None:
            c_bl = (0, 0, 0, 0)
        c_br = tile.getpixel((TILE_SIZE - 1, TILE_SIZE - 1))
        if c_br is None:
            c_br = (0, 0, 0, 0)
        padded.putpixel((0, 0), c_tl)
        padded.putpixel((BORDER + TILE_SIZE, 0), c_tr)
        padded.putpixel((0, BORDER + TILE_SIZE), c_bl)
        padded.putpixel((BORDER + TILE_SIZE, BORDER + TILE_SIZE), c_br)

        dst_x = tx * new_tile
        dst_y = ty * new_tile
        dst.paste(padded, (dst_x, dst_y))

dst.save("textures.png")
