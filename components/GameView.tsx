import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  BuildingType, ChassisType, Entity, EntityType, FactionType, GameState, Projectile, 
  UnitComposition, WeaponType, Zone, TargetType
} from '../types';
import { 
  BUILD_TIME_FRAMES, BUILDINGS_DATA, CHASSIS_STATS, COLORS, FPS, MAP_HEIGHT, MAP_WIDTH, 
  MINING_INTERVAL, MINING_RATE, REPAIR_COST_PER_HP, REPAIR_SPEED, WEAPON_STATS, ZONE_CAPTURE_TIME 
} from '../constants';
import { generateId, getDistance, normalize, isPointInEntity } from '../utils/gameUtils';

interface GameViewProps {
  faction: FactionType;
  onGameOver: (win: boolean) => void;
  uiStateRef: React.MutableRefObject<any>; // To communicate with UI Overlay without re-renders
}

const GameView: React.FC<GameViewProps> = ({ faction, onGameOver, uiStateRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mutable Game State (Refs for performance in game loop)
  const gameStateRef = useRef<GameState>({
    status: 'PLAYING',
    faction: faction,
    money: 600, // Initial money higher to start basic eco
    maxUnits: 5,
    camera: { x: 0, y: 0 }
  });

  const entitiesRef = useRef<Entity[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const zonesRef = useRef<Zone[]>([]);
  const selectionRef = useRef<string[]>([]);
  const rallyModeRef = useRef<boolean>(false); // If true, next click sets rally point
  
  // React State for UI updates (polled or triggered)
  const [refreshKey, setRefreshKey] = useState(0); // Force UI update
  const [modalEntity, setModalEntity] = useState<Entity | null>(null);

  // Initialization
  useEffect(() => {
    // Initial setup
    const initialZones: Zone[] = [
      { id: 'z1', position: { x: 200, y: 200 }, radius: 150, resourcesLeft: 12000, owner: 1, captureProgress: 0, contested: false },
      { id: 'z2', position: { x: MAP_WIDTH - 200, y: MAP_HEIGHT - 200 }, radius: 150, resourcesLeft: 12000, owner: 2, captureProgress: 0, contested: false },
      { id: 'z3', position: { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 }, radius: 150, resourcesLeft: 12000, owner: 0, captureProgress: 0, contested: false },
      { id: 'z4', position: { x: 200, y: MAP_HEIGHT - 200 }, radius: 150, resourcesLeft: 12000, owner: 0, captureProgress: 0, contested: false },
      { id: 'z5', position: { x: MAP_WIDTH - 200, y: 200 }, radius: 150, resourcesLeft: 12000, owner: 0, captureProgress: 0, contested: false },
    ];
    zonesRef.current = initialZones;

    // Initial Buildings
    const startBuildings: Entity[] = [
      // Player Base
      { 
        id: generateId(), type: EntityType.Building, subType: BuildingType.Refinery, owner: 1, 
        position: { x: 250, y: 250 }, health: 150, maxHealth: 150, radius: 40, state: 'idle' 
      },
      // Enemy Base
      { 
        id: generateId(), type: EntityType.Building, subType: BuildingType.Refinery, owner: 2, 
        position: { x: MAP_WIDTH - 250, y: MAP_HEIGHT - 250 }, health: 150, maxHealth: 150, radius: 40, state: 'idle' 
      }
    ];
    entitiesRef.current = startBuildings;

    // Initial Camera
    gameStateRef.current.camera = { x: 0, y: 0 };
    
  }, []);

  // -- Game Loop Logic --

  const update = useCallback(() => {
    const state = gameStateRef.current;
    if (state.status !== 'PLAYING') return;

    // 1. Zone Logic (Mining & Capture)
    zonesRef.current.forEach(zone => {
      const unitsInZone = entitiesRef.current.filter(e => 
        e.type === EntityType.Unit && 
        e.subType !== ChassisType.Aircraft && // Aircraft cannot capture
        getDistance(e.position, zone.position) < zone.radius
      );

      const playerUnits = unitsInZone.filter(u => u.owner === 1).length;
      const enemyUnits = unitsInZone.filter(u => u.owner === 2).length;

      // Capture Logic
      if (playerUnits > 0 && enemyUnits === 0) {
        if (zone.owner !== 1) {
            zone.captureProgress += 1;
            if (zone.captureProgress >= ZONE_CAPTURE_TIME) {
                zone.owner = 1;
                zone.captureProgress = 0;
            }
        }
      } else if (enemyUnits > 0 && playerUnits === 0) {
        if (zone.owner !== 2) {
            zone.captureProgress += 1;
            if (zone.captureProgress >= ZONE_CAPTURE_TIME) {
                zone.owner = 2;
                zone.captureProgress = 0;
            }
        }
      } else {
        zone.captureProgress = Math.max(0, zone.captureProgress - 1);
      }
      
      zone.contested = playerUnits > 0 && enemyUnits > 0;
    });

    // 2. Resource Tick
    // Every ~10 seconds (600 frames)
    if (Date.now() % 1000 < 20) { // Approximate simplistic tick or use frame counter
       // Better to use a frame counter but for this complexity standard loop is okay
    }
    
    // Mining logic tied to frames
    entitiesRef.current.forEach(e => {
        if (e.type === EntityType.Building && e.subType === BuildingType.Refinery && e.state === 'idle') {
            // Find zone
            const zone = zonesRef.current.find(z => getDistance(z.position, e.position) < z.radius);
            if (zone && zone.owner === e.owner && zone.resourcesLeft > 0) {
                if (!e.productionTimer) e.productionTimer = 0;
                e.productionTimer++;
                if (e.productionTimer >= MINING_INTERVAL) {
                    e.productionTimer = 0;
                    zone.resourcesLeft = Math.max(0, zone.resourcesLeft - MINING_RATE);
                    if (e.owner === 1) state.money += MINING_RATE;
                    // AI Money handled abstractly
                }
            }
        }
    });

    // 3. Entity Updates (Movement, Combat, Production)
    entitiesRef.current.forEach(entity => {
      // Construction Logic
      if (entity.isConstructing && entity.constructionProgress !== undefined) {
        entity.constructionProgress += 1 / BUILD_TIME_FRAMES;
        if (entity.constructionProgress >= 1) {
          entity.isConstructing = false;
          entity.state = 'idle';
          entity.health = entity.maxHealth; // Full health on completion
        }
        return; // Can't do anything else while building
      }

      // Unit Production Logic (Factories)
      if (entity.type === EntityType.Building && entity.productionQueue && entity.productionQueue.length > 0) {
         if (!entity.productionTimer) entity.productionTimer = 0;
         entity.productionTimer++;
         // Assume 5 seconds per unit for simplicity or variable
         if (entity.productionTimer >= 300) { 
             const unitSpec = entity.productionQueue[0];
             
             // Check cap
             const currentUnits = entitiesRef.current.filter(u => u.owner === entity.owner && u.type === EntityType.Unit).length;
             const depots = entitiesRef.current.filter(u => u.owner === entity.owner && u.subType === BuildingType.Depot).length;
             const cap = 5 + (depots * 5);
             if (entity.owner === 1) state.maxUnits = cap;

             if (currentUnits < cap) {
                 // Spawn Unit
                 const spawnPos = { x: entity.position.x, y: entity.position.y + 50 };
                 const stats = CHASSIS_STATS[unitSpec.chassis];
                 const weaponStats = WEAPON_STATS[unitSpec.weapon];
                 
                 const newUnit: Entity = {
                     id: generateId(),
                     type: EntityType.Unit,
                     subType: `${unitSpec.weapon}_${unitSpec.chassis}`,
                     owner: entity.owner,
                     position: spawnPos,
                     health: stats.armor, // Base HP from Armor
                     maxHealth: stats.armor,
                     radius: 12,
                     state: 'idle',
                     velocity: { x: 0, y: 0 },
                     weapon: unitSpec.weapon,
                     chassis: unitSpec.chassis,
                     attackDamage: weaponStats.damage, // TODO: Add upgrades
                     attackRange: weaponStats.range,
                     attackSpeed: weaponStats.cooldown,
                     targetType: weaponStats.target,
                     lastAttack: 0
                 };
                 
                 // Rally Point
                 if (entity.rallyPoint) {
                     newUnit.moveTarget = { ...entity.rallyPoint };
                     newUnit.state = 'moving';
                 }

                 entitiesRef.current.push(newUnit);
                 entity.productionQueue.shift();
                 entity.productionTimer = 0;
             }
         }
      }

      if (entity.type === EntityType.Unit) {
        const stats = CHASSIS_STATS[entity.chassis!];
        
        // Movement
        if (entity.moveTarget) {
            const dist = getDistance(entity.position, entity.moveTarget);
            if (dist < 5) {
                entity.moveTarget = null;
                entity.state = 'idle';
            } else {
                const dir = normalize({ x: entity.moveTarget.x - entity.position.x, y: entity.moveTarget.y - entity.position.y });
                entity.position.x += dir.x * stats.speed;
                entity.position.y += dir.y * stats.speed;
                entity.state = 'moving';
            }
        }

        // Auto Attack Logic
        if (!entity.moveTarget) { // Only attack if not forced moving (simplification)
            let potentialTargets = entitiesRef.current.filter(t => t.owner !== entity.owner && t.owner !== 0 && !t.isConstructing);
            
            // Filter by target type
            const wStats = WEAPON_STATS[entity.weapon!];
            if (wStats.target === TargetType.Ground) {
                potentialTargets = potentialTargets.filter(t => t.type === EntityType.Building || (t.type === EntityType.Unit && t.chassis !== ChassisType.Aircraft));
            } else if (wStats.target === TargetType.Air) {
                potentialTargets = potentialTargets.filter(t => t.type === EntityType.Unit && t.chassis === ChassisType.Aircraft);
            }

            // Find closest
            let closest = null;
            let minDist = wStats.range;

            for (const t of potentialTargets) {
                const d = getDistance(entity.position, t.position);
                if (d <= minDist) {
                    minDist = d;
                    closest = t;
                }
            }

            if (closest) {
                // Shoot
                if ((entity.lastAttack || 0) <= 0) {
                     projectilesRef.current.push({
                         id: generateId(),
                         position: { ...entity.position },
                         targetId: closest.id,
                         speed: 10,
                         damage: entity.attackDamage!,
                         type: entity.weapon!
                     });
                     entity.lastAttack = wStats.cooldown;
                }
            }
        }
        if (entity.lastAttack && entity.lastAttack > 0) entity.lastAttack--;
      }
      
      // Turret Logic
      if (entity.subType === BuildingType.Turret && !entity.isConstructing) {
           const range = 150;
           let target = entitiesRef.current.find(t => t.owner !== entity.owner && t.owner !== 0 && getDistance(entity.position, t.position) < range);
           if (target) {
               if (!entity.lastAttack) entity.lastAttack = 0;
               if (entity.lastAttack <= 0) {
                    projectilesRef.current.push({
                         id: generateId(),
                         position: { ...entity.position },
                         targetId: target.id,
                         speed: 12,
                         damage: 10, // Base turret dmg
                         type: WeaponType.Gatling
                     });
                     entity.lastAttack = 20;
               }
           }
           if (entity.lastAttack && entity.lastAttack > 0) entity.lastAttack--;
      }

    });

    // 4. Projectile Updates
    for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
        const proj = projectilesRef.current[i];
        const target = entitiesRef.current.find(e => e.id === proj.targetId);
        
        if (!target) {
            projectilesRef.current.splice(i, 1);
            continue;
        }

        const dist = getDistance(proj.position, target.position);
        if (dist < proj.speed) {
            // Hit
            target.health -= proj.damage;
            projectilesRef.current.splice(i, 1);
        } else {
            const dir = normalize({ x: target.position.x - proj.position.x, y: target.position.y - proj.position.y });
            proj.position.x += dir.x * proj.speed;
            proj.position.y += dir.y * proj.speed;
        }
    }

    // 5. Cleanup Dead Entities
    for (let i = entitiesRef.current.length - 1; i >= 0; i--) {
        if (entitiesRef.current[i].health <= 0) {
             // If selected, deselect
             if (selectionRef.current.includes(entitiesRef.current[i].id)) {
                 selectionRef.current = selectionRef.current.filter(id => id !== entitiesRef.current[i].id);
             }
             // Close modal if dead
             if (modalEntity?.id === entitiesRef.current[i].id) {
                 setModalEntity(null);
             }
             entitiesRef.current.splice(i, 1);
        }
    }
    
    // Check Win/Loss
    const myRefineries = entitiesRef.current.filter(e => e.owner === 1 && e.subType === BuildingType.Refinery).length;
    const enemyRefineries = entitiesRef.current.filter(e => e.owner === 2 && e.subType === BuildingType.Refinery).length;
    
    // Simple Game Over condition: No Refineries left
    if (myRefineries === 0 && entitiesRef.current.filter(e => e.owner === 1).length === 0) onGameOver(false);
    if (enemyRefineries === 0 && entitiesRef.current.filter(e => e.owner === 2).length === 0) onGameOver(true);

    // Sync Ref to UI State for HUD
    uiStateRef.current = {
        money: state.money,
        currentUnits: entitiesRef.current.filter(u => u.owner === 1 && u.type === EntityType.Unit).length,
        maxUnits: state.maxUnits,
        selection: selectionRef.current,
        // Calculate owned buildings for tech tree
        buildings: entitiesRef.current.filter(b => b.owner === 1 && !b.isConstructing).map(b => b.subType)
    };
    
    setRefreshKey(prev => (prev + 1) % 60); // Trigger render roughly every frame or less frequently if optimized
  }, [gameStateRef, entitiesRef, projectilesRef, uiStateRef, onGameOver, modalEntity]);


  // -- Animation Loop --
  useEffect(() => {
    let animationFrameId: number;
    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [update]);


  // -- Input Handlers --

  const handleMouseDown = (e: React.MouseEvent) => {
     if (e.button !== 0) return; // Only left click

     const rect = canvasRef.current!.getBoundingClientRect();
     const x = e.clientX - rect.left + gameStateRef.current.camera.x;
     const y = e.clientY - rect.top + gameStateRef.current.camera.y;
     const worldPos = { x, y };

     // Check UI Click (Rally Point)
     if (rallyModeRef.current) {
        const factoryId = selectionRef.current[0];
        const factory = entitiesRef.current.find(e => e.id === factoryId);
        if (factory) {
            factory.rallyPoint = worldPos;
        }
        rallyModeRef.current = false;
        // Trigger UI update
        return;
     }

     // Select Logic
     const clickedEntity = entitiesRef.current.find(ent => isPointInEntity(worldPos, ent.position, ent.radius + 5));
     
     if (clickedEntity) {
        if (clickedEntity.owner === 1) {
            selectionRef.current = [clickedEntity.id];
            if (clickedEntity.type === EntityType.Building) {
                setModalEntity(clickedEntity);
            } else {
                setModalEntity(null);
            }
        } else {
             selectionRef.current = [];
             setModalEntity(clickedEntity); // Inspect enemy
        }
     } else {
        // Deselect or Box Select start (skipped box select for simplicity/requirement "single/double")
        selectionRef.current = [];
        setModalEntity(null);
     }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
     const rect = canvasRef.current!.getBoundingClientRect();
     const x = e.clientX - rect.left + gameStateRef.current.camera.x;
     const y = e.clientY - rect.top + gameStateRef.current.camera.y;
     const worldPos = { x, y };

     const clickedEntity = entitiesRef.current.find(ent => isPointInEntity(worldPos, ent.position, ent.radius + 5));
     if (clickedEntity && clickedEntity.owner === 1 && clickedEntity.type === EntityType.Unit) {
         // Select all similar units on screen
         const visibleUnits = entitiesRef.current.filter(ent => 
             ent.owner === 1 && 
             ent.subType === clickedEntity.subType &&
             ent.position.x >= gameStateRef.current.camera.x &&
             ent.position.x <= gameStateRef.current.camera.x + canvasRef.current!.width &&
             ent.position.y >= gameStateRef.current.camera.y &&
             ent.position.y <= gameStateRef.current.camera.y + canvasRef.current!.height
         );
         selectionRef.current = visibleUnits.map(u => u.id);
     }
  };

  const handleRightClick = (e: React.MouseEvent) => {
     e.preventDefault();
     const rect = canvasRef.current!.getBoundingClientRect();
     const x = e.clientX - rect.left + gameStateRef.current.camera.x;
     const y = e.clientY - rect.top + gameStateRef.current.camera.y;
     const worldPos = { x, y };

     if (selectionRef.current.length > 0) {
        const targetEntity = entitiesRef.current.find(ent => isPointInEntity(worldPos, ent.position, ent.radius));
        
        entitiesRef.current.forEach(ent => {
            if (selectionRef.current.includes(ent.id) && ent.type === EntityType.Unit) {
                if (targetEntity && targetEntity.owner !== 1) {
                    // Attack
                    // Logic handled in update loop automatically by proximity, 
                    // but we could force a target here if we implemented `targetId`.
                    // For now, move to range.
                    ent.moveTarget = { ...targetEntity.position }; 
                } else {
                    // Move
                    // Slight dispersion
                    const offsetX = (Math.random() - 0.5) * 30;
                    const offsetY = (Math.random() - 0.5) * 30;
                    ent.moveTarget = { x: worldPos.x + offsetX, y: worldPos.y + offsetY };
                    ent.state = 'moving';
                }
            }
        });
     }
  };

  // Camera Pan
  const mousePosRef = useRef({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      // Edge panning logic could go here
      
      // Simple Drag (Middle mouse or check buttons)
      if (e.buttons === 4 || (e.buttons === 1 && e.ctrlKey)) {
          gameStateRef.current.camera.x -= e.movementX;
          gameStateRef.current.camera.y -= e.movementY;
          // Clamp
          gameStateRef.current.camera.x = Math.max(0, Math.min(gameStateRef.current.camera.x, MAP_WIDTH - canvasRef.current!.width));
          gameStateRef.current.camera.y = Math.max(0, Math.min(gameStateRef.current.camera.y, MAP_HEIGHT - canvasRef.current!.height));
      }
  };
  
  // Keyboard Pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const camSpeed = 20;
        if (e.key === 'ArrowLeft') gameStateRef.current.camera.x -= camSpeed;
        if (e.key === 'ArrowRight') gameStateRef.current.camera.x += camSpeed;
        if (e.key === 'ArrowUp') gameStateRef.current.camera.y -= camSpeed;
        if (e.key === 'ArrowDown') gameStateRef.current.camera.y += camSpeed;
        
        gameStateRef.current.camera.x = Math.max(0, Math.min(gameStateRef.current.camera.x, MAP_WIDTH - (canvasRef.current?.width || 800)));
        gameStateRef.current.camera.y = Math.max(0, Math.min(gameStateRef.current.camera.y, MAP_HEIGHT - (canvasRef.current?.height || 600)));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  // -- Render --
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const cam = gameStateRef.current.camera;

    // Clear
    ctx.fillStyle = '#C2B280'; // Sand/Ground color
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    // Draw Map Borders/Background Details
    ctx.fillStyle = '#A09060';
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    // Draw grid
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    for(let i=0; i<MAP_WIDTH; i+=100) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i, MAP_HEIGHT); ctx.stroke(); }
    for(let i=0; i<MAP_HEIGHT; i+=100) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(MAP_WIDTH, i); ctx.stroke(); }


    // Draw Zones
    zonesRef.current.forEach(zone => {
        ctx.beginPath();
        ctx.arc(zone.position.x, zone.position.y, zone.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = zone.owner === 1 ? COLORS[faction] : zone.owner === 2 ? COLORS.ENEMY : '#555';
        ctx.setLineDash([10, 10]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Capture Progress Ring
        if (zone.captureProgress > 0) {
            ctx.beginPath();
            ctx.arc(zone.position.x, zone.position.y, zone.radius + 5, -Math.PI/2, (-Math.PI/2) + (Math.PI * 2 * (zone.captureProgress / ZONE_CAPTURE_TIME)));
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        // Mineral patches visual
        if (zone.resourcesLeft > 0) {
            ctx.fillStyle = '#FFD700'; // Gold
            for(let i=0; i<5; i++) {
                ctx.fillRect(zone.position.x - 20 + i*10, zone.position.y - 10, 6, 6);
            }
            ctx.fillStyle = '#FFF';
            ctx.font = '12px Arial';
            ctx.fillText(`$${zone.resourcesLeft}`, zone.position.x - 20, zone.position.y + 20);
        }
    });

    // Draw Entities
    entitiesRef.current.forEach(ent => {
       const isSelected = selectionRef.current.includes(ent.id);
       
       if (ent.type === EntityType.Building) {
           // Base
           ctx.fillStyle = ent.owner === 1 ? COLORS[faction] : COLORS.ENEMY;
           if (ent.owner === 0) ctx.fillStyle = COLORS.NEUTRAL;
           
           const size = ent.radius * 1.5;
           ctx.fillRect(ent.position.x - size/2, ent.position.y - size/2, size, size);
           
           // Building visual based on type
           ctx.fillStyle = 'rgba(255,255,255,0.3)';
           if (ent.subType === BuildingType.Factory) ctx.fillRect(ent.position.x - 5, ent.position.y - size/2 + 5, 10, size - 10);
           if (ent.subType === BuildingType.Turret) {
               ctx.beginPath(); ctx.arc(ent.position.x, ent.position.y, 10, 0, Math.PI*2); ctx.fillStyle = '#333'; ctx.fill();
               // Barrel
               ctx.strokeStyle = '#333'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(ent.position.x, ent.position.y); ctx.lineTo(ent.position.x + 15, ent.position.y); ctx.stroke();
           }

           // HP Bar
           if (ent.health < ent.maxHealth || isSelected) {
               const hpPct = ent.health / ent.maxHealth;
               ctx.fillStyle = 'red';
               ctx.fillRect(ent.position.x - 20, ent.position.y - size/2 - 10, 40, 5);
               ctx.fillStyle = '#0f0';
               ctx.fillRect(ent.position.x - 20, ent.position.y - size/2 - 10, 40 * hpPct, 5);
           }
           
           // Construction Bar
           if (ent.isConstructing) {
               ctx.fillStyle = 'yellow';
               ctx.fillRect(ent.position.x - 20, ent.position.y, 40 * (ent.constructionProgress || 0), 4);
               ctx.font = '10px Arial';
               ctx.fillStyle = 'white';
               ctx.fillText('Building...', ent.position.x - 20, ent.position.y - 5);
           }

           // Queue visual
           if (ent.productionQueue && ent.productionQueue.length > 0) {
               ctx.fillStyle = 'cyan';
               ctx.beginPath(); ctx.arc(ent.position.x - size/2, ent.position.y - size/2, 5, 0, Math.PI*2); ctx.fill();
               ctx.font = '10px Arial'; ctx.fillText(ent.productionQueue.length.toString(), ent.position.x - size/2 - 5, ent.position.y - size/2 - 5);
           }

           // Rally Point Line
           if (isSelected && ent.rallyPoint) {
               ctx.beginPath();
               ctx.moveTo(ent.position.x, ent.position.y);
               ctx.lineTo(ent.rallyPoint.x, ent.rallyPoint.y);
               ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
               ctx.lineWidth = 1;
               ctx.stroke();
               ctx.fillStyle = 'cyan';
               ctx.fillRect(ent.rallyPoint.x - 2, ent.rallyPoint.y - 2, 4, 4);
           }

       } else {
           // Units
           ctx.save();
           ctx.translate(ent.position.x, ent.position.y);
           // Rotation based on movement or target? 
           // Simple visual for now
           
           // Chassis
           ctx.fillStyle = ent.owner === 1 ? COLORS[faction] : COLORS.ENEMY;
           if (ent.chassis === ChassisType.Wheels) ctx.fillRect(-10, -10, 20, 20);
           else if (ent.chassis === ChassisType.Tracks) ctx.fillRect(-12, -12, 24, 24);
           else if (ent.chassis === ChassisType.Aircraft) {
               ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(10, 10); ctx.lineTo(-10, 10); ctx.fill();
           } else {
               // Specials
               ctx.beginPath(); ctx.arc(0,0, 14, 0, Math.PI*2); ctx.fill();
           }

           // Weapon
           ctx.fillStyle = '#333';
           ctx.beginPath(); ctx.arc(0,0, 5, 0, Math.PI*2); ctx.fill();
           // Barrel
           ctx.fillRect(0, -2, 12, 4);

           // HP Bar
           const hpPct = ent.health / ent.maxHealth;
           ctx.fillStyle = 'red';
           ctx.fillRect(-10, -18, 20, 3);
           ctx.fillStyle = '#0f0';
           ctx.fillRect(-10, -18, 20 * hpPct, 3);

           ctx.restore();
       }

       if (isSelected) {
           ctx.strokeStyle = '#00FF00';
           ctx.lineWidth = 1;
           ctx.beginPath();
           ctx.arc(ent.position.x, ent.position.y, ent.radius + 5, 0, Math.PI * 2);
           ctx.stroke();
       }
    });

    // Draw Projectiles
    projectilesRef.current.forEach(proj => {
        ctx.fillStyle = '#FFFF00';
        if (proj.type === WeaponType.Laser) {
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 2;
            // Draw full beam for instant effect, but here we model projectile for simplicity
            ctx.beginPath(); ctx.arc(proj.position.x, proj.position.y, 2, 0, Math.PI*2); ctx.fill();
        } else if (proj.type === WeaponType.Lightning) {
            ctx.fillStyle = '#00FFFF';
            ctx.beginPath(); ctx.arc(proj.position.x, proj.position.y, 3, 0, Math.PI*2); ctx.fill();
        } else {
            ctx.beginPath(); ctx.arc(proj.position.x, proj.position.y, 2, 0, Math.PI*2); ctx.fill();
        }
    });

    ctx.restore();
  };

  // Exposed Actions for UI
  const buildBuilding = (type: BuildingType) => {
      const state = gameStateRef.current;
      const cost = BUILDINGS_DATA[type].cost;
      
      // Check existing buildings
      const existing = entitiesRef.current.filter(e => e.owner === 1 && e.type === EntityType.Building);
      const req = BUILDINGS_DATA[type].requires;
      if (req && !existing.find(e => e.subType === req && !e.isConstructing)) {
          console.warn("Requirement not met");
          return;
      }

      if (state.money >= cost) {
          state.money -= cost;
          // Place near existing base or selected unit? 
          // For this game style (MechCom), usually fixed slots or placement near base.
          // Let's implement simple "Place near center of camera" or random near base for MVP
          // Better: Click to place mode.
          // FOR MVP: Auto place near first Refinery.
          const base = existing.find(e => e.subType === BuildingType.Refinery) || existing[0];
          if (base) {
              const angle = Math.random() * Math.PI * 2;
              const dist = 80 + Math.random() * 50;
              const pos = { x: base.position.x + Math.cos(angle) * dist, y: base.position.y + Math.sin(angle) * dist };
              
              entitiesRef.current.push({
                  id: generateId(),
                  type: EntityType.Building,
                  subType: type,
                  owner: 1,
                  position: pos,
                  health: 1, // Start at 1
                  maxHealth: BUILDINGS_DATA[type].hp,
                  radius: 30,
                  state: 'building',
                  isConstructing: true,
                  constructionProgress: 0
              });
          }
      }
  };

  const queueUnit = (comp: UnitComposition) => {
      // Find selected factory or first available factory
      let factories = entitiesRef.current.filter(e => e.owner === 1 && e.subType === BuildingType.Factory && !e.isConstructing);
      
      // If factory selected, use that
      if (selectionRef.current.length > 0) {
          const selected = entitiesRef.current.find(e => e.id === selectionRef.current[0]);
          if (selected && selected.subType === BuildingType.Factory) {
              factories = [selected];
          }
      }

      if (factories.length > 0 && gameStateRef.current.money >= comp.cost) {
          gameStateRef.current.money -= comp.cost;
          if (!factories[0].productionQueue) factories[0].productionQueue = [];
          factories[0].productionQueue.push(comp);
      }
  };

  const repairEntity = () => {
      if (!modalEntity) return;
      // Needs gradual repair logic, simple instant for now or abstract
      // Request says: Cost 1 per 1HP, 0.4s.
      // We'll mark it "repairing" in state? For MVP, lets just heal chunks
      // Implementing simplified:
      const missing = modalEntity.maxHealth - modalEntity.health;
      if (missing > 0 && gameStateRef.current.money >= 10) {
          // Heal 10 HP
          const amount = Math.min(missing, 10);
          gameStateRef.current.money -= amount;
          const entity = entitiesRef.current.find(e => e.id === modalEntity.id);
          if (entity) entity.health += amount;
          setModalEntity({...modalEntity, health: modalEntity.health + amount});
      }
  };

  const sellEntity = () => {
      if (!modalEntity) return;
      const entityIdx = entitiesRef.current.findIndex(e => e.id === modalEntity.id);
      if (entityIdx > -1) {
          // Refund 60%
          const typeData = BUILDINGS_DATA[modalEntity.subType as BuildingType];
          if (typeData) {
              gameStateRef.current.money += Math.floor(typeData.cost * 0.6);
          }
          entitiesRef.current.splice(entityIdx, 1);
          setModalEntity(null);
          selectionRef.current = [];
      }
  };

  const setRally = () => {
      if (selectionRef.current.length > 0) {
          rallyModeRef.current = true;
      }
  };

  const clearQueue = () => {
      if (selectionRef.current.length > 0) {
          const ent = entitiesRef.current.find(e => e.id === selectionRef.current[0]);
          if (ent && ent.productionQueue) {
              // Refund
              ent.productionQueue.forEach(u => gameStateRef.current.money += u.cost);
              ent.productionQueue = [];
          }
      }
  };

  // Expose methods to parent/UI via custom event or ref passing is tricky.
  // We passed `uiStateRef` for reading.
  // For writing (actions), we can attach to window or use a context.
  // For this constrained environment, I will attach a listener to a custom event dispatched by UI.
  
  useEffect(() => {
    const handleGameAction = (e: CustomEvent) => {
        const { action, payload } = e.detail;
        if (action === 'BUILD_BUILDING') buildBuilding(payload);
        if (action === 'BUILD_UNIT') queueUnit(payload);
        if (action === 'REPAIR') repairEntity();
        if (action === 'SELL') sellEntity();
        if (action === 'SET_RALLY') setRally();
        if (action === 'CLEAR_QUEUE') clearQueue();
        if (action === 'MINIMAP_CLICK') {
            const {x, y} = payload; // Normalized 0-1
            gameStateRef.current.camera.x = (x * MAP_WIDTH) - (canvasRef.current?.width || 800)/2;
            gameStateRef.current.camera.y = (y * MAP_HEIGHT) - (canvasRef.current?.height || 600)/2;
        }
    };
    window.addEventListener('GAME_ACTION', handleGameAction as EventListener);
    return () => window.removeEventListener('GAME_ACTION', handleGameAction as EventListener);
  }, [modalEntity]); // Re-bind if modalEntity changes to capture closure correctly (not ideal but works for mvp)

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black cursor-crosshair">
       <canvas
         ref={canvasRef}
         width={window.innerWidth}
         height={window.innerHeight}
         onMouseDown={handleMouseDown}
         onMouseMove={handleMouseMove}
         onMouseUp={() => { /* Drag end */ }}
         onDoubleClick={handleDoubleClick}
         onContextMenu={handleRightClick}
         className="block"
       />
       
       {/* Selection/Building Modal (In-world UI) */}
       {modalEntity && modalEntity.type === EntityType.Building && (
         <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 border-2 border-gray-500 text-white p-4 rounded shadow-lg z-10 w-64">
             <div className="flex justify-between items-center mb-2">
                 <h3 className="font-bold text-lg">{modalEntity.subType}</h3>
                 <button onClick={() => setModalEntity(null)} className="text-gray-400 hover:text-white font-bold">X</button>
             </div>
             <div className="mb-4">
                 <div className="text-sm mb-1">HP: {Math.floor(modalEntity.health)} / {modalEntity.maxHealth}</div>
                 <div className="w-full bg-gray-700 h-2">
                     <div className="bg-green-500 h-2" style={{width: `${(modalEntity.health/modalEntity.maxHealth)*100}%`}}></div>
                 </div>
             </div>
             {modalEntity.owner === 1 && (
             <div className="flex gap-2">
                 <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('GAME_ACTION', { detail: { action: 'SELL' }}))}
                    className="flex-1 bg-red-900 hover:bg-red-700 py-1 text-sm border border-red-500">
                    Recycle
                 </button>
                 <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('GAME_ACTION', { detail: { action: 'REPAIR' }}))}
                    className="flex-1 bg-blue-900 hover:bg-blue-700 py-1 text-sm border border-blue-500">
                    Repair
                 </button>
             </div>
             )}
         </div>
       )}
    </div>
  );
};

export default GameView;
