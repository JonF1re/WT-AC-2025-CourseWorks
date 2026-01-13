import React, { useEffect, useState } from 'react';

type Device = {
  id: string;
  name: string;
  description?: string;
  location?: string;
};

const DevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const token = localStorage.getItem('token');

  const userId = localStorage.getItem('userId') || 'HARDCODED_ADMIN_ID';

  const fetchDevices = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:3000/devices', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDevices(data.data || []);
    } catch (err) {
      console.error('Ошибка загрузки устройств:', err);
      setError('Не удалось загрузить устройства');
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleCreate = async () => {
    if (!token || !userId) {
      setError('Нет токена или userId');
      return;
    }

    if (!name) {
      setError('Введите название устройства');
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description, location, owner_id: userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log('Ошибка сервера при создании устройства:', data);
        setError(data.error?.message || 'Ошибка при создании устройства');
        return;
      }

      console.log('Устройство создано:', data);
      setName('');
      setDescription('');
      setLocation('');
      setError(null);
      fetchDevices();
    } catch (err) {
      console.error('Ошибка fetch:', err);
      setError('Ошибка сети при создании устройства');
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:3000/devices/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        console.log('Ошибка удаления:', data);
        setError(data.error?.message || 'Ошибка удаления устройства');
        return;
      }
      fetchDevices();
    } catch (err) {
      console.error('Ошибка fetch при удалении:', err);
      setError('Ошибка сети при удалении устройства');
    }
  };

  return (
    <div>
      <h2>Устройства</h2>

      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}

      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="Название"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          placeholder="Описание"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <input
          placeholder="Локация"
          value={location}
          onChange={e => setLocation(e.target.value)}
        />
        <button onClick={handleCreate}>Создать</button>
      </div>

      <ul>
        {devices.map(d => (
          <li key={d.id}>
            {d.name} - {d.description || 'Нет описания'} ({d.location || 'Нет локации'})
            <button onClick={() => handleDelete(d.id)} style={{ marginLeft: 10 }}>
              Удалить
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DevicesPage;
