import React from 'react';

export default function TrendingRightPanel() {
  return (
    <div className="p-6 h-full flex flex-col pointer-events-auto sticky top-0">
      <div className="bg-surface rounded-xl p-4 mb-6 relative z-10">
        <div className="font-bold mb-4 text-sm uppercase tracking-widest text-accent">Trending Vibes</div>
        
        <div className="mb-4 block cursor-pointer group">
          <div className="text-muted text-[11px] mb-0.5">Trending in Tech</div>
          <div className="font-mono text-sm text-accent tracking-tighter group-hover:text-pop transition-colors">#chaoticneutral</div>
          <div className="text-muted text-[11px] mt-0.5">4.2k threads</div>
        </div>
        <div className="mb-4 block cursor-pointer group">
          <div className="text-muted text-[11px] mb-0.5">Trending in Lifestyle</div>
          <div className="font-mono text-sm text-accent tracking-tighter group-hover:text-pop transition-colors">#maincharacter</div>
          <div className="text-muted text-[11px] mt-0.5">12.5k threads</div>
        </div>
        <div className="block cursor-pointer group">
          <div className="text-muted text-[11px] mb-0.5">Trending in Culture</div>
          <div className="font-mono text-sm text-accent tracking-tighter group-hover:text-pop transition-colors">#sayitraw</div>
          <div className="text-muted text-[11px] mt-0.5">8.9k threads</div>
        </div>
      </div>

      <div className="bg-surface rounded-xl p-4 border border-pop2 relative z-10">
        <div className="font-bold mb-3 text-[14px] text-accent">AI Vibe Analysis</div>
        <div className="text-[13px] leading-relaxed text-accent/90">
          Your recent posts are tracking as <span className="text-pop2 font-bold">98% authentic</span>. Gemini suggests your next vibe should be <span className="text-pop font-bold">👾 random</span>.
        </div>
        <div className="mt-4 bg-gradient-to-r from-pop via-[#784ba0] to-[#2b86c5] rounded-lg p-2.5 flex items-center justify-center gap-2 text-[11px] font-bold tracking-widest uppercase w-max cursor-pointer hover:opacity-90 text-accent transition-opacity">
          ✦ Generate Caption
        </div>
      </div>
      
      <div className="fixed bottom-5 right-6 font-display text-[48px] opacity-5 pointer-events-none uppercase tracking-tighter whitespace-nowrap z-0 select-none">
        say it raw.
      </div>
    </div>
  )
}
