import { useState } from "react";
import { authApi } from "../shared/api/auth.api";
import { useNavigate, Link } from "react-router-dom";
import { Page } from "../shared/layout/Page";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    try {
      const res = await authApi.login({ email, password });
      localStorage.setItem("accessToken", res.data.data.accessToken);
      navigate("/");
    } catch {
      setError("Неверный email или пароль");
    }
  };

  return (
    <Page>
      <div className="card auth-card">
        <h1>Вход</h1>

        <div className="auth-field">
          <label>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@mail.com"
          />
        </div>

        <div className="auth-field">
          <label>Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div className="auth-actions">
          <button onClick={submit}>Войти</button>
        </div>

        {error && <div className="error">{error}</div>}

        <p className="auth-footer">
          Нет аккаунта? <Link to="/register">Регистрация</Link>
        </p>
      </div>
    </Page>
  );
}
