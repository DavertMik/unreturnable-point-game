import { Terraforming } from './terraforming';
import type { World } from 'hytopia';

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