import type { World } from 'hytopia';

interface TerraformingTarget {
  x: number;
  y: number;
  z: number;
  startTime: number; // Track when this target started
  spawnerPosition?: { x: number; y: number; z: number }; // Position of spawner block
  isActive: boolean; // Whether this target is still active
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
  spawnerBlockId?: number; // Block ID for the spawner block (dragons-stone)
  initialSpawnPoints?: Array<{ x: number; z: number }>; // Initial spawn points
  spawnerSpreadRadius?: number; // Radius for new spawner placement
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
  private spawnerBlockId: number;
  private initialSpawnPoints: Array<{ x: number; z: number }>;
  private spawnerSpreadRadius: number;
  
  private currentTarget: TerraformingTarget | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isActive: boolean = false;
  private completedTargets: TerraformingTarget[] = []; // Track all targets (active and completed)
  private spawnerPositions: Set<string> = new Set(); // Track spawner block positions
  private hasInitialSpawners: boolean = false; // Track if initial spawners have been created

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
    this.spawnerBlockId = options.spawnerBlockId ?? 19; // stone block ID (dragons-stone texture)
    this.spawnerSpreadRadius = options.spawnerSpreadRadius ?? 10; // 10 blocks radius for new spawners
    
    // Set default initial spawn points if none provided
    this.initialSpawnPoints = options.initialSpawnPoints ?? [
      { x: this.centerX, z: this.centerZ }, // Center point
    ];
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
   * Remove all spawner blocks
   */
  clearAllSpawners(): void {
    this.spawnerPositions.forEach(posKey => {
      const parts = posKey.split(',');
      if (parts.length >= 3) {
        const x = parseInt(parts[0]!, 10);
        const y = parseInt(parts[1]!, 10);
        const z = parseInt(parts[2]!, 10);
        this.setBlock(x, y, z, 0); // Remove spawner block (set to air)
      }
    });
    this.spawnerPositions.clear();
    console.log('All terraforming spawners cleared');
  }

  /**
   * Select a new random target within the terraforming area
   */
  private selectNewTarget(): void {
    // If we don't have initial spawners yet, create them first
    if (!this.hasInitialSpawners) {
      this.createInitialSpawners();
      return;
    }

    // Find a valid position near existing spawners
    const validPosition = this.findValidSpawnerPosition();
    
    if (!validPosition) {
      console.log('No valid position found for new spawner near existing spawners');
      return;
    }

    this.currentTarget = {
      x: validPosition.x,
      y: this.targetHeight,
      z: validPosition.z,
      startTime: Date.now(),
      isActive: true
    };

    // Create spawner block at the new target position
    this.createSpawnerBlock();

    console.log(`New terraforming target: (${validPosition.x}, ${this.targetHeight}, ${validPosition.z})`);
  }

  /**
   * Create initial spawners at predefined points
   */
  private createInitialSpawners(): void {
    console.log('Creating initial spawners...');
    
    for (const spawnPoint of this.initialSpawnPoints) {
      // Check if spawn point is within terraforming bounds
      if (!this.isWithinBounds(spawnPoint.x, spawnPoint.z)) {
        console.warn(`Initial spawn point (${spawnPoint.x}, ${spawnPoint.z}) is outside terraforming bounds`);
        continue;
      }

      // Create target for this initial spawn point
      const target: TerraformingTarget = {
        x: spawnPoint.x,
        y: this.targetHeight,
        z: spawnPoint.z,
        startTime: Date.now(),
        isActive: true
      };

      // Create spawner block
      const targetHeight = this.getCurrentHeight(spawnPoint.x, spawnPoint.z);
      const spawnerY = Math.max(targetHeight + 2, 2);
      
      this.setBlock(spawnPoint.x, spawnerY, spawnPoint.z, this.spawnerBlockId);
      
      // Track spawner position
      const spawnerPosition = { x: spawnPoint.x, y: spawnerY, z: spawnPoint.z };
      const posKey = `${spawnerPosition.x},${spawnerPosition.y},${spawnerPosition.z}`;
      this.spawnerPositions.add(posKey);
      
      target.spawnerPosition = spawnerPosition;
      
      console.log(`Initial spawner created at: (${spawnerPosition.x}, ${spawnerPosition.y}, ${spawnerPosition.z})`);
    }
    
    this.hasInitialSpawners = true;
    
    // Now select the first target from initial spawners
    if (this.initialSpawnPoints.length > 0) {
      const firstSpawn = this.initialSpawnPoints[0];
      if (firstSpawn && this.isWithinBounds(firstSpawn.x, firstSpawn.z)) {
        this.currentTarget = {
          x: firstSpawn.x,
          y: this.targetHeight,
          z: firstSpawn.z,
          startTime: Date.now(),
          isActive: true,
          spawnerPosition: this.findSpawnerPositionAt(firstSpawn.x, firstSpawn.z)
        };
      }
    }
  }

