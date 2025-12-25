# 3D Voxel Terrain Renderer

A WebGL2-based voxel terrain renderer built with vanilla JavaScript. Explore infinite procedurally generated worlds with multiple biomes, caves, and dynamic terrain.

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
2. Start a local web server (e.g., `python -m http.server 8000`)
3. Open `http://localhost:8000` in your browser

**Note**: Requires a modern browser with WebGL2 support.

## 🎮 Controls

| Key         | Action                           |
| ----------- | -------------------------------- |
| **W/A/S/D** | Move forward/left/backward/right |
| **Mouse**   | Look around (click canvas first) |
| **Shift**   | Sprint (increased speed + FOV)   |
| **F**       | Remove targeted block            |
| **Alt + G** | Toggle chunk borders (debug)     |
| **ESC**     | Release pointer lock             |

### Debug Overlays

-   **Heightmap**: Toggle heightmap visualization
-   **Temperature**: Display temperature map overlay
-   **Humidity**: Display humidity map overlay

## 📂 Project Structure

```
├── Chunks/              # Chunk loading and management
├── Globals/             # Game constants and configuration
├── Noise/               # Procedural generation algorithms
├── Player/              # Player movement and camera
├── RendererThreeD/      # WebGL rendering and shaders
├── shaders/             # GLSL shader files
└── worker/              # Web workers for terrain generation
```

## 🎨 Customization

Edit [Globals/Constants.js](Globals/Constants.js) to customize biomes, blocks, terrain parameters, and world generation settings.

## 🐛 Known Issues

-   Occasional z-fighting on chunk borders
-   Some chunks refuse to generate

## 🙏 Acknowledgments

Built with WebGL2, vanilla JavaScript, and [gl-matrix](https://glmatrix.net/). Inspired by Minecraft and voxel-based games.

---

**Made with ❤️ and WebGL**
