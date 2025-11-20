
import React, { useState, useEffect } from 'react';
import { GameState, MissionData } from './types';
import { generateMissionBriefing, generateBattleReport } from './services/gemini';
import { OpeningCrawl } from './components/OpeningCrawl';
import { GameCanvas } from './components/GameCanvas';
import { Sword, Shield, Zap, Play, Skull, Trophy, RotateCcw, Volume2 } from 'lucide-react';
import { initAudio, startAmbience, stopAmbience } from './utils/audio';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [mission, setMission] = useState<MissionData | null>(null);
  const [score, setScore] = useState(0); // Not really used in duel, but kept for report
  const [playerHealth, setPlayerHealth] = useState(100);
  const [enemyHealth, setEnemyHealth] = useState(100);
  const [playerForce, setPlayerForce] = useState(100);
  
  const [report, setReport] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);

  useEffect(() => {
    // Stop ambience if game over/menu
    if (gameState === GameState.MENU || gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) {
        stopAmbience();
    } else if (gameState === GameState.PLAYING) {
        if(audioInitialized) startAmbience();
    }
  }, [gameState, audioInitialized]);

  const initGameAudio = () => {
    if (!audioInitialized) {
      initAudio();
      setAudioInitialized(true);
    }
  };

  const startGame = async () => {
    initGameAudio();
    setLoading(true);
    const data = await generateMissionBriefing("武士");
    setMission(data);
    setLoading(false);
    setGameState(GameState.INTRO);
  };

  const handleIntroComplete = () => {
    setGameState(GameState.BRIEFING);
  };

  const handleMissionStart = () => {
    initGameAudio();
    setPlayerHealth(100);
    setEnemyHealth(100);
    setPlayerForce(100);
    setGameState(GameState.PLAYING);
  };

  const handleGameOver = async (finalScore: number, won: boolean) => {
    stopAmbience();
    setScore(finalScore);
    setGameState(won ? GameState.VICTORY : GameState.GAME_OVER);
    setLoading(true);
    const result = await generateBattleReport(finalScore, won);
    setReport(result);
    setLoading(false);
  };

  // --- MENU ---
  if (gameState === GameState.MENU) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-4 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
        <h1 className="text-6xl md:text-8xl text-blue-500 font-sans tracking-widest mb-8 drop-shadow-[0_0_20px_rgba(59,130,246,0.8)]">
          原力决斗
        </h1>
        <p className="text-gray-400 font-sans text-xl mb-12 tracking-widest">
          绝地武士 VS 西斯尊主
        </p>
        <button 
          onClick={startGame}
          disabled={loading}
          className="group relative px-8 py-4 bg-transparent border-2 border-blue-500 text-blue-500 font-sans text-xl uppercase tracking-widest hover:bg-blue-500 hover:text-black transition-all duration-300"
        >
          {loading ? (
             <span className="animate-pulse">正在感应原力波动...</span>
          ) : (
            <div className="flex items-center gap-3">
              <Sword className="w-6 h-6" />
              <span>点亮光剑</span>
            </div>
          )}
          <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-20 blur-md transition-opacity"></div>
        </button>
        <div className="mt-6 text-gray-500 flex items-center gap-2 text-xs">
            <Volume2 className="w-4 h-4" /> 建议开启声音以获得最佳体验
        </div>
        <p className="mt-8 text-gray-600 text-sm">Powered by Gemini AI</p>
      </div>
    );
  }

  // --- INTRO ---
  if (gameState === GameState.INTRO) {
    return <OpeningCrawl onComplete={handleIntroComplete} />;
  }

  // --- BRIEFING ---
  if (gameState === GameState.BRIEFING && mission) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="relative max-w-2xl w-full p-8 border border-red-900/50 bg-black/90 shadow-[0_0_50px_rgba(220,38,38,0.2)] rounded-lg">
          {/* Hologram Scanlines */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(255,0,0,0.05)_50%)] bg-[length:100%_4px]"></div>
          
          <h2 className="text-3xl text-red-500 font-sans mb-6 border-b border-red-900 pb-2 flex items-center gap-3">
            <Zap className="animate-pulse" /> 敌人识别完毕
          </h2>
          
          <div className="space-y-6 text-red-100 font-sans tracking-wide">
            <div>
              <span className="text-red-500 text-xs uppercase">目标代号</span>
              <p className="text-2xl text-white font-bold">{mission.enemyName}</p>
            </div>
            <div>
              <span className="text-red-500 text-xs uppercase">威胁等级</span>
              <p className="text-lg text-yellow-500">{mission.difficulty}</p>
            </div>
            <div className="bg-red-950/30 p-4 border-l-4 border-red-600">
              <span className="text-red-500 text-xs uppercase block mb-2">敌方通讯截获</span>
              <p className="italic text-xl font-serif">
                "{mission.taunt}"
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button 
              onClick={handleMissionStart}
              className="px-6 py-3 bg-red-700 hover:bg-red-600 text-white font-sans rounded transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" /> 开始决斗
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- GAME OVER / VICTORY ---
  if (gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className={`max-w-lg w-full p-8 border-2 ${gameState === GameState.VICTORY ? 'border-yellow-500' : 'border-red-600'} bg-zinc-900 rounded-lg text-center`}>
          {gameState === GameState.VICTORY ? (
             <Trophy className="w-20 h-20 mx-auto text-yellow-500 mb-4" />
          ) : (
             <Skull className="w-20 h-20 mx-auto text-red-600 mb-4" />
          )}
          
          <h2 className={`text-4xl font-bold mb-2 ${gameState === GameState.VICTORY ? 'text-yellow-500' : 'text-red-600'}`}>
             {gameState === GameState.VICTORY ? '绝地归来' : '陷入黑暗'}
          </h2>
          
          <div className="bg-black p-4 rounded mb-8 border border-gray-700 text-left mt-6">
             <span className="text-xs text-gray-500 uppercase block mb-2">原力回响:</span>
             {loading ? (
                <p className="text-green-500 animate-pulse font-mono">正在聆听原力的声音...</p>
             ) : (
                <p className="text-green-400 font-mono text-sm leading-relaxed">
                  {">"} {report}
                </p>
             )}
          </div>

          <button 
              onClick={() => setGameState(GameState.MENU)}
              className="px-6 py-3 border border-white text-white hover:bg-white hover:text-black transition-colors flex items-center gap-2 mx-auto"
            >
              <RotateCcw className="w-4 h-4" /> 再次挑战
            </button>
        </div>
      </div>
    );
  }

  // --- PLAYING (HUD) ---
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      {/* HUD Container */}
      <div className="absolute top-0 left-0 w-full p-6 pointer-events-none z-10 flex justify-between items-start">
        
        {/* Player Stats (Left) */}
        <div className="w-1/3">
          <div className="text-blue-400 text-xl mb-1 flex items-center gap-2">
             <span className="font-bold">绝地武士</span>
          </div>
          {/* Health */}
          <div className="h-4 w-full bg-gray-800 border border-blue-900 skew-x-[-12deg] mb-2 relative overflow-hidden">
            <div className="h-full bg-blue-600 transition-all duration-200" style={{ width: `${Math.max(0, playerHealth)}%` }}></div>
          </div>
          {/* Force Bar */}
          <div className="h-2 w-2/3 bg-gray-800 border border-cyan-900 skew-x-[-12deg] relative overflow-hidden">
             <div className="h-full bg-cyan-400 transition-all duration-200" style={{ width: `${Math.max(0, playerForce)}%` }}></div>
          </div>
          <span className="text-xs text-cyan-500 mt-1 block uppercase tracking-widest">原力能量</span>
        </div>

        {/* VS Badge */}
        <div className="text-yellow-500 font-bold text-2xl mt-2 opacity-50">VS</div>

        {/* Enemy Stats (Right) */}
        <div className="w-1/3 text-right">
          <div className="text-red-500 text-xl mb-1 flex items-center justify-end gap-2">
             <span className="font-bold">{mission?.enemyName || 'SITH'}</span>
          </div>
          {/* Health */}
          <div className="h-4 w-full bg-gray-800 border border-red-900 skew-x-[12deg] mb-2 relative overflow-hidden">
            <div className="h-full bg-red-600 transition-all duration-200 float-right" style={{ width: `${Math.max(0, enemyHealth)}%` }}></div>
          </div>
        </div>
      </div>

      {/* Game Canvas */}
      <GameCanvas 
        onGameOver={handleGameOver} 
        setPlayerHealth={setPlayerHealth}
        setEnemyHealth={setEnemyHealth}
        setPlayerForce={setPlayerForce}
      />
      
      {/* Controls Hint */}
      <div className="absolute bottom-8 w-full text-center text-white/40 text-sm pointer-events-none">
        <div className="space-x-6">
          <span>[A/D] 移动</span>
          <span>[J] 攻击</span>
          <span>[S] 格挡</span>
          <span>[K] 原力 (消耗能量)</span>
        </div>
      </div>
    </div>
  );
}
