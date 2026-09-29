import { VirtualFile } from './types';

export const defaultFiles: VirtualFile[] = [
  {
    path: 'index.html',
    name: 'index.html',
    language: 'html',
    content: `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sintassi Playground</title>
    <!-- Collegamento al file CSS locale: viene risolto e iniettato automaticamente -->
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header class="main-header">
        <!-- Immagine locale collegata: risolta e visualizzata automaticamente -->
        <img src="logo.svg" alt="Logo Playground" class="playground-logo">
        <h1>Playground di Sviluppo</h1>
        <p>Editor reattivo con supporto completo per HTML, CSS, React, TSX e immagini locali.</p>
    </header>

    <main class="container">
        <!-- Punto di montaggio principale per i componenti React (App.tsx) -->
        <div id="root"></div>

        <section class="card" style="margin-top: 1.5rem;">
            <h2>Funzionalità Interconnesse</h2>
            <ul id="feature-list">
                <!-- Popolato da app.js -->
            </ul>
        </section>
    </main>

    <!-- Script JavaScript locale collegato -->
    <script src="app.js"></script>
</body>
</html>
`
  },
  {
    path: 'styles.css',
    name: 'styles.css',
    language: 'css',
    content: `/* Stili per il Playground di Esempio */
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #0f172a;
    color: #e2e8f0;
    margin: 0;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
}

.main-header {
    text-align: center;
    margin-bottom: 2rem;
}

/* Esempio di immagine collegata tramite CSS url() */
.playground-logo {
    width: 64px;
    height: 64px;
    margin: 0 auto 1rem auto;
    display: block;
    filter: drop-shadow(0 0 12px rgba(56, 189, 248, 0.4));
    transition: transform 0.3s ease;
}

.playground-logo:hover {
    transform: scale(1.08) rotate(5deg);
}

.main-header h1 {
    font-size: 2.2rem;
    color: #38bdf8;
    margin: 0 0 0.5rem 0;
}

.main-header p {
    color: #94a3b8;
    margin: 0;
    font-size: 0.95rem;
}

.container {
    width: 100%;
    max-width: 650px;
}

.card {
    background-color: #1e293b;
    border-radius: 12px;
    padding: 1.5rem 2rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
    border: 1px solid #334155;
}

.card h2 {
    color: #f1f5f9;
    font-size: 1.25rem;
    margin-top: 0;
    margin-bottom: 1rem;
}

ul {
    padding-left: 1.2rem;
    line-height: 1.8;
}

li {
    color: #cbd5e1;
    margin-bottom: 0.5rem;
}
`
  },
  {
    path: 'logo.svg',
    name: 'logo.svg',
    language: 'xml',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
    <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="90" height="90" x="5" y="5" rx="22" fill="#0f172a" stroke="url(#primaryGrad)" stroke-width="4"/>
  <path d="M30 40 L45 50 L30 60" fill="none" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M70 40 L55 50 L70 60" fill="none" stroke="#818cf8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M47 30 L53 70" fill="none" stroke="url(#sparkGrad)" stroke-width="4" stroke-linecap="round"/>
</svg>
`
  },
  {
    path: 'src/App.tsx',
    name: 'App.tsx',
    language: 'typescript',
    content: `import React, { useState } from 'react';
// I componenti sono interconnessi: importabili con percorso relativo o per nome!
import Counter from './Counter';
import { UserProfile } from './UserProfile';
import logo from '../logo.svg';

export default function App() {
  const [activeTab, setActiveTab] = useState<'counter' | 'profile'>('counter');
  const [user, setUser] = useState({
    id: 'usr_1',
    name: 'Mario Rossi',
    email: 'mario.rossi@example.com',
    role: 'editor' as 'admin' | 'editor' | 'viewer',
    createdAt: new Date()
  });

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-xl text-slate-100">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <img src={logo} alt="React Logo" className="w-8 h-8 rounded" />
          <div>
            <h2 className="text-lg font-bold text-sky-400">App React (TSX)</h2>
            <p className="text-xs text-slate-400">Componenti collegati ad App.tsx con successo!</p>
          </div>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
          <button
            onClick={() => setActiveTab('counter')}
            className={\`px-3 py-1 rounded transition \${activeTab === 'counter' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}\`}
          >
            Counter (JSX)
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={\`px-3 py-1 rounded transition \${activeTab === 'profile' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}\`}
          >
            Profilo (TSX)
          </button>
        </div>
      </div>

      <div className="pt-4">
        {activeTab === 'counter' ? (
          <Counter />
        ) : (
          <UserProfile 
            user={user} 
            onUpdateRole={(newRole) => setUser(prev => ({ ...prev, role: newRole }))} 
          />
        )}
      </div>
    </div>
  );
}
`
  },
  {
    path: 'src/Counter.jsx',
    name: 'Counter.jsx',
    language: 'javascript',
    content: `import React, { useState } from 'react';

/**
 * Componente Counter di esempio scritto in JSX
 */
export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-lg flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <span className="text-2xl">⚡</span>
        <div>
          <div className="text-sm font-semibold text-white">Contatore Interattivo (Counter.jsx)</div>
          <p className="text-xs text-slate-400">Stato locale React: {count}</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <button 
          onClick={() => setCount(prev => prev - 1)}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 text-xs font-bold transition"
        >
          -1
        </button>
        <button 
          onClick={() => setCount(0)}
          className="px-2 py-1 bg-slate-700/60 hover:bg-slate-700 rounded text-slate-400 text-xs transition"
        >
          Reset
        </button>
        <button 
          onClick={() => setCount(prev => prev + 1)}
          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 rounded text-slate-950 text-xs font-bold transition"
        >
          +1
        </button>
      </div>
    </div>
  );
}
`
  },
  {
    path: 'src/types/interfaces.ts',
    name: 'interfaces.ts',
    language: 'typescript',
    content: `// Definizione delle interfacce in TypeScript

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: Date;
}

export type ThemeMode = 'light' | 'dark' | 'system';
`
  },
  {
    path: 'src/UserProfile.tsx',
    name: 'UserProfile.tsx',
    language: 'typescript',
    content: `import React from 'react';
import { User } from './types/interfaces';

interface UserProfileProps {
  user: User;
  onUpdateRole: (newRole: User['role']) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdateRole }) => {
  return (
    <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-lg">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-sm font-bold text-white">{user.name}</div>
          <div className="text-xs text-slate-400">{user.email}</div>
        </div>
        <span className={\`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider \${
          user.role === 'admin' 
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
            : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
        }\`}>
          {user.role}
        </span>
      </div>

      <div className="flex items-center space-x-2 pt-2 border-t border-slate-700/60">
        <span className="text-xs text-slate-400">Modifica Ruolo:</span>
        <button 
          onClick={() => onUpdateRole('admin')}
          className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200 transition"
        >
          Admin
        </button>
        <button 
          onClick={() => onUpdateRole('editor')}
          className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200 transition"
        >
          Editor
        </button>
        <button 
          onClick={() => onUpdateRole('viewer')}
          className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200 transition"
        >
          Viewer
        </button>
      </div>
    </div>
  );
};
`
  },
  {
    path: 'app.js',
    name: 'app.js',
    language: 'javascript',
    content: `// Codice JavaScript per il Playground

const features = [
    "Collegamento automatico tra HTML e CSS (<link rel='stylesheet'>)",
    "Supporto immagini in CSS (background-image: url('...')) e HTML (<img src='...'>)",
    "Supporto completo componenti React: import ed export default o named collegati ad App.tsx",
    "Importazione risorse in React: import logo from './logo.svg'",
    "Evidenziazione sintassi in tempo reale con Monaco Editor",
    "Caricamento e download ZIP di interi progetti"
];

document.addEventListener("DOMContentLoaded", () => {
    const listElement = document.getElementById("feature-list");
    
    if (listElement) {
        listElement.innerHTML = '';
        features.forEach(feature => {
            const li = document.createElement("li");
            li.textContent = feature;
            listElement.appendChild(li);
        });
        
        console.log("Playground caricato con successo! Funzionalità attive:", features.length);
    }
});
`
  },
  {
    path: 'package.json',
    name: 'package.json',
    language: 'json',
    content: `{
  "name": "my-playground-project",
  "version": "1.0.0",
  "description": "Playground per HTML, CSS, JavaScript e React",
  "main": "src/App.tsx",
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.344.0"
  }
}
`
  }
];