  /**
   * Find a valid position for a new spawner near existing spawners
   */
  private findValidSpawnerPosition(): { x: number; z: number } | null {
    const activeSpawners = this.getActiveSpawnerPositions();
    
    if (activeSpawners.length === 0) {
      console.warn('No active spawners found to spread from');
      return null;
    }

    // Try to find a valid position near each active spawner
    for (let attempts = 0; attempts < 50; attempts++) {
      // Pick a random active spawner to spread from
      const sourceSpawner = activeSpawners[Math.floor(Math.random() * activeSpawners.length)];
      
      if (!sourceSpawner) {
        continue; // Skip if no spawner found
      }
      
      // Generate random position within spread radius
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * this.spawnerSpreadRadius;
      
      const newX = Math.round(sourceSpawner.x + Math.cos(angle) * distance);
      const newZ = Math.round(sourceSpawner.z + Math.sin(angle) * distance);
      
      // Check if position is valid
      if (this.isValidSpawnerPosition(newX, newZ)) {
        return { x: newX, z: newZ };
      }
    }
    
    return null; // No valid position found after all attempts
  }

  /**
   * Check if a position is valid for placing a new spawner
   */
  private isValidSpawnerPosition(x: number, z: number): boolean {
    // Must be within terraforming bounds
    if (!this.isWithinBounds(x, z)) {
      return false;
    }
    
    // Must not already have a spawner nearby (minimum distance of 5 blocks)
    const minDistance = 5;
    const activeSpawners = this.getActiveSpawnerPositions();
    
    for (const spawner of activeSpawners) {
      const distance = Math.sqrt((x - spawner.x) ** 2 + (z - spawner.z) ** 2);
      if (distance < minDistance) {
        return false; // Too close to existing spawner
      }
    }
    
    // Must be within spread radius of at least one existing spawner
    let nearExistingSpawner = false;
    for (const spawner of activeSpawners) {
      const distance = Math.sqrt((x - spawner.x) ** 2 + (z - spawner.z) ** 2);
      if (distance <= this.spawnerSpreadRadius) {
        nearExistingSpawner = true;
        break;
      }
    }
    
    return nearExistingSpawner;
  }

  /**
   * Find spawner position at given coordinates
   */
  private findSpawnerPositionAt(x: number, z: number): { x: number; y: number; z: number } | undefined {
    const activeSpawners = this.getActiveSpawnerPositions();
    return activeSpawners.find(spawner => spawner.x === x && spawner.z === z);
  }

