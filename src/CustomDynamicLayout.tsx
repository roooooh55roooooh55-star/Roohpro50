import React, { useMemo } from 'react';
import { Video, UserInteractions } from './types';
import { InteractiveMarquee, VideoCardThumbnail, formatVideoSource, getNeonColor, SafeAutoPlayVideo } from './MainContent';

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
  
  // Advanced distribution logic to ensure NO duplicates unless necessary
  const distributedContent = useMemo(() => {
    const usedIds = new Set<string>();
    const distribution: Record<string, Video[]> = {};

    const shortsOnly = videos.filter(v => v.video_type === 'Shorts');
    const longsOnly = videos.filter(v => v.video_type === 'Long Video');

    // Helper to pick unique videos first
    const pickVideos = (pool: Video[], count: number): Video[] => {
        if (!pool || pool.length === 0) return [];

        const available = pool.filter(v => !usedIds.has(v.id));
        
        let selected = available.slice(0, count);
        selected.forEach(v => usedIds.add(v.id));

        // Recycle if needed
        if (selected.length < count) {
            const needed = count - selected.length;
            const recycled = pool.filter(v => !selected.includes(v)).sort(() => 0.5 - Math.random());
            selected = [...selected, ...recycled.slice(0, needed)];
        }

        return selected;
    };

    sections.forEach((section, index) => {
        const key = section.id || `section-${index}`;
        
        if (section.type === 'long_video') {
            distribution[key] = pickVideos(longsOnly, 1);
        } else if (section.type === 'shorts_grid') {
            distribution[key] = pickVideos(shortsOnly, 4);
        } else if (section.type === 'long_slider') {
            distribution[key] = pickVideos(longsOnly, 10);
        } else if (section.type === 'slider_left' || section.type === 'slider_right') {
             distribution[key] = pickVideos(videos, 10);
        }
    });

    return distribution;
  }, [sections, videos]);

  return (
    <div className="w-full flex flex-col p-2 pb-24 animate-in fade-in duration-700 min-h-screen">
      {sections.map((section, idx) => {
        const key = section.id || `section-${idx}`;
        const sectionVideos = distributedContent[key] || [];

        if (sectionVideos.length === 0) return null;

        return (
            <div 
            key={key} 
            className="mx-auto overflow-visible rounded-3xl transition-all duration-500 relative z-10"
            style={{ 
                width: `${section.width}%`, 
                height: section.height ? `${section.height}px` : 'auto',
                minHeight: section.type.includes('slider') ? 'auto' : `${section.height}px`,
                marginTop: `${section.marginTop || 0}px`,
                marginBottom: '20px'
            }}
            >
            {/* --- LONG VIDEO BLOCK --- */}
            {section.type === 'long_video' && sectionVideos[0] && (
                <div className="w-full h-full relative group">
                    <div onClick={() => onPlayLong(sectionVideos[0])} className="w-full h-full">
                        <VideoCardThumbnail 
                        video={sectionVideos[0]} 
                        interactions={interactions} 
                        isOverlayActive={isOverlayActive} 
                        onLike={onLike}
                        onCategoryClick={onCategoryClick}
                        />
                    </div>
                </div>
            )}

            {/* --- SHORTS GRID (2x2) --- */}
            {section.type === 'shorts_grid' && (
                <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-2">
                {sectionVideos.slice(0, 4).map((v, i) => {
                    const isLiked = interactions?.likedIds?.includes(v.id);
                    const neonStyle = getNeonColor(v.id, i + idx); 
                    return (
                    <div key={v.id} onClick={() => onPlayShort(v, videos.filter(x => x.video_type === 'Shorts'))} className={`rounded-xl overflow-hidden relative border-2 ${neonStyle.border} bg-black`}>
                        <SafeAutoPlayVideo 
                            src={formatVideoSource(v)} 
                            poster={v.poster_url || undefined}
                            className="w-full h-full object-cover" 
                            muted 
                            loop 
                            playsInline 
                        />
                        
                        <div className="absolute top-1 right-1 z-20">
                            <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                onLike(v.id); 
                            }}
                            className={`p-1.5 rounded-lg backdrop-blur-md border transition-all active:scale-75 ${isLiked ? 'bg-red-600/60 border-red-500 text-white shadow-none' : 'bg-black/40 border-white/20 text-gray-300 hover:text-white hover:border-white/50'}`}
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
                {/* LABEL REMOVED */}
                <InteractiveMarquee 
                    videos={sectionVideos} 
                    onPlay={(v) => v.video_type === 'Shorts' ? onPlayShort(v, videos) : onPlayLong(v)} 
                    direction="left-to-right" 
                    interactions={interactions}
                    isShorts={true}
                    transparent={true} 
                    onLike={onLike}
                />
                </div>
            )}

            {/* --- SLIDER RIGHT TO LEFT (SHORTS) --- */}
            {section.type === 'slider_right' && (
                <div className="w-full h-full flex flex-col justify-center py-2">
                {/* LABEL REMOVED */}
                <InteractiveMarquee 
                    videos={sectionVideos} 
                    onPlay={(v) => v.video_type === 'Shorts' ? onPlayShort(v, videos) : onPlayLong(v)} 
                    direction="right-to-left" 
                    interactions={interactions}
                    isShorts={true} 
                    transparent={true} 
                    onLike={onLike}
                />
                </div>
            )}

            {/* --- LONG VIDEO SLIDER --- */}
            {section.type === 'long_slider' && (
                <div className="w-full h-full flex flex-col justify-center py-2">
                {/* LABEL REMOVED */}
                <InteractiveMarquee 
                    videos={sectionVideos} 
                    onPlay={(v) => onPlayLong(v)} 
                    direction="right-to-left" 
                    interactions={interactions}
                    isShorts={false} 
                    transparent={true} 
                    onLike={onLike}
                />
                </div>
            )}
            </div>
        );
      })}
    </div>
  );
};

export default CustomDynamicLayout;