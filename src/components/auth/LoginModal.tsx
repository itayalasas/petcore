import { useState } from 'react';
import { Eye, EyeOff, Loader, Lock, Mail, PawPrint, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onSwitchToRegister: () => void;
}

export default function LoginModal({ onClose, onSuccess, onSwitchToRegister }: LoginModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      onSuccess();
    } catch (err: any) {
      if (err.message.includes('Invalid login credentials')) {
        setError('Email o contraseña incorrectos');
      } else if (err.message.includes('Email not confirmed')) {
        setError('Por favor confirma tu email antes de iniciar sesión');
      } else {
        setError(err.message || 'Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/60 bg-white shadow-[0_32px_90px_-40px_rgba(15,23,42,0.6)]">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-emerald-100 via-transparent to-cyan-100" />

        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full border border-slate-200 bg-white/80 p-2 text-slate-500 transition-colors hover:text-slate-900"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 shadow-lg shadow-emerald-500/20">
              <PawPrint className="h-7 w-7 text-white" />
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950">Bienvenido de nuevo</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Accede a tu operación pet con una experiencia más clara y profesional.</p>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-sm font-medium text-rose-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-700">Contraseña</label>
                <button type="button" className="text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-800">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-6">
            <p className="text-center text-sm text-slate-500">
              ¿Tu empresa aún no está registrada?{' '}
              <button onClick={onSwitchToRegister} className="font-semibold text-emerald-700 transition-colors hover:text-emerald-800">
                Registra tu empresa
              </button>
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs leading-6 text-slate-500">
              <strong className="text-slate-700">Nota:</strong> Si eres un empleado, debes usar las credenciales proporcionadas por tu administrador. Si no tienes acceso, contacta al administrador de tu organización.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
