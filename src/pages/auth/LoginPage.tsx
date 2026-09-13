import React, { useState } from 'react';
import { Mail, Lock, Scissors } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/firebase/auth.service';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      await authService.login(email.trim(), password);
      navigate('/');
    } catch {
      setErrorMessage('Credenciales incorrectas o cuenta no registrada.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm border border-neutral-800 bg-neutral-900/60 p-8 rounded-xl shadow-2xl backdrop-blur-md">
        <div className="mb-6 text-center space-y-1">
          <div className="mx-auto h-10 w-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-200 mb-3">
            <Scissors className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-100">ADMINSITE</h1>
          <p className="text-xs text-neutral-400">XAC Barber Studio · Consola Administrativa</p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-400">Correo electrónico</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 h-4 w-4 text-neutral-500 pointer-events-none" />
              <input
                type="email"
                placeholder="admin@xacbarber.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-9 pl-9 pr-3 rounded-md bg-neutral-950 border border-neutral-800 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-400">Contraseña</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 h-4 w-4 text-neutral-500 pointer-events-none" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-9 pl-9 pr-3 rounded-md bg-neutral-950 border border-neutral-800 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-9 mt-2 inline-flex items-center justify-center rounded-md bg-neutral-100 text-neutral-950 text-sm font-medium hover:bg-neutral-300 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-neutral-800 pt-4">
          <p className="text-[11px] text-neutral-500">Acceso restringido para personal autorizado</p>
        </div>
      </div>
    </div>
  );
};