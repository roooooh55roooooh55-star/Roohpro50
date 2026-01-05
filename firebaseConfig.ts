import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCjuQxanRlM3Ef6-vGWtMZowz805DmU0D4",
  authDomain: "rooh1-b80e6.firebaseapp.com",
  projectId: "rooh1-b80e6",
  storageBucket: "rooh1-b80e6.firebasestorage.app",
  messagingSenderId: "798624809478",
  appId: "1:798624809478:web:472d3a3149a7e1c24ff987",
  measurementId: "G-Q59TKDZVDX"
};

const app = initializeApp(firebaseConfig);

// نستخدم النسخة البسيطة لتجنب أخطاء الفوترة (Billing) وتقليل التعقيد
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// دالة الدخول التلقائي (ضرورية لعمل التطبيق)
export const ensureAuth = async () => {
  try {
    if (auth.currentUser) return auth.currentUser;
    const result = await signInAnonymously(auth);
    console.log("تم تسجيل الدخول بنجاح:", result.user.uid);
    return result.user;
  } catch (error) {
    console.error("خطأ في المصادقة:", error);
    return null;
  }
};