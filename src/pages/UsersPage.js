import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Btn, Input, Select, Modal, RoleBadge } from '../components/UIComponents';

// ============================================
// PÁGINA: Gestión de Usuarios (Solo Admin)
// CRUD de usuarios del sistema
// ============================================

const UsersPage = () => {
  const { users, addUser, editUser, deleteUser, currentUser } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'worker',
  });

  // Abrir modal para nuevo usuario
  const handleNew = () => {
    setForm({ name: '', username: '', password: '', role: 'worker' });
    setEditId(null);
    setShowModal(true);
  };

  // Abrir modal para editar usuario
  const handleEdit = (user) => {
    setForm({
      name: user.name,
      username: user.username,
      password: user.password,
      role: user.role,
    });
    setEditId(user.id);
    setShowModal(true);
  };

  // Guardar (crear o editar)
  const handleSave = () => {
    if (!form.name || !form.username || !form.password) return;

    if (editId) {
      editUser(editId, form);
    } else {
      addUser(form);
    }

    setShowModal(false);
    setForm({ name: '', username: '', password: '', role: 'worker' });
    setEditId(null);
  };

  // Eliminar usuario con confirmación
  const handleDelete = (user) => {
    if (user.id === 1) return; // Proteger admin principal
    if (user.id === currentUser?.id) {
      alert('No puedes eliminar tu propio usuario mientras estás logueado.');
      return;
    }
    if (!window.confirm(`¿Eliminar al usuario "${user.name}"?\nEsta acción no se puede deshacer.`)) return;
    deleteUser(user.id);
  };

  return (
    <div>
      <div className="flex-between">
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
            Gestión de Usuarios
          </h2>
          <p className="text-muted">Administre los usuarios del sistema</p>
        </div>
        <Btn onClick={handleNew}>➕ Nuevo Usuario</Btn>
      </div>

      <Card className="mt-2">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.name}</td>
                <td>{u.username}</td>
                <td>
                  <RoleBadge role={u.role} />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn
                      variant="ghost"
                      className="btn-icon"
                      onClick={() => handleEdit(u)}
                    >
                      ✏️
                    </Btn>
                    {u.id !== 1 && u.id !== currentUser?.id && (
                      <Btn
                        variant="danger"
                        className="btn-icon"
                        onClick={() => handleDelete(u)}
                      >
                        🗑️
                      </Btn>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Modal de crear/editar */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editId ? 'Editar Usuario' : 'Nuevo Usuario'}
      >
        <Input
          label="NOMBRE COMPLETO"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label="NOMBRE DE USUARIO"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <Input
          label="CONTRASEÑA"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Select
          label="ROL"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          options={[
            { value: 'worker', label: 'Grifero' },
            { value: 'admin', label: 'Administrador' },
          ]}
        />
        <Btn
          onClick={handleSave}
          className="btn-full mt-2"
        >
          💾 Guardar
        </Btn>
      </Modal>
    </div>
  );
};

export default UsersPage;
