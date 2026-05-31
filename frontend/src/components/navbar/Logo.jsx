import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';

export default function Logo() {
  const [scrolled, setScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { scrollY } = useScroll();
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const brandName = "COREDEV";
  const academyName = "ACADEMY";

  return (
    <div 
      className="flex items-center select-none focus:outline-none" 
      aria-label="CoreDev Academy home"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        <motion.svg
          width={42}
          height={42}
          viewBox="0 0 100 100"
          initial="initial"
          animate={isHovered ? "hover" : "animate"}
        >
          <defs>
            <filter id="glowBracket">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          <motion.g style={{ transformOrigin: "50% 50%" }}>
            {/* Left Bracket */}
            <motion.path
              d="M 35 25 L 10 50 L 35 75"
              fill="none"
              stroke="#9333EA"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={isHovered ? "url(#glowBracket)" : "none"}
              variants={{
                initial: { pathLength: 0, opacity: 0 },
                animate: { pathLength: 1, opacity: 1, transition: { duration: 0.8, ease: "easeInOut" } },
                hover: { scale: 1.05, stroke: "#A855F7", transition: { duration: 0.2 } }
              }}
            />
            
            {/* Slash */}
            <motion.path
              d="M 60 15 L 40 85"
              fill="none"
              stroke="#0EA5E9"
              strokeWidth="12"
              strokeLinecap="round"
              filter={isHovered ? "url(#glowBracket)" : "none"}
              variants={{
                initial: { pathLength: 0, opacity: 0 },
                animate: { pathLength: 1, opacity: 1, transition: { delay: 0.2, duration: 0.8, ease: "easeInOut" } },
                hover: { scale: 1.05, stroke: "#38BDF8", transition: { duration: 0.2 } }
              }}
            />
            
            {/* Right Bracket */}
            <motion.path
              d="M 65 25 L 90 50 L 65 75"
              fill="none"
              stroke="#10B981"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={isHovered ? "url(#glowBracket)" : "none"}
              variants={{
                initial: { pathLength: 0, opacity: 0 },
                animate: { pathLength: 1, opacity: 1, transition: { delay: 0.4, duration: 0.8, ease: "easeInOut" } },
                hover: { scale: 1.05, stroke: "#34D399", transition: { duration: 0.2 } }
              }}
            />
          </motion.g>
        </motion.svg>
      </div>

      <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col ml-3"
          >
            <div className="flex gap-0.5">
              {brandName.split('').map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.05, duration: 0.4 }}
                  className="text-lg font-black tracking-tight"
                  style={{
                    color: isHovered 
                      ? (i < 4 ? '#FF6C6C' : '#FFD700') 
                      : (i < 4 ? '#6C47FF' : '#00D4AA'),
                    textShadow: isHovered 
                      ? '0 0 20px rgba(255,108,108,0.5)' 
                      : '0 0 20px rgba(108,71,255,0.3)',
                    transition: 'color 0.4s ease, text-shadow 0.4s ease'
                  }}
                >
                  {char}
                </motion.span>
              ))}
            </div>
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="text-[10px] font-bold tracking-[0.25em] uppercase"
              style={{
                color: isHovered ? '#FFD700' : '#9CA3AF',
                transition: 'color 0.4s ease'
              }}
            >
              {academyName}
            </motion.span>
          </motion.div>
      </AnimatePresence>
    </div>
  );
}
