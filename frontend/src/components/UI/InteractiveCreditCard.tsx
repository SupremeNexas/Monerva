import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Wifi } from 'lucide-react';

interface InteractiveCreditCardProps {
  cardName: string;
  cardNumber?: string;
  limitAmount?: number;
  totalDue?: number;
  dueDate?: string;
  cardHolder?: string;
  gradientFrom?: string;
  gradientTo?: string;
}

export function InteractiveCreditCard({
  cardName,
  cardNumber = '•••• ​ •••• ​ •••• ​ 4892',
  limitAmount = 250000,
  totalDue = 14500,
  dueDate,
  cardHolder = 'ALEXANDER WRIGHT',
  gradientFrom = 'from-slate-900',
  gradientTo = 'to-indigo-950'
}: InteractiveCreditCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const tiltX = -(y - centerY) / 8;
    const tiltY = (x - centerX) / 8;

    setRotateX(tiltX);
    setRotateY(tiltY);

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;
    setGlarePosition({ x: glareX, y: glareY });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlarePosition({ x: 50, y: 50 });
  };

  const percentageUsed = limitAmount > 0 ? ((totalDue / limitAmount) * 100).toFixed(1) : '0.0';

  return (
    <div className="perspective-1000 w-full max-w-sm cursor-pointer select-none">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        animate={{
          rotateX: rotateX,
          rotateY: rotateY,
          transformStyle: 'preserve-3d',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`relative w-full min-h-[210px] sm:min-h-[220px] rounded-2xl p-5 sm:p-6 bg-gradient-to-br ${gradientFrom} ${gradientTo} border border-white/20 shadow-2xl overflow-hidden flex flex-col justify-between`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Parallax Hologram & Background Texture */}
        <div
          className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"
          style={{ transform: 'translateZ(-10px)' }}
        />

        {/* Dynamic Glare Reflection */}
        <div
          className="absolute inset-0 transition-opacity duration-300 pointer-events-none opacity-30 group-hover:opacity-40"
          style={{
            background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255,255,255,0.7), transparent 60%)`,
            transform: 'translateZ(1px)'
          }}
        />

        {/* Card Header & Contactless Icon */}
        <div className="flex justify-between items-start relative z-10 gap-2" style={{ transform: 'translateZ(20px)' }}>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] font-extrabold text-indigo-300 block mb-0.5 truncate">
              PRO ACCOUNT // TIER 1
            </span>
            <span className="text-base sm:text-lg font-bold text-white tracking-tight drop-shadow block truncate">
              {cardName}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Wifi className="w-5 h-5 sm:w-6 sm:h-6 text-white/80 rotate-90 drop-shadow" />
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
          </div>
        </div>

        {/* Chip & Number */}
        <div className="my-1.5 sm:my-2 relative z-10" style={{ transform: 'translateZ(30px)' }}>
          <div className="w-10 h-7 sm:w-12 sm:h-8.5 rounded-md bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-500 mb-2 sm:mb-3 border border-yellow-600/50 shadow-md flex items-center justify-between px-1">
            <div className="w-full h-px bg-yellow-700/40" />
          </div>
          <div className="text-base sm:text-lg md:text-xl font-mono tracking-[0.14em] sm:tracking-[0.18em] text-white/95 font-semibold drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis">
            {cardNumber}
          </div>
        </div>

        {/* Card Footer */}
        <div className="flex justify-between items-end relative z-10 pt-1" style={{ transform: 'translateZ(25px)' }}>
          <div className="flex-1 min-w-0 mr-3">
            <div className="text-[9px] uppercase tracking-widest text-slate-300 mb-0.5 font-bold">
              CARDHOLDER
            </div>
            <div className="text-xs sm:text-sm font-semibold tracking-wider text-white font-sans uppercase truncate">
              {cardHolder}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[9px] uppercase tracking-widest text-slate-300 mb-0.5 font-bold">
              USAGE LIMIT
            </div>
            <div className="text-xs sm:text-sm font-bold tracking-wider text-emerald-400">
              {percentageUsed}%
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
