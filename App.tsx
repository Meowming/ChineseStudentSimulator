
import React, { useState } from 'react';
import { LifeStage, GameState, GameStats, TurnOption, AIResponse } from './types';
import { generateNextTurn } from './services/geminiService';
import StatBar from './components/StatBar';

const INITIAL_STATS: GameStats = {
  intelligence: 10,
  charm: 10,
  stamina: 10,
  happiness: 10,
  money: 10
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [draggedOption, setDraggedOption] = useState<TurnOption | null>(null);
  const [selections, setSelections] = useState<Record<number, TurnOption | null>>({});
  const [isOver, setIsOver] = useState(false);
  const [summary, setSummary] = useState('');

  const startNewGame = async () => {
    setLoading(true);
    try {
      const response = await generateNextTurn(6, LifeStage.PRIMARY, 1, INITIAL_STATS, []);
      setGameState({
        age: 6,
        stage: LifeStage.PRIMARY,
        turnInYear: 1,
        stats: INITIAL_STATS,
        storyHistory: [],
        currentTurn: response
      });
      setSelections({});
    } catch (err) {
      alert("初始化失败，请检查 API KEY");
    } finally {
      setLoading(false);
    }
  };

  const handleNextTurn = async () => {
    if (!gameState || !gameState.currentTurn) return;
    
    const slots = (gameState.currentTurn.storyTemplate.match(/__\d+__/g) || []).length;
    if (Object.values(selections).filter(Boolean).length < slots) return;

    setLoading(true);
    const newStats = { ...gameState.stats };
    
    // Construct the actual story fragment from selections to pass back to AI
    let actualStory = gameState.currentTurn.storyTemplate;
    Object.keys(selections).forEach(key => {
      const sel = selections[parseInt(key)];
      if (sel) actualStory = actualStory.replace(`__${key}__`, `[${sel.text}]`);
    });
    
    // Add the AI's summary snippet too
    const turnSummary = `${actualStory} -> ${gameState.currentTurn.nextStorySnippet}`;

    (Object.values(selections) as (TurnOption | null)[]).forEach(opt => {
      if (opt && opt.effect) {
        Object.keys(opt.effect).forEach(k => {
          const key = k as keyof GameStats;
          const val = opt.effect[key] || 0;
          newStats[key] = (newStats[key] || 0) + val;
        });
      }
    });

    let nextTurn = gameState.turnInYear + 1;
    let nextAge = gameState.age;

    if (nextTurn > 5) {
      nextTurn = 1;
      nextAge += 1;
    }

    let nextStage = gameState.stage;
    if (nextAge >= 16) nextStage = LifeStage.HIGH;
    else if (nextAge >= 13) nextStage = LifeStage.MIDDLE;

    try {
      const response = await generateNextTurn(
        nextAge, 
        nextStage, 
        nextTurn, 
        newStats, 
        [...gameState.storyHistory, turnSummary]
      );

      if (response.isGameOver) {
        setIsOver(true);
        setSummary(response.gameOverSummary || "你的学生生涯在各种操作中落下了帷幕。");
        setGameState(prev => prev ? { ...prev, stats: newStats, age: nextAge } : null);
      } else {
        setGameState({
          age: nextAge,
          stage: nextStage,
          turnInYear: nextTurn,
          stats: newStats,
          storyHistory: [...gameState.storyHistory, turnSummary],
          currentTurn: response
        });
        setSelections({});
      }
    } catch (err) {
      alert("生成下一回合失败");
    } finally {
      setLoading(false);
    }
  };

  const renderStoryWithBlanks = () => {
    if (!gameState?.currentTurn) return null;
    const template = gameState.currentTurn.storyTemplate;
    const parts = template.split(/(__\d+__)/g);

    return (
      <div className="text-xl md:text-3xl leading-[1.6] text-slate-900 font-bold bg-white p-10 md:p-16 rounded-[3rem] shadow-2xl shadow-blue-100 border border-slate-100 mb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-[0.03] rounded-full -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500 opacity-[0.03] rounded-full -ml-12 -mb-12" />
        {parts.map((part, index) => {
          const match = part.match(/__(\d+)__/);
          if (match) {
            const slotIdx = parseInt(match[1]);
            const selected = selections[slotIdx];
            return (
              <span
                key={index}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedOption && draggedOption.slotIndex === slotIdx) {
                    setSelections(prev => ({ ...prev, [slotIdx]: draggedOption }));
                  }
                }}
                className={`drag-placeholder inline-flex items-center min-w-[100px] px-4 py-1.5 rounded-xl border-2 border-dashed mx-1.5 transition-all transform hover:scale-105 ${
                  selected 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200 ring-4 ring-blue-50' 
                    : 'bg-slate-50 border-slate-300 text-slate-300 text-base hover:border-blue-400'
                }`}
              >
                {selected ? selected.text : `槽位 ${slotIdx}`}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  };

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="max-w-xl text-center p-8 relative z-10">
          <div className="mb-8 inline-block animate-bounce">
            <span className="text-8xl">🚀</span>
          </div>
          <h1 className="text-6xl font-black text-slate-900 mb-6 tracking-tight">中国学生<span className="text-blue-600">重开</span>模拟器</h1>
          <p className="text-slate-500 mb-12 text-xl leading-relaxed">
            从小学一年级到高三毕业，<br/>
            不仅仅是学习，更有那些荒诞、离谱、让人泪流满面的瞬间。
          </p>
          <button onClick={startNewGame} disabled={loading} className="group relative w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-bold text-2xl shadow-2xl hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50">
            {loading ? '正在载入命运...' : '开启这疯狂的一生'}
          </button>
        </div>
      </div>
    );
  }

  const allSlotsFilled = gameState.currentTurn 
    ? Object.values(selections).filter(Boolean).length === (gameState.currentTurn.storyTemplate.match(/__\d+__/g) || []).length
    : false;

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32">
      <div className="bg-white/90 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="bg-slate-900 text-white w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg">
              {gameState.age}
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-slate-800 tracking-tight">{gameState.stage}</span>
              <div className="flex gap-1.5 mt-1.5">
                {[1, 2, 3, 4, 5].map(t => (
                  <div key={t} className={`h-2 w-8 rounded-full transition-all duration-500 ${t <= gameState.turnInYear ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-100'}`} />
                ))}
              </div>
            </div>
          </div>
          <button onClick={() => window.confirm('重开吗？这次可能会更出人意料哦。') && window.location.reload()} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 mt-10">
        <StatBar stats={gameState.stats} />

        {isOver ? (
          <div className="bg-white rounded-[4rem] p-16 shadow-2xl border border-blue-50 text-center animate-in fade-in slide-in-from-bottom-10 duration-700">
            <h2 className="text-6xl font-black mb-10 text-slate-900 tracking-tighter">🎓 最终结局</h2>
            <div className="text-2xl text-slate-600 leading-relaxed mb-14 whitespace-pre-wrap bg-slate-50 p-10 rounded-[3rem] border border-slate-100 text-left relative">
               <span className="absolute -top-6 -left-2 text-8xl opacity-10">“</span>
               {summary}
               <span className="absolute -bottom-16 -right-2 text-8xl opacity-10">”</span>
            </div>
            <button onClick={() => window.location.reload()} className="px-20 py-6 bg-blue-600 text-white rounded-[2.5rem] font-bold text-2xl shadow-2xl hover:bg-blue-700 hover:-translate-y-1 active:translate-y-0 transition-all">逆天改命，再来一次</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6 px-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">
                  {gameState.turnInYear === 3 ? '🚨 学年中期' : gameState.turnInYear === 5 ? '🔥 考试季' : '📅 校园时光'}
                </span>
              </div>
            </div>

            {renderStoryWithBlanks()}

            <div className="space-y-12 mb-20">
              {[1, 2, 3].map(slotIdx => {
                const optionsForSlot = gameState.currentTurn?.options.filter(o => o.slotIndex === slotIdx) || [];
                if (optionsForSlot.length === 0) return null;
                return (
                  <div key={slotIdx} className="relative group">
                    <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-4">
                      <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center text-xs">{slotIdx}</span>
                      备选操作库
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      {optionsForSlot.map(opt => {
                        const isSelected = (Object.values(selections) as (TurnOption | null)[]).some(s => s?.id === opt.id);
                        
                        return (
                          <div
                            key={opt.id}
                            draggable={!isSelected}
                            onDragStart={() => !isSelected && setDraggedOption(opt)}
                            className={`group cursor-grab active:cursor-grabbing px-6 py-3.5 rounded-2xl border-2 font-bold text-lg transition-all ${
                              isSelected
                                ? 'bg-slate-50 border-transparent text-slate-200 opacity-30 cursor-not-allowed scale-90'
                                : 'bg-white border-slate-100 hover:border-blue-500 hover:shadow-xl shadow-sm hover:-translate-y-1 text-slate-700'
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <span className="whitespace-nowrap">{opt.text}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center sticky bottom-10 z-20">
              <button
                onClick={handleNextTurn}
                disabled={!allSlotsFilled || loading}
                className="group relative px-20 py-6 bg-slate-900 text-white rounded-[2.5rem] font-black text-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:bg-blue-600 disabled:opacity-20 disabled:grayscale transition-all duration-300 active:scale-95"
              >
                <span className="relative z-10 flex items-center gap-3">
                  {loading ? (
                    <>
                      <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      命运加载中...
                    </>
                  ) : (
                    <>
                      写入人生
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </>
                  )}
                </span>
                {!loading && allSlotsFilled && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem]" />
                )}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
