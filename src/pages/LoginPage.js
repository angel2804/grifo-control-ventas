import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import '../styles/login.css';

const LoginPage = () => {
  const { users, login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');

  const handleLogin = () => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) { login(user); setError(''); }
    else setError('Usuario o contraseña incorrectos');
  };

  const handleKeyDown = e => { if (e.key === 'Enter') handleLogin(); };

  return (
    <div className="login-page">

      {/* ── Panel izquierdo: formulario ── */}
      <div className="login-left">
        <div className="login-form-wrapper">

          {/* Logo / ícono */}
          <div className="login-brand">
            <div className="login-logo-box">
              {/*
                LOGO: coloca tu archivo en  public/logo.png  (o .jpg / .svg)
                Si no existe, se muestra el emoji ⛽ como respaldo.
              */}
              <span className="login-logo-fallback">⛽</span>
              <img
                src="/logo.png"
                alt="Logo"
                className="login-logo-img"
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <h1 className="login-title">GrifoControl</h1>
            <p className="login-subtitle">Sistema de Control de Ventas</p>
          </div>

          {/* Bienvenida */}
          <div className="login-welcome">
            <h2 className="login-welcome-title">Bienvenido</h2>
            <p className="login-welcome-sub">Ingresa tus credenciales para continuar</p>
          </div>

          {/* Campos */}
          <div className="login-field">
            <label className="login-label">USUARIO</label>
            <input
              className="login-input"
              placeholder="Ingrese su usuario"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="username"
            />
          </div>

          <div className="login-field">
            <label className="login-label">CONTRASEÑA</label>
            <input
              className="login-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="login-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <button className="login-btn" onClick={handleLogin}>
            Iniciar Sesión →
          </button>

        </div>
      </div>

      {/* ── Panel derecho: imagen de la empresa ── */}
      <div
        className="login-right"
        style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/hero.jpg)` }}
      >
        {/*
          IMAGEN: coloca tu archivo en  public/hero.jpg  (o .png / .webp)
          Si no existe, se muestra un degradado de fondo como respaldo.
        */}
        <div className="login-right-overlay">
          <div className="login-right-content">
            <div className="login-right-badge">⛽ Gestión de Combustible</div>
            <h2 className="login-right-title">
              Control total<br />de tu grifo
            </h2>
            <p className="login-right-desc">
              Registra turnos, verifica reportes<br />y monitorea ventas en tiempo real.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default LoginPage;
