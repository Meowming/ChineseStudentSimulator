
export enum LifeStage {
  PRIMARY = '小学',
  MIDDLE = '初中',
  HIGH = '高中',
  GRADUATED = '毕业'
}

export enum Semester {
  AUTUMN = '秋季学期',
  SPRING = '春季学期'
}

export interface GameStats {
  intelligence: number; // 智力
  charm: number;        // 魅力
  stamina: number;      // 体力
  happiness: number;    // 压力/心情
  money: number;        // 零花钱
}

export interface GameState {
  age: number;
  stage: LifeStage;
  semester: Semester;
  turnInSemester: number; // 1 to 5
  stats: GameStats;
  storyHistory: string[];
  currentTurn: TurnData | null;
}

export interface TurnOption {
  id: string;
  text: string;
  slotIndex: number; 
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
