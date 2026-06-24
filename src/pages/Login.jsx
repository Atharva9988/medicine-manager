import { useState } from "react";
import { auth } from "../firebase/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError("");
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Medicine Manager</h1>
        <p style={styles.subtitle}>Track your medicines and expiry dates</p>
      </div>

      <div style={styles.tabRow}>
        <button
          style={isLogin ? styles.activeTab : styles.inactiveTab}
          onClick={() => setIsLogin(true)}
        >
          Log in
        </button>
        <button
          style={!isLogin ? styles.activeTab : styles.inactiveTab}
          onClick={() => setIsLogin(false)}
        >
          Sign up
        </button>
      </div>

      <input
        style={styles.input}
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        style={styles.input}
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p style={styles.error}>{error}</p>}

      <button style={styles.button} onClick={handleSubmit}>
        {isLogin ? "Log in" : "Create account"}
      </button>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "360px",
    margin: "80px auto",
    padding: "32px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    fontFamily: "sans-serif",
    border: "1px solid #e5e7eb",
    borderRadius: "12px"
  },
  header: {
    textAlign: "center",
    marginBottom: "8px"
  },
  title: {
    fontSize: "22px",
    fontWeight: "600",
    margin: "0 0 6px 0"
  },
  subtitle: {
    fontSize: "13px",
    color: "#6b7280",
    margin: 0
  },
  tabRow: {
    display: "flex",
    gap: "8px"
  },
  activeTab: {
    flex: 1,
    padding: "10px",
    border: "1px solid #4F46E5",
    borderRadius: "8px",
    background: "#4F46E5",
    color: "white",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "14px"
  },
  inactiveTab: {
    flex: 1,
    padding: "10px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    background: "white",
    color: "#333",
    cursor: "pointer",
    fontSize: "14px"
  },
  input: {
    padding: "12px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none"
  },
  button: {
    padding: "13px",
    background: "#4F46E5",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    marginTop: "4px"
  },
  error: {
    color: "#dc2626",
    fontSize: "13px",
    margin: 0
  }
};

export default Login;