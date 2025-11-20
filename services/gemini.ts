import { GoogleGenAI, Type } from "@google/genai";
import { MissionData } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_ID = 'gemini-2.5-flash';

export const generateMissionBriefing = async (difficulty: string): Promise<MissionData> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: `生成一个星战风格的反派决斗开场。难度是 ${difficulty}。
      请返回JSON格式。
      包括：
      title (任务标题，中文),
      enemyName (西斯尊主的名字，中文),
      taunt (敌人的挑衅台词，中文，霸气一点),
      difficulty (难度等级，保持原样).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            enemyName: { type: Type.STRING },
            taunt: { type: Type.STRING },
            difficulty: { type: Type.STRING }
          },
          required: ["title", "enemyName", "taunt"]
        },
        systemInstruction: "你是一个星战故事生成器。生成内容必须是中文。",
      }
    });

    const text = response.text;
    if (!text) throw new Error("No content generated");
    return JSON.parse(text) as MissionData;
  } catch (error) {
    console.error("Gemini Briefing Error:", error);
    return {
      title: "遭遇西斯",
      enemyName: "达斯·维德",
      taunt: "原力在你身上很弱...",
      difficulty: "武士"
    };
  }
};

export const generateBattleReport = async (score: number, won: boolean): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: `战斗结束。玩家 ${won ? "击败了西斯尊主" : "被西斯击败了"}。分数是 ${score}。
      请写一段两句话的中文评价。如果是胜利，模仿尤达大师的语气给予赞赏。如果是失败，模仿西斯尊主的语气进行嘲讽。`,
      config: {
        systemInstruction: "你是一个星战旁白。用中文回答。",
      }
    });
    return response.text || "通讯受到干扰...";
  } catch (error) {
    return won ? "原力与你同在，年轻的绝地。" : "这就是你的全部实力吗？太令人失望了。";
  }
};