export const MAP_CONFIG = {
  WALLS: [
    // Outer walls
    { x: -1000, y: -1000, width: 2000, height: 20 }, // Top
    { x: -1000, y: 980, width: 2000, height: 20 }, // Bottom
    { x: -1000, y: -1000, width: 20, height: 2000 }, // Left
    { x: 980, y: -1000, width: 20, height: 2000 }, // Right

    // Inner walls (Balanced & Strategic)
    { x: -500, y: -500, width: 150, height: 20 }, // Horizontal - Top Left
    { x: -500, y: -450, width: 20, height: 150 }, // Vertical - Top Left

    { x: 350, y: -500, width: 150, height: 20 }, // Horizontal - Top Right
    { x: 450, y: -450, width: 20, height: 150 }, // Vertical - Top Right

    { x: -500, y: 400, width: 150, height: 20 }, // Horizontal - Bottom Left
    { x: -500, y: 400, width: 20, height: 150 }, // Vertical - Bottom Left

    { x: 400, y: 400, width: 150, height: 20 }, // Horizontal - Bottom Right
    { x: 450, y: 400, width: 20, height: 150 }, // Vertical - Bottom Right

    // Central Structure (Creates a chokepoint)
    { x: -100, y: -100, width: 200, height: 20 }, // Horizontal
    { x: -100, y: -100, width: 20, height: 200 }, // Vertical
    { x: 80, y: -100, width: 20, height: 200 }, // Vertical
    { x: -100, y: 80, width: 200, height: 20 }, // Horizontal
  ],
};
