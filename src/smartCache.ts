import { Video } from './types';

// حجم الجزء الذي سيتم تحميله (3 ميجابايت يكفي لـ 10-15 ثانية بجودة عالية)
const CHUNK_SIZE = 3 * 1024 * 1024; 
const VIDEO_CACHE_NAME = 'rooh-video-previews-v2';

/**
 * يقوم بتحميل أول جزء من الفيديو وتخزينه في الكاش
 * يعود بـ true إذا تم التحميل بنجاح
 */
export const preloadVideoChunk = async (url: string): Promise<boolean> => {
  if (!url || !url.startsWith('http')) return false;

  try {
    const cache = await caches.open(VIDEO_CACHE_NAME);
    const match = await cache.match(url);

    if (match) {
      return true; // موجود بالفعل
    }

    // طلب أول جزء من الملف
    // FIX: Added credentials: 'omit' to prevent CORS errors with R2
    // FIX: Added cache: 'no-store' to ensure we fetch the range specifically
    const response = await fetch(url, {
      headers: {
        'Range': `bytes=0-${CHUNK_SIZE}`
      },
      mode: 'cors',
      credentials: 'omit', 
      cache: 'no-store'
    });

    if (response.ok || response.status === 206) {
      // نقوم بتخزين الاستجابة في الكاش لاستخدامها لاحقاً
      await cache.put(url, response.clone());
      return true;
    }
    return false;
  } catch (e) {
    // Changed to debug to avoid cluttering console with expected network aborts
    console.debug("Smart Cache skipped (Fallback to direct stream):", url.split('/').pop());
    return false;
  }
};

/**
 * الدالة الرئيسية التي تستدعى عند تحديث القائمة
 * تقوم بتحميل أول 5 فيديوهات لضمان سرعة العرض
 */
export const initSmartBuffering = async (videos: Video[]): Promise<void> => {
  if (!navigator.onLine || !videos || videos.length === 0) return;

  // التركيز على الفيديوهات الأولى التي تظهر للمستخدم
  const priorityQueue = videos.slice(0, 5); 

  // تنفيذ التحميل بشكل متوازي
  const promises = priorityQueue.map(video => {
      if (video.video_url) {
          return preloadVideoChunk(video.video_url);
      }
      return Promise.resolve(false);
  });

  await Promise.allSettled(promises);
};

/**
 * تنظيف الكاش القديم لتوفير مساحة الهاتف
 */
export const cleanUpOldCache = async () => {
    try {
        const cache = await caches.open(VIDEO_CACHE_NAME);
        const keys = await cache.keys();
        // إذا زاد عدد الملفات عن 50، احذف الأقدم
        if (keys.length > 50) {
            for (let i = 0; i < keys.length - 20; i++) {
                await cache.delete(keys[i]);
            }
        }
    } catch (e) {}
};