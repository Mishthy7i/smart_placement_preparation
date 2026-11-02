import { useEffect, useState } from "react";
import { api } from "./services/api";

type User = {
  id: number;
  name: string;
  email: string;
};

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem("token");

    api
      .get("/protected-test", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => {
        setMessage(response.data.message);
      })
      .catch(() => {
        handleLogout();
      });
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setMessage("");
  };

  if (user) {
    return (
      <main style={{ maxWidth: "700px", margin: "60px auto" }}>
        <h1>Smart Placement Portal</h1>
        <h2>Student Dashboard</h2>

        <p>Welcome, {user.name}!</p>
        <p>Email: {user.email}</p>

        {message && <p style={{ color: "green" }}>{message}</p>}

        <button onClick={handleLogout}>Logout</button>
      </main>
    );
  }

  return <LoginForm onLogin={setUser} />;
}

type LoginFormProps = {
  onLogin: (user: User) => void;
};

function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const { token, user } = response.data.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      onLogin(user);
    } catch (error: any) {
      setError(
        error.response?.data?.message || "Login failed. Please try again."
      );
    }
  };

  return (
    <main style={{ maxWidth: "400px", margin: "60px auto" }}>
      <h1>Smart Placement Portal</h1>
      <h2>Student Login</h2>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleLogin();
        }}
      >
        <label>Email</label>
        <br />
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <br />
        <br />

        <label>Password</label>
        <br />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <br />
        <br />

        <button type="submit">Login</button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </main>
  );
}

export default App;