export enum FactionType {
  Quadrumm = 'Quadrumm', // Blue, Balanced, Legs, Lightning
  Trionic = 'Trionic',   // Green, Tech, Wheels, Plasma
  Sphenix = 'Sphenix',   // Red, Mining, Tracks, Laser
}

export enum EntityType {
  Unit = 'Unit',
  Building = 'Building',
  Resource = 'Resource'
}

export enum BuildingType {
  Refinery = 'Refinery',
  Factory = 'Factory',
  Depot = 'Depot',
  Armory = 'Armory',
  Turret = 'Turret',
  TracksLab = 'TracksLab',
  CannonLab = 'CannonLab',
  AirLab = 'AirLab',
  MechLab = 'MechLab',     // Special Chassis Lab
  RocketLab = 'RocketLab',
  TechLab = 'TechLab',     // Special Weapon Lab (Lightning/Laser/Plasma)
}

export enum WeaponType {
  Gatling = 'Gatling',
  Cannon = 'Cannon',
  Rocket = 'Rocket',
  Laser = 'Laser',
  Lightning = 'Lightning',
  Plasma = 'Plasma'
}

export enum ChassisType {
  Wheels = 'Wheels',
  Tracks = 'Tracks',
  Aircraft = 'Aircraft',
  Bipedal = 'Bipedal',
  H_Tracks = 'H_Tracks',
  H_Wheels = 'H_Wheels'
}

export enum TargetType {
  Any = 'Any',
  Ground = 'Gnd',
  Air = 'Air'
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  subType: string; // BuildingType | UnitComposition
  owner: number; // 0 = Neutral, 1 = Player, 2 = Enemy
  position: Vector2;
  health: number;
  maxHealth: number;
  radius: number;
  targetId?: string | null;
  state: 'idle' | 'moving' | 'attacking' | 'building' | 'mining';
  // Unit specific
  velocity?: Vector2;
  moveTarget?: Vector2 | null;
  weapon?: WeaponType;
  chassis?: ChassisType;
  attackRange?: number;
  attackDamage?: number;
  attackSpeed?: number; // cooldown in frames
  lastAttack?: number;
  targetType?: TargetType;
  // Building specific
  constructionProgress?: number; // 0 to 1
  isConstructing?: boolean;
  productionQueue?: UnitComposition[];
  productionTimer?: number;
  rallyPoint?: Vector2 | null;
}

export interface UnitComposition {
  weapon: WeaponType;
  chassis: ChassisType;
  cost: number;
  name?: string;
}

export interface Zone {
  id: string;
  position: Vector2;
  radius: number;
  resourcesLeft: number;
  owner: number;
  captureProgress: number; // 0 to 5 seconds (roughly 300 frames)
  contested: boolean;
}

export interface Projectile {
  id: string;
  position: Vector2;
  targetId: string;
  speed: number;
  damage: number;
  type: WeaponType;
}

export interface GameState {
  status: 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
  faction: FactionType;
  money: number;
  maxUnits: number;
  camera: Vector2;
}

export interface TechNode {
  type: BuildingType;
  name: string;
  cost: number;
  hp: number;
  requires: BuildingType | null; // Simple dependency
  row: number; // For UI visualization
}

export interface UpgradeState {
  damageLevel: number;
  armorLevel: number;
}
