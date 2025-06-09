import { Entity, DefaultPlayerEntity, BaseEntityControllerEvent, Player, World } from 'hytopia';

// Singleton TerrainManager for block damage
class TerrainManager {
  static instance = new TerrainManager();
  private _blockDamages = new Map<string, { blockId: number, damage: number }>();

  // Damage a block, break if threshold reached
  public damageBlock(world: World, block: any, damage: number): boolean {
    const key = `${block.globalCoordinate.x},${block.globalCoordinate.y},${block.globalCoordinate.z}`;
    if (Math.abs(block.globalCoordinate.x) <= 2 && Math.abs(block.globalCoordinate.z) <= 2 && block.globalCoordinate.y === 0) {
      // Bunker protection
      return false;
    }
    let tracker = this._blockDamages.get(key);
    if (!tracker) {
      tracker = { blockId: block.blockType.id, damage: 0 };
      this._blockDamages.set(key, tracker);
    }
    tracker.damage += damage;
    const threshold = this.getBreakThreshold(block.blockType.id);
    if (tracker.damage >= threshold) {
      world.chunkLattice.setBlock(block.globalCoordinate, 0); // 0 = air
      this._blockDamages.delete(key);
      // Optionally: play break sound/particles here
      return true;
    }
    // Optionally: show block damage feedback here
    return false;
  }

  private getBreakThreshold(blockId: number): number {
    // Example: stone=25, dirt=10, default=20
    const thresholds: Record<number, number> = { 4: 10, 19: 25, 2: 8, 7: 8, 17: 8, 1: 15, 3: 20 };
    return thresholds[blockId] || 20;
  }
}

// Pickaxe entity (placeholder model: stick.gltf)
export class PickaxeEntity extends Entity {
  public readonly damage: number = 10;
  public readonly range: number = 4;
  private _cooldown: boolean = false;

  constructor(parent: DefaultPlayerEntity) {
    super({
      name: 'Sword',
      modelUri: 'models/items/sword.gltf',
      modelScale: 0.5,
      parent,
      parentNodeName: 'hand_right_anchor',
    });
  }

  public spawnCorrectly(world: World) {
    // Use the exact offset and quaternion as in the example
    this.spawn(
      world,
      { x: 0, y: 0.1, z: 0.1 },
      { x: -Math.PI / 3, y: 0, z: 0, w: 1 }
    );
  }

  // Called when player uses the sword
  public use() {
    if (this._cooldown) return;
    this._cooldown = true;
    setTimeout(() => { this._cooldown = false; }, 500);
    const player = this.parent as DefaultPlayerEntity;
    const world = player.world;
    if (!world) return;
    // Play sword hit animation (if available)
    this.startModelOneshotAnimations(['attack']);
    // Play player sword swing animation
    player.startModelOneshotAnimations(['sword-attack-upper']);
    const origin = player.position;
    const direction = player.player.camera.facingDirection;
    const hit = world.simulation.raycast(origin, direction, this.range, { filterExcludeRigidBody: player.rawRigidBody });
    if (hit?.hitBlock) {
      // Prevent breaking the block the player is standing on
      const standingBlock = {
        x: Math.floor(player.position.x),
        y: Math.floor(player.position.y - 0.1), // slightly below feet
        z: Math.floor(player.position.z)
      };
      const hitBlock = hit.hitBlock.globalCoordinate;
      // Prevent breaking blocks at y <= 0
      if (hitBlock.y <= 0) {
        return;
      }
      if (
        hitBlock.x === standingBlock.x &&
        hitBlock.y === standingBlock.y &&
        hitBlock.z === standingBlock.z
      ) {
        return; // Don't break the block under the player
      }
      // Play sword swing animation again when block is broken
      player.startModelOneshotAnimations(['sword-attack-upper']);
      TerrainManager.instance.damageBlock(world, hit.hitBlock, this.damage);
    }
  }
}

// Attach block breaking to player entity
export function enableBlockBreaking(playerEntity: DefaultPlayerEntity) {
  if (!playerEntity.world || !playerEntity.controller) return;
  const sword = new PickaxeEntity(playerEntity);
  sword.spawnCorrectly(playerEntity.world);
  playerEntity.controller.on(BaseEntityControllerEvent.TICK_WITH_PLAYER_INPUT, ({ input }: { input: any }) => {
    if (input.ml) {
      sword.use();
      input.ml = false;
    }
  });
} 