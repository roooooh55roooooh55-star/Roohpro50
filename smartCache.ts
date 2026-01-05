import { Video } from './types';

// حجم الجزء الذي سيتم تحميله (1.5 ميجابايت يكفي لـ 5-8 ثواني بجودة جيدة)
const BUFFER_SIZE = 1.5 * 1024 * 1024; 

export const initSmartBuffering = async (videos: Video[]) => {
  if (!navigator.onLine || !videos || videos.length === 0) return;

  // التركيز على أول 5 فيديوهات لعدم إرهاق المتصفح، مع إعطاء أولوية للسرعة
  const queue = [...videos].slice(0, 5); 

  const bufferNext = async (index: number) => {
    if (index >= queue.length) return;

    const video = queue[index];
    if (!video || !video.video_url || !video.video_url.startsWith('http')) {
        await bufferNext(index + 1);
        return;
    }

    try {
        const publicURL = video.video_url;

        // Use fetch with Range header to get the first chunk
        const response = await fetch(publicURL, {
            headers: {
                // طلب أول 1.5 ميجا بايت فقط (وهي ما تعادل تقريباً 7-10 ثوانٍ)
                'Range': `bytes=0-${BUFFER_SIZE}`
            },
            mode: 'cors' 
        });

        if (response.ok || response.status === 206) {
            const blob = await response.blob();
            // Store this part in the 'video-previews' cache for instant reuse
            const cache = await caches.open('video-previews');
            await cache.put(publicURL, new Response(blob));
            // console.log("تم تجهيز أول 7 ثوانٍ بنجاح!");
        }
    } catch (e) {
      // console.warn(`Skipped buffering for ${video.id}`, e);
    }

    // الانتقال للفيديو التالي في القائمة
    await bufferNext(index + 1);
  };

  // بدء السلسلة
  bufferNext(0);
};