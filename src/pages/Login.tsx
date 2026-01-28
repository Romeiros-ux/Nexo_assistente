import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/Logo';
import Mascot from '@/components/Mascot';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔵 Login - Iniciando...', { email, password: '***' });
    
    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🔵 Login - Chamando login()...');
      await login(email, password);
      console.log('✅ Login - Sucesso!');
      toast.success('Bem-vindo ao sistema!');
      navigate('/chat');
    } catch (error) {
      console.error('❌ Login - Erro:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao realizar login';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      console.log('🔵 Login - Finalizado');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] institutional-gradient-dark relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/3 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          <div className="max-w-md text-center">
            <Mascot size="hero" className="mx-auto mb-8" animate={true} />
            
            <h1 className="text-3xl xl:text-4xl font-display font-bold text-white mb-4">
              Sistema de Inteligência Artificial
            </h1>
            <p className="text-lg text-white/80 leading-relaxed mb-8">
              Apoio estratégico à tomada de decisão na gestão educacional
            </p>
            
            <div className="flex flex-col gap-4 text-left">
              {[
                'Análise de dados educacionais em tempo real',
                'Identificação de padrões e tendências',
                'Sugestões estratégicas baseadas em evidências',
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3 text-white/90">
                  <div className="w-2 h-2 rounded-full bg-white/60" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-hero p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <Logo size="lg" />
          </div>

          {/* Desktop Logo */}
          <div className="hidden lg:flex justify-center mb-10">
            <Logo size="md" />
          </div>

          {/* Login Card */}
          <div className="login-card animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-xl font-display font-bold text-foreground">
                Acesse o Sistema
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                Entre com suas credenciais institucionais
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  E-mail ou CPF
                </Label>
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@educacao.gov.br"
                  className="input-field h-12 rounded-xl"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field h-12 rounded-xl pr-12"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl institutional-gradient hover:opacity-90 transition-all duration-200 text-base font-medium shadow-lg shadow-primary/20"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar no Sistema'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <a 
                href="#" 
                className="text-sm text-primary hover:underline"
              >
                Esqueci minha senha
              </a>
            </div>

            <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-border">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Ambiente seguro e protegido
              </span>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            Sistema Institucional de Inteligência Artificial<br />
            Secretaria de Educação
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
