
import React, { useState, useEffect, useCallback } from 'react';
import { Applicant, EvaluationStatus } from '../types';
import { initDB, getAllApplicantsDB, addApplicantDB, updateApplicantDB, deleteApplicantDB } from '../services/db';

const AdminDashboard: React.FC = () => {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    downloadLink: ''
  });

  const fetchData = useCallback(async () => {
    try {
      const db = await initDB();
      const data = await getAllApplicantsDB(db);
      setApplicants(data);
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); 
    return () => clearInterval(interval);
  }, [fetchData]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ firstName: '', lastName: '', email: '', phone: '', downloadLink: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (app: Applicant) => {
    setEditingId(app.id);
    setFormData({
      firstName: app.firstName,
      lastName: app.lastName,
      email: app.email,
      phone: app.phone,
      downloadLink: app.downloadLink
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const db = await initDB();
      if (editingId) {
        await updateApplicantDB(db, editingId, formData);
      } else {
        await addApplicantDB(db, formData);
      }
      await fetchData();
      setIsModalOpen(false);
    } catch (err) {
      alert('Error al guardar los cambios.');
    }
  };

  const handleDelete = async (id: string, fullName: string) => {
    if (window.confirm(`¿Estás completamente seguro de que deseas ELIMINAR PERMANENTEMENTE a ${fullName}?`)) {
      try {
        const db = await initDB();
        // Feedback visual inmediato
        setApplicants(current => current.filter(a => a.id !== id));
        
        const success = await deleteApplicantDB(db, id);
        if (!success) {
          throw new Error("La eliminación falló en la base de datos.");
        }
        console.log(`Postulante ${fullName} eliminado con éxito.`);
      } catch (err) {
        console.error('Error de eliminación:', err);
        alert('Hubo un problema al eliminar el registro. Por favor, intenta de nuevo.');
        await fetchData(); // Revertir UI si hubo error
      }
    }
  };

  const toggleSuspension = async (id: string, currentStatus?: boolean) => {
    try {
      const db = await initDB();
      await updateApplicantDB(db, id, { isSuspended: !currentStatus });
      await fetchData();
    } catch (err) {
      console.error('Error al suspender/habilitar:', err);
    }
  };

  const handleDownload = (app: Applicant) => {
    if (!app.submissionLink) return;
    
    const link = document.createElement('a');
    link.href = app.submissionLink;
    link.download = `Evaluacion_${app.lastName}_${app.firstName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (ts?: number) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getElapsedTime = (applicant: Applicant) => {
    if (!applicant.startTime) return '-';
    const end = applicant.endTime || Date.now();
    const diff = end - applicant.startTime;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Panel Administrativo</h1>
          <p className="text-slate-500 font-medium">Gestión de postulantes y seguimiento de evaluaciones.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-[#2A647E] hover:bg-[#1f4b5e] text-white font-black py-4 px-8 rounded-2xl transition-all flex items-center shadow-xl active:scale-95 transform hover:-translate-y-1"
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          Registrar Postulante
        </button>
      </div>

      <div className="bg-white shadow-xl shadow-slate-200/50 border border-slate-100 rounded-[2.5rem] overflow-hidden">
        {loading ? (
          <div className="p-32 text-center text-slate-400">
            <svg className="animate-spin h-12 w-12 mx-auto mb-6 text-[#2A647E]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p className="font-bold text-lg">Cargando base de datos...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-400 uppercase bg-slate-50/30 border-b border-slate-50 font-black tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-6">Postulante</th>
                  <th className="px-8 py-6">Estado</th>
                  <th className="px-8 py-6">Cronometría</th>
                  <th className="px-8 py-6">Duración</th>
                  <th className="px-8 py-6 text-right">Gestión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {applicants.length === 0 ? (
                  <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic font-medium">No se han encontrado postulantes registrados.</td></tr>
                ) : (
                  applicants.map((app) => (
                    <tr key={app.id} className={`group hover:bg-slate-50/50 transition-colors ${app.isSuspended ? 'bg-slate-50/40 opacity-60' : ''}`}>
                      <td className="px-8 py-7">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 text-lg leading-tight">{app.firstName} {app.lastName}</span>
                          <span className="text-xs text-slate-400 font-medium tracking-tight mt-0.5">{app.email}</span>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <div className="flex flex-col gap-2 items-start">
                          <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                            app.status === EvaluationStatus.COMPLETED ? 'bg-green-100 text-green-700' :
                            app.status === EvaluationStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700 animate-pulse' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {app.status === EvaluationStatus.PENDING ? 'Pendiente' :
                             app.status === EvaluationStatus.IN_PROGRESS ? 'En Curso' : 'Finalizado'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <div className="text-[11px] text-slate-500 font-bold tracking-tight">
                          <div className="flex items-center gap-2"><span className="text-slate-300 uppercase font-black text-[9px]">Inicio:</span> {formatTime(app.startTime)}</div>
                          <div className="flex items-center gap-2 mt-0.5"><span className="text-slate-300 uppercase font-black text-[9px]">Fin:</span> {formatTime(app.endTime)}</div>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <div className="flex flex-col items-start gap-2">
                          <span className="font-black text-blue-600 text-sm tracking-tighter">{getElapsedTime(app)}</span>
                          {app.submissionLink && (
                            <button
                              onClick={() => handleDownload(app)}
                              className="flex items-center gap-1.5 text-[10px] font-black text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-all shadow-md uppercase tracking-wider active:scale-95"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                              Descargar
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-7 text-right">
                        <div className="flex justify-end items-center gap-3">
                          <button
                            onClick={() => toggleSuspension(app.id, app.isSuspended)}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-sm ${
                              app.isSuspended ? 'bg-amber-100 text-amber-600' : 'bg-amber-50 text-amber-500 hover:bg-amber-500 hover:text-white'
                            }`}
                            title={app.isSuspended ? "Habilitar Acceso" : "Suspender Acceso"}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                          </button>
                          
                          <button
                            onClick={() => openEditModal(app)}
                            className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                            title="Editar Datos"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 00-2 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          </button>

                          <button
                            onClick={() => handleDelete(app.id, `${app.firstName} ${app.lastName}`)}
                            className="w-10 h-10 flex items-center justify-center bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg active:scale-95"
                            title="Eliminar Permanente"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl animate-in zoom-in duration-300 border border-slate-100">
            <h2 className="text-3xl font-black mb-8 text-slate-800 tracking-tight">
              {editingId ? 'Editar Postulante' : 'Nuevo Registro'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Nombre</label>
                  <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#2A647E] outline-none font-bold text-slate-700 transition-all" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Apellido</label>
                  <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#2A647E] outline-none font-bold text-slate-700 transition-all" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Correo Electrónico</label>
                <input required type="email" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#2A647E] outline-none font-bold text-slate-700 transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Teléfono Celular</label>
                <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#2A647E] outline-none font-bold text-slate-700 transition-all" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Link de la Evaluación</label>
                <input required type="url" placeholder="https://..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#2A647E] outline-none font-bold text-slate-700 transition-all" value={formData.downloadLink} onChange={e => setFormData({...formData, downloadLink: e.target.value})} />
              </div>
              <div className="flex justify-end gap-4 pt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-slate-400 font-black hover:bg-slate-50 rounded-2xl transition-colors uppercase tracking-widest text-[11px]">Cerrar</button>
                <button type="submit" className="px-12 py-4 bg-[#2A647E] text-white rounded-2xl font-black shadow-xl uppercase tracking-widest text-[11px] hover:bg-[#1f4b5e] transition-all transform active:scale-95">
                  {editingId ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
