import React from 'react';
import { FactionType } from '../types';

interface MainMenuProps {
  onStart: (faction: FactionType) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart }) => {
  return (
    <div className="w-full h-full bg-black text-white flex flex-col items-center justify-center p-8 bg-[url('https://picsum.photos/1920/1080?grayscale&blur=2')] bg-cover">
      <div className="bg-gray-900 bg-opacity-90 p-12 rounded-xl border-4 border-gray-700 shadow-2xl max-w-4xl w-full">
        <h1 className="text-6xl font-bold text-center mb-8 tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-gray-100 to-gray-500">
            MECHWAR STRATEGY
        </h1>
        <p className="text-center text-gray-400 mb-12">Select your Corporation</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FactionCard 
                name="Quadrumm" 
                color="border-blue-500" 
                textColor="text-blue-400"
                desc="Balanced. Masters of Bipedal mechs and Lightning technology." 
                onClick={() => onStart(FactionType.Quadrumm)} 
            />
             <FactionCard 
                name="Trionic" 
                color="border-green-500" 
                textColor="text-green-400"
                desc="Tech focused. Specialists in Plasma weapons and rapid Wheels." 
                onClick={() => onStart(FactionType.Trionic)} 
            />
             <FactionCard 
                name="Sphenix" 
                color="border-red-500" 
                textColor="text-red-400"
                desc="Industrialists. Heavy Armor Tracks and Laser weaponry." 
                onClick={() => onStart(FactionType.Sphenix)} 
            />
        </div>
      </div>
    </div>
  );
};

const FactionCard = ({ name, color, textColor, desc, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`bg-gray-800 border-2 ${color} p-6 rounded hover:bg-gray-700 transition-all transform hover:-translate-y-2 group text-left h-64 flex flex-col`}
    >
        <h2 className={`text-2xl font-bold mb-4 ${textColor} group-hover:text-white`}>{name}</h2>
        <p className="text-gray-400 text-sm flex-1">{desc}</p>
        <div className={`mt-4 py-2 text-center w-full border ${color} ${textColor} text-sm font-bold uppercase`}>
            Select
        </div>
    </button>
);

export default MainMenu;
