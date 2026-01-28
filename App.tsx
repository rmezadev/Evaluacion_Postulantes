
import React, { useState, useEffect } from 'react';
import { UserRole, UserSession } from './types';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import { ApplicantView } from './components/ApplicantView';

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    const savedSession = localStorage.getItem('livigui_session');
    if (savedSession) {
      setSession(JSON.parse(savedSession));
    }
  }, []);

  const handleLogin = (userSession: UserSession) => {
    setSession(userSession);
    localStorage.setItem('livigui_session', JSON.stringify(userSession));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('livigui_session');
  };

  if (!session) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-40 backdrop-blur-md bg-white/80">
        <div className="flex flex-wrap justify-between items-center mx-auto max-w-screen-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#2A647E] rounded-xl flex items-center justify-center text-white font-black text-xl">L</div>
            <div className="flex flex-col">
              <span className="self-center text-lg font-black whitespace-nowrap text-[#2A647E] leading-none">
                LIVIGUI
              </span>
              <span className="text-[9px] font-bold text-slate-400 tracking-[0.2em] uppercase">Evaluaciones</span>
            </div>
          </div>
          <div className="flex items-center lg:order-2 space-x-4">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-[11px] font-black text-[#2A647E] uppercase tracking-tighter">
                {session.email}
              </span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                {session.role === UserRole.ADMIN ? 'Administrador' : 'Postulante'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-[#2A647E] hover:bg-slate-100 font-black rounded-xl text-xs px-5 py-2.5 transition-all active:scale-95 border border-slate-100"
            >
              SALIR
            </button>
          </div>
        </div>
      </nav>

      <main className="py-10">
        {session.role === UserRole.ADMIN ? (
          <AdminDashboard />
        ) : (
          <ApplicantView applicantId={session.applicantId!} />
        )}
      </main>
    </div>
  );
};

export default App;
