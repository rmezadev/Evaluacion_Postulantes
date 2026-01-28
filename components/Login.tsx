
import React, { useState } from 'react';
import { UserRole, UserSession } from '../types';
import { initDB, getAllApplicantsDB } from '../services/db';

interface LoginProps {
  onLogin: (session: UserSession) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const LogoSVG = () => (
    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-6 shadow-xl rounded-3xl bg-[#2A647E] p-4">
      <path d="M4 4V20H20V4H4ZM18 18H6V6H18V18ZM8 8H10V16H8V8ZM12 8H14V16H12V8ZM15 8H17V16H15V8Z" fill="white"/>
      <path d="M7 14H17V15H7V14Z" fill="white" opacity="0.3"/>
    </svg>
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    
    setLoading(true);
    setError('');

    try {
      if (cleanEmail === 'admin@livigui.com') {
        onLogin({ role: UserRole.ADMIN, email: cleanEmail });
        return;
      }

      const db = await initDB();
      const applicants = await getAllApplicantsDB(db);
      const applicant = applicants.find(a => a.email.toLowerCase() === cleanEmail);

      if (applicant) {
        if (applicant.isSuspended) {
          setError('Tu acceso ha sido suspendido.');
        } else {
          onLogin({ 
            role: UserRole.POSTULANTE, 
            email: cleanEmail, 
            applicantId: applicant.id 
          });
        }
      } else {
        setError('Correo no registrado.');
      }
    } catch (err) {
      setError('Error de conexión con la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-10">
          <LogoSVG />
          <h1 className="text-3xl font-black text-[#2A647E] tracking-tight uppercase">LIVIGUI</h1>
          <p className="text-slate-400 font-bold text-[10px] tracking-[0.3em] uppercase mt-2">Plataforma de Evaluaciones</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-slate-50 border-1 border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#2A647E] focus:border-transparent outline-none font-bold text-slate-700"
              placeholder="admin@livigui.com"
              required
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2A647E] hover:bg-[#1f4b5e] text-white font-black py-4 rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-50 uppercase tracking-wider"
          >
            {loading ? 'Verificando...' : 'Acceder'}
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest leading-loose">
            LIVIGUI S.A.C
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
