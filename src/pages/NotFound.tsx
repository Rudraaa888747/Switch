import { useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";

const premiumEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 26, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: premiumEase },
  },
};

const NotFound = () => {
  const location = useLocation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const ghostY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const ghostOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.15]);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div ref={sectionRef} className="relative flex min-h-[85vh] items-center justify-center overflow-hidden py-24 md:py-32">
      {/* Ghost watermark */}
      <motion.div
        aria-hidden="true"
        style={{ y: ghostY, opacity: ghostOpacity }}
        className="pointer-events-none absolute inset-0 flex select-none items-center justify-center"
      >
        <motion.span
          initial={{ scale: 1.12, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease: premiumEase }}
          className="font-serif text-[clamp(11rem,42vw,30rem)] font-light leading-none tracking-tighter text-foreground/[0.05]"
        >
          404
        </motion.span>
      </motion.div>

      {/* Ambient gold glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_38%,rgba(201,169,110,0.07),transparent_72%)]" />

      {/* Hairline frame */}
      <div className="pointer-events-none absolute inset-x-4 top-24 hidden md:block md:inset-x-12" aria-hidden="true">
        <div className="h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />
        <div className="mt-4 h-px w-24 bg-gradient-to-r from-[#C9A96E] to-transparent" />
      </div>

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto max-w-2xl px-6 text-center"
      >
        {/* Eyebrow */}
        <motion.div variants={itemVariants} className="mb-8 inline-flex items-center gap-3">
          <span className="h-px w-8 bg-[#C9A96E]" />
          <span className="text-[11px] uppercase tracking-[0.28em] text-[#C9A96E]">Error · Page Not Found</span>
          <span className="h-px w-8 bg-[#C9A96E]" />
        </motion.div>

        {/* Heading */}
        <motion.h1
          variants={itemVariants}
          className="mb-6 font-serif text-[clamp(2.6rem,6vw,4.5rem)] font-light leading-[1.08] tracking-tight text-foreground"
        >
          Even the best wardrobes have a <em className="text-[#C9A96E]">gap</em>.
        </motion.h1>

        {/* Copy */}
        <motion.p
          variants={itemVariants}
          className="mx-auto mb-8 max-w-md text-sm font-light leading-relaxed text-muted-foreground md:text-base"
        >
          The piece you're after may have moved to a new rack — or it never hung here at
          all. Let's get you back to what's new.
        </motion.p>

        {/* Requested route */}
        <motion.div variants={itemVariants} className="mb-10">
          <span className="inline-flex items-center rounded-full border border-border bg-background/60 px-4 py-1.5 font-mono text-[10px] tracking-[0.15em] text-muted-foreground/70">
            {location.pathname}
          </span>
        </motion.div>

        {/* CTAs */}
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/" className="btn-primary group inline-flex items-center gap-2 !px-10 !py-4">
            <ArrowLeft size={14} className="transition-transform duration-300 group-hover:-translate-x-1" />
            Return Home
          </Link>
          <Link to="/shop" className="btn-outline group inline-flex items-center gap-2 !px-10 !py-4">
            Browse the Collection
            <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </motion.div>

        {/* Secondary links */}
        <motion.div variants={itemVariants} className="mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {[
            { label: 'New Arrivals', to: '/shop?filter=new' },
            { label: 'Lookbook', to: '/lookbook' },
            { label: 'How to Use', to: '/how-to-use' },
          ].map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="group inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground transition-colors duration-300 hover:text-foreground"
            >
              {link.label}
              <ArrowRight size={11} className="text-[#C9A96E] transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