  /**
   * Perform one terraforming step with smooth parabolic elevation
   */
  private terraformStep(): void {
    if (!this.currentTarget) {
      this.selectNewTarget();
      return;
    }

    // Check if current target is still active (spawner not destroyed)
    if (!this.currentTarget.isActive) {
      console.log('Current target is inactive (spawner destroyed), selecting new target');
      this.selectNewTarget();
      return;
    }

    // Check if spawner block still exists
    if (this.currentTarget.spawnerPosition && !this.isSpawnerBlockPresent(this.currentTarget.spawnerPosition)) {
      console.log('Spawner block was destroyed, stopping terraforming for this target');
      this.currentTarget.isActive = false;
      this.onSpawnerDestroyed(this.currentTarget.spawnerPosition);
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
      // Mark current target as completed and add to completed targets
      if (this.currentTarget) {
        this.completedTargets.push(this.currentTarget);
      }
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
   * Create a spawner block at the current target position
   */
  private createSpawnerBlock(): void {
    if (!this.currentTarget) {
      return;
    }

    // Get the height at the target position
    const targetHeight = this.getCurrentHeight(this.currentTarget.x, this.currentTarget.z);
    const spawnerY = Math.max(targetHeight + 2, 2); // Place spawner at least 2 blocks above ground

    // Place spawner block with dragons-stone texture
    this.setBlock(this.currentTarget.x, spawnerY, this.currentTarget.z, this.spawnerBlockId);

    // Track spawner position
    const spawnerPosition = { x: this.currentTarget.x, y: spawnerY, z: this.currentTarget.z };
    const posKey = `${spawnerPosition.x},${spawnerPosition.y},${spawnerPosition.z}`;
    
    this.spawnerPositions.add(posKey);
    
    // Link spawner position to target
    this.currentTarget.spawnerPosition = spawnerPosition;
    this.currentTarget.isActive = true;

    console.log(`Terraforming spawner block created at: (${spawnerPosition.x}, ${spawnerPosition.y}, ${spawnerPosition.z})`);
  }

  /**
   * Check if spawner block is still present at the given position
   */
  private isSpawnerBlockPresent(position: { x: number; y: number; z: number }): boolean {
    try {
      const blockId = this.world.chunkLattice.getBlockId(position);
      return blockId === this.spawnerBlockId;
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle spawner destruction by position
   */
  private onSpawnerDestroyed(position: { x: number; y: number; z: number }): void {
    const posKey = `${position.x},${position.y},${position.z}`;
    
    // Find target associated with this spawner position
    const target = this.findTargetByPosition(position.x, position.y, position.z);
    
    if (target) {
      // Mark target as inactive
      target.isActive = false;
      target.spawnerPosition = undefined;
      
      console.log(`Spawner destroyed at (${position.x}, ${position.y}, ${position.z}) - terraforming stopped for this location`);
      
      // If this was the current target, select a new one
      if (this.currentTarget === target) {
        this.selectNewTarget();
      }
    }

    // Remove from tracking
    this.spawnerPositions.delete(posKey);
  }

  /**
   * Get all spawner positions
   */
  getSpawnerPositions(): Array<{ x: number; y: number; z: number }> {
    return Array.from(this.spawnerPositions).map(posKey => {
      const parts = posKey.split(',');
      const x = parseInt(parts[0]!, 10);
      const y = parseInt(parts[1]!, 10);
      const z = parseInt(parts[2]!, 10);
      return { x, y, z };
    });
  }

  /**
   * Get count of spawners created
   */
  getSpawnerCount(): number {
    return this.spawnerPositions.size;
  }

  /**
   * Get all completed targets
   */
  getCompletedTargets(): TerraformingTarget[] {
    return [...this.completedTargets];
  }

  /**
   * Get active spawner positions (those that still exist)
   */
  getActiveSpawnerPositions(): Array<{ x: number; y: number; z: number }> {
    return this.getSpawnerPositions().filter(pos => {
      // Check if block still exists at this position
      return this.isSpawnerBlockPresent(pos);
    });
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
    spawnerCount: number;
    spawnerPositions: Array<{ x: number; y: number; z: number }>;
    activeSpawnerCount: number;
    completedTargetsCount: number;
    hasInitialSpawners: boolean;
    initialSpawnPoints: Array<{ x: number; z: number }>;
    spawnerSpreadRadius: number;
  } {
    return {
      isActive: this.isActive,
      centerX: this.centerX,
      centerZ: this.centerZ,
      size: this.size,
      currentTarget: this.currentTarget,
      elevationSpeed: this.elevationSpeed,
      spawnerCount: this.getSpawnerCount(),
      spawnerPositions: this.getSpawnerPositions(),
      activeSpawnerCount: this.getActiveSpawnerPositions().length,
      completedTargetsCount: this.completedTargets.length,
      hasInitialSpawners: this.hasInitialSpawners,
      initialSpawnPoints: this.initialSpawnPoints,
      spawnerSpreadRadius: this.spawnerSpreadRadius,
    };
  }

  /**
   * Check if a position is a spawner block
   */
  public isSpawnerBlock(x: number, y: number, z: number): boolean {
    const posKey = `${x},${y},${z}`;
    return this.spawnerPositions.has(posKey);
  }

  /**
   * Find target by spawner position
   */
  private findTargetByPosition(x: number, y: number, z: number): TerraformingTarget | undefined {
    // Check current target
    if (this.currentTarget?.spawnerPosition && 
        this.currentTarget.spawnerPosition.x === x &&
        this.currentTarget.spawnerPosition.y === y &&
        this.currentTarget.spawnerPosition.z === z) {
      return this.currentTarget;
    }
    
    // Check completed targets
    return this.completedTargets.find(target => 
      target.spawnerPosition &&
      target.spawnerPosition.x === x &&
      target.spawnerPosition.y === y &&
      target.spawnerPosition.z === z
    );
  }
} 