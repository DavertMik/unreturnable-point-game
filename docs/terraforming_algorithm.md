# Wilderness Terraforming Algorithm

## Overview
Terraforming in the wilderness is an automated, real-time process that gradually transforms the terrain by raising blocks in sections toward randomly chosen target points above the ground. The wilderness area is now 200x200 blocks, centered at (0,0,0), and made of clay blocks at y=0.

## Algorithm Steps

1. **Initialization**
   - Define the wilderness area as a 200x200 grid, centered at (0,0,0), at y=0.
   - All blocks start as clay at y=0.

2. **Target Point Selection**
   - Randomly select a target point within the wilderness bounds.
   - The target point should be 5 blocks above the current ground level (i.e., y=5).
   - Example: (x, y=5, z), where x and z are random integers in [-100, 99].

3. **Terraforming Step**
   - Every 10 seconds, perform the following:
     - Define a 10x10 area centered below the target point (i.e., from x-5 to x+4, z-5 to z+4).
     - For each (x, z) in this area, check the current highest block at (x, z).
     - If the current height is less than the target y (5), place a clay block at the next y level up (current y + 1).
     - Repeat for all positions in the 10x10 area.

4. **Completion Check**
   - If all blocks in the 10x10 area have reached the target y (5), consider this target complete.
   - Select a new random target point and repeat the process.

5. **Continuous Operation**
   - The process runs indefinitely, always working toward a new target after the previous one is finished.

## Pseudocode
```js
// Pseudocode for terraforming step
function terraformStep() {
  if (currentTarget == null || targetReached(currentTarget)) {
    currentTarget = pickRandomTarget();
  }
  for (let x = currentTarget.x - 5; x < currentTarget.x + 5; x++) {
    for (let z = currentTarget.z - 5; z < currentTarget.z + 5; z++) {
      let currentY = getCurrentHeight(x, z);
      if (currentY < currentTarget.y) {
        setBlock(x, currentY + 1, z, 'clay');
      }
    }
  }
}
// Call terraformStep() every 10 seconds
```

## Notes
- The algorithm can be adjusted to use different block types or heights as needed.
- Care should be taken to avoid modifying the bunker area if it overlaps with the wilderness.
- The process can be visualized as the wilderness "growing" upward in patches, always toward a new random point. 