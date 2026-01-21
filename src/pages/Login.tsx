import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Zap } from 'lucide-react';

import { motion } from 'framer-motion';

export default function Login() {
  const navigate = useNavigate();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInAsDemo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signInWithEmail(loginEmail, loginPassword);
    setLoading(false);

    if (error) {
      toast.error('Erro ao entrar: ' + error.message);
    } else {
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    await signInAsDemo();
    setLoading(false);
    toast.success('Bem-vindo ao Modo Demo!');
    navigate('/dashboard');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUpWithEmail(signupEmail, signupPassword);
    setLoading(false);

    if (error) {
      toast.error('Erro ao criar conta: ' + error.message);
    } else {
      toast.success('Conta criada com sucesso!');
      navigate('/dashboard');
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setGoogleLoading(false);
      toast.error('Erro ao entrar com Google: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[400px] relative z-10"
      >
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
          <CardHeader className="text-center space-y-6 pb-6 pt-10">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <CardTitle className="text-3xl font-bold tracking-tight mb-2">Seja bem-vindo, Gustavo</CardTitle>
              <CardDescription className="text-muted-foreground text-lg">
                O que vamos criar hoje?
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent className="space-y-6 pb-10 px-8">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <Button type="submit" className="w-full h-11 text-base relative overflow-hidden group" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                <span className="relative z-10">{loading ? 'Entrando...' : 'Entrar na Plataforma'}</span>
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Button>
            </form>

            <Button
              variant="secondary"
              className="w-full h-11 gap-2 font-medium bg-muted/50 hover:bg-muted transition-colors"
              onClick={handleDemoLogin}
              disabled={loading}
            >
              <Zap className="w-4 h-4 text-warning" />
              Entrar como Demo
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full h-11 gap-3"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Continuar com Google
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Gysi Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="absolute bottom-6 left-0 right-0 text-center"
      >
        <p className="text-sm font-medium text-muted-foreground">
          Desenvolvido por <span className="text-primary font-bold">Gysi Company</span>
        </p>
      </motion.div>
    </div>
  );
}
