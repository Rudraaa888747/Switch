import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function HeroCinematic() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });

  const imageScale = useTransform(scrollYProgress, [0, 0.22], [1, 1.08]);
  const imageY = useTransform(scrollYProgress, [0, 0.22], [0, -28]);
  const copyY = useTransform(scrollYProgress, [0, 0.18], [0, -16]);
  const videoScale = useTransform(scrollYProgress, [0.25, 0.75], [1.08, 1]);
  const videoY = useTransform(scrollYProgress, [0.25, 0.75], [26, -18]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    const onCanPlay = () => {
      if (cancelled) return;
      setVideoReady(true);
      video.play().catch(() => {});
    };

    video.addEventListener('canplay', onCanPlay);
    if (video.readyState >= 3) {
      onCanPlay();
    }

    return () => {
      cancelled = true;
      video.removeEventListener('canplay', onCanPlay);
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative w-full overflow-hidden bg-black md:-mt-20">
      <div className="md:hidden">
        <section className="relative flex min-h-[100dvh] items-end overflow-hidden bg-black">
          <motion.div className="absolute inset-0 gpu-layer" style={{ scale: imageScale, y: imageY }}>
            <div className="h-full w-full bg-neutral-900">
              <img
                src="/hero/hero-image.png"
                alt="SWITCH luxury collection"
                loading="eager"
                fetchPriority="high"
                onLoad={() => setImageLoaded(true)}
                className="h-full w-full object-cover object-[center_28%]"
                style={{
                  filter: imageLoaded ? 'blur(0px)' : 'blur(24px)',
                  opacity: imageLoaded ? 1 : 0,
                  transition: 'filter 1.2s cubic-bezier(0.83, 0, 0.17, 1), opacity 1.2s cubic-bezier(0.83, 0, 0.17, 1)'
                }}
              />
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.28)_35%,rgba(0,0,0,0.76)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_35%)]" />
          </motion.div>

          <motion.div className="relative z-10 w-full px-6 pb-[calc(var(--mobile-content-bottom)+2.5rem)] pt-32 text-center" style={{ y: copyY }}>
            <div className="mx-auto max-w-[18rem]">
              <p className="mb-5 text-[10px] uppercase tracking-[0.32em] text-white/60">SWITCH Studio Drop</p>
              <h1 className="text-[clamp(1.8rem,7.5vw,3rem)] font-light leading-[1.05] tracking-[0.14em] text-white">ENGINEERED FOR MODERN MOVEMENT</h1>
              <p className="mx-auto mb-8 max-w-[16rem] text-sm leading-relaxed text-white/65">
                Elevated essentials with cinematic presence, editorial balance, and native-app ease.
              </p>
              <Link
                to="/shop"
                className="tap-lift touch-pill btn-shine inline-flex items-center gap-2 bg-foreground px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.24em] text-background shadow-[0_24px_48px_-26px_rgba(0,0,0,0.7)]"
              >
                Explore Drop
                <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>
        </section>

        <section className="relative min-h-[100dvh] overflow-hidden bg-black">
          <motion.div className="absolute inset-0 gpu-layer" style={{ scale: videoScale, y: videoY }}>
            <div className="absolute inset-0 bg-neutral-950" style={{ opacity: videoReady ? 0 : 1, transition: 'opacity 1.2s cubic-bezier(0.83, 0, 0.17, 1)' }} />
            <img
              src="/hero/hero-image.png"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover object-center"
              style={{
                filter: videoReady ? 'blur(10px)' : 'blur(0px)',
                opacity: videoReady ? 0 : 1,
                transition: 'opacity 1.2s cubic-bezier(0.83, 0, 0.17, 1), filter 1.2s cubic-bezier(0.83, 0, 0.17, 1)'
              }}
            />
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              loop
              preload="auto"
              poster="/hero/hero-image.png"
              className="absolute inset-0 h-full w-full object-cover object-center"
              style={{
                opacity: videoReady ? 1 : 0,
                transition: 'opacity 1.2s cubic-bezier(0.83, 0, 0.17, 1)',
                transform: 'translateZ(0)',
              }}
              disablePictureInPicture
              controls={false}
            >
              <source src="/hero/hero.webm" type="video/webm" />
              <source src="/hero/hero.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.38)_0%,rgba(0,0,0,0.18)_28%,rgba(0,0,0,0.6)_100%)]" />
          </motion.div>


        </section>
      </div>

      <section className="relative hidden h-screen w-full overflow-hidden bg-black md:block">
        <div className="flex h-full w-full">
          <div className="relative h-full w-1/2 overflow-hidden bg-neutral-900">
            <img
              src="/hero/hero-image.png"
              alt="SWITCH Collection"
              className="h-full w-full object-cover"
              loading="eager"
              onLoad={() => setImageLoaded(true)}
            />
          </div>

          <div className="relative h-full w-1/2 overflow-hidden bg-neutral-900">
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900" style={{ opacity: videoReady ? 0 : 1, transition: 'opacity 1.2s cubic-bezier(0.83, 0, 0.17, 1)' }}>
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/10">Loading</span>
            </div>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              loop
              preload="auto"
              poster="/hero/hero-image.png"
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                opacity: videoReady ? 1 : 0,
                transition: 'opacity 1.2s cubic-bezier(0.83, 0, 0.17, 1)',
                transform: 'translateZ(0)',
              }}
              disablePictureInPicture
              controls={false}
            >
              <source src="/hero/hero.webm" type="video/webm" />
              <source src="/hero/hero.mp4" type="video/mp4" />
            </video>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/5" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/10" />
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="pointer-events-auto max-w-3xl px-6 text-center">
            <h1 className="mb-6 text-4xl font-light leading-tight tracking-[0.12em] text-white md:text-6xl lg:text-7xl md:tracking-[0.15em]">
              ENGINEERED FOR
              <br />
              MODERN MOVEMENT
            </h1>
            <p className="mx-auto mb-10 max-w-md text-sm font-light leading-relaxed tracking-wide text-white/65 md:text-base">
              Premium essentials crafted for motion, comfort, and elevated everyday wear.
            </p>
            <Link
              to="/shop"
              className="group inline-flex items-center gap-2 bg-foreground px-10 py-4 text-xs font-medium uppercase tracking-[0.15em] text-background transition-all duration-500 hover:bg-foreground/90"
            >
              Explore Drop
              <ArrowRight size={14} className="transition-transform duration-500 ease-[cubic-bezier(0.83,0,0.17,1)] group-hover:translate-x-1.5" />
            </Link>
          </div>
        </div>
      </section>
    </section>
  );
}
