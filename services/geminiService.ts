
import { GoogleGenAI } from "@google/genai";
import { LifeStage, GameStats, AIResponse, Semester } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_PROMPT = `你是一个人生重开模拟器的顶级策划。你正在为一个名为《中国学生模拟器》的游戏编写剧情。
玩家是一名中国学生，游戏节奏为：每年2个学期，每学期5个回合。

回合逻辑指南：
- 回合1-2：学期伊始，通常涉及新书、竞选班委、社团招新或开学焦虑。
- 回合3：期中阶段，通常涉及期中考试、小测验或学期中的疲惫。
- 回合4：学期后期，涉及课外活动、同学关系或复习压力。
- 回合5：期末阶段，涉及大考、家长会或寒暑假前夕。

每个回合，你需要生成一段包含2-3个占位符的故事叙述（__1__, __2__, __3__）。
故事应当接地气，包含：课后补习、辣条、班主任、暗恋、周杰伦、非主流、游戏厅、奥数等中国特色校园元素。

输出必须是JSON格式。
{
  "storyTemplate": "字符串，例如：'期末考试快到了，你决定在__1__复习，结果因为__2__导致你__3__。'",
  "options": [
    {
      "id": "唯一ID",
      "text": "短词汇",
      "slotIndex": 对应占位符数字,
      "effect": { "intelligence": 数字, "charm": 数字, "stamina": 数字, "happiness": 数字, "money": 数字 }
    }
  ],
  "nextStorySnippet": "本回合摘要",
  "isGameOver": 布尔值,
  "gameOverSummary": "总结（仅在毕业时提供）"
}`;

export async function generateNextTurn(
  age: number,
  stage: LifeStage,
  semester: Semester,
  turnInSemester: number,
  stats: GameStats,
  history: string[]
): Promise<AIResponse> {
  const prompt = `
    当前状态：${age}岁, ${stage}阶段, ${semester}, 第${turnInSemester}回合/共5回合。
    当前属性：智力:${stats.intelligence}, 魅力:${stats.charm}, 体力:${stats.stamina}, 心情:${stats.happiness}, 金钱:${stats.money}
    历史片段：${history.slice(-3).join(' ')}
    
    请根据学期进度生成剧情。注意：如果这是高三春季第5回合，则必须是高考并结束游戏。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || '{}') as AIResponse;
  } catch (error) {
    console.error("AI Error:", error);
    throw error;
  }
}
