import { GoogleGenAI } from "@google/genai";
import { DashboardStats } from "../types";

// Note: In a real app, never expose API keys on the client.
const apiKey = process.env.API_KEY || ''; 

let ai: GoogleGenAI | null = null;

try {
    if (apiKey) {
        ai = new GoogleGenAI({ apiKey });
    }
} catch (error) {
    console.error("Failed to initialize Gemini Client", error);
}

export const generateDailyReport = async (stats: DashboardStats, date: string): Promise<string> => {
  if (!ai) return "الرجاء تكوين مفتاح API لاستخدام الذكاء الاصطناعي.";

  try {
    const prompt = `
      بصفتك مساعدًا إداريًا للمدرسة، اكتب تقريرًا يوميًا موجزًا (حوالي 3-4 جمل) عن حالة الحضور لهذا اليوم: ${date}.
      
      البيانات:
      - إجمالي الطلاب: ${stats.totalStudents}
      - الحضور: ${stats.presentCount}
      - الغياب: ${stats.absentCount}
      - التسرب: ${stats.truantCount}
      - نسبة الحضور: ${stats.attendanceRate}%

      قدم توصية قصيرة إذا كانت نسبة الغياب مرتفعة (أقل من 90٪).
      اجعل النغمة رسمية واحترافية باللغة العربية.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "لم يتم إنشاء تقرير.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "حدث خطأ أثناء إنشاء التقرير الذكي.";
  }
};
