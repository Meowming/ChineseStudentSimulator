
import { GoogleGenAI } from "@google/genai";
import { LifeStage, GameStats, AIResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_PROMPT = `你是一个人生重开模拟器的顶级策划，擅长编写充满惊喜、幽默且具有极强叙事连贯性的校园剧情。

核心机制 - 行动点(Action Points)：
1. 每个选项必须包含一个 "cost" (消耗点数)，范围 0 到 10。
2. 收益越高、结果越完美的选项消耗越高（如：5-8点）；平庸的选项消耗低（如：1-3点）；糟糕、离谱或躺平的选项应为 0点。
3. 重要：每个决策槽位（slotIndex）的备选方案中，必须确保至少有一个选项的 cost 为 0，以防止玩家点数不足时卡死。

槽位匹配机制：
1. 你的 storyTemplate 包含占位符如 __1__, __2__。
2. 你提供的 options 数组中，每个 option 的 slotIndex 必须与模板中的数字严格对应。
3. 必须为模板中出现的每一个占位符数字提供至少3个备选选项。

剧情要求：
1. 叙事连贯性：继承并演化之前的设定。
2. 属性影响：智力、魅力、体质、家境、气运应显著影响剧情。
3. 选项限制：每个选项文本严禁超过10个汉字。
4. 校园底色：补习班、五三、老班后窗、大课间、校门口、奥数、课间操、运动会。

输出必须是JSON格式。
{
  "storyTemplate": "字符串，使用__1__, __2__等占位。",
  "options": [
    {
      "id": "唯一ID",
      "text": "填入词汇",
      "slotIndex": 数字(必须对应模板中的占位符数字),
      "cost": 数字,
      "effect": { "intelligence": 数字, "charm": 数字, "stamina": 数字, "money": 数字, "luck": 数字 }
    }
  ],
  "nextStorySnippet": "摘要",
  "isGameOver": 布尔值,
  "gameOverSummary": "总结"
}`;

export async function generateNextTurn(
  age: number,
  stage: LifeStage,
  turnInYear: number,
  stats: GameStats,
  history: string[]
): Promise<AIResponse> {
  const lifeHistory = history.length > 0 ? history.slice(-10).join('\n') : "这是一段崭新人生的开端。";
  
  const prompt = `
    当前：${age}岁, ${stage}, 这一年的第${turnInYear}回合。
    核心属性：智力:${stats.intelligence}, 魅力:${stats.charm}, 体质:${stats.stamina}, 家境:${stats.money}, 气运:${stats.luck}
    
    前情提要：
    ${lifeHistory}
    
    生成当前回合内容。确保 storyTemplate 里的 __X__ 占位符与 options 里的 slotIndex 完美对应。
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
