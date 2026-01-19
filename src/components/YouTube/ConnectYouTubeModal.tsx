import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Youtube, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ConnectYouTubeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (youtubeUrl: string) => Promise<void>;
  isConnecting: boolean;
}

export function ConnectYouTubeModal({ 
  open, 
  onOpenChange, 
  onConnect,
  isConnecting 
}: ConnectYouTubeModalProps) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');

  const validateUrl = (url: string): boolean => {
    // Accept various YouTube channel URL formats
    const patterns = [
      /youtube\.com\/@[\w-]+/,
      /youtube\.com\/channel\/[\w-]+/,
      /youtube\.com\/c\/[\w-]+/,
      /youtube\.com\/user\/[\w-]+/,
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const handleConnect = async () => {
    setError('');
    
    if (!youtubeUrl.trim()) {
      setError('Por favor, insira a URL do canal');
      return;
    }

    // Add https:// if missing
    let normalizedUrl = youtubeUrl.trim();
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    if (!validateUrl(normalizedUrl)) {
      setError('URL inválida. Use o formato: https://www.youtube.com/@NomeDoCanal');
      return;
    }

    try {
      setStatus('connecting');
      await onConnect(normalizedUrl);
      setStatus('success');
      setTimeout(() => {
        onOpenChange(false);
        setYoutubeUrl('');
        setStatus('idle');
      }, 1500);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Erro ao conectar canal');
    }
  };

  const handleClose = () => {
    if (!isConnecting) {
      onOpenChange(false);
      setYoutubeUrl('');
      setError('');
      setStatus('idle');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-500" />
            Conectar Canal do YouTube
          </DialogTitle>
          <DialogDescription>
            Insira a URL do seu canal para importar métricas e vídeos automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {status === 'success' ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="text-center font-medium">Canal conectado com sucesso!</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="youtube-url">URL do Canal</Label>
                <Input
                  id="youtube-url"
                  placeholder="https://www.youtube.com/@SeuCanal"
                  value={youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value);
                    setError('');
                  }}
                  disabled={isConnecting}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: @username, /channel/ID, /c/nome, /user/nome
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {status === 'connecting' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Buscando dados do canal... Isso pode levar até 2 minutos.</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isConnecting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting || !youtubeUrl.trim()}
                  className="gap-2 bg-red-500 hover:bg-red-600"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <Youtube className="w-4 h-4" />
                      Conectar
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
