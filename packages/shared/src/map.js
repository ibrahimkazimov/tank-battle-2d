export const MAP_CONFIG = {
  WALLS: [
    // Outer walls
    { x: -1000, y: -1000, width: 2000, height: 20 }, // Top
    { x: -1000, y: 980, width: 2000, height: 20 }, // Bottom
    { x: -1000, y: -1000, width: 20, height: 2000 }, // Left
    { x: 980, y: -1000, width: 20, height: 2000 }, // Right

    // === CORNER FORTIFICATIONS (Asymmetric for variety) ===

    // Top-Left: Bunker style (good defensive spawn)
    { x: -700, y: -700, width: 250, height: 20 },
    { x: -700, y: -680, width: 20, height: 180 },
    { x: -680, y: -520, width: 180, height: 20 },
    { x: -520, y: -680, width: 20, height: 180 },

    // Top-Right: Open corner with long wall (mobility focus)
    { x: 450, y: -700, width: 250, height: 20 },
    { x: 680, y: -680, width: 20, height: 300 },
    { x: 500, y: -500, width: 180, height: 20 },

    // Bottom-Left: Maze-like (tactical complexity)
    { x: -700, y: 680, width: 180, height: 20 },
    { x: -700, y: 500, width: 20, height: 200 },
    { x: -600, y: 550, width: 120, height: 20 },
    { x: -500, y: 600, width: 20, height: 100 },
    { x: -680, y: 600, width: 100, height: 20 },

    // Bottom-Right: L-shape with extension (sniper position)
    { x: 500, y: 680, width: 200, height: 20 },
    { x: 680, y: 500, width: 20, height: 200 },
    { x: 550, y: 550, width: 130, height: 20 },

    // === MID-FIELD COVER (Creates lanes and tactical positions) ===

    // Upper mid-field
    { x: -300, y: -400, width: 150, height: 20 },
    { x: -200, y: -380, width: 20, height: 100 },

    { x: 150, y: -400, width: 150, height: 20 },
    { x: 250, y: -380, width: 20, height: 100 },

    // Middle horizontal lanes (flanking routes)
    { x: -600, y: -50, width: 180, height: 20 },
    { x: 420, y: -50, width: 180, height: 20 },

    { x: -600, y: 30, width: 180, height: 20 },
    { x: 420, y: 30, width: 180, height: 20 },

    // Lower mid-field
    { x: -300, y: 280, width: 150, height: 20 },
    { x: -200, y: 200, width: 20, height: 100 },

    { x: 150, y: 280, width: 150, height: 20 },
    { x: 250, y: 200, width: 20, height: 100 },

    // === CENTER STRUCTURE (Larger, multi-room design) ===

    // Outer walls of center fortress
    { x: -180, y: -180, width: 360, height: 20 }, // Top
    { x: -180, y: 160, width: 360, height: 20 }, // Bottom
    { x: -180, y: -180, width: 20, height: 360 }, // Left
    { x: 160, y: -180, width: 20, height: 360 }, // Right

    // Inner divisions (creates rooms and corridors)
    { x: -180, y: -10, width: 140, height: 20 }, // Left chamber divider
    { x: 40, y: -10, width: 140, height: 20 }, // Right chamber divider
    { x: -10, y: -180, width: 20, height: 140 }, // Top chamber divider
    { x: -10, y: 40, width: 20, height: 140 }, // Bottom chamber divider

    // Entrance gaps (4 main entrances + 4 small gaps in center)
    // The gaps are implicit - no walls blocking these areas

    // === DIAGONAL COVER PIECES (Adds variety to movement) ===

    // These create diagonal corridors
    { x: -450, y: 150, width: 100, height: 20 },
    { x: -370, y: 150, width: 20, height: 80 },

    { x: 350, y: 150, width: 100, height: 20 },
    { x: 430, y: 150, width: 20, height: 80 },

    { x: -450, y: -230, width: 100, height: 20 },
    { x: -370, y: -230, width: 20, height: 80 },

    { x: 350, y: -230, width: 100, height: 20 },
    { x: 430, y: -230, width: 20, height: 80 },

    // === POWER-UP POSITIONS (Strategic single walls) ===
    // Small isolated walls where power-ups could spawn

    { x: -800, y: -10, width: 60, height: 20 }, // Left edge
    { x: 740, y: -10, width: 60, height: 20 }, // Right edge
    { x: -10, y: -800, width: 20, height: 60 }, // Top edge
    { x: -10, y: 740, width: 20, height: 60 }, // Bottom edge
  ],
};
