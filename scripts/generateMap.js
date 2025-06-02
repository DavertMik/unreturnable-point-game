import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname workaround for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAP_SIZE = 200; // Set the map size here (width and depth)

// Paths to your map and bunker files
const mapPath = path.join(__dirname, '../assets/map.json');
const bunkerPath = path.join(__dirname, '../assets/maps/bunker.json');

// Load blockTypes from map.json (or bunker.json, they should match)
const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const blockTypes = mapData.blockTypes;

// Generate 50x50 clay plane (block id 2)
const blocks = {};
const halfSize = Math.floor(MAP_SIZE / 2);
for (let x = -halfSize; x < halfSize; x++) {
  for (let z = -halfSize; z < halfSize; z++) {
    blocks[`${x},0,${z}`] = 2; // 2 = clay
  }
}

// Load bunker blocks
const bunkerData = JSON.parse(fs.readFileSync(bunkerPath, 'utf8'));
const bunkerBlocks = bunkerData.blocks;

// Merge bunker blocks (overwrite clay in the 10x10 area)
Object.assign(blocks, bunkerBlocks);

// Write the merged map back to map.json
const newMap = {
  blockTypes,
  blocks
};

fs.writeFileSync(mapPath, JSON.stringify(newMap, null, 2));
console.log(`Generated ${MAP_SIZE}x${MAP_SIZE} clay wilderness and merged bunker into map.json`); 