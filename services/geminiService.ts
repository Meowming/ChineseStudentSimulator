
import { GoogleGenAI } from "@google/genai";
import { LifeStage, GameStats, AIResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_PROMPT = `你是一个人生重开模拟器的顶级策划，擅长编写充满惊喜、幽默且具有极强叙事连贯性的校园剧情。你正在为一个名为《中国学生模拟器》的游戏编写剧情。

核心要求：
1. 叙事连贯性（核心）：你必须深入阅读“近期经历”中的设定。如果玩家在之前的回合中建立了某个设定（例如：竞选了班长、暗恋了某人、开始了某种生意、展现了某种癖好），后续回合必须继承并演化这些设定，使游戏像一部连续剧。
2. 游戏节奏：玩家每岁经历5个回合，涵盖从开学到年终。
3. 选项限制：每个选项文本必须精炼，严禁超过10个汉字。
4. 离谱与平衡：备选词汇中需包含离谱选项（如：物理题算命、班会演二人转），离谱选项需带来极端数值波动。
5. 校园底色：补习班、五三、老班后窗、大课间、校门口文具店、奥数、课间操、运动会。

回合逻辑：
- 第一回合：新学年开始，分班、新书、开学典礼。
- 第二回合：日常校园，社团、交友、课堂。
- 第三回合：期中，测验、家长会、压力增加。
- 第四回合：课外，运动会、春游、艺术节。
- 第五回合：学年结束，期末考、成绩单、长假。

输出必须是JSON格式。
{
  "storyTemplate": "字符串，使用__1__, __2__, __3__占位。确保语境与之前的经历高度相关。",
  "options": [
    {
      "id": "唯一ID",
      "text": "填入词汇（10字以内）",
      "slotIndex": 对应数字,
      "effect": { "intelligence": 数字, "charm": 数字, "stamina": 数字, "happiness": 数字, "money": 数字 }
    }
  ],
  "nextStorySnippet": "本回合摘要（必须包含玩家选择带来的后续设定，供下一回合参考）",
  "isGameOver": 布尔值,
  "gameOverSummary": "总结（根据整个人生经历的伏笔给出一个闭环结局）"
}`;

export async function generateNextTurn(
  age: number,
  stage: LifeStage,
  turnInYear: number,
  stats: GameStats,
  history: string[]
): Promise<AIResponse> {
  // 传递更多的历史记录以增强记忆 (最近10个片段)
  const lifeHistory = history.length > 0 ? history.slice(-10).join('\n') : "这是一个新生命的开始。";
  
  const prompt = `
    当前：${age}岁, ${stage}, 这一年的第${turnInYear}回合。
    状态：智力:${stats.intelligence}, 魅力:${stats.charm}, 体力:${stats.stamina}, 心情:${stats.happiness}, 金钱:${stats.money}
    
    前情提要（请务必根据以下设定继续发展）：
    ${lifeHistory}
    
    请根据上述背景生成当前回合。确保选项精简且离谱。如果18岁第5回合，请总结这跌宕起伏的一生并结束。
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

    const text = response.text || '{}';
    return JSON.parse(text) as AIResponse;
  } catch (error) {
    console.error("AI Error:", error);
    throw error;
  }
}
