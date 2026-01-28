
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Applicant, EvaluationStatus, EVALUATION_DURATION_MS } from '../types';
import { initDB, getApplicantByIdDB, updateApplicantDB } from '../services/db';

interface ApplicantViewProps {
  applicantId: string;
}

export const ApplicantView: React.FC<ApplicantViewProps> = ({ applicantId }) => {
  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; data: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      const db = await initDB();
      const data = await getApplicantByIdDB(db, applicantId);
      if (data) {
        setApplicant(data);
        if (data.status === EvaluationStatus.IN_PROGRESS && data.startTime) {
          const remaining = (data.startTime + EVALUATION_DURATION_MS) - Date.now();
          setTimeLeft(Math.max(0, remaining));
        }
        if (data.submissionLink && data.status === EvaluationStatus.COMPLETED) {
          setSelectedFile({ name: 'Examen entregado.xlsx', data: data.submissionLink });
        }
      }
    } catch (err) {
      console.error('Error loading data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [applicantId]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || applicant?.status !== EvaluationStatus.IN_PROGRESS) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, applicant?.status]);

  const handleStart = async () => {
    const startTime = Date.now();
    try {
      const db = await initDB();
      const updated = await updateApplicantDB(db, applicantId, {
        startTime,
        status: EvaluationStatus.IN_PROGRESS
      });
      if (updated) {
        setApplicant(updated);
        setTimeLeft(EVALUATION_DURATION_MS);
      }
    } catch (err) {
      alert('Error al iniciar la evaluación');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target?.result as string;
      setSelectedFile({ name: file.name, data: base64Data });
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const performFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const db = await initDB();
      const updated = await updateApplicantDB(db, applicantId, {
        endTime: Date.now(),
        status: EvaluationStatus.COMPLETED,
        submissionLink: selectedFile?.data || ''
      });
      if (updated) {
        setApplicant(updated);
        setTimeLeft(0);
      }
    } catch (err) {
      alert('Hubo un error al guardar tu archivo. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    performFinalSubmit();
  };

  const handleAutoSubmit = useCallback(() => {
    if (applicant?.status === EvaluationStatus.IN_PROGRESS) {
      performFinalSubmit();
    }
  }, [applicant, selectedFile]);

  const formatCountdown = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="p-20 text-center font-bold text-blue-600 animate-pulse">Sincronizando con la DB...</div>;
  if (!applicant) return <div className="p-8 text-center text-gray-500">Sesión no encontrada.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-gray-50 pb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 leading-tight">Hola, {applicant.firstName} 👋</h1>
            <p className="text-gray-400 font-medium">Panel de Evaluación Técnica - Excel Intermedio</p>
          </div>
          <div className="text-right">
            <span className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-sm ${
              applicant.status === EvaluationStatus.COMPLETED ? 'bg-green-600 text-white' :
              applicant.status === EvaluationStatus.IN_PROGRESS ? 'bg-blue-600 text-white animate-pulse' :
              'bg-slate-100 text-slate-500'
            }`}>
              {applicant.status === EvaluationStatus.PENDING && 'Listo para empezar'}
              {applicant.status === EvaluationStatus.IN_PROGRESS && 'Evaluación Activa'}
              {applicant.status === EvaluationStatus.COMPLETED && 'Entregado'}
            </span>
          </div>
        </div>

        {applicant.status === EvaluationStatus.PENDING && (
          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-10 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <h2 className="text-2xl font-black text-slate-800">¿Todo listo para comenzar?</h2>
            <ul className="text-slate-600 text-sm space-y-3 max-w-sm mx-auto text-left list-none font-medium">
              <li className="flex items-start"><span className="text-blue-500 mr-2">✔</span> Cronómetro de 45 min ininterrumpidos.</li>
              <li className="flex items-start"><span className="text-blue-500 mr-2">✔</span> Descarga única del archivo de trabajo.</li>
              <li className="flex items-start"><span className="text-blue-500 mr-2">✔</span> Carga de archivo directa desde tu PC.</li>
            </ul>
            <button
              onClick={handleStart}
              className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-16 rounded-2xl text-lg transition-all active:scale-95 shadow-2xl transform hover:-translate-y-1"
            >
              INICIAR EXAMEN
            </button>
          </div>
        )}

        {(applicant.status === EvaluationStatus.IN_PROGRESS || applicant.status === EvaluationStatus.COMPLETED) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Paso 1</h3>
                <h4 className="font-bold text-slate-800 mb-4">Descarga el Material</h4>
                <a
                  href={applicant.downloadLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full py-4 bg-white border-2 border-slate-200 rounded-2xl text-blue-600 font-black hover:border-blue-500 hover:bg-blue-50 transition-all shadow-sm"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  BAJAR ARCHIVO (.xlsx)
                </a>
              </div>

              <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Paso 2</h3>
                <h4 className="font-bold text-slate-800 mb-4">Entrega tu Solución</h4>
                
                {applicant.status !== EvaluationStatus.COMPLETED ? (
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div
                      onDragOver={onDragOver}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={onDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative border-3 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
                        isDragging ? 'border-blue-500 bg-blue-100/50 scale-[1.02]' : 'border-slate-300 bg-white hover:border-blue-400'
                      }`}
                    >
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx,.xls,.xlsm" />
                      {!selectedFile ? (
                        <div className="space-y-2">
                          <svg className="w-10 h-10 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                          <p className="text-xs font-bold text-slate-500">Haz clic o suelta el Excel aquí</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-blue-700">
                          <svg className="w-10 h-10 mb-2" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/></svg>
                          <p className="text-xs font-black truncate max-w-[200px]">{selectedFile.name}</p>
                          <p className="text-[10px] text-blue-400 font-medium">Archivo cargado correctamente</p>
                        </div>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting || !selectedFile}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl disabled:opacity-50 transform active:scale-95"
                    >
                      {isSubmitting ? 'Guardando en DB...' : 'ENVIAR EVALUACIÓN'}
                    </button>
                  </form>
                ) : (
                  <div className="p-6 bg-white border border-green-100 rounded-2xl flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <p className="font-black text-green-700 uppercase tracking-tighter">¡Entrega exitosa!</p>
                    <p className="text-[10px] text-slate-400 mt-1">El proceso ha concluido. Puedes cerrar esta ventana.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-10 bg-slate-900 rounded-[3rem] shadow-2xl text-white relative overflow-hidden border border-slate-800">
              <div className="absolute top-0 left-0 w-full h-2 bg-slate-800">
                <div
                  className="h-full bg-blue-500 transition-all duration-1000 ease-linear shadow-[0_0_20px_rgba(59,130,246,0.8)]"
                  style={{ width: `${( (timeLeft || 0) / EVALUATION_DURATION_MS ) * 100}%` }}
                ></div>
              </div>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10">Tiempo Restante</h3>
              <div className={`text-8xl font-mono font-black tabular-nums tracking-tighter ${
                (timeLeft || 0) < 300000 ? 'text-red-500 animate-pulse' : 'text-blue-400'
              }`}>
                {timeLeft !== null ? formatCountdown(timeLeft) : '00:00'}
              </div>
              <div className="mt-12 p-4 bg-slate-800/50 rounded-2xl flex items-center space-x-3 border border-slate-700/50">
                <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                <p className="text-[10px] text-slate-400 leading-tight font-medium">Al agotarse el tiempo, lo que hayas cargado se enviará automáticamente.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
