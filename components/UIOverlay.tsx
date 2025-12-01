import React, { useEffect, useState } from 'react';
import { BuildingType, ChassisType, FactionType, UnitComposition, WeaponType } from '../types';
import { BUILDINGS_DATA, CHASSIS_STATS, SPECIAL_TECH_MAPPING, TECH_REQUIREMENTS, WEAPON_COSTS, WEAPON_STATS } from '../constants';
import { Hammer, Users, ArrowUpCircle, Play, Pause, X } from 'lucide-react';

interface UIOverlayProps {
  faction: FactionType;
  uiStateRef: React.MutableRefObject<any>;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ faction, uiStateRef }) => {
  const [uiState, setUiState] = useState(uiStateRef.current);
  const [activeMenu, setActiveMenu] = useState<'BUILD' | 'UNITS' | 'UPGRADE' | 'QUEUE' | null>(null);
  
  // Unit Designer State
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>(WeaponType.Gatling);
  const [selectedChassis, setSelectedChassis] = useState<ChassisType>(ChassisType.Wheels);

  useEffect(() => {
    const interval = setInterval(() => {
      setUiState({ ...uiStateRef.current });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const dispatch = (action: string, payload?: any) => {
    window.dispatchEvent(new CustomEvent('GAME_ACTION', { detail: { action, payload } }));
  };

  // Helper to check building requirements
  const canBuild = (bType: BuildingType) => {
    const req = BUILDINGS_DATA[bType].requires;
    if (!req) return true;
    return uiState.buildings && uiState.buildings.includes(req);
  };

  // Helper to check unit part requirements
  const isPartUnlocked = (type: 'weapon' | 'chassis', key: string) => {
      if (key === WeaponType.Gatling || key === ChassisType.Wheels) return uiState.buildings.includes(BuildingType.Factory);
      
      const req = TECH_REQUIREMENTS[type === 'weapon' ? 'weapons' : 'chassis'][key];
      if (!req) return true; // Basic
      return uiState.buildings && uiState.buildings.includes(req);
  };

  // Filter parts for faction
  const availableWeapons = Object.values(WeaponType).filter(w => {
      const special = SPECIAL_TECH_MAPPING[faction].weapon;
      // If it's a special weapon, only show if it matches faction
      if ([WeaponType.Lightning, WeaponType.Laser, WeaponType.Plasma].includes(w)) {
          return w === special;
      }
      return true;
  });

  const availableChassis = Object.values(ChassisType).filter(c => {
      const special = SPECIAL_TECH_MAPPING[faction].chassis;
      if ([ChassisType.H_Tracks, ChassisType.H_Wheels, ChassisType.Bipedal].includes(c)) {
          return c === special;
      }
      return true;
  });

  const currentUnitCost = (CHASSIS_STATS[selectedChassis]?.cost || 0) + (selectedWeapon === WeaponType.Gatling ? 0 : 25) + (['Laser', 'Lightning', 'Plasma'].includes(selectedWeapon) ? 50 : 0); // Simplified cost logic from prompt

  const renderModal = () => {
    if (!activeMenu) return null;

    return (
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
        <div className="bg-gray-900 border-2 border-cyan-500 p-1 pointer-events-auto shadow-2xl w-[600px] max-w-full">
            {/* Header */}
            <div className="bg-gray-800 p-2 flex justify-between items-center border-b border-gray-700">
                <h2 className="text-cyan-400 font-bold text-xl uppercase tracking-widest">
                    {activeMenu === 'BUILD' ? 'Construction' : activeMenu === 'UNITS' ? 'Unit Constructor' : activeMenu}
                </h2>
                <button onClick={() => setActiveMenu(null)} className="text-red-500 hover:text-red-400"><X /></button>
            </div>

            {/* Content */}
            <div className="p-4 bg-opacity-90 bg-gray-900 min-h-[300px]">
                
                {/* BUILDING MENU */}
                {activeMenu === 'BUILD' && (
                    <div className="flex flex-col gap-4">
                        {/* Row 1 */}
                        <div className="flex gap-4 justify-center">
                            {[BuildingType.Refinery, BuildingType.Factory, BuildingType.Depot, BuildingType.Armory].map(b => (
                                <BuildBtn key={b} type={b} canBuild={true} money={uiState.money} onClick={() => dispatch('BUILD_BUILDING', b)} />
                            ))}
                        </div>
                        {/* Row 2 (Branches) */}
                        <div className="flex gap-4 justify-center">
                            <div className="border-l-2 border-gray-600 pl-4 flex gap-2">
                                <BuildBtn type={BuildingType.TracksLab} canBuild={canBuild(BuildingType.TracksLab)} money={uiState.money} onClick={() => dispatch('BUILD_BUILDING', BuildingType.TracksLab)} />
                                <BuildBtn type={BuildingType.CannonLab} canBuild={canBuild(BuildingType.CannonLab)} money={uiState.money} onClick={() => dispatch('BUILD_BUILDING', BuildingType.CannonLab)} />
                            </div>
                            <div className="border-l-2 border-gray-600 pl-4">
                                <BuildBtn type={BuildingType.Turret} canBuild={canBuild(BuildingType.Turret)} money={uiState.money} onClick={() => dispatch('BUILD_BUILDING', BuildingType.Turret)} />
                            </div>
                        </div>
                         {/* Row 3 (Adv Branches) */}
                         <div className="flex gap-4 justify-center">
                            <div className="flex gap-2">
                                <BuildBtn type={BuildingType.AirLab} canBuild={canBuild(BuildingType.AirLab)} money={uiState.money} onClick={() => dispatch('BUILD_BUILDING', BuildingType.AirLab)} />
                                <BuildBtn type={BuildingType.MechLab} canBuild={canBuild(BuildingType.MechLab)} money={uiState.money} onClick={() => dispatch('BUILD_BUILDING', BuildingType.MechLab)} />
                            </div>
                            <div className="flex gap-2 ml-8">
                                <BuildBtn type={BuildingType.RocketLab} canBuild={canBuild(BuildingType.RocketLab)} money={uiState.money} onClick={() => dispatch('BUILD_BUILDING', BuildingType.RocketLab)} />
                                <BuildBtn type={BuildingType.TechLab} canBuild={canBuild(BuildingType.TechLab)} money={uiState.money} onClick={() => dispatch('BUILD_BUILDING', BuildingType.TechLab)} />
                            </div>
                        </div>
                    </div>
                )}

                {/* UNIT CONSTRUCTOR */}
                {activeMenu === 'UNITS' && (
                    <div className="flex h-full">
                        {/* Left Controls */}
                        <div className="w-2/3 pr-4 border-r border-gray-700 flex flex-col justify-between h-[300px]">
                            {/* Weapons Top */}
                            <div className="flex justify-between gap-1">
                                {availableWeapons.slice(0, 4).map(w => (
                                    <PartBtn key={w} active={selectedWeapon === w} locked={!isPartUnlocked('weapon', w)} label={w} onClick={() => isPartUnlocked('weapon', w) && setSelectedWeapon(w)} />
                                ))}
                            </div>
                            
                            {/* Visual Center */}
                            <div className="flex-1 flex items-center justify-center bg-gray-800 my-2 border border-gray-700 relative overflow-hidden">
                                <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 opacity-10 pointer-events-none">
                                    {Array.from({length: 144}).map((_, i) => <div key={i} className="border border-cyan-500"></div>)}
                                </div>
                                <div className="text-center">
                                    <div className="text-6xl mb-2">🤖</div>
                                    <div className="text-cyan-300 font-mono text-sm">{selectedWeapon} + {selectedChassis}</div>
                                </div>
                            </div>

                            {/* Chassis Bottom */}
                            <div className="flex justify-between gap-1">
                                {availableChassis.map(c => (
                                    <PartBtn key={c} active={selectedChassis === c} locked={!isPartUnlocked('chassis', c)} label={c} onClick={() => isPartUnlocked('chassis', c) && setSelectedChassis(c)} />
                                ))}
                            </div>
                        </div>

                        {/* Right Stats & Build */}
                        <div className="w-1/3 pl-4 flex flex-col justify-between">
                             <div className="space-y-2 text-sm font-mono text-gray-300">
                                 <div className="flex justify-between border-b border-gray-600"><span>Dmg:</span> <span className="text-white">{WEAPON_STATS[selectedWeapon].damage}</span></div>
                                 <div className="flex justify-between border-b border-gray-600"><span>Rng:</span> <span className="text-white">{WEAPON_STATS[selectedWeapon].range}</span></div>
                                 <div className="flex justify-between border-b border-gray-600"><span>Tgt:</span> <span className="text-white">{WEAPON_STATS[selectedWeapon].target}</span></div>
                                 <div className="flex justify-between border-b border-gray-600"><span>Arm:</span> <span className="text-white">{CHASSIS_STATS[selectedChassis].armor}</span></div>
                                 <div className="flex justify-between border-b border-gray-600"><span>Spd:</span> <span className="text-white">{CHASSIS_STATS[selectedChassis].speed}</span></div>
                             </div>

                             <button 
                                onClick={() => dispatch('BUILD_UNIT', { weapon: selectedWeapon, chassis: selectedChassis, cost: currentUnitCost })}
                                className="w-full bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-4 text-xl border-2 border-cyan-400 mt-4 flex flex-col items-center">
                                 <span>BUILD</span>
                                 <span className="text-sm font-normal text-yellow-300">${currentUnitCost}</span>
                             </button>
                        </div>
                    </div>
                )}
                
                {activeMenu === 'QUEUE' && (
                    <div className="text-center text-white">
                        <p>Unit Production Queue</p>
                        <button onClick={() => dispatch('SET_RALLY')} className="bg-blue-600 px-4 py-2 mt-4 rounded">Set Rally Point</button>
                        <button onClick={() => dispatch('CLEAR_QUEUE')} onContextMenu={(e) => { e.preventDefault(); dispatch('CLEAR_QUEUE')}} className="bg-red-600 px-4 py-2 mt-4 ml-4 rounded">Clear Queue (Hold)</button>
                        <div className="text-xs text-gray-400 mt-2">Select a factory first to set rally point.</div>
                    </div>
                )}

                 {activeMenu === 'UPGRADE' && (
                    <div className="text-center text-white">
                        <p className="mb-4">Armory Upgrades</p>
                        {/* Placeholder for upgrades logic */}
                        <div className="grid grid-cols-2 gap-4">
                            <button className="bg-gray-700 p-4 border border-gray-500 opacity-50 cursor-not-allowed">Damage Lvl 1 ($100)</button>
                            <button className="bg-gray-700 p-4 border border-gray-500 opacity-50 cursor-not-allowed">Armor Lvl 1 ($100)</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
        {/* Top Bar */}
        <div className="h-12 bg-gray-900 bg-opacity-90 border-b border-gray-600 flex justify-between items-center px-4 pointer-events-auto">
             <div className="text-yellow-400 font-mono font-bold text-xl">${Math.floor(uiState.money)}</div>
             <div className="text-white font-mono text-lg">{uiState.currentUnits} / {uiState.maxUnits}</div>
        </div>

        {/* Minimap (Right Top) */}
        <div className="absolute top-14 right-2 w-48 h-48 bg-black border-2 border-gray-500 pointer-events-auto overflow-hidden">
             {/* Simplified Minimap visual - in a real app this would canvas render too */}
             <div 
                className="w-full h-full relative cursor-pointer opacity-80 hover:opacity-100"
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width;
                    const y = (e.clientY - rect.top) / rect.height;
                    dispatch('MINIMAP_CLICK', {x, y});
                }}
             >
                 <div className="absolute inset-0 bg-gray-800"></div>
                 {/* Mock dots for zones */}
                 <div className="absolute top-[13%] left-[13%] w-2 h-2 bg-yellow-500 rounded-full"></div>
                 <div className="absolute bottom-[13%] right-[13%] w-2 h-2 bg-yellow-500 rounded-full"></div>
                 <div className="absolute top-[50%] left-[50%] w-2 h-2 bg-yellow-500 rounded-full"></div>
             </div>
        </div>

        {/* Sidebar Left Controls */}
        <div className="absolute left-0 top-1/4 flex flex-col gap-2 p-2 pointer-events-auto">
            <SideBtn icon={<Pause size={24} />} onClick={() => {}} />
            <SideBtn icon={<Play size={24} />} text={uiState.selection.length > 0 ? "1" : ""} onClick={() => setActiveMenu('QUEUE')} />
            <SideBtn icon={<ArrowUpCircle size={24} />} onClick={() => setActiveMenu('UPGRADE')} />
            <SideBtn icon={<Users size={24} />} onClick={() => setActiveMenu('UNITS')} />
        </div>

        {/* Bottom Right Building */}
        <div className="absolute right-4 bottom-4 pointer-events-auto">
            <button 
                onClick={() => setActiveMenu('BUILD')}
                className="w-16 h-16 bg-cyan-900 border-2 border-cyan-400 text-cyan-400 flex items-center justify-center hover:bg-cyan-800 rounded-lg shadow-lg">
                <Hammer size={32} />
            </button>
        </div>

        {renderModal()}
    </div>
  );
};

// Sub-components for clean UI code
const SideBtn = ({ icon, text, onClick }: any) => (
    <button onClick={onClick} className="w-12 h-12 bg-gray-800 border border-cyan-600 text-cyan-500 flex items-center justify-center hover:bg-gray-700 relative">
        {icon}
        {text && <span className="absolute bottom-0 right-0 text-xs text-white bg-red-600 px-1">{text}</span>}
    </button>
);

const BuildBtn = ({ type, canBuild, money, onClick }: any) => {
    const data = BUILDINGS_DATA[type];
    const afford = money >= data.cost;
    return (
        <button 
            disabled={!canBuild || !afford}
            onClick={onClick}
            className={`w-24 h-24 flex flex-col items-center justify-center border-2 p-1 relative
            ${!canBuild ? 'bg-gray-900 border-gray-700 text-gray-600 grayscale' : 
               !afford ? 'bg-gray-800 border-red-500 text-red-400' : 'bg-gray-800 border-cyan-500 text-cyan-400 hover:bg-gray-700'}
            `}>
            <div className="text-2xl mb-1">🏭</div>
            <div className="text-[10px] text-center leading-tight h-8 flex items-center">{data.name}</div>
            <div className="text-xs font-bold text-yellow-400">${data.cost}</div>
        </button>
    );
};

const PartBtn = ({ label, active, locked, onClick }: any) => (
    <button 
        disabled={locked}
        onClick={onClick}
        className={`flex-1 py-2 text-xs border text-center transition-colors uppercase
        ${active ? 'bg-cyan-600 text-white border-cyan-400' : 'bg-gray-800 text-gray-400 border-gray-600'}
        ${locked ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-700'}
        `}>
        {label.replace('H_', '')}
    </button>
);

export default UIOverlay;
