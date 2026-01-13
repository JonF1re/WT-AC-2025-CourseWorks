import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../shared/api/auth.api";
import { Page } from "../shared/layout/Page";

export default function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");

    if (!email.includes("@")) {
      setError("Некорректный email");
      return;
    }

    if (password.length < 6) {
      setError("Пароль должен быть не короче 6 символов");
      return;
    }

    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }

    try {
      await authApi.register({
        email,
        password,
        username: email.split("@")[0],
      });

      navigate("/login");
    } catch (e) {
      const err = e as {
        response?: {
          data?: {
            error?: {
              message?: string;
            };
          };
        };
      };

      setError(
        err.response?.data?.error?.message || "Ошибка регистрации"
      );
    }
  };

  return (
    <Page>
      <div className="card auth-card">
        <h1>Регистрация</h1>

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

        <div className="auth-field">
          <label>Повторите пароль</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div className="auth-actions">
          <button onClick={submit}>Зарегистрироваться</button>
        </div>

        {error && <div className="error">{error}</div>}

        <p className="auth-footer">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </Page>
  );
}
