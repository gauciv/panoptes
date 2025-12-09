import React from 'react';
import { useForm } from 'react-hook-form';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface LoginFormProps {
  mode: 'signin' | 'signup';
}

interface FormValues {
  email: string;
  password: string;
  confirmPassword?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ mode }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormValues>();

  const onSubmit = (data: FormValues) => {
    // Stub: Show a message for now
    alert(`Form submitted!\nMode: ${mode}\nEmail: ${data.email}`);
  };

  return (
    <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label className="block text-sm font-mono font-semibold text-ghost mb-2">Email</label>
        <Input
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Invalid email address',
            },
          })}
          className="w-full"
          placeholder="you@example.com"
        />
        {errors.email && <span className="text-destructive text-xs mt-1">{errors.email.message}</span>}
      </div>

      <div>
        <label className="block text-sm font-semibold font-mono text-ghost mb-2">Password</label>
        <Input
          type="password"
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 8,
              message: 'Password must be at least 8 characters',
            },
          })}
          className="w-full"
          placeholder="••••••••"
        />
        {errors.password && <span className="text-destructive text-xs mt-1">{errors.password.message}</span>}
      </div>

      {mode === 'signup' && (
        <div>
          <label className="block text-sm font-semibold text-ghost mb-2">Confirm Password</label>
          <Input
            type="password"
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) => value === watch('password') || 'Passwords do not match',
            })}
            className="w-full"
            placeholder="••••••••"
          />
          {errors.confirmPassword && (
            <span className="text-destructive text-xs mt-1">{errors.confirmPassword.message}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded border-ghost-dim" />
          <span className="text-sm text-ghost/70">Remember me</span>
        </label>
        {mode === 'signin' && (
          <a href="#" className="text-sm text-sentinel hover:text-sentinel/80 font-semibold transition-colors">
            Forgot password?
          </a>
        )}
      </div>

      <Button type="submit" className="w-full mt-4 font-sans">
        {mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
      </Button>
    </form>
  );
};
