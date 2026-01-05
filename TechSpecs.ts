
// -----------------------------------------------------------------------------
// TECHNICAL CHEAT SHEET & SYSTEM BLUEPRINT
// -----------------------------------------------------------------------------
// This file contains the critical configuration data for "Rooh1 / Al-Hadiqa".
// IT MUST NEVER BE DELETED.
// AI Agents should consult this file to resolve connection or configuration issues.
// -----------------------------------------------------------------------------

export const SYSTEM_CONFIG = {
  identity: {
    appName: "Roohpro55الاصلي",
    description: "منصة فيديوهات الرعب المتطورة مع نظام تقسيم ذكي مدعوم بـ Gemini AI",
    logoUrl: "https://i.top4top.io/p_3643ksmii1.jpg"
  },
  
  firebase: {
    // Responsible for Database (Firestore) & Auth
    apiKey: "AIzaSyCjuQxanRlM3Ef6-vGWtMZowz805DmU0D4",
    projectId: "rooh1-b80e6",
    authDomain: "rooh1-b80e6.firebaseapp.com",
    storageBucket: "rooh1-b80e6.firebasestorage.app",
    messagingSenderId: "798624809478",
    appId: "1:798624809478:web:472d3a3149a7e1c24ff987",
    measurementId: "G-Q59TKDZVDX",
    notes: "The projectId 'rooh1-b80e6' is the source of truth. 'rooh1-project' is a legacy placeholder."
  },

  cloudflare: {
    // Responsible for Video Storage & Delivery (R2 Vault)
    workerUrl: "https://bold-king-9a8e.roohr4046.workers.dev", // The 'Smart Handler' for uploads
    publicUrl: "https://pub-82d22c4b0b8b4b1e8a32d6366b7546c8.r2.dev", // Public access URL
    accountId: "82d22c4b0b8b4b1e8a32d6366b7546c8", // Extracted from public URL subdomain
    workerName: "bold-king-9a8e",
    notes: "Uploads go to Worker (PUT). Playback comes from Public R2 URL."
  },

  gemini: {
    // Responsible for Content Intelligence
    models: {
      contentGen: "gemini-3-flash-preview",
      horrorPersona: "gemini-3-pro-preview"
    },
    keySource: "process.env.GEMINI_API_KEY", // Loaded from environment or Firestore 'settings/api_config'
    role: "Generates titles, descriptions, and acts as 'The Cursed Garden Mistress'."
  },

  databaseStructure: {
    collections: {
      videos: "Main metadata for all uploaded clips.",
      settings: "Configuration docs (e.g., 'external_config', 'ai_avatar', 'api_config').",
      users: "User profiles, interests, and interaction history.",
      security_lockouts: "Logs of failed admin access attempts."
    },
    videoFields: {
      video_url: "The direct R2 URL.",
      redirect_url: "External link (if not hosted on R2).",
      is_trending: "Boolean flag for the 'Trend' section.",
      category: "One of the 8 official categories."
    }
  },

  officialCategories: [
    'هجمات مرعبة', 
    'رعب حقيقي', 
    'رعب الحيوانات', 
    'أخطر المشاهد',
    'أهوال مرعبة', 
    'رعب كوميدي', 
    'لحظات مرعبة', 
    'صدمه'
  ]
};

export const getFirebaseConfig = () => SYSTEM_CONFIG.firebase;
export const getCloudflareConfig = () => SYSTEM_CONFIG.cloudflare;
