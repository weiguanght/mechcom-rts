import { BuildingType, ChassisType, FactionType, TargetType, TechNode, WeaponType } from "./types";

export const FPS = 60;
export const ZONE_CAPTURE_TIME = 5 * FPS;
export const MINING_RATE = 50; // Gold
export const MINING_INTERVAL = 10 * FPS; // 10 seconds
export const MAX_ZONE_GOLD = 12000;
export const BUILD_TIME_FRAMES = 15 * FPS; // 15 seconds
export const REPAIR_COST_PER_HP = 1;
export const REPAIR_SPEED = 1 / (0.4 * FPS); // HP per frame

export const COLORS = {
  [FactionType.Quadrumm]: '#00A8FF', // Blue
  [FactionType.Trionic]: '#00E676', // Green
  [FactionType.Sphenix]: '#FF3D00', // Red
  NEUTRAL: '#757575',
  ENEMY: '#D32F2F', // Default enemy color (will map to non-player faction)
  UI_BG: 'rgba(30, 30, 30, 0.95)',
  UI_BORDER: '#444'
};

export const BUILDINGS_DATA: Record<BuildingType, TechNode> = {
  [BuildingType.Refinery]: { type: BuildingType.Refinery, name: 'Refinery', cost: 200, hp: 150, requires: null, row: 1 },
  [BuildingType.Factory]: { type: BuildingType.Factory, name: 'Factory', cost: 150, hp: 250, requires: null, row: 1 },
  [BuildingType.Depot]: { type: BuildingType.Depot, name: 'Depot', cost: 100, hp: 100, requires: null, row: 1 },
  [BuildingType.Armory]: { type: BuildingType.Armory, name: 'Armory', cost: 150, hp: 200, requires: null, row: 1 },
  
  [BuildingType.Turret]: { type: BuildingType.Turret, name: 'Turret', cost: 100, hp: 150, requires: BuildingType.Armory, row: 2 },
  [BuildingType.TracksLab]: { type: BuildingType.TracksLab, name: 'Tracks Lab', cost: 200, hp: 200, requires: BuildingType.Factory, row: 2 },
  [BuildingType.CannonLab]: { type: BuildingType.CannonLab, name: 'Cannon Lab', cost: 200, hp: 200, requires: BuildingType.Factory, row: 2 },
  
  [BuildingType.AirLab]: { type: BuildingType.AirLab, name: 'Airport', cost: 250, hp: 250, requires: BuildingType.TracksLab, row: 3 },
  [BuildingType.MechLab]: { type: BuildingType.MechLab, name: 'Mech Lab', cost: 300, hp: 250, requires: BuildingType.TracksLab, row: 3 }, // Special chassis
  [BuildingType.RocketLab]: { type: BuildingType.RocketLab, name: 'Rocket Lab', cost: 250, hp: 250, requires: BuildingType.CannonLab, row: 3 },
  [BuildingType.TechLab]: { type: BuildingType.TechLab, name: 'Tech Lab', cost: 300, hp: 250, requires: BuildingType.CannonLab, row: 3 }, // Special weapon
};

export const WEAPON_STATS = {
  [WeaponType.Gatling]: { damage: 5, target: TargetType.Any, cooldown: 30, range: 150 },
  [WeaponType.Cannon]: { damage: 8, target: TargetType.Ground, cooldown: 60, range: 180 },
  [WeaponType.Rocket]: { damage: 12, target: TargetType.Air, cooldown: 50, range: 220 },
  // Specials
  [WeaponType.Laser]: { damage: 16, target: TargetType.Ground, cooldown: 40, range: 160 },
  [WeaponType.Lightning]: { damage: 20, target: TargetType.Ground, cooldown: 50, range: 140 },
  [WeaponType.Plasma]: { damage: 12, target: TargetType.Ground, cooldown: 25, range: 170 },
};

export const CHASSIS_STATS = {
  [ChassisType.Wheels]: { armor: 50, speed: 2, cost: 50 },
  [ChassisType.Tracks]: { armor: 70, speed: 1.5, cost: 75 },
  [ChassisType.Aircraft]: { armor: 65, speed: 2.5, cost: 100 }, // Flying
  // Specials
  [ChassisType.H_Tracks]: { armor: 120, speed: 1.5, cost: 100 },
  [ChassisType.H_Wheels]: { armor: 80, speed: 2, cost: 100 },
  [ChassisType.Bipedal]: { armor: 100, speed: 1.8, cost: 100 },
};

export const WEAPON_COSTS = {
  basic: 0, // Included in base combinations usually, but logical separation here
  special: 50 // Added to base
};

// Map logical weapon/chassis to build requirements
export const TECH_REQUIREMENTS = {
  weapons: {
    [WeaponType.Gatling]: null,
    [WeaponType.Cannon]: BuildingType.CannonLab,
    [WeaponType.Rocket]: BuildingType.RocketLab,
    [WeaponType.Laser]: BuildingType.TechLab,
    [WeaponType.Lightning]: BuildingType.TechLab,
    [WeaponType.Plasma]: BuildingType.TechLab,
  },
  chassis: {
    [ChassisType.Wheels]: null,
    [ChassisType.Tracks]: BuildingType.TracksLab,
    [ChassisType.Aircraft]: BuildingType.AirLab,
    [ChassisType.H_Tracks]: BuildingType.MechLab,
    [ChassisType.H_Wheels]: BuildingType.MechLab,
    [ChassisType.Bipedal]: BuildingType.MechLab,
  }
};

export const SPECIAL_TECH_MAPPING = {
  [FactionType.Quadrumm]: { weapon: WeaponType.Lightning, chassis: ChassisType.Bipedal },
  [FactionType.Trionic]: { weapon: WeaponType.Plasma, chassis: ChassisType.H_Wheels },
  [FactionType.Sphenix]: { weapon: WeaponType.Laser, chassis: ChassisType.H_Tracks },
};

export const MAP_WIDTH = 2000;
export const MAP_HEIGHT = 1500;
