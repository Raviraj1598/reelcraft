
  import { createRoot } from "react-dom/client";
  import { BrowserRouter } from "react-router-dom";
  import App from "./App.tsx";
  import { AuthProvider } from "./contexts/AuthContext.tsx";
  import "./index.css";

  createRoot(document.getElementById("root")!).render(
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  );
  