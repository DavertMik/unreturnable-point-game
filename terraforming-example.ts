import { startServer, World } from 'hytopia';
import { Terraforming } from './terraforming';
import { TerrainManager } from './blockBreaking';
import worldMap from './assets/map.json';

/**
 * Example usage of the Terraforming system
 * This shows how to create multiple independent terraforming instances
 */

export function setupTerraforming(world: World) {
  // Create multiple terraforming instances with different areas
  
  // Terraforming zone 1: Small hills in the northeast
  const terraforming1 = new Terraforming(world, {
    centerX: 30,
    centerZ: 30,
    size: 40,
    targetHeight: 5,
    intervalMs: 8000, // Every 8 seconds
    terraformSize: 8, // 8x8 areas
    blockTypeId: 4 // dirt blocks
  });

  // Terraforming zone 2: Medium hills in the southwest  
  const terraforming2 = new Terraforming(world, {
    centerX: -30,
    centerZ: -30, 
    size: 50,
    targetHeight: 7,
    intervalMs: 12000, // Every 12 seconds
    terraformSize: 12, // 12x12 areas
    blockTypeId: 19 // stone blocks
  });

  // Terraforming zone 3: Large clay formations in the center
  const terraforming3 = new Terraforming(world, {
    centerX: 0,
    centerZ: 0,
    size: 60,
    targetHeight: 4,
    intervalMs: 15000, // Every 15 seconds
    terraformSize: 15, // 15x15 areas
    blockTypeId: 2 // clay blocks
  });

  // Start all terraforming processes
  terraforming1.start();
  terraforming2.start();
  terraforming3.start();

  // Store references for later control
  const terraformingInstances = [terraforming1, terraforming2, terraforming3];

  // Example: Stop terraforming after 5 minutes (optional)
  setTimeout(() => {
    console.log('Stopping all terraforming after 5 minutes');
    terraformingInstances.forEach(instance => instance.stop());
  }, 5 * 60 * 1000);

  // Return instances for external control
  return terraformingInstances;
}

/**
 * Example of dynamically controlling terraforming
 */
export function controlTerraforming(terraformingInstances: Terraforming[]) {
  // Check status of all instances
  terraformingInstances.forEach((instance, index) => {
    const status = instance.getStatus();
    console.log(`Terraforming ${index + 1} status:`, status);
  });

  // Example: Restart a specific terraforming instance
  const firstInstance = terraformingInstances[0];
  if (firstInstance && !firstInstance.getStatus().isActive) {
    console.log('Restarting first terraforming instance');
    firstInstance.start();
  }
}

startServer(world => {
  // Load the world map
  world.loadMap(worldMap);

  // Create a terraforming instance with initial spawn points and spreading mechanics
  const terraforming = new Terraforming(world, {
    centerX: 0,        // Center X coordinate
    centerZ: 0,        // Center Z coordinate  
    size: 100,         // Area size (100x100) - larger area for spreading
    targetHeight: 8,   // Maximum height of terraformed hills
    intervalMs: 5000,  // 5 seconds between terraform steps
    terraformSize: 12, // Size of each terraformed area
    blockTypeId: 2,    // Clay blocks for terraforming
    elevationSpeed: 1, // How fast the elevation spreads
    spawnerBlockId: 19, // Stone block ID for spawners (dragons-stone texture)
    // Define initial spawn points in different zones
    initialSpawnPoints: [
      { x: -20, z: -20 }, // Northwest zone
      { x: 20, z: -20 },  // Northeast zone
      { x: -20, z: 20 },  // Southwest zone
      { x: 20, z: 20 },   // Southeast zone
      { x: 0, z: 0 },     // Center zone
    ],
    spawnerSpreadRadius: 10, // New spawners appear within 10 blocks of existing ones
  });

  // Start terraforming after 3 seconds
  setTimeout(() => {
    terraforming.start();
  }, 3000);

  // Log status every 10 seconds
  setInterval(() => {
    const status = terraforming.getStatus();
    console.log('Terraforming Status:', {
      isActive: status.isActive,
      hasInitialSpawners: status.hasInitialSpawners,
      currentTarget: status.currentTarget,
      spawnersCreated: status.spawnerCount,
      activeSpawners: status.activeSpawnerCount,
      completedTargets: status.completedTargetsCount,
      initialSpawnPoints: status.initialSpawnPoints,
      spawnerSpreadRadius: status.spawnerSpreadRadius,
      spawnerPositions: status.spawnerPositions.map(pos => ({
        x: pos.x,
        y: pos.y,
        z: pos.z
      }))
    });
    
    // Show message about spawner destruction
    if (status.spawnerCount > status.activeSpawnerCount) {
      console.log(`⚠️  ${status.spawnerCount - status.activeSpawnerCount} spawner(s) have been destroyed by players!`);
    }

    // Show spreading information
    if (status.hasInitialSpawners && status.spawnerCount > status.initialSpawnPoints.length) {
      const spreadSpawners = status.spawnerCount - status.initialSpawnPoints.length;
      console.log(`🌱 ${spreadSpawners} spawner(s) have spread from initial points`);
    }
  }, 10000);

  // Stop terraforming after 5 minutes and optionally clear spawners
  setTimeout(() => {
    terraforming.stop();
    
    console.log(`Terraforming completed. Total spawners created: ${terraforming.getSpawnerCount()}`);
    console.log('Final spawner positions:', terraforming.getSpawnerPositions());
    
    // Uncomment the line below if you want to remove all spawners when stopping
    // terraforming.clearAllSpawners();
  }, 300000); // 5 minutes
}); 