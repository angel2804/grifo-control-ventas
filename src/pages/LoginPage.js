import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Input, Btn } from '../components/UIComponents';
import '../styles/login.css';

// ============================================
// PÁGINA: Login
// Formulario de inicio de sesión
// ============================================

const LoginPage = () => {
  const { users, login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    // Buscar usuario con credenciales correctas
    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      login(user);
      setError('');
    } else {
      setError('Usuario o contraseña incorrectos');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="login-page">
      {/* Efectos de brillo decorativos */}
      <div className="login-glow-1" />
      <div className="login-glow-2" />

      <div className="login-card">
        {/* Encabezado */}
        <div className="login-header">
          <div className="login-icon">⛽</div>
          <h1 className="login-title">Control de Ventas</h1>
          <p className="login-subtitle">
            Sistema de Grifo — Ingrese sus credenciales
          </p>
        </div>

        {/* Formulario */}
        <Input
          label="USUARIO"
          placeholder="Ingrese su usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Input
          label="CONTRASEÑA"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {/* Mensaje de error */}
        {error && (
          <div className="login-error">
            ⚠️ {error}
          </div>
        )}

        {/* Botón de login */}
        <Btn
          onClick={handleLogin}
          className="btn-full"
          style={{ padding: 14, fontSize: 16, marginTop: 8 }}
        >
          Iniciar Sesión
        </Btn>

        {/* Info de demo */}
        <div className="login-demo">
          Demo: admin / admin123 — carlos / carlos123 — maria / maria123
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
