
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { StarknetProvider } from './src/starknet/StarknetProvider';
import { Toaster } from 'react-hot-toast';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <StarknetProvider>
      <Toaster position="top-right" />
      <App />
    </StarknetProvider>
  </React.StrictMode>
);
