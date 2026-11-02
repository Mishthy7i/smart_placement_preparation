import { useEffect, useState } from "react";
import { api } from "./services/api";

function App() {
  const [message, setMessage] = useState("Connecting to backend...");
  const [error, setError] = useState("");

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await api.get("/health");
        setMessage(response.data.message);
      } catch {
        setError("Could not connect to backend");
      }
    };

    checkBackend();
  }, []);

  return (
    <main>
      <h1>Smart Placement Portal</h1>

      {error ? <p>{error}</p> : <p>{message}</p>}
    </main>
  );
}

export default App;