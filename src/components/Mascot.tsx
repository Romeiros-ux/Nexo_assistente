import React, { forwardRef } from 'react';
import mascotImage from '@/assets/mascot-v2.png';

interface MascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  animate?: boolean;
  speaking?: boolean;
}

const Mascot = forwardRef<HTMLDivElement, MascotProps>(({ 
  size = 'lg', 
  className = '', 
  animate = true,
  speaking = false 
}, ref) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-44 h-44',
    hero: 'w-56 h-56',
  };

  return (
    <div 
      ref={ref}
      className={`relative ${sizeClasses[size]} ${animate ? 'animate-float' : ''} ${className}`}
    >
      <img 
        src={mascotImage} 
        alt="Edu - Assistente de Inteligência Artificial" 
        className="w-full h-full object-contain drop-shadow-xl"
      />
      {speaking && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
          <span className="w-2 h-2 bg-primary rounded-full typing-dot" />
          <span className="w-2 h-2 bg-primary rounded-full typing-dot" />
          <span className="w-2 h-2 bg-primary rounded-full typing-dot" />
        </div>
      )}
    </div>
  );
});

Mascot.displayName = 'Mascot';

export default Mascot;
