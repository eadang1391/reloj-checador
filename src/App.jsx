import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, orderBy, serverTimestamp, deleteDoc, doc, 
  where 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  Clock, Users, BarChart3, LogIn, LogOut, 
  Plus, Trash2, UserCheck, Shield, History,
  AlertCircle, CheckCircle2
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---
{
  apiKey: "AIzaSyBBMYDOqzXp1DUQArqYGXgGPyRjoV5eEEQ",
  authDomain: "checador-escarola.firebaseapp.com",
  projectId: "checador-escarola",
  storageBucket: "checador-escarola.firebasestorage.app",
  messagingSenderId: "836776118383",
  appId: "1:836776118383:web:8d8ac6db5d4cc36f59659a"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('employee'); // 'employee', 'admin', 'report'
  const [employees, setEmployees] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Autenticación inicial
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Cargar Empleados
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'employees'),
      orderBy('name')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(items);
      setLoading(false);
    }, (error) => console.error("Error cargando empleados:", error));
    return () => unsubscribe();
  }, [user]);

  // Cargar Registros (Logs)
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'time_logs'),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        dateObj: doc.data().timestamp ? doc.data().timestamp.toDate() : new Date()
      }));
      setLogs(items);
    }, (error) => console.error("Error cargando registros:", error));
    return () => unsubscribe();
  }, [user]);

  // Renderizado condicional de vistas
  const renderContent = () => {
    if (loading) return <div className="flex items-center justify-center h-screen text-stone-500">Cargando sistema...</div>;
    
    switch (view) {
      case 'admin':
        return <AdminPanel employees={employees} logs={logs} setView={setView} />;
      case 'report':
        return <ReportPanel employees={employees} logs={logs} setView={setView} />;
      default:
        return <EmployeeTerminal employees={employees} />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900">
      {/* Navbar con Verde Bosque Profundo */}
      <nav className="bg-green-950 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('employee')}>
            <Clock className="text-green-400" size={28} />
            <h1 className="text-xl font-bold tracking-tight">Reloj<span className="text-green-400">Checador</span></h1>
          </div>
          <div className="flex gap-2">
            {view === 'employee' ? (
              <button 
                onClick={() => setView('admin')}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-green-900 hover:bg-green-800 rounded-lg transition-colors border border-green-800"
              >
                <Shield size={16} />
                Admin
              </button>
            ) : (
              <button 
                onClick={() => setView('employee')}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-green-700 hover:bg-green-600 rounded-lg transition-colors font-medium border-b-2 border-green-900"
              >
                <LogOut size={16} />
                Volver al Reloj
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-4 md:p-6">
        {renderContent()}
      </main>
    </div>
  );
}

// --- VISTA 1: TERMINAL DEL EMPLEADO ---
function EmployeeTerminal({ employees }) {
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState(null); 

  const handlePinSubmit = async (type) => {
    if (!selectedEmp) return;

    if (pin !== selectedEmp.pin) {
      setMessage({ type: 'error', text: 'PIN Incorrecto. Intenta de nuevo.' });
      setPin('');
      return;
    }

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'time_logs'), {
        employeeId: selectedEmp.id,
        employeeName: selectedEmp.name,
        type: type, // 'IN' or 'OUT'
        timestamp: serverTimestamp()
      });

      setMessage({ 
        type: 'success', 
        text: `¡${type === 'IN' ? 'Entrada' : 'Salida'} registrada exitosamente para ${selectedEmp.name}!` 
      });
      
      setPin('');
      setSelectedEmp(null);
      setTimeout(() => setMessage(null), 3000);

    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Error de conexión. Intenta de nuevo.' });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-10 fade-in">
      
      {/* Mensaje Flash - Tonos Tierra/Verde */}
      {message && (
        <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-bounce border-l-8
          ${message.type === 'success' ? 'bg-stone-50 text-green-900 border-green-600 border-l-green-600' : 'bg-stone-50 text-red-900 border-red-800 border-l-red-800'}`}>
          {message.type === 'success' ? <CheckCircle2 size={24} className="text-green-700"/> : <AlertCircle size={24} className="text-red-800"/>}
          <span className="font-bold text-lg">{message.text}</span>
        </div>
      )}

      {!selectedEmp ? (
        <div className="w-full max-w-2xl">
          <h2 className="text-3xl font-bold text-center mb-2 text-stone-800">Bienvenido</h2>
          <p className="text-center text-stone-500 mb-8">Selecciona tu nombre para registrar tu horario</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {employees.length === 0 ? (
              <div className="col-span-2 text-center p-10 bg-white rounded-xl shadow-sm border border-stone-200">
                <Users className="mx-auto text-stone-300 mb-2" size={48} />
                <p className="text-stone-500">No hay empleados registrados.</p>
                <p className="text-sm text-stone-400">Ve al panel de Admin para agregar personal.</p>
              </div>
            ) : (
              employees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmp(emp)}
                  className="flex items-center p-6 bg-white rounded-xl shadow-sm border border-stone-200 hover:border-green-600 hover:shadow-md transition-all group text-left"
                >
                  <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 group-hover:bg-green-100 group-hover:text-green-800 transition-colors">
                    <UserCheck size={24} />
                  </div>
                  <div className="ml-4">
                    <h3 className="font-bold text-lg text-stone-800 group-hover:text-green-900">{emp.name}</h3>
                    <p className="text-xs text-stone-400 font-mono">ID: {emp.pin ? '****' : 'Sin PIN'}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-stone-100 text-center">
          <button 
            onClick={() => { setSelectedEmp(null); setPin(''); }}
            className="text-sm text-stone-400 hover:text-stone-600 mb-4 hover:underline"
          >
            ← Cancelar / Volver a la lista
          </button>
          
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-stone-800">{selectedEmp.name}</h3>
            <p className="text-stone-500">Ingresa tu PIN de seguridad</p>
          </div>

          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Introduce PIN (Ej: 1234)"
            className="w-full text-center text-3xl tracking-widest p-4 rounded-xl border-2 border-stone-200 focus:border-green-600 focus:outline-none mb-8 font-mono bg-stone-50 text-stone-800"
            maxLength={6}
          />

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handlePinSubmit('IN')}
              disabled={!pin}
              className="flex flex-col items-center justify-center p-6 rounded-xl bg-green-50 border-2 border-green-100 text-green-900 hover:bg-green-100 hover:border-green-300 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn size={32} className="mb-2 text-green-700" />
              <span className="font-bold text-lg">ENTRADA</span>
            </button>

            <button
              onClick={() => handlePinSubmit('OUT')}
              disabled={!pin}
              className="flex flex-col items-center justify-center p-6 rounded-xl bg-red-50 border-2 border-red-100 text-red-900 hover:bg-red-100 hover:border-red-300 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut size={32} className="mb-2 text-red-700" />
              <span className="font-bold text-lg">SALIDA</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- VISTA 2: PANEL DE ADMINISTRADOR ---
function AdminPanel({ employees, logs, setView }) {
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newName || !newPin) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'employees'), {
        name: newName,
        pin: newPin,
        createdAt: serverTimestamp()
      });
      setNewName('');
      setNewPin('');
    } catch (err) {
      console.error(err);
      alert('Error al guardar empleado');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de eliminar este empleado?')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'employees', id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-800">Gestión de Personal</h2>
          <p className="text-stone-500 text-sm">Agrega o elimina empleados autorizados</p>
        </div>
        <button 
          onClick={() => setView('report')}
          className="flex items-center gap-2 bg-stone-700 text-stone-100 px-5 py-2.5 rounded-lg hover:bg-stone-600 transition shadow-sm font-medium"
        >
          <BarChart3 size={18} />
          Ver Reporte de Horas
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario Agregar */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 sticky top-24">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-stone-700">
              <Plus size={20} className="text-green-600" /> Nuevo Empleado
            </h3>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full p-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition"
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Asignar PIN</label>
                <input
                  type="number"
                  value={newPin}
                  onChange={e => setNewPin(e.target.value)}
                  className="w-full p-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition"
                  placeholder="Ej: 1234"
                  required
                />
              </div>
              <button className="w-full bg-green-800 text-white py-3 rounded-lg hover:bg-green-700 font-medium transition flex justify-center items-center gap-2">
                <UserCheck size={18} />
                Registrar Empleado
              </button>
            </form>
          </div>
        </div>

        {/* Lista Empleados */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-200">
              <h3 className="font-bold text-stone-700">Lista de Activos ({employees.length})</h3>
            </div>
            {employees.length === 0 ? (
              <div className="p-8 text-center text-stone-500">No hay empleados registrados.</div>
            ) : (
              <div className="divide-y divide-stone-100">
                {employees.map(emp => (
                  <div key={emp.id} className="p-4 flex justify-between items-center hover:bg-stone-50 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-50 text-green-700 flex items-center justify-center font-bold text-sm">
                        {emp.name.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-stone-800">{emp.name}</p>
                        <p className="text-xs text-stone-400">PIN: {emp.pin}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(emp.id)}
                      className="text-stone-300 hover:text-red-700 p-2 transition"
                      title="Eliminar empleado"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- VISTA 3: REPORTE DE HORAS ---
function ReportPanel({ logs, employees, setView }) {
  // Lógica para calcular horas
  const reportData = useMemo(() => {
    const data = {};

    // Agrupar logs por empleado
    employees.forEach(emp => {
      data[emp.id] = { name: emp.name, logs: [], totalHours: 0, shifts: [] };
    });

    logs.forEach(log => {
      if (data[log.employeeId]) {
        data[log.employeeId].logs.push(log);
      }
    });

    // Calcular pares Entrada-Salida
    Object.values(data).forEach(empData => {
      // Ordenar logs cronológicamente (ascendente para calculo)
      const sortedLogs = [...empData.logs].sort((a, b) => a.dateObj - b.dateObj);
      
      let currentEntry = null;

      sortedLogs.forEach(log => {
        if (log.type === 'IN') {
          currentEntry = log;
        } else if (log.type === 'OUT' && currentEntry) {
          // Tenemos un par válido
          const durationMs = log.dateObj - currentEntry.dateObj;
          const durationHrs = durationMs / (1000 * 60 * 60);
          
          empData.shifts.push({
            date: currentEntry.dateObj.toLocaleDateString(),
            in: currentEntry.dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            out: log.dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            hours: durationHrs
          });
          
          empData.totalHours += durationHrs;
          currentEntry = null;
        }
      });
    });

    return Object.values(data);
  }, [logs, employees]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => setView('admin')}
          className="text-stone-500 hover:text-stone-800"
        >
          ← Volver
        </button>
        <h2 className="text-2xl font-bold text-stone-800">Reporte de Asistencia</h2>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {reportData.map((emp) => (
          <div key={emp.name} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="bg-stone-50 p-4 border-b border-stone-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-stone-800">{emp.name}</h3>
              <div className="bg-stone-200 text-stone-700 px-3 py-1 rounded-full text-sm font-bold border border-stone-300">
                Total: {emp.totalHours.toFixed(2)} Hrs
              </div>
            </div>
            
            <div className="p-0">
              {emp.shifts.length === 0 ? (
                <p className="p-4 text-stone-400 italic text-sm">Sin turnos completados aún.</p>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-stone-500 uppercase bg-stone-50 border-b">
                    <tr>
                      <th className="px-6 py-3">Fecha</th>
                      <th className="px-6 py-3 text-green-800">Entrada</th>
                      <th className="px-6 py-3 text-red-900">Salida</th>
                      <th className="px-6 py-3 text-right">Duración</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {emp.shifts.map((shift, idx) => (
                      <tr key={idx} className="hover:bg-stone-50">
                        <td className="px-6 py-3 font-medium text-stone-700">{shift.date}</td>
                        <td className="px-6 py-3 text-green-700 font-medium">{shift.in}</td>
                        <td className="px-6 py-3 text-red-800 font-medium">{shift.out}</td>
                        <td className="px-6 py-3 text-right font-bold text-stone-700">{shift.hours.toFixed(2)} h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {/* Historial Crudo (Raw Logs) Opcional */}
            <div className="bg-stone-50 p-2 border-t border-stone-200">
               <details className="text-xs text-stone-400 cursor-pointer">
                 <summary>Ver registros sin procesar</summary>
                 <div className="mt-2 pl-4 border-l-2 border-stone-300 space-y-1">
                   {emp.logs.slice().reverse().map(log => (
                     <div key={log.id}>
                       {log.type === 'IN' ? '🟢' : '🔴'} {log.dateObj.toLocaleString()}
                     </div>
                   ))}
                 </div>
               </details>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}