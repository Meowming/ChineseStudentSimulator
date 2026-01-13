
import React, { useState } from 'react';
import { LifeStage, GameState, GameStats, TurnOption, AIResponse, Semester } from './types';
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
      const response = await generateNextTurn(6, LifeStage.PRIMARY, Semester.AUTUMN, 1, INITIAL_STATS, []);
      setGameState({
        age: 6,
        stage: LifeStage.PRIMARY,
        semester: Semester.AUTUMN,
        turnInSemester: 1,
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
    let historySnippet = gameState.currentTurn.nextStorySnippet;

    (Object.values(selections) as (TurnOption | null)[]).forEach(opt => {
      if (opt && opt.effect) {
        Object.keys(opt.effect).forEach(k => {
          const key = k as keyof GameStats;
          newStats[key] = (newStats[key] || 0) + (opt.effect[key] || 0);
        });
      }
    });

    // Progression Logic: Turn -> Semester -> Year
    let nextTurn = gameState.turnInSemester + 1;
    let nextSemester = gameState.semester;
    let nextAge = gameState.age;

    if (nextTurn > 5) {
      nextTurn = 1;
      if (nextSemester === Semester.AUTUMN) {
        nextSemester = Semester.SPRING;
      } else {
        nextSemester = Semester.AUTUMN;
        nextAge += 1;
      }
    }

    let nextStage = gameState.stage;
    if (nextAge >= 16) nextStage = LifeStage.HIGH;
    else if (nextAge >= 13) nextStage = LifeStage.MIDDLE;

    try {
      const response = await generateNextTurn(
        nextAge, 
        nextStage, 
        nextSemester, 
        nextTurn, 
        newStats, 
        [...gameState.storyHistory, historySnippet]
      );

      if (response.isGameOver) {
        setIsOver(true);
        setSummary(response.gameOverSummary || "模拟结束。");
        setGameState(prev => prev ? { ...prev, stats: newStats, age: nextAge } : null);
      } else {
        setGameState({
          age: nextAge,
          stage: nextStage,
          semester: nextSemester,
          turnInSemester: nextTurn,
          stats: newStats,
          storyHistory: [...gameState.storyHistory, historySnippet],
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
      <div className="text-xl md:text-2xl leading-relaxed text-slate-800 font-medium bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-blue-500 opacity-20" />
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
                className={`drag-placeholder inline-flex items-center min-w-[100px] px-4 py-1.5 rounded-xl border-2 border-dashed mx-2 transition-all ${
                  selected 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 scale-105' 
                    : 'bg-slate-50 border-slate-300 text-slate-400 text-base hover:border-blue-300'
                }`}
              >
                {selected ? selected.text : `? [${slotIdx}]`}
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="max-w-md text-center p-6">
          <div className="mb-6 inline-block p-4 bg-blue-50 rounded-3xl">
            <span className="text-5xl">🎒</span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter">中国学生模拟器</h1>
          <p className="text-slate-500 mb-10 text-lg">从一年级到高三，体验最真实完整的校园生活。</p>
          <button onClick={startNewGame} disabled={loading} className="group relative w-full py-5 bg-slate-900 text-white rounded-[2rem] font-bold text-xl shadow-2xl hover:bg-blue-600 transition-all disabled:opacity-50">
            {loading ? '正在初始化人生...' : '开启求学之路'}
          </button>
        </div>
      </div>
    );
  }

  const allSlotsFilled = gameState.currentTurn 
    ? Object.values(selections).filter(Boolean).length === (gameState.currentTurn.storyTemplate.match(/__\d+__/g) || []).length
    : false;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 p-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-xl font-black text-slate-900">{gameState.age} 岁 · {gameState.stage}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">{gameState.semester}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(t => (
                    <div key={t} className={`h-1.5 w-4 rounded-full ${t <= gameState.turnInSemester ? 'bg-blue-500' : 'bg-slate-200'}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => window.confirm('确定要放弃这一生重来吗？') && window.location.reload()} className="h-10 w-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        <StatBar stats={gameState.stats} />

        {isOver ? (
          <div className="bg-white rounded-[3rem] p-12 shadow-2xl shadow-blue-100 border border-blue-50 text-center animate-in fade-in zoom-in duration-500">
            <h2 className="text-5xl font-black mb-8 text-slate-900">🎓 毕业典礼</h2>
            <div className="text-xl text-slate-600 leading-relaxed mb-12 whitespace-pre-wrap bg-slate-50 p-8 rounded-[2rem] border border-slate-100 text-left italic">
              {summary}
            </div>
            <button onClick={() => window.location.reload()} className="px-16 py-5 bg-blue-600 text-white rounded-[2rem] font-bold text-2xl shadow-xl hover:bg-blue-700 transition-all">再续前缘</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4 px-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                第 {gameState.turnInSemester} 阶段：
                {gameState.turnInSemester === 3 ? '期中挑战' : gameState.turnInSemester === 5 ? '期末考卷' : '日常点滴'}
              </span>
            </div>

            {renderStoryWithBlanks()}

            <div className="space-y-8 mb-16">
              {[1, 2, 3].map(slotIdx => {
                const optionsForSlot = gameState.currentTurn?.options.filter(o => o.slotIndex === slotIdx) || [];
                if (optionsForSlot.length === 0) return null;
                return (
                  <div key={slotIdx} className="bg-white/40 p-6 rounded-[2rem] border border-slate-100">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px]">{slotIdx}</span>
                      备选词汇
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      {optionsForSlot.map(opt => {
                        const isSelected = (Object.values(selections) as (TurnOption | null)[]).some(s => s?.id === opt.id);
                        return (
                          <div
                            key={opt.id}
                            draggable={!isSelected}
                            onDragStart={() => !isSelected && setDraggedOption(opt)}
                            className={`group cursor-grab active:cursor-grabbing px-8 py-4 rounded-2xl border-2 font-bold transition-all ${
                              isSelected
                                ? 'bg-slate-100 border-transparent text-slate-300 opacity-40 cursor-not-allowed'
                                : 'bg-white border-white hover:border-blue-500 shadow-sm hover:shadow-xl hover:-translate-y-1 text-slate-700'
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <span>{opt.text}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleNextTurn}
                disabled={!allSlotsFilled || loading}
                className="group relative px-20 py-6 bg-slate-900 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-blue-600 disabled:opacity-20 disabled:grayscale transition-all overflow-hidden"
              >
                <span className="relative z-10">{loading ? '光阴流转中...' : '确认经历'}</span>
                {!loading && allSlotsFilled && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            </div>
          </>
        )}
      </main>
      
      <div className="fixed bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#F8FAFC] to-transparent pointer-events-none" />
    </div>
  );
};

export default App;
