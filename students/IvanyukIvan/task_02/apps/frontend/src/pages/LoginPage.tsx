import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useState } from 'react';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters')
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
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
      await login(data);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Login failed');
    }
  };

  return (
    <div className="card" style={{ maxWidth: 420 }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="card-body">
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
          {isSubmitting ? 'Signing in...' : 'Login'}
        </Button>
        <div className="muted">
          No account? <Link to="/register">Register</Link>
        </div>
      </form>
    </div>
  );
}
