import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Hane App, Claude.ai içindeyken "window.storage" adında özel bir
// hafıza sistemi kullanıyordu. Bu sistem sadece Claude'un kendi
// ortamında var. Gerçek bir web sitesinde (Vercel'de) çalışırken
// verileri tarayıcının kendi hafızası olan localStorage'a kaydediyoruz.
// Böylece App.jsx dosyasında hiçbir şeyi değiştirmemize gerek kalmadı.
if (!window.storage) {
  const prefix = "hane-app::";

  window.storage = {
    get: async (key) => {
      const raw = localStorage.getItem(prefix + key);
      if (raw === null) return null;
      return { key, value: raw, shared: false };
    },
    set: async (key, value) => {
      localStorage.setItem(prefix + key, value);
      return { key, value, shared: false };
    },
    delete: async (key) => {
      localStorage.removeItem(prefix + key);
      return { key, deleted: true, shared: false };
    },
    list: async (p) => {
      const keys = Object.keys(localStorage)
        .filter((k) => k.startsWith(prefix + (p || "")))
        .map((k) => k.slice(prefix.length));
      return { keys, prefix: p, shared: false };
    },
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
