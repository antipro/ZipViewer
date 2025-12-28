
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');

const showError = (err: any) => {
  console.error("ZipViewer: Startup Error:", err);
  if (rootElement) {
    let errorDetail = "";
    if (err instanceof Error) {
      errorDetail = err.stack || err.message;
    } else if (typeof err === 'object' && err !== null) {
      try {
        errorDetail = JSON.stringify(err, null, 2);
      } catch {
        errorDetail = String(err);
      }
    } else {
      errorDetail = String(err);
    }

    rootElement.innerHTML = `
      <div style="padding: 40px; color: white; background: #0f172a; font-family: sans-serif; text-align: center; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <div style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); max-width: 500px; width: 90%;">
          <h1 style="color: #ef4444; margin-bottom: 16px; font-size: 24px;">Initialization Failed</h1>
          <p style="color: #94a3b8; margin-bottom: 24px; line-height: 1.5;">The application could not resolve its dependencies or encountered a runtime error.</p>
          <pre style="display: block; background: #000; padding: 15px; border-radius: 8px; margin-bottom: 24px; font-size: 11px; color: #fca5a5; text-align: left; overflow-x: auto; white-space: pre-wrap; word-break: break-all;">${errorDetail}</pre>
          <button onclick="location.reload()" style="background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 12px; cursor: pointer; font-weight: bold; width: 100%;">Retry Load</button>
        </div>
      </div>
    `;
  }
};

window.onerror = (msg, url, line, col, error) => {
  showError(error || msg);
  return false;
};

window.onunhandledrejection = (event) => {
  showError(event.reason);
};

if (!rootElement) {
  console.error("FATAL: Root element #root not found.");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    showError(err);
  }
}
