/**
 * HYTOPIA SDK Boilerplate
 * 
 * This is a simple boilerplate to get started on your project.
 * It implements the bare minimum to be able to run and connect
 * to your game server and run around as the basic player entity.
 * 
 * From here you can begin to implement your own game logic
 * or do whatever you want!
 * 
 * You can find documentation here: https://github.com/hytopiagg/sdk/blob/main/docs/server.md
 * 
 * For more in-depth examples, check out the examples folder in the SDK, or you
 * can find it directly on GitHub: https://github.com/hytopiagg/sdk/tree/main/examples/payload-game
 * 
 * You can officially report bugs or request features here: https://github.com/hytopiagg/sdk/issues
 * 
 * To get help, have found a bug, or want to chat with
 * other HYTOPIA devs, join our Discord server:
 * https://discord.gg/DXCXJbHSJX
 * 
 * Official SDK Github repo: https://github.com/hytopiagg/sdk
 * Official SDK NPM Package: https://www.npmjs.com/package/hytopia
 */

import {
  startServer,
  Audio,
  DefaultPlayerEntity,
  PlayerEvent,
} from 'hytopia';

import worldMap from './assets/map.json';
import { Terraforming } from './terraforming';
import { enableBlockBreaking } from './blockBreaking';

/**
 * startServer is always the entry point for our game.
 * It accepts a single function where we should do any
 * setup necessary for our game. The init function is
 * passed a World instance which is the default
 * world created by the game server on startup.
 * 
 * Documentation: https://github.com/hytopiagg/sdk/blob/main/docs/server.startserver.md
 */

startServer(world => {
  /**
   * Enable debug rendering of the physics simulation.
   * This will overlay lines in-game representing colliders,
   * rigid bodies, and raycasts. This is useful for debugging
   * physics-related issues in a development environment.
   * Enabling this can cause performance issues, which will
   * be noticed as dropped frame rates and higher RTT times.
   * It is intended for development environments only and
   * debugging physics.
   */
  
  // world.simulation.enableDebugRendering(true);

  /**
   * Load our map.
   * You can build your own map using https://build.hytopia.com
   * After building, hit export and drop the .json file in
   * the assets folder as map.json.
   */
  world.loadMap(worldMap);

  /**
   * Setup multiple terraforming systems across the map
   * Creates 5 terraforming zones with random sizes and positions
   * Each zone will create different types of terrain features
   */
  
  // Terraforming Zone 1: Northeast Hills (Stone)
  const terraforming1 = new Terraforming(world, {
    centerX: 60,
    centerZ: 60,
    size: 25,
    targetHeight: 4,
    intervalMs: 2500,
    terraformSize: 12,
    blockTypeId: 19, // stone blocks
    elevationSpeed: 0.8
  });

  // Terraforming Zone 2: Southwest Clay Formations
  const terraforming2 = new Terraforming(world, {
    centerX: -70,
    centerZ: -50,
    size: 18,
    targetHeight: 6,
    intervalMs: 4000,
    terraformSize: 10,
    blockTypeId: 2, // clay blocks
    elevationSpeed: 1.5
  });

  // Terraforming Zone 3: Northwest Dirt Mounds
  const terraforming3 = new Terraforming(world, {
    centerX: -40,
    centerZ: 80,
    size: 30,
    targetHeight: 3,
    intervalMs: 3500,
    terraformSize: 8,
    blockTypeId: 4, // dirt blocks
    elevationSpeed: 1.0
  });

  // Terraforming Zone 4: Southeast Sand Dunes
  const terraforming4 = new Terraforming(world, {
    centerX: 85,
    centerZ: -65,
    size: 22,
    targetHeight: 5,
    intervalMs: 3000,
    terraformSize: 14,
    blockTypeId: 17, // sand blocks
    elevationSpeed: 1.3
  });

  // Terraforming Zone 5: Central Mixed Terrain
  const terraforming5 = new Terraforming(world, {
    centerX: 10,
    centerZ: -10,
    size: 35,
    targetHeight: 7,
    intervalMs: 4500,
    terraformSize: 16,
    blockTypeId: 7, // grass blocks
    elevationSpeed: 0.9
  });

  // Store all terraforming instances for easy management
  const allTerraforming = [terraforming1, terraforming2, terraforming3, terraforming4, terraforming5];
  
  // Start all terraforming processes
  allTerraforming.forEach((terraform, index) => {
    terraform.start();
    console.log(`Started terraforming zone ${index + 1}`);
  });

  // Log status of all terraforming zones every 45 seconds
  setInterval(() => {
    console.log('\n=== Terraforming Status Report ===');
    allTerraforming.forEach((terraform, index) => {
      const status = terraform.getStatus();
      console.log(`Zone ${index + 1}: Active=${status.isActive}, Center=(${status.centerX},${status.centerZ}), Size=${status.size}`);
    });
  }, 45000);

  /**
   * Handle player joining the game. The PlayerEvent.JOINED_WORLD
   * event is emitted to the world when a new player connects to
   * the game. From here, we create a basic player
   * entity instance which automatically handles mapping
   * their inputs to control their in-game entity and
   * internally uses our player entity controller.
   * 
   * The HYTOPIA SDK is heavily driven by events, you
   * can find documentation on how the event system works,
   * here: https://dev.hytopia.com/sdk-guides/events
   */
  world.on(PlayerEvent.JOINED_WORLD, ({ player }) => {
    const playerEntity = new DefaultPlayerEntity({
      player,
      name: 'Player',
    });
  
    playerEntity.spawn(world, { x: 0, y: 10, z: 0 });

    // Set camera for over-the-shoulder view
    player.camera.setOffset({ x: 0, y: 1, z: 0 });
    player.camera.setForwardOffset(0.3);
    player.camera.setFilmOffset(0.5);

    // Enable block breaking with a stick for this player
    enableBlockBreaking(playerEntity);

    // Load our game UI for this player
    player.ui.load('ui/index.html');

    // Send a nice welcome message that only the player who joined will see ;)
    world.chatManager.sendPlayerMessage(player, 'Welcome to the game!', '00FF00');
    world.chatManager.sendPlayerMessage(player, 'Use WASD to move around.');
    world.chatManager.sendPlayerMessage(player, 'Press space to jump.');
    world.chatManager.sendPlayerMessage(player, 'Hold shift to sprint.');
    world.chatManager.sendPlayerMessage(player, 'Press \\ to enter or exit debug view.');
    world.chatManager.sendPlayerMessage(player, 'Left click to break blocks with your stick!', 'FFFF00');
    world.chatManager.sendPlayerMessage(player, '🏔️ 5 terraforming zones are active across the map!', 'FFFF00');
    world.chatManager.sendPlayerMessage(player, 'Zone 1: Stone Hills (60,60) | Zone 2: Clay (−70,−50)', '00FFFF');
    world.chatManager.sendPlayerMessage(player, 'Zone 3: Dirt (−40,80) | Zone 4: Sand (85,−65) | Zone 5: Grass (10,−10)', '00FFFF');
  });

  /**
   * Handle player leaving the game. The PlayerEvent.LEFT_WORLD
   * event is emitted to the world when a player leaves the game.
   * Because HYTOPIA is not opinionated on join and
   * leave game logic, we are responsible for cleaning
   * up the player and any entities associated with them
   * after they leave. We can easily do this by 
   * getting all the known PlayerEntity instances for
   * the player who left by using our world's EntityManager
   * instance.
   * 
   * The HYTOPIA SDK is heavily driven by events, you
   * can find documentation on how the event system works,
   * here: https://dev.hytopia.com/sdk-guides/events
   */
  world.on(PlayerEvent.LEFT_WORLD, ({ player }) => {
    world.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => entity.despawn());
  });

  /**
   * A silly little easter egg command. When a player types
   * "/rocket" in the game, they'll get launched into the air!
   */
  world.chatManager.registerCommand('/rocket', player => {
    world.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => {
      entity.applyImpulse({ x: 0, y: 20, z: 0 });
    });
  });

  /**
   * Terraforming control commands
   */
  world.chatManager.registerCommand('/terraform_stop', player => {
    allTerraforming.forEach(terraform => terraform.stop());
    world.chatManager.sendPlayerMessage(player, 'All terraforming zones stopped!', 'FF0000');
  });

  world.chatManager.registerCommand('/terraform_start', player => {
    allTerraforming.forEach(terraform => terraform.start());
    world.chatManager.sendPlayerMessage(player, 'All terraforming zones started!', '00FF00');
  });

  world.chatManager.registerCommand('/terraform_status', player => {
    world.chatManager.sendPlayerMessage(player, '=== Terraforming Status ===', 'FFFF00');
    allTerraforming.forEach((terraform, index) => {
      const status = terraform.getStatus();
      const zoneNames = ['Stone Hills', 'Clay Formations', 'Dirt Mounds', 'Sand Dunes', 'Grass Terrain'];
      world.chatManager.sendPlayerMessage(player, 
        `Zone ${index + 1} (${zoneNames[index]}): ${status.isActive ? '✅ Active' : '❌ Stopped'} at (${status.centerX},${status.centerZ})`, 
        status.isActive ? '00FF00' : 'FF0000'
      );
    });
  });

  // Individual zone control commands
  world.chatManager.registerCommand('/zone1_toggle', player => {
    const status = terraforming1.getStatus();
    if (status.isActive) {
      terraforming1.stop();
      world.chatManager.sendPlayerMessage(player, 'Zone 1 (Stone Hills) stopped!', 'FF0000');
    } else {
      terraforming1.start();
      world.chatManager.sendPlayerMessage(player, 'Zone 1 (Stone Hills) started!', '00FF00');
    }
  });

  world.chatManager.registerCommand('/zone2_toggle', player => {
    const status = terraforming2.getStatus();
    if (status.isActive) {
      terraforming2.stop();
      world.chatManager.sendPlayerMessage(player, 'Zone 2 (Clay Formations) stopped!', 'FF0000');
    } else {
      terraforming2.start();
      world.chatManager.sendPlayerMessage(player, 'Zone 2 (Clay Formations) started!', '00FF00');
    }
  });

  world.chatManager.registerCommand('/zone3_toggle', player => {
    const status = terraforming3.getStatus();
    if (status.isActive) {
      terraforming3.stop();
      world.chatManager.sendPlayerMessage(player, 'Zone 3 (Dirt Mounds) stopped!', 'FF0000');
    } else {
      terraforming3.start();
      world.chatManager.sendPlayerMessage(player, 'Zone 3 (Dirt Mounds) started!', '00FF00');
    }
  });

  world.chatManager.registerCommand('/zone4_toggle', player => {
    const status = terraforming4.getStatus();
    if (status.isActive) {
      terraforming4.stop();
      world.chatManager.sendPlayerMessage(player, 'Zone 4 (Sand Dunes) stopped!', 'FF0000');
    } else {
      terraforming4.start();
      world.chatManager.sendPlayerMessage(player, 'Zone 4 (Sand Dunes) started!', '00FF00');
    }
  });

  world.chatManager.registerCommand('/zone5_toggle', player => {
    const status = terraforming5.getStatus();
    if (status.isActive) {
      terraforming5.stop();
      world.chatManager.sendPlayerMessage(player, 'Zone 5 (Grass Terrain) stopped!', 'FF0000');
    } else {
      terraforming5.start();
      world.chatManager.sendPlayerMessage(player, 'Zone 5 (Grass Terrain) started!', '00FF00');
    }
  });

  /**
   * Play some peaceful ambient music to
   * set the mood!
   */
  
  new Audio({
    uri: 'audio/music/hytopia-main.mp3',
    loop: true,
    volume: 0.1,
  }).play(world);
});
