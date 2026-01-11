# 3D Voxel Terrain Renderer

A WebGL2-based voxel terrain renderer built with JS/TS + Svelte for UI. Explore infinite procedurally generated worlds with multiple biomes, caves, and dynamic terrain.

![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow) ![WebGL](https://img.shields.io/badge/WebGL-2.0-red) ![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

-   🌍 **Infinite procedurally generated worlds** with six distinct biomes (Plains, Desert, Mountains, Grasslands, Taiga, Ocean)
-   🏔️ **Cave systems** with natural underground networks
-   🌳 **Natural terrain features** including trees, flowers, and ore deposits
-   💧 **Animated water** with transparency effects
-   ☁️ **Dynamic clouds** and atmospheric effects
-   🎮 **First-person controls** with flight mode, sprinting, and block interaction
-   📊 **Debug overlays** for heightmap, temperature, and humidity visualization

## 🚀 Getting Started

1. Clone the repository and navigate to the folder
2. Run `npm install` in the terminal
3. Run `npm run dev` and navigate to http://localhost:5173

**Note**: Requires a modern browser with WebGL2 support.

## 🎮 Controls

| Key         | Action                           |
| ----------- | -------------------------------- |
| **W/A/S/D** | Move forward/left/backward/right |
| **Mouse**   | Look around (click canvas first) |
| **Shift**   | Sprint (increased speed + FOV)   |
| **LMB**     | Remove targeted block            |
| **RMB**     | Place selected block             |
| **Scroll**  | Change selected block            |
| **Alt + G** | Toggle chunk borders (debug)     |
| **ESC / P** | Pause game & release pointer     |

## 🐛 Known Issues

-   Game freezes when rapidly increasing render distance

## 🙏 Acknowledgments

Built with WebGL2, JS/TS + Svelte for UI, and [gl-matrix](https://glmatrix.net/). Inspired by Minecraft and voxel-based games.

---

**Made with ❤️ and WebGL**

---

### Boring disclamer:

This project uses assets from the [Minecraft Bedrock Samples](https://github.com/Mojang/bedrock-samples) repository.
Not an official Minecraft product. Not endorsed by Mojang or Microsoft.
