
import React, { useMemo } from 'react';
import { Video, UserInteractions } from './types';
import { InteractiveMarquee, VideoCardThumbnail, formatVideoSource, getNeonColor } from './MainContent';

interface CustomDynamicLayoutProps {
  sections: any[];
  videos: Video[];
  interactions: UserInteractions;
  onPlayShort: (v: Video, list: Video[]) => void;
  onPlayLong: (v: Video) => void;
  onCategoryClick: (cat: string) => void;
  onLike: (id: string) => void;
  isOverlayActive: boolean;
}

const CustomDynamicLayout: React.FC<CustomDynamicLayoutProps> = ({ 
  sections, 
  videos, 
  interactions, 
  onPlayShort, 
  onPlayLong, 
  onCategoryClick,
  onLike,
  isOverlayActive
}) => {
  
  // Helper to get random unique videos for each section to avoid repetition
  const getVideosForSection = (count: number, type: 'Shorts' | 'Long Video' | 'Mixed') => {
    let filtered = videos;
    if (type !== 'Mixed') {
      filtered = videos.filter(v => v.video_type === type);
    }
    // Shuffle and slice
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  return (
    <div className="w-full flex flex-col p-2 pb-24 animate-in fade-in duration-700 min-h-screen">
      {sections.map((section, idx) => (
        <div 
          key={section.id || idx} 
          className="mx-auto overflow-visible rounded-3xl transition-all duration-500 relative z-10"
          style={{ 
            width: `${section.width}%`, 
            height: section.height ? `${section.height}px` : 'auto',
            minHeight: section.type.includes('slider') ? 'auto' : `${section.height}px`,
            marginTop: `${section.marginTop || 0}px`, // Vertical Shift Logic
            marginBottom: '20px' // Base spacing
          }}
        >
          {/* --- LONG VIDEO BLOCK --- */}
          {section.type === 'long_video' && (
            <div className="w-full h-full relative group">
               {getVideosForSection(1, 'Long Video').map(v => (
                 <div key={v.id} onClick={() => onPlayLong(v)} className="w-full h-full">
                    <VideoCardThumbnail 
                      video={v} 
                      interactions={interactions} 
                      isOverlayActive={isOverlayActive} 
                      onLike={onLike}
                      onCategoryClick={onCategoryClick}
                    />
                 </div>
               ))}
            </div>
          )}

          {/* --- SHORTS GRID (2x2) --- */}
          {section.type === 'shorts_grid' && (
            <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-2">
               {getVideosForSection(4, 'Shorts').map(v => {
                 const isLiked = interactions?.likedIds?.includes(v.id);
                 const neonStyle = getNeonColor(v.id);
                 return (
                   <div key={v.id} onClick={() => onPlayShort(v, videos.filter(x => x.video_type === 'Shorts'))} className={`rounded-xl overflow-hidden relative border-2 ${neonStyle}`}>
                      <video src={formatVideoSource(v)} className="w-full h-full object-cover" muted loop playsInline autoPlay />
                      
                      {/* Heart Button Overlay */}
                      <div className="absolute top-1 right-1 z-20">
                         <button 
                           onClick={(e) => { 
                              e.stopPropagation(); 
                              onLike(v.id); 
                           }}
                           className={`p-1.5 rounded-lg backdrop-blur-md border transition-all active:scale-75 ${isLiked ? 'bg-red-600/60 border-red-500 text-white shadow-[0_0_10px_red]' : 'bg-black/40 border-white/20 text-gray-300 hover:text-white hover:border-white/50'}`}
                         >
                           <svg className="w-3 h-3" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                         </button>
                      </div>

                      <div className="absolute bottom-1 left-1 right-1 text-[8px] font-bold text-white truncate text-center drop-shadow-md">{v.title}</div>
                   </div>
                 );
               })}
            </div>
          )}

          {/* --- SLIDER LEFT TO RIGHT (SHORTS) --- */}
          {section.type === 'slider_left' && (
            <div className="w-full h-full flex flex-col justify-center py-2">
               {section.label && (
                 <div className="px-2 mb-1 flex items-center gap-2">
                    <div className="w-1.5 h-3 bg-emerald-500 rounded-full"></div>
                    <h3 className="text-[10px] font-black text-white">{section.label}</h3>
                 </div>
               )}
               <InteractiveMarquee 
                 videos={getVideosForSection(10, 'Mixed')} 
                 onPlay={(v) => v.video_type === 'Shorts' ? onPlayShort(v, videos) : onPlayLong(v)} 
                 direction="left-to-right" 
                 interactions={interactions}
                 isShorts={true}
                 transparent={true} // Clean Look
                 onLike={onLike}
               />
            </div>
          )}

          {/* --- SLIDER RIGHT TO LEFT (SHORTS) --- */}
          {section.type === 'slider_right' && (
            <div className="w-full h-full flex flex-col justify-center py-2">
               {section.label && (
                 <div className="px-2 mb-1 flex items-center gap-2">
                    <div className="w-1.5 h-3 bg-purple-500 rounded-full"></div>
                    <h3 className="text-[10px] font-black text-white">{section.label}</h3>
                 </div>
               )}
               <InteractiveMarquee 
                 videos={getVideosForSection(10, 'Mixed')} 
                 onPlay={(v) => v.video_type === 'Shorts' ? onPlayShort(v, videos) : onPlayLong(v)} 
                 direction="right-to-left" 
                 interactions={interactions}
                 isShorts={true} // Actually mixed but styled as portraits usually
                 transparent={true} // Clean Look
                 onLike={onLike}
               />
            </div>
          )}

          {/* --- LONG VIDEO SLIDER (NEW) --- */}
          {section.type === 'long_slider' && (
            <div className="w-full h-full flex flex-col justify-center py-2">
               {section.label && (
                 <div className="px-2 mb-1 flex items-center gap-2">
                    <div className="w-1.5 h-3 bg-red-600 rounded-full"></div>
                    <h3 className="text-[10px] font-black text-white">{section.label}</h3>
                 </div>
               )}
               <InteractiveMarquee 
                 videos={getVideosForSection(10, 'Long Video')} 
                 onPlay={(v) => onPlayLong(v)} 
                 direction="right-to-left" 
                 interactions={interactions}
                 isShorts={false} // Wide landscape mode
                 transparent={true} // Clean Look
                 onLike={onLike}
               />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CustomDynamicLayout;
