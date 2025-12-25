import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useState } from 'react';

const schema = z.object({
  username: z.string().min(1, 'Username is required').min(3, 'At least 3 characters').max(30).regex(/^[a-zA-Z0-9_]+$/, 'Use letters, numbers, underscore'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters')
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: doRegister } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await doRegister(data);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Registration failed');
    }
  };

  return (
    <div className="card" style={{ maxWidth: 420 }}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="card-body">
        <div className="form-row">
          <label>Username</label>
          <Input placeholder="ivan" {...register('username')} />
          {errors.username && <span className="error">{errors.username.message}</span>}
        </div>
        <div className="form-row">
          <label>Email</label>
          <Input type="email" placeholder="you@example.com" {...register('email')} />
          {errors.email && <span className="error">{errors.email.message}</span>}
        </div>
        <div className="form-row">
          <label>Password</label>
          <Input type="password" placeholder="********" {...register('password')} />
          {errors.password && <span className="error">{errors.password.message}</span>}
        </div>
        {error && <div className="error">{error}</div>}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Register'}
        </Button>
        <div className="muted">
          Have an account? <Link to="/login">Login</Link>
        </div>
      </form>
    </div>
  );
}
