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
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header class="main-header">
        <h1>Benvenuto nel Playground</h1>
        <p>Un editor leggero per scrivere HTML, CSS e JavaScript in tempo reale.</p>
    </header>

    <main class="container">
        <section class="card">
            <h2>Funzionalità dell'Editor</h2>
            <ul id="feature-list">
                <!-- Verrà popolato tramite JavaScript -->
            </ul>
        </section>

        <!-- Punto di montaggio per componenti React (es. App.tsx, Counter.jsx) -->
        <div id="root" style="margin-top: 1.5rem;"></div>
    </main>

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
    margin-bottom: 3rem;
}

.main-header h1 {
    font-size: 2.5rem;
    color: #38bdf8;
    margin: 0 0 0.5rem 0;
}

.container {
    width: 100%;
    max-width: 600px;
}

.card {
    background-color: #1e293b;
    border-radius: 12px;
    padding: 1.5rem 2rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
    border: 1px solid #334155;
}

ul {
    padding-left: 1.2rem;
    line-height: 1.8;
}

li {
    color: #94a3b8;
    margin-bottom: 0.5rem;
}
`
  },
  {
    path: 'app.js',
    name: 'app.js',
    language: 'javascript',
    content: `// Codice JavaScript per il Playground

const features = [
    "Evidenziazione della sintassi in tempo reale",
    "Supporto per HTML, CSS, JS, JSX, TSX, JSON",
    "Caricamento locale di file e intere cartelle",
    "Download di singoli file o dell'intero progetto in formato ZIP",
    "Nessun server o anteprima di disturbo: solo codice puro!"
];

document.addEventListener("DOMContentLoaded", () => {
    const listElement = document.getElementById("feature-list");
    
    if (listElement) {
        features.forEach(feature => {
            const li = document.createElement("li");
            li.textContent = feature;
            listElement.appendChild(li);
        });
        
        console.log("Playground caricato con successo! Numero di feature:", features.length);
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
  "description": "Un progetto di esempio nel mio Codice Playground",
  "main": "app.js",
  "scripts": {
    "start": "echo 'Nessun server necessario, solo codice!'"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "author": "Sviluppatore Web",
  "license": "MIT"
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
    <div className="p-6 max-w-sm mx-auto bg-slate-800 rounded-xl shadow-md flex items-center space-x-4">
      <div className="flex-shrink-0">
        <span className="text-3xl text-emerald-400">⚡</span>
      </div>
      <div>
        <div className="text-xl font-medium text-white">Contatore React (JSX)</div>
        <p className="text-slate-400">Valore attuale: {count}</p>
        <button 
          onClick={() => setCount(count + 1)}
          className="mt-2 px-4 py-1 text-sm text-emerald-600 font-semibold rounded-full border border-emerald-500 hover:text-white hover:bg-emerald-600 hover:border-transparent focus:outline-none"
        >
          Incrementa
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

export interface AppConfig {
  theme: ThemeMode;
  fontSize: number;
  wordWrap: boolean;
  tabSize: number;
}
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
    <div className="user-profile-card">
      <h3>Profilo Utente (TSX)</h3>
      <div className="info">
        <p><strong>Nome:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Ruolo:</strong> {user.role}</p>
      </div>
      <div className="actions">
        <button onClick={() => onUpdateRole('admin')}>Imposta Admin</button>
        <button onClick={() => onUpdateRole('editor')}>Imposta Editor</button>
      </div>
    </div>
  );
};
`
  }
];
