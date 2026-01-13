
import React, { useState, useMemo } from 'react';
import { LifeStage, GameState, GameStats, TurnOption, AIResponse } from './types';
import { generateNextTurn } from './services/geminiService';
import StatBar from './components/StatBar';

const MAX_POINTS = 20;
const INITIAL_ACTION_POINTS = 10;

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [draggedOption, setDraggedOption] = useState<TurnOption | null>(null);
  const [selections, setSelections] = useState<Record<number, TurnOption | null>>({});
  const [isOver, setIsOver] = useState(false);
  const [summary, setSummary] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [currentResultText, setCurrentResultText] = useState('');
  const [pendingNextTurn, setPendingNextTurn] = useState<AIResponse | null>(null);
  const [pendingStats, setPendingStats] = useState<GameStats>({ intelligence: 0, charm: 0, stamina: 0, money: 0, luck: 0 });
  const [pendingActionPoints, setPendingActionPoints] = useState(0);

  const [isAllocating, setIsAllocating] = useState(false);
  const [allocStats, setAllocStats] = useState<GameStats>({
    intelligence: 5,
    charm: 5,
    stamina: 5,
    money: 5,
    luck: 0
  });

  // Fix: The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
  // Explicitly cast to number[] for arithmetic safety
  const remainingAllocPoints = MAX_POINTS - (Object.values(allocStats) as number[]).reduce((a: number, b: number) => a + b, 0);
  const currentTotalCost = (Object.values(selections) as (TurnOption | null)[]).reduce((acc, curr) => acc + (curr?.cost || 0), 0);

  // CRITICAL: Extract unique slot indices from the story template string
  const requiredSlots = useMemo(() => {
    if (!gameState?.currentTurn?.storyTemplate) return [];
    const matches = gameState.currentTurn.storyTemplate.match(/__(\d+)__/g) || [];
    // Extract unique numbers and sort them
    const indices = Array.from(new Set(matches.map(m => parseInt(m.match(/\d+/)![0]))));
    return indices.sort((a, b) => a - b);
  }, [gameState?.currentTurn?.storyTemplate]);

  const handleStatChange = (stat: keyof GameStats, delta: number) => {
    const newVal = allocStats[stat] + delta;
    if (newVal < 0) return;
    if (delta > 0 && remainingAllocPoints <= 0) return;
    setAllocStats(prev => ({ ...prev, [stat]: newVal }));
  };

  const startNewGame = async () => {
    setLoading(true);
    try {
      const response = await generateNextTurn(6, LifeStage.PRIMARY, 1, allocStats, []);
      setGameState({
        age: 6,
        stage: LifeStage.PRIMARY,
        turnInYear: 1,
        stats: allocStats,
        actionPoints: INITIAL_ACTION_POINTS,
        storyHistory: [],
        currentTurn: response
      });
      setSelections({});
      setIsAllocating(false);
    } catch (err) {
      alert("初始化失败，请检查 API KEY");
    } finally {
      setLoading(false);
    }
  };

  const handleNextTurn = async () => {
    if (!gameState || !gameState.currentTurn) return;
    
    // Check if all slots in the template have been filled
    const filledCount = Object.keys(selections).filter(key => selections[parseInt(key)] !== null).length;
    if (filledCount < requiredSlots.length) {
      alert("请填满所有故事空位！");
      return;
    }

    if (currentTotalCost > gameState.actionPoints) {
      alert("行动力不足！");
      return;
    }

    setLoading(true);
    const newStats = { ...gameState.stats };
    
    let actualStory = gameState.currentTurn.storyTemplate;
    requiredSlots.forEach(slotIdx => {
      const sel = selections[slotIdx];
      if (sel) actualStory = actualStory.replace(`__${slotIdx}__`, `[${sel.text}]`);
    });
    
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

    const recovery = Math.floor(Math.random() * 3) + 1;
    const nextActionPoints = Math.max(0, (gameState.actionPoints as number) - (currentTotalCost as number) + recovery);

    let nextTurnNum = gameState.turnInYear + 1;
    let nextAge = gameState.age;
    if (nextTurnNum > 5) { nextTurnNum = 1; nextAge += 1; }
    let nextStage = gameState.stage;
    if (nextAge >= 16) nextStage = LifeStage.HIGH;
    else if (nextAge >= 13) nextStage = LifeStage.MIDDLE;

    try {
      const response = await generateNextTurn(nextAge, nextStage, nextTurnNum, newStats, [...gameState.storyHistory, turnSummary]);
      setCurrentResultText(turnSummary);
      setPendingNextTurn(response);
      setPendingStats(newStats);
      setPendingActionPoints(nextActionPoints);
      setShowResult(true);
    } catch (err) {
      alert("生成下一回合失败");
    } finally {
      setLoading(false);
    }
  };

  const proceedToNextTurn = () => {
    if (!pendingNextTurn || !gameState) return;
    if (pendingNextTurn.isGameOver) {
      setIsOver(true);
      setSummary(pendingNextTurn.gameOverSummary || "游戏结束。");
    } else {
      let nextTurnNum = gameState.turnInYear + 1;
      let nextAge = gameState.age;
      if (nextTurnNum > 5) { nextTurnNum = 1; nextAge += 1; }
      let nextStage = gameState.stage;
      if (nextAge >= 16) nextStage = LifeStage.HIGH;
      else if (nextAge >= 13) nextStage = LifeStage.MIDDLE;

      setGameState({
        age: nextAge,
        stage: nextStage,
        turnInYear: nextTurnNum,
        stats: pendingStats,
        actionPoints: pendingActionPoints,
        storyHistory: [...gameState.storyHistory, currentResultText],
        currentTurn: pendingNextTurn
      });
      setSelections({});
    }
    setShowResult(false);
    setPendingNextTurn(null);
  };

  const renderStoryWithBlanks = () => {
    if (!gameState?.currentTurn) return null;
    const template = gameState.currentTurn.storyTemplate;
    const parts = template.split(/(__\d+__)/g);

    return (
      <div className="text-xl md:text-3xl leading-[1.8] text-slate-900 font-bold bg-white p-10 md:p-16 rounded-[3rem] shadow-2xl shadow-blue-100 border border-slate-100 mb-10 relative overflow-hidden">
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
                className={`drag-placeholder inline-flex flex-col items-center justify-center min-w-[140px] px-4 py-2 rounded-2xl border-2 border-dashed mx-2 transition-all transform hover:scale-105 ${
                  selected ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-slate-50 border-slate-300 text-slate-300 text-base'
                }`}
              >
                {selected ? (
                  <>
                    <span className="text-[10px] font-black uppercase opacity-70 mb-0.5">-{selected.cost}⚡</span>
                    <span className="leading-tight text-lg md:text-xl">{selected.text}</span>
                  </>
                ) : (
                  `决策点 ${slotIdx}`
                )}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  };

  if (!gameState && !isAllocating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="max-w-xl text-center p-8">
          <div className="mb-8 inline-block animate-bounce"><span className="text-8xl">🚀</span></div>
          <h1 className="text-6xl font-black text-slate-900 mb-6 tracking-tight">中国学生<span className="text-blue-600">重开</span>模拟器</h1>
          <p className="text-slate-500 mb-12 text-xl leading-relaxed">体验一段充满抉择与可能的求学之路。</p>
          <button onClick={() => setIsAllocating(true)} className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-bold text-2xl shadow-2xl hover:bg-blue-600 transition-all">
            点击重开
          </button>
        </div>
      </div>
    );
  }

  if (isAllocating) {
    const statLabels: Record<keyof GameStats, { label: string, icon: string, desc: string }> = {
      stamina: { label: '体质', icon: '💪', desc: '强健的体魄是内卷的基础' },
      money: { label: '家境', icon: '🏠', desc: '起点越高，容错率越大' },
      charm: { label: '魅力', icon: '✨', desc: '校园风云人物的必备素质' },
      intelligence: { label: '智力', icon: '🧠', desc: '天才少年还是平庸之辈' },
      luck: { label: '气运', icon: '🍀', desc: '天降鸿运，改变命运的玄学' }
    };

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white rounded-[3rem] p-10 md:p-14 shadow-2xl border border-slate-100">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-black text-slate-900 mb-2">属性分配</h2>
            <div className="inline-block px-6 py-2 bg-blue-50 text-blue-600 rounded-full font-bold">
              剩余点数: <span className="text-2xl ml-1">{remainingAllocPoints}</span>
            </div>
          </div>
          <div className="space-y-6">
            {(Object.keys(statLabels) as (keyof GameStats)[]).map((key) => (
              <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:shadow-md">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{statLabels[key].icon}</span>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{statLabels[key].label}</h3>
                    <p className="text-xs text-slate-400">{statLabels[key].desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => handleStatChange(key, -1)} className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-600 font-bold hover:bg-red-50 hover:border-red-200 transition-all">-</button>
                  <span className="w-8 text-center text-xl font-black text-slate-900">{allocStats[key]}</span>
                  <button onClick={() => handleStatChange(key, 1)} className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-600 font-bold hover:bg-green-50 hover:border-green-200 transition-all">+</button>
                </div>
              </div>
            ))}
          </div>
          <button 
            disabled={remainingAllocPoints !== 0 || loading}
            onClick={startNewGame}
            className="w-full mt-10 py-6 bg-slate-900 text-white rounded-[2.5rem] font-bold text-2xl shadow-xl hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {loading ? '注入灵魂中...' : (remainingAllocPoints === 0 ? '确定属性，投胎！' : `还需要分配 ${remainingAllocPoints} 点`)}
          </button>
        </div>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-6">
        <div className="max-w-3xl w-full bg-white rounded-[4rem] p-12 shadow-2xl border border-slate-100 text-center">
          <h2 className="text-4xl font-black text-slate-900 mb-10">人生演算</h2>
          <div className="text-2xl md:text-3xl text-slate-700 leading-relaxed font-bold bg-slate-50 p-10 rounded-[3rem] border border-slate-100 mb-12 text-left">
            {currentResultText.split(' -> ').map((text, i) => (
              <p key={i} className={i === 1 ? 'mt-6 text-blue-600 border-l-4 border-blue-500 pl-6' : ''}>{text}</p>
            ))}
          </div>
          <div className="bg-blue-50 px-8 py-4 rounded-3xl border border-blue-100 mb-8 inline-block">
             <span className="text-sm font-bold text-blue-400 block mb-1">获得新行动力</span>
             <span className="text-3xl font-black text-blue-600">{pendingActionPoints} ⚡</span>
          </div>
          <StatBar stats={pendingStats} />
          <button onClick={proceedToNextTurn} className="mt-12 px-20 py-6 bg-slate-900 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-blue-600 transition-all flex items-center gap-3 mx-auto">
            继续前行 <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    );
  }

  const isAffordable = gameState ? (currentTotalCost as number) <= gameState.actionPoints : true;

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32">
      <div className="bg-white/90 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="bg-slate-900 text-white w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg">{gameState?.age}</div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-slate-800 tracking-tight">{gameState?.stage}</span>
              <div className="flex gap-1.5 mt-1.5">
                {[1, 2, 3, 4, 5].map(t => (
                  <div key={t} className={`h-2 w-8 rounded-full transition-all duration-500 ${t <= (gameState?.turnInYear || 0) ? 'bg-blue-500' : 'bg-slate-100'}`} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 transition-all ${isAffordable ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-red-50 border-red-100 text-red-600 animate-pulse'}`}>
               <span className="font-black text-lg">{gameState?.actionPoints} ⚡</span>
               {currentTotalCost > 0 && <span className="text-sm opacity-60">(-{currentTotalCost})</span>}
            </div>
            <button onClick={() => window.location.reload()} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-red-500 transition-all">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 mt-10">
        {gameState && <StatBar stats={gameState.stats} />}
        {isOver ? (
          <div className="bg-white rounded-[4rem] p-16 shadow-2xl border border-blue-50 text-center">
            <h2 className="text-6xl font-black mb-10 text-slate-900 tracking-tighter">🎓 最终结局</h2>
            <div className="text-2xl text-slate-600 leading-relaxed mb-14 bg-slate-50 p-10 rounded-[3rem] border border-slate-100 text-left">{summary}</div>
            <button onClick={() => window.location.reload()} className="px-20 py-6 bg-blue-600 text-white rounded-[2.5rem] font-bold text-2xl shadow-2xl hover:bg-blue-700 transition-all">逆天改命，再来一次</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-6 px-4">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm font-black text-slate-400 uppercase tracking-widest">
                {gameState?.turnInYear === 5 ? '🔥 年度完结篇' : '📅 校园纪实'}
              </span>
            </div>
            {renderStoryWithBlanks()}
            <div className="space-y-16 mb-20">
              {requiredSlots.map(slotIdx => {
                const optionsForSlot = gameState?.currentTurn?.options.filter(o => o.slotIndex === slotIdx) || [];
                return (
                  <div key={slotIdx} className="relative">
                    <div className="absolute -top-8 left-0 flex items-center gap-3">
                      <span className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-lg">{slotIdx}</span>
                      <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">决策槽位供选方案</h3>
                    </div>
                    <div className="flex flex-wrap gap-4 pt-4">
                      {optionsForSlot.length > 0 ? optionsForSlot.map(opt => {
                        const isSelected = (Object.values(selections) as (TurnOption | null)[]).some(s => s?.id === opt.id);
                        const canAfford = (gameState?.actionPoints || 0) >= opt.cost;
                        
                        return (
                          <div
                            key={opt.id}
                            draggable={!isSelected && canAfford}
                            onDragStart={() => !isSelected && canAfford && setDraggedOption(opt)}
                            className={`group relative cursor-grab active:cursor-grabbing px-6 py-5 rounded-3xl border-2 font-bold text-lg transition-all ${
                              isSelected 
                                ? 'bg-slate-50 border-transparent text-slate-200 opacity-20 cursor-not-allowed scale-90' 
                                : !canAfford
                                ? 'bg-white border-slate-50 text-slate-300 opacity-40 cursor-not-allowed'
                                : 'bg-white border-slate-100 hover:border-blue-500 text-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-black ${
                                opt.cost === 0 ? 'bg-green-50 text-green-600 border-green-100' : 
                                opt.cost > 5 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                              }`}>
                                {opt.cost} ⚡
                              </span>
                              {opt.text}
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="text-slate-400 text-sm italic py-4">该槽位暂无可用选项，请联系开发者或重试。</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center sticky bottom-10 z-20">
              <button
                onClick={handleNextTurn}
                disabled={loading}
                className="group relative px-24 py-7 bg-slate-900 text-white rounded-[3rem] font-black text-2xl shadow-2xl hover:bg-blue-600 disabled:opacity-20 transition-all active:scale-95"
              >
                {loading ? '命理推演中...' : '见证选择的力量'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
