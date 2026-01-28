import { GraduationCap } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`${sizeClasses[size]} institutional-gradient rounded-xl flex items-center justify-center shadow-lg`}>
        <GraduationCap className="text-primary-foreground w-2/3 h-2/3" />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={`font-display font-bold text-foreground ${textSizeClasses[size]} leading-tight`}>
            Secretaria de Educação
          </span>
          <span className="text-xs text-muted-foreground">
            Sistema de Inteligência Artificial
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
