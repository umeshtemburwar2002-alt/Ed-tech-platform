import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";

// Suppress ResizeObserver errors
const resizeObserverErrorHandler = (e) => {
  if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
    const resizeObserverErrDiv = document.getElementById('webpack-dev-server-client-overlay-div');
    const resizeObserverErr = document.getElementById('webpack-dev-server-client-overlay');
    if (resizeObserverErr) {
      resizeObserverErr.setAttribute('style', 'display: none');
    }
    if (resizeObserverErrDiv) {
      resizeObserverErrDiv.setAttribute('style', 'display: none');
    }
  }
};

window.addEventListener('error', resizeObserverErrorHandler);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Provider store={store}>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <App />
        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: 'rgba(30,30,30,0.9)',
              color: '#fff',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)',
            },
            success: {
              style: {
                background: 'linear-gradient(to right, #4ade80, #16a34a)',
              },
            },
            error: {
              style: {
                background: 'linear-gradient(to right, #f87171, #dc2626)',
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </Provider>
);
