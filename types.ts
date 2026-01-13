
export enum LifeStage {
  PRIMARY = '小学',
  MIDDLE = '初中',
  HIGH = '高中',
  GRADUATED = '毕业'
}

export interface GameStats {
  intelligence: number; // 智力
  charm: number;        // 魅力
  stamina: number;      // 体质
  money: number;        // 家境
  luck: number;         // 气运
}

export interface GameState {
  age: number;
  stage: LifeStage;
  turnInYear: number;
  stats: GameStats;
  actionPoints: number; // 全局行动点
  storyHistory: string[];
  currentTurn: TurnData | null;
}

export interface TurnOption {
  id: string;
  text: string;
  slotIndex: number; 
  cost: number; // 消耗的点数
  effect: Partial<GameStats>;
}

export interface TurnData {
  storyTemplate: string; 
  options: TurnOption[];
  nextStorySnippet: string; 
}

export interface AIResponse {
  storyTemplate: string;
  options: TurnOption[];
  nextStorySnippet: string;
  isGameOver: boolean;
  gameOverSummary?: string;
}
