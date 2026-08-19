import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, type Easing } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle, KeyRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Premium easing curve
const premiumEase: Easing = [0.4, 0, 0.2, 1];

// Floating particles for background
const FloatingParticle = ({ delay, duration, size, x, y }: { delay: number; duration: number; size: number; x: string; y: string }) => (
  <motion.div
    className="absolute rounded-full bg-foreground/5"
    style={{ width: size, height: size, left: x, top: y }}
    animate={{
      y: [0, -30, 0],
      opacity: [0.3, 0.6, 0.3],
      scale: [1, 1.1, 1],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: premiumEase,
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: premiumEase,
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: premiumEase },
  },
};

const glowVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1, ease: premiumEase },
  },
};

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { resetPassword, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: 'Error',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    const success = await resetPassword(email);

    if (success) {
      setIsSubmitted(true);
      toast({
        title: 'Email Sent!',
        description: 'Check your inbox for password reset instructions.',
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to send reset email. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <motion.div
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-gradient-to-br from-foreground/5 to-transparent blur-3xl"
          variants={glowVariants}
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-gradient-to-tl from-foreground/5 to-transparent blur-3xl"
          variants={glowVariants}
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Floating Particles */}
        <FloatingParticle delay={0} duration={6} size={8} x="10%" y="20%" />
        <FloatingParticle delay={1} duration={8} size={6} x="85%" y="15%" />
        <FloatingParticle delay={2} duration={7} size={10} x="70%" y="70%" />
        <FloatingParticle delay={0.5} duration={9} size={5} x="20%" y="80%" />
        <FloatingParticle delay={1.5} duration={6} size={7} x="90%" y="50%" />
        <FloatingParticle delay={3} duration={8} size={4} x="5%" y="50%" />
        <FloatingParticle delay={2.5} duration={7} size={8} x="50%" y="10%" />
        <FloatingParticle delay={4} duration={10} size={6} x="40%" y="90%" />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--foreground)/0.02)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* Back to Home - Fixed Position */}
      <motion.div
        className="fixed top-6 left-6 z-50"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: premiumEase }}
      >
        <Link to="/">
          <motion.div
            className="text-xl font-bold tracking-[0.2em] uppercase text-foreground"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            SWITCH
          </motion.div>
        </Link>
      </motion.div>

      {/* Main Card */}
      <motion.div
        className="relative z-10 w-full max-w-md mx-4"
        variants={cardVariants}
      >
        {/* Card Glow Effect */}
        <motion.div
          className="absolute -inset-1 bg-gradient-to-r from-foreground/10 via-foreground/5 to-foreground/10 rounded-3xl blur-xl opacity-50"
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Card Content */}
        <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 md:p-10 shadow-2xl">
          {/* Back Link */}
          <motion.div variants={itemVariants}>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
            >
              <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
              <span>Back to login</span>
            </Link>
          </motion.div>

          <AnimatePresence mode="wait">
            {!isSubmitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: premiumEase }}
              >
                {/* Header */}
                <motion.div className="text-center mb-8" variants={itemVariants}>
                  <motion.div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-foreground/5 border border-border/50 mb-6"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.3, ease: premiumEase }}
                  >
                    <KeyRound size={28} className="text-foreground/70" />
                  </motion.div>

                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
                    Forgot password?
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    No worries, we'll send you reset instructions.
                  </p>
                </motion.div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  <motion.div variants={itemVariants}>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors duration-300 group-focus-within:text-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-12 pl-12 pr-4 bg-background/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground/30 transition-all duration-300"
                        placeholder="Enter your email"
                      />
                    </div>
                  </motion.div>

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-foreground text-background font-medium rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all duration-300"
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isLoading ? (
                      <motion.span
                        className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      'Reset Password'
                    )}
                  </motion.button>
                </form>

                {/* Footer */}
                <motion.p
                  className="text-center mt-8 text-sm text-muted-foreground"
                  variants={itemVariants}
                >
                  Remember your password?{' '}
                  <Link
                    to="/auth"
                    className="text-foreground font-medium hover:underline underline-offset-4"
                  >
                    Sign in
                  </Link>
                </motion.p>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: premiumEase }}
                className="text-center"
              >
                {/* Success Icon */}
                <motion.div
                  className="w-20 h-20 bg-foreground/5 border border-border/50 rounded-full flex items-center justify-center mx-auto mb-6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    <CheckCircle className="w-10 h-10 text-foreground" />
                  </motion.div>
                </motion.div>

                <motion.h1
                  className="text-3xl font-bold mb-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  Check your email
                </motion.h1>

                <motion.p
                  className="text-muted-foreground mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  We sent a password reset link to
                  <br />
                  <span className="text-foreground font-medium">{email}</span>
                </motion.p>

                <motion.p
                  className="text-sm text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                >
                  Didn't receive the email?{' '}
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-foreground font-medium hover:underline underline-offset-4"
                  >
                    Click to resend
                  </button>
                </motion.p>

                <motion.div
                  className="mt-8 pt-6 border-t border-border/50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                >
                  <Link to="/auth">
                    <motion.button
                      type="button"
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <ArrowLeft size={16} />
                      <span>Back to login</span>
                    </motion.button>
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ForgotPassword;
