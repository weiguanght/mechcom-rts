import React, { useRef, useState } from 'react';
import GameView from './components/GameView';
import UIOverlay from './components/UIOverlay';
import MainMenu from './components/MainMenu';
import { FactionType } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'GAMEOVER'>('MENU');
  const [selectedFaction, setSelectedFaction] = useState<FactionType>(FactionType.Quadrumm);
  const [win, setWin] = useState(false);
  
  // Ref to pass state from Game Loop to UI without triggering React renders constantly in GameView
  const uiStateRef = useRef({
      money: 0,
      currentUnits: 0,
      maxUnits: 5,
      selection: [],
      buildings: []
  });

  const startGame = (faction: FactionType) => {
      setSelectedFaction(faction);
      setGameState('PLAYING');
  };

  const handleGameOver = (hasWon: boolean) => {
      setWin(hasWon);
      setGameState('GAMEOVER');
  };

  return (
    <div className="w-screen h-screen overflow-hidden font-sans select-none">
      {gameState === 'MENU' && (
          <MainMenu onStart={startGame} />
      )}

      {gameState === 'PLAYING' && (
          <div className="relative w-full h-full">
              <GameView 
                  faction={selectedFaction} 
                  onGameOver={handleGameOver}
                  uiStateRef={uiStateRef}
              />
              <UIOverlay 
                  faction={selectedFaction}
                  uiStateRef={uiStateRef} 
              />
          </div>
      )}

      {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
              <div className="text-center">
                  <h1 className={`text-8xl font-bold mb-8 ${win ? 'text-green-500' : 'text-red-600'}`}>
                      {win ? 'VICTORY' : 'DEFEAT'}
                  </h1>
                  <button 
                    onClick={() => setGameState('MENU')}
                    className="px-8 py-4 bg-gray-700 hover:bg-white hover:text-black text-white text-xl border-2 border-white rounded">
                    Return to Main Menu
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
