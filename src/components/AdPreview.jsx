import { useState, useEffect, useRef } from 'react';

const CTA_LABELS = {
  LEARN_MORE: 'Learn More', SHOP_NOW: 'Shop Now', SIGN_UP: 'Sign Up',
  CONTACT_US: 'Contact Us', DOWNLOAD: 'Download', GET_OFFER: 'Get Offer',
  SUBSCRIBE: 'Subscribe', APPLY_NOW: 'Apply Now', ORDER_NOW: 'Order Now',
  WHATSAPP_MESSAGE: 'Send Message', NO_BUTTON: '',
};

function CardMedia({ file }) {
  const [url, setUrl] = useState(null);
  const isImage = file?.type?.startsWith('image/');

  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  if (!url) return <div className="w-full h-full bg-bg" />;
  return isImage
    ? <img src={url} alt="" className="w-full h-full object-cover" />
    : <video src={url} className="w-full h-full object-cover" muted />;
}

export default function AdPreview({ file, files, primaryText, headline, description, cta, pageName, websiteUrl, isCarousel, cards }) {
  const [placement, setPlacement] = useState('feed');
  const [activeCard, setActiveCard] = useState(0);
  const scrollRef = useRef(null);

  const domain = (() => {
    try { return new URL(websiteUrl).hostname; } catch { return 'example.com'; }
  })();

  const hasContent = isCarousel ? (files && files.length > 0) : !!file;

  if (!hasContent) {
    return (
      <div className="text-center py-10 text-text-secondary text-xs">
        Carica delle creative per vedere l'anteprima
      </div>
    );
  }

  const carouselCards = isCarousel && cards ? cards : [];

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const cardWidth = el.firstChild?.offsetWidth || 200;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setActiveCard(idx);
  };

  const scrollTo = (idx) => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.firstChild?.offsetWidth || 200;
    scrollRef.current.scrollTo({ left: idx * cardWidth, behavior: 'smooth' });
    setActiveCard(idx);
  };

  return (
    <div className="space-y-3">
      {/* Placement toggle */}
      <div className="flex gap-1 bg-bg rounded-lg p-0.5 w-fit">
        <button type="button" onClick={() => setPlacement('feed')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${placement === 'feed' ? 'bg-white shadow-sm text-text' : 'text-text-secondary hover:text-text'}`}>
          Facebook Feed
        </button>
        <button type="button" onClick={() => setPlacement('story')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${placement === 'story' ? 'bg-white shadow-sm text-text' : 'text-text-secondary hover:text-text'}`}>
          Instagram Story
        </button>
      </div>

      {placement === 'feed' ? (
        /* ========== FACEBOOK FEED PREVIEW ========== */
        <div className="bg-white rounded-xl border border-border overflow-hidden max-w-[340px]">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              <span className="text-accent text-xs font-bold">{(pageName || 'P')[0].toUpperCase()}</span>
            </div>
            <div>
              <p className="text-xs font-semibold leading-tight">{pageName || 'Your Page'}</p>
              <p className="text-[10px] text-text-secondary leading-tight">Sponsored</p>
            </div>
            <div className="ml-auto">
              <svg className="w-4 h-4 text-text-secondary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>

          {/* Primary text */}
          {primaryText && (
            <div className="px-3 pb-2">
              <p className="text-xs leading-relaxed whitespace-pre-wrap line-clamp-3">{primaryText}</p>
            </div>
          )}

          {isCarousel && carouselCards.length > 0 ? (
            /* ---- Carousel media ---- */
            <>
              <div className="relative">
                <div
                  ref={scrollRef}
                  onScroll={handleScroll}
                  className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {carouselCards.map((card, i) => (
                    <div key={i} className="flex-shrink-0 w-full snap-center">
                      <div className="aspect-square bg-bg relative">
                        <CardMedia file={card.file} />
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 bg-[#f0f2f5]">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-text-secondary uppercase tracking-wide truncate">{domain}</p>
                          {card.headline && <p className="text-xs font-semibold truncate leading-tight mt-0.5">{card.headline}</p>}
                          {card.description && <p className="text-[10px] text-text-secondary truncate leading-tight mt-0.5">{card.description}</p>}
                        </div>
                        {card.cta && card.cta !== 'NO_BUTTON' && (
                          <button className="ml-2 px-3 py-1.5 bg-[#e4e6eb] rounded text-xs font-semibold flex-shrink-0">
                            {CTA_LABELS[card.cta] || card.cta}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Arrows */}
                {carouselCards.length > 1 && activeCard > 0 && (
                  <button onClick={() => scrollTo(activeCard - 1)}
                    className="absolute left-1.5 top-[40%] -translate-y-1/2 w-7 h-7 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                )}
                {carouselCards.length > 1 && activeCard < carouselCards.length - 1 && (
                  <button onClick={() => scrollTo(activeCard + 1)}
                    className="absolute right-1.5 top-[40%] -translate-y-1/2 w-7 h-7 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                )}
              </div>

              {/* Dots */}
              {carouselCards.length > 1 && (
                <div className="flex justify-center gap-1 py-2">
                  {carouselCards.map((_, i) => (
                    <button key={i} onClick={() => scrollTo(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${i === activeCard ? 'bg-accent' : 'bg-border'}`} />
                  ))}
                </div>
              )}
            </>
          ) : (
            /* ---- Single media ---- */
            <>
              <div className="aspect-square bg-bg relative">
                <CardMedia file={file} />
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 bg-[#f0f2f5]">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-text-secondary uppercase tracking-wide truncate">{domain}</p>
                  {headline && <p className="text-xs font-semibold truncate leading-tight mt-0.5">{headline}</p>}
                  {description && <p className="text-[10px] text-text-secondary truncate leading-tight mt-0.5">{description}</p>}
                </div>
                {cta && cta !== 'NO_BUTTON' && (
                  <button className="ml-2 px-3 py-1.5 bg-[#e4e6eb] rounded text-xs font-semibold flex-shrink-0">
                    {CTA_LABELS[cta] || cta}
                  </button>
                )}
              </div>
            </>
          )}

          {/* Reactions bar */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 text-text-secondary">
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                Like
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                Comment
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                Share
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ========== INSTAGRAM STORY PREVIEW ========== */
        <div className="relative bg-black rounded-2xl overflow-hidden max-w-[240px]" style={{ aspectRatio: '9/16' }}>
          {isCarousel && carouselCards.length > 0 ? (
            <CardMedia file={carouselCards[activeCard]?.file} />
          ) : (
            <CardMedia file={file} />
          )}

          {/* Story top bar */}
          <div className="absolute top-0 left-0 right-0 p-2.5 bg-gradient-to-b from-black/50 to-transparent">
            {/* Progress bars */}
            <div className="flex gap-0.5 mb-2">
              {isCarousel && carouselCards.length > 1 ? (
                carouselCards.map((_, i) => (
                  <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${i <= activeCard ? 'bg-white w-full' : 'w-0'}`} />
                  </div>
                ))
              ) : (
                <div className="flex-1 h-0.5 bg-white/30 rounded-full">
                  <div className="w-1/3 h-full bg-white rounded-full" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[9px] font-bold">{(pageName || 'P')[0].toUpperCase()}</span>
              </div>
              <p className="text-white text-[10px] font-semibold">{pageName || 'Your Page'}</p>
              <p className="text-white/60 text-[9px]">Sponsored</p>
            </div>
          </div>

          {/* Tap areas for carousel stories */}
          {isCarousel && carouselCards.length > 1 && (
            <>
              <div className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer" onClick={() => setActiveCard(Math.max(0, activeCard - 1))} />
              <div className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer" onClick={() => setActiveCard(Math.min(carouselCards.length - 1, activeCard + 1))} />
            </>
          )}

          {/* Bottom CTA */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8">
            {primaryText && (
              <p className="text-white text-[10px] leading-relaxed mb-2 line-clamp-2">{primaryText}</p>
            )}
            {(() => {
              const activeCta = isCarousel && carouselCards[activeCard]?.cta ? carouselCards[activeCard].cta : cta;
              return activeCta && activeCta !== 'NO_BUTTON' ? (
                <div className="flex items-center justify-center">
                  <div className="bg-white rounded-full px-4 py-1.5 text-center">
                    <p className="text-xs font-semibold">{CTA_LABELS[activeCta] || activeCta}</p>
                  </div>
                </div>
              ) : null;
            })()}
            <div className="flex justify-center mt-2">
              <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
