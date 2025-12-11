import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { confirmSignUp } from 'aws-amplify/auth';

interface LoginFormProps {
  mode: 'signin' | 'signup';
}

interface FormValues {
  email: string;
  password: string;
  confirmPassword?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ mode }) => {
  const { login, register: registerUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Local state for visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      if (mode === 'signin') {
        const result = await login({ 
            username: data.email, 
            password: data.password 
        });
        
        if (result.isSignedIn) {
            toast.success("ACCESS GRANTED");
        } else if (result.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
             handleVerification(data.email);
        }
      } else {
        const { nextStep } = await registerUser({
            username: data.email,
            password: data.password,
            options: {
                userAttributes: {
                    email: data.email
                }
            }
        });

        if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
            toast.success("Account created. Verification code sent.");
            handleVerification(data.email);
        } else if (nextStep.signUpStep === 'COMPLETE_AUTO_SIGN_IN') {
             toast.success("Account created successfully!");
        }
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (email: string) => {
    const code = window.prompt(`Enter the verification code sent to ${email}:`);
    if (!code) return;
    
    try {
        await confirmSignUp({ username: email, confirmationCode: code });
        toast.success("Verified! Please sign in.");
    } catch (err: any) {
        toast.error(`Verification failed: ${err.message}`);
    }
  };

  // Reusable style for all inputs to ensure visibility on dark backgrounds
  const inputClasses = "w-full bg-transparent border-b border-white/20 py-2 text-sm text-white font-mono placeholder-white/20 focus:border-sentinel focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <form className="w-full flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
      
      {/* --- Email Field --- */}
      <div className="space-y-1">
        <label className="block text-[10px] font-mono font-semibold text-ghost/60 uppercase tracking-wider">
            ID_SEQUENCE (EMAIL)
        </label>
        <input
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Invalid email address',
            },
          })}
          className={inputClasses}
          placeholder="user@panoptes.net"
          disabled={isLoading}
        />
        {errors.email && <span className="text-red-500 text-[10px] font-mono mt-1 block">{errors.email.message}</span>}
      </div>

      {/* --- Password Field --- */}
      <div className="space-y-1">
        <label className="block text-[10px] font-mono font-semibold text-ghost/60 uppercase tracking-wider">
            ACCESS_KEY
        </label>
        <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
              })}
              className={`${inputClasses} pr-10`}
              placeholder="••••••••"
              disabled={isLoading}
            />
            
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-ghost/40 hover:text-sentinel transition-colors focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={isLoading}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
        {errors.password && <span className="text-red-500 text-[10px] font-mono mt-1 block">{errors.password.message}</span>}
      </div>

      {/* --- Confirm Password (Signup Only) --- */}
      {mode === 'signup' && (
        <div className="space-y-1">
          <label className="block text-[10px] font-mono font-semibold text-ghost/60 uppercase tracking-wider">
            CONFIRM_KEY
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) => value === watch('password') || 'Passwords do not match',
              })}
              className={`${inputClasses} pr-10`}
              placeholder="••••••••"
              disabled={isLoading}
            />
            
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-ghost/40 hover:text-sentinel transition-colors focus:outline-none"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              disabled={isLoading}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <span className="text-red-500 text-[10px] font-mono mt-1 block">{errors.confirmPassword.message}</span>
          )}
        </div>
      )}

      {/* --- Footer Actions --- */}
      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className="relative flex items-center">
            <input type="checkbox" className="peer sr-only" disabled={isLoading} />
            <div className="h-3 w-3 border border-ghost/40 rounded-sm bg-transparent peer-checked:bg-sentinel peer-checked:border-sentinel transition-all" />
          </div>
          <span className="text-[10px] font-mono text-ghost/60 group-hover:text-white transition-colors">REMEMBER_SESSION</span>
        </label>
        
        {mode === 'signin' && (
          <a href="#" className="text-[10px] font-mono text-sentinel hover:text-white transition-colors">
            LOST_KEY?
          </a>
        )}
      </div>

      <Button 
        type="submit" 
        className="w-full mt-2 bg-sentinel hover:bg-sentinel/90 text-black font-mono tracking-widest text-xs py-6" 
        disabled={isLoading}
      >
        {isLoading 
            ? <span className="animate-pulse">PROCESSING...</span> 
            : (mode === 'signin' ? 'INITIATE_LINK' : 'REGISTER_UNIT')
        }
      </Button>
    </form>
  );
};