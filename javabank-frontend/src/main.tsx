import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ---------------------------------------------------------------------------
// 1. Guard: bail out with a clear error if the mount node is missing
// ---------------------------------------------------------------------------
const container = document.getElementById('root');
if (!container) {
    // eslint-disable-next-line no-console
    console.error('[JavaBank] #root element not found in index.html');
    throw new Error('Cannot mount JavaBank: #root not present in the DOM');
}

// ---------------------------------------------------------------------------
// 2. HMR-safe root — reuse the same root across Vite reloads
// ---------------------------------------------------------------------------
const globalRef = globalThis as typeof globalThis & { __JB_ROOT__?: Root };
const root: Root = globalRef.__JB_ROOT__ ?? createRoot(container);
if (import.meta.env.DEV) globalRef.__JB_ROOT__ = root;

// ---------------------------------------------------------------------------
// 3. Global error / rejection logging
// ---------------------------------------------------------------------------
window.addEventListener('unhandledrejection', (e) => {
    // eslint-disable-next-line no-console
    console.error('[JavaBank] Unhandled promise rejection:', e.reason);
});

// ---------------------------------------------------------------------------
// 4. Mount
// ---------------------------------------------------------------------------
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

// ---------------------------------------------------------------------------
// 5. Dev banner
// ---------------------------------------------------------------------------
if (import.meta.env.DEV) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    // eslint-disable-next-line no-console
    console.info(
        `%cJavaBank%c dev build ready\nAPI: ${apiUrl}\nShortcuts: Ctrl/Cmd+K (palette) · Ctrl+Shift+L (clear auth)`,
        'background:#002743;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600',
        'color:#42474e'
    );
}