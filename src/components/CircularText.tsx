import { useEffect } from 'react';
import { motion, useAnimation, useMotionValue } from 'framer-motion';
import './CircularText.css';

const getRotationTransition = (duration: number, from: number, loop = true) => ({
  from,
  to: from + 360,
  ease: 'linear',
  duration,
  type: 'tween' as const,
  repeat: loop ? Infinity : 0
});

const getTransition = (duration: number, from: number) => ({
  rotate: getRotationTransition(duration, from),
  scale: {
    type: 'spring' as const,
    damping: 20,
    stiffness: 300
  }
});

interface CircularTextProps {
  text: string;
  spinDuration?: number;
  onHover?: 'slowDown' | 'speedUp' | 'pause' | 'goBonkers' | '';
  className?: string;
  children?: React.ReactNode;
  size?: number;     // width and height of the container in px
  radius?: number;   // radius of the circle in px (translateY value)
}

const CircularText = ({
  text,
  spinDuration = 20,
  onHover = 'speedUp',
  className = '',
  children,
  size = 240,     // Default to 240px (even smaller & more premium!)
  radius = 92     // Default to 92px translateY (diameter 184px)
}: CircularTextProps) => {
  const letters = Array.from(text);
  const controls = useAnimation();
  const rotation = useMotionValue(0);

  useEffect(() => {
    const start = rotation.get();
    controls.start({
      rotate: start + 360,
      scale: 1,
      transition: getTransition(spinDuration, start)
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHoverStart = () => {
    const start = rotation.get();
    console.log('CircularText mounted with text:', text);
    if (!onHover) return;

    let transitionConfig;
    let scaleVal = 1;

    switch (onHover) {
      case 'slowDown':
        transitionConfig = getTransition(spinDuration * 2, start);
        break;
      case 'speedUp':
        transitionConfig = getTransition(spinDuration / 4, start);
        break;
      case 'pause':
        transitionConfig = {
          rotate: { type: 'spring' as const, damping: 20, stiffness: 300 },
          scale: { type: 'spring' as const, damping: 20, stiffness: 300 }
        };
        scaleVal = 1;
        break;
      case 'goBonkers':
        transitionConfig = getTransition(spinDuration / 20, start);
        scaleVal = 0.8;
        break;
      default:
        transitionConfig = getTransition(spinDuration, start);
    }

    controls.start({
      rotate: start + 360,
      scale: scaleVal,
      transition: transitionConfig
    });
  };

  const handleHoverEnd = () => {
    const start = rotation.get();
    controls.start({
      rotate: start + 360,
      scale: 1,
      transition: getTransition(spinDuration, start)
    });
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: `${size}px`, height: `${size}px` }}>
      {/* Central content (Logo, text, etc.) */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center pointer-events-none">
        {children}
      </div>

      <motion.div
        className={`circular-text ${className}`}
        style={{ rotate: rotation, width: `${size}px`, height: `${size}px` }}
        initial={{ rotate: 0 }}
        animate={controls}
        onMouseEnter={handleHoverStart}
        onMouseLeave={handleHoverEnd}
      >
        {letters.map((letter, i) => {
          const rotationDeg = (360 / letters.length) * i;
          // Dynamically translate by the custom radius
          const transform = `rotate(${rotationDeg}deg) translateY(-${radius}px)`;

          return (
            <span key={i} style={{ transform, WebkitTransform: transform }}>
              {letter}
            </span>
          );
        })}
      </motion.div>
    </div>
  );
};

export default CircularText;
