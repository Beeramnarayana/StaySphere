console.log('React app starting...');
console.log('Document readyState:', document.readyState);
console.log('Document body:', document.body);

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './utils/requestLogger';

function initializeApp() {
  console.log('Initializing app...');
  console.log('Document body content:', document.body ? document.body.outerHTML : 'No body element');
  
  const rootElement = document.getElementById('root');
  console.log('Root element:', rootElement);
  
  if (!rootElement) {
    console.error("Failed to find the root element. Make sure you have a <div id='root'></div> in your HTML.");
    console.log('Creating root element dynamically as fallback...');
    
    // Create root element if it doesn't exist
    const newRoot = document.createElement('div');
    newRoot.id = 'root';
    document.body.appendChild(newRoot);
    
    // Initialize React with the new root
    const root = ReactDOM.createRoot(newRoot);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    return;
  }
  
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Try different ways to ensure the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  setTimeout(initializeApp, 0);
}

reportWebVitals();