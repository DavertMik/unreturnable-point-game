import type { World } from 'hytopia';

interface TerraformingTarget {
  x: number;
  y: number;
  z: number;
  startTime: number; // Track when this target started
}

interface TerraformingOptions {
  centerX: number;
  centerZ: number;
  size: number;
  targetHeight?: number;
  intervalMs?: number;
  terraformSize?: number;
  blockTypeId?: number;
  elevationSpeed?: number; // How fast the elevation spreads outward
}

export class Terraforming {
  private world: World;
  private centerX: number;
  private centerZ: number;
  private size: number;
  private targetHeight: number;
  private intervalMs: number;
  private terraformSize: number;
  private blockTypeId: number;
  private elevationSpeed: number;
  
  private currentTarget: TerraformingTarget | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isActive: boolean = false;

  constructor(world: World, options: TerraformingOptions) {
    this.world = world;
    this.centerX = options.centerX;
    this.centerZ = options.centerZ;
    this.size = options.size;
    this.targetHeight = options.targetHeight ?? 5;
    this.intervalMs = options.intervalMs ?? 10000; // 10 seconds default
    this.terraformSize = options.terraformSize ?? 10; // 10x10 area default
    this.blockTypeId = options.blockTypeId ?? 2; // clay default
    this.elevationSpeed = options.elevationSpeed ?? 0.5; // How fast elevation spreads per step
  }

  /**
   * Start the terraforming process
   */
  start(): void {
    if (this.isActive) {
      console.warn('Terraforming is already active');
      return;
    }

    this.isActive = true;
    this.selectNewTarget();
    
    this.intervalId = setInterval(() => {
      this.terraformStep();
    }, this.intervalMs);

    console.log(`Terraforming started at (${this.centerX}, ${this.centerZ}) with size ${this.size}`);
  }

  /**
   * Stop the terraforming process
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log(`Terraforming stopped at (${this.centerX}, ${this.centerZ})`);
  }

  /**
   * Select a new random target within the terraforming area
   */
  private selectNewTarget(): void {
    const halfSize = Math.floor(this.size / 2);
    const minX = this.centerX - halfSize;
    const maxX = this.centerX + halfSize - 1;
    const minZ = this.centerZ - halfSize;
    const maxZ = this.centerZ + halfSize - 1;

    // Ensure the target is within bounds, accounting for terraform size
    const terraformHalf = Math.floor(this.terraformSize / 2);
    const targetX = Math.floor(Math.random() * (maxX - minX + 1 - this.terraformSize)) + minX + terraformHalf;
    const targetZ = Math.floor(Math.random() * (maxZ - minZ + 1 - this.terraformSize)) + minZ + terraformHalf;

    this.currentTarget = {
      x: targetX,
      y: this.targetHeight,
      z: targetZ,
      startTime: Date.now()
    };

    console.log(`New terraforming target: (${targetX}, ${this.targetHeight}, ${targetZ})`);
  }

  /**
   * Perform one terraforming step with smooth parabolic elevation
   */
  private terraformStep(): void {
    if (!this.currentTarget) {
      this.selectNewTarget();
      return;
    }

    const halfTerraform = Math.floor(this.terraformSize / 2);
    const maxRadius = halfTerraform;
    let blocksModified = 0;
    let targetComplete = true;

    // Calculate how much time has passed since this target started
    const timeElapsed = Date.now() - this.currentTarget.startTime;
    const stepsElapsed = Math.floor(timeElapsed / this.intervalMs);
    
    // Calculate the current "wave radius" - how far out the elevation has spread
    const currentWaveRadius = stepsElapsed * this.elevationSpeed;

    // Terraform blocks in a parabolic pattern
    for (let x = this.currentTarget.x - halfTerraform; x < this.currentTarget.x + halfTerraform; x++) {
      for (let z = this.currentTarget.z - halfTerraform; z < this.currentTarget.z + halfTerraform; z++) {
        // Check if position is within our terraforming area bounds
        if (!this.isWithinBounds(x, z)) {
          continue;
        }

        // Calculate distance from center of target
        const deltaX = x - this.currentTarget.x;
        const deltaZ = z - this.currentTarget.z;
        const distanceFromCenter = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
        
        // Skip blocks that are beyond the current wave radius
        if (distanceFromCenter > currentWaveRadius) {
          targetComplete = false;
          continue;
        }

        // Calculate target height for this position using parabolic formula
        // Height decreases as distance from center increases
        const normalizedDistance = distanceFromCenter / maxRadius; // 0 to 1
        const heightMultiplier = Math.max(0, 1 - (normalizedDistance * normalizedDistance)); // Parabolic curve
        const targetHeightForPosition = Math.floor(this.currentTarget.y * heightMultiplier);
        
        // Only place blocks if target height is at least 1
        if (targetHeightForPosition < 1) {
          continue;
        }

        const currentHeight = this.getCurrentHeight(x, z);
        
        if (currentHeight < targetHeightForPosition) {
          // Place a block one level higher, but don't exceed target height for this position
          const newHeight = Math.min(currentHeight + 1, targetHeightForPosition);
          this.setBlock(x, newHeight, z, this.blockTypeId);
          blocksModified++;
          targetComplete = false;
        }
      }
    }

    console.log(`Terraforming step: ${blocksModified} blocks modified (wave radius: ${currentWaveRadius.toFixed(1)})`);

    // If target is complete (all blocks have reached their target height), select a new one
    if (targetComplete) {
      console.log('Parabolic hill completed, selecting new target');
      this.selectNewTarget();
    }
  }

  /**
   * Check if coordinates are within the terraforming area bounds
   */
  private isWithinBounds(x: number, z: number): boolean {
    const halfSize = Math.floor(this.size / 2);
    const minX = this.centerX - halfSize;
    const maxX = this.centerX + halfSize - 1;
    const minZ = this.centerZ - halfSize;
    const maxZ = this.centerZ + halfSize - 1;

    return x >= minX && x <= maxX && z >= minZ && z <= maxZ;
  }

  /**
   * Get the current height (highest block) at the given x, z coordinates
   */
  private getCurrentHeight(x: number, z: number): number {
    // Start from a reasonable height and work downward to find the highest block
    for (let y = this.targetHeight + 10; y >= 0; y--) {
      if (this.hasBlockAt(x, y, z)) {
        return y;
      }
    }
    return -1; // No blocks found, should place at y=0
  }

  /**
   * Check if there's a block at the given coordinates
   */
  private hasBlockAt(x: number, y: number, z: number): boolean {
    try {
      const blockId = this.world.chunkLattice.getBlockId({ x, y, z });
      return blockId !== 0 && blockId !== null && blockId !== undefined;
    } catch (error) {
      // If getBlockId throws an error, assume no block
      return false;
    }
  }

  /**
   * Set a block at the given coordinates
   */
  private setBlock(x: number, y: number, z: number, blockTypeId: number): void {
    try {
      this.world.chunkLattice.setBlock({ x, y, z }, blockTypeId);
    } catch (error) {
      console.error(`Failed to set block at (${x}, ${y}, ${z}):`, error);
    }
  }

  /**
   * Get current status information
   */
  getStatus(): {
    isActive: boolean;
    centerX: number;
    centerZ: number;
    size: number;
    currentTarget: TerraformingTarget | null;
    elevationSpeed: number;
  } {
    return {
      isActive: this.isActive,
      centerX: this.centerX,
      centerZ: this.centerZ,
      size: this.size,
      currentTarget: this.currentTarget,
      elevationSpeed: this.elevationSpeed
    };
  }
} 