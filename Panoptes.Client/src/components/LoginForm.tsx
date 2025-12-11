import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react'; // Import icons
import { Input } from './ui/input';
import { Button } from './ui/button';
// TODO import { useAuth } from '../context/AuthContext';

interface LoginFormProps {
  mode: 'signin' | 'signup';
}

interface FormValues {
  email: string;
  password: string;
  confirmPassword?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ mode }) => {
   // TODO const { login, register: registerUser } = useAuth();
  const [isLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormValues>();

  // 1. Local state for visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const onSubmit = (data: FormValues) => {
    // Stub: Show a message for now
    alert(`Form submitted!\nMode: ${mode}\nEmail: ${data.email}`);
  };

  return (
    <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      
      {/* --- Email --- */}
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
          disabled={isLoading}
        />
        {errors.email && <span className="text-destructive text-xs mt-1">{errors.email.message}</span>}
      </div>

      {/* --- Password --- */}
      <div>
        <label className="block text-sm font-semibold font-mono text-ghost mb-2">Password</label>
        <div className="relative">
          <Input
            // 2. Toggle type based on state
            type={showPassword ? 'text' : 'password'}
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters',
              },
            })}
            className="w-full pr-10" 
            placeholder="••••••••"
          />
          
          {/* 3. Toggle Button */}
          <button
            type="button" 
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ghost/50 hover:text-sentinel transition-colors focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && <span className="text-destructive text-xs mt-1">{errors.password.message}</span>}
      </div>

      {/* --- Confirm Password (Signup Only) --- */}
      {mode === 'signup' && (
        <div>
          <label className="block text-sm font-semibold text-ghost mb-2">Confirm Password</label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) => value === watch('password') || 'Passwords do not match',
              })}
              className="w-full pr-10"
              placeholder="••••••••"
            />
            
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ghost/50 hover:text-sentinel transition-colors focus:outline-none"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <span className="text-destructive text-xs mt-1">{errors.confirmPassword.message}</span>
          )}
        </div>
      )}

      {/* --- Actions --- */}
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

      <Button type="submit" className="w-full mt-4 font-sans" disabled={isLoading}>
        {isLoading 
            ? <span className="animate-pulse">PROCESSING...</span> 
            : (mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT')
        }
      </Button>
    </form>
  );
};