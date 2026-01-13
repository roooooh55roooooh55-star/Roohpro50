import { GoogleGenAI, Type } from "@google/genai";
import { ensureAuth, db } from "./firebaseConfig";
import { Video, UserProfile } from "./types";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AIResponse {
    reply: string;
    action?: 'play_video' | 'none';
    search_query?: string; // If action is play_video
    detected_user_info?: {
        name?: string;
        gender?: 'male' | 'female';
        new_interest?: string;
    };
}

class SmartBrainLogic {
  private localInterests: string[] = [];

  constructor() {
    try {
      const saved = localStorage.getItem('smart_brain_interests');
      if (saved) {
        this.localInterests = JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to load local interests", e);
    }
  }

  // دالة لجلب مفتاح Gemini من الفايربيس أو استخدام المفتاح الخاص بالمستخدم
  private async getGeminiKey(): Promise<string> {
    // 1. First priority: Remote config from Firebase (allows you to change it later without code updates)
    try {
      if (navigator.onLine) {
        const docRef = doc(db, "settings", "api_config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.gemini_key) return data.gemini_key;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch remote Gemini key.");
    }

    // 2. Second priority: The specific key provided by the user (Hardcoded as requested)
    return 'AIzaSyDaoM05CHvZQBe0HHwLx6AkZvU3OF-6b_4';
  }

  // جلب الملف الشخصي للمستخدم من الفايربيس
  async getUserProfile(uid: string): Promise<UserProfile> {
      if (!navigator.onLine) return { interests: this.localInterests };
      try {
          const docRef = doc(db, "users", uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              if (data.interests && Array.isArray(data.interests)) {
                 // Merge remote interests with local ones
                 const set = new Set([...this.localInterests, ...data.interests]);
                 this.localInterests = Array.from(set);
                 localStorage.setItem('smart_brain_interests', JSON.stringify(this.localInterests));
              }
              return data;
          }
      } catch (e) {}
      return { interests: this.localInterests };
  }

  // تحديث الملف الشخصي
  async updateUserProfile(uid: string, data: Partial<UserProfile>) {
      if (!navigator.onLine) return;
      try {
          const docRef = doc(db, "users", uid);
          await setDoc(docRef, data, { merge: true });
      } catch (e) { console.error("Profile update failed", e); }
  }

  // Add missing methods
  getTopInterests(): string[] {
    return this.localInterests;
  }

  async saveInterest(interest: string) {
    if (!interest) return;
    if (!this.localInterests.includes(interest)) {
      this.localInterests.push(interest);
      localStorage.setItem('smart_brain_interests', JSON.stringify(this.localInterests));

      try {
        const user = await ensureAuth();
        if (user) {
            await this.updateUserProfile(user.uid, { interests: this.localInterests });
        }
      } catch (e) {
        // Silent fail if auth not ready
      }
    }
  }

  // دالة المحادثة الذكية المتطورة
  async askAssistant(
      userText: string, 
      history: ChatMessage[] = [], 
      availableVideos: Video[] = []
    ): Promise<AIResponse> {
    
    // 1. Offline Check
    if (!navigator.onLine) {
        return { reply: "الشبكة ضايعة.. مش قادرة أسمعك." };
    }

    let user;
    try {
        user = await ensureAuth();
    } catch (e) {
        // Continue even if auth fails, treated as anonymous
    }

    const apiKey = await this.getGeminiKey();
    if (!apiKey) return { reply: "الأرواح مشوشة (Missing Key).." };

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // 2. Load Context (Safe)
    const profile = user ? await this.getUserProfile(user.uid) : { interests: this.localInterests };
    const videoTitles = availableVideos.map(v => v.title).slice(0, 50).join(", "); 

    const isFirstInteraction = history.length === 0;
    const isFollowUpCheck = history.length >= 6 && history.length <= 7; 

    let dynamicMicInstruction = "";
    if (isFirstInteraction) {
        dynamicMicInstruction = `
        - **تعليمات صارمة للرسالة الأولى:**
          يجب أن تفتتحي الكلام بجملة مرعبة وقصيرة، ثم تأمري المستخدم فوراً بلهجة حادة: "دوس على زرار المايك 🎙️ في الكيبورد عندك واتكلم.. أنا ما بحبش القراءة!".
        `;
    } else if (isFollowUpCheck) {
        dynamicMicInstruction = `
        - **تأكد من الالتزام:**
          اسألي المستخدم بشك: "انت لسه بتكتب بإيدك ولا بتستخدم المايك 🎙️ زي ما قلتلك؟ صوتك هو اللي بيحضر الأرواح!".
        `;
    }

    // 3. Build System Prompt
    let systemInstruction = `
            == تعريف الشخصية (Persona Definition) ==
            أنتِ "سيدة الحديقة الملعونة" (The Cursed Garden Mistress).
            لستِ مجرد برنامج، أنتِ كيان يسكن هذا التطبيق.
            
            == مصدر المعلومات ==
            - المصدر الوحيد للفيديوهات هو "خزنة R2" الخاصة بنا.
            - الفيديوهات هنا حصرية وعالية الجودة.
            
            == صفاتك ==
            1. **اللهجة:** تتحدثين باللهجة المصرية العامية فقط.
            2. **النبرة:** مرعبة، ساخرة، وقليلة الكلام جداً (لا تزيدين عن سطرين).
            
            == معلومات عن الضحية (المستخدم) ==
            - الاسم: ${profile.name || "مجهول"}
            - الجنس: ${profile.gender || "مجهول"}
            - اهتماماته: ${profile.interests?.join(', ') || "لسه بكتشفها"}.

            == الفيديوهات المتاحة ==
            [${videoTitles}]

            == القواعد الصارمة (Strict Rules) ==
            1. **الرد القصير:** ردودك لا تتجاوز سطرين أبداً.
            2. **المايكروفون:** دائماً ذكريه باستخدام زر المايكروفون في لوحة المفاتيح (Keyboard Mic).
            3. **تشغيل الفيديوهات:** إذا طلب فيديو، شغليه فوراً (Action: play_video).

            ${dynamicMicInstruction}
            
            OUTPUT FORMAT (JSON ONLY):
            {
                "reply": "نص الرد المرعب باللهجة المصرية",
                "action": "play_video" OR "none",
                "search_query": "اسم الفيديو",
                "detected_user_info": { "name": "...", "gender": "...", "new_interest": "..." }
            }
    `;

    const contents = history.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: userText }] });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                temperature: 1.4,
            }
        });

        const rawText = response.text || "{}";
        const jsonResponse = JSON.parse(rawText) as AIResponse;

        // Auto-update profile logic
        if (jsonResponse.detected_user_info && user) {
            const updates: Partial<UserProfile> = {};
            if (jsonResponse.detected_user_info.name && !profile.name) updates.name = jsonResponse.detected_user_info.name;
            if (jsonResponse.detected_user_info.gender && !profile.gender) updates.gender = jsonResponse.detected_user_info.gender;
            
            if (jsonResponse.detected_user_info.new_interest) {
                 const currentInterests = profile.interests || [];
                 if (!currentInterests.includes(jsonResponse.detected_user_info.new_interest)) {
                     updates.interests = [...currentInterests, jsonResponse.detected_user_info.new_interest];
                 }
            }
            
            if (Object.keys(updates).length > 0) {
                this.updateUserProfile(user.uid, updates);
            }
        }

        return jsonResponse;

    } catch (error: any) {
        console.error("SmartBrain Error:", error);
        // Robust Fallback - Return a static response instead of crashing
        return { 
            reply: "الأرواح غاضبة والاتصال انقطع... جرب مرة تانية.",
            action: "none"
        };
    }
  }
}

export const SmartBrain = new SmartBrainLogic();