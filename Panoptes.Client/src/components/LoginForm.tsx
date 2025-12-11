import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'; // Added ArrowLeft for the back button
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
  code?: string; // Added this to handle the verification input
}

export const LoginForm: React.FC<LoginFormProps> = ({ mode }) => {
  const { login, register: registerUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // NEW: State to handle the transition from Login -> Verify
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  // Local state for visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger
  } = useForm<FormValues>();

  // Use your exact same styling class
  const inputClasses = "w-full bg-transparent border-b border-white/20 py-2 text-sm text-white font-mono placeholder-white/20 focus:border-sentinel focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  // 1. STANDARD LOGIN/SIGNUP SUBMIT
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
          // Instead of window.prompt, we switch UI state
          setPendingEmail(data.email);
          setIsVerifying(true);
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
          toast.success("Verification code sent.");
          setPendingEmail(data.email);
          setIsVerifying(true);
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

  // 2. NEW VERIFICATION SUBMIT
  const handleVerifySubmit = async () => {
    // Only validate the 'code' field here
    const isValid = await trigger('code');
    if (!isValid) return;

    const code = watch('code');
    setIsLoading(true);

    try {
      await confirmSignUp({ username: pendingEmail, confirmationCode: code! });
      toast.success("Verified! Accessing system...");
      setIsVerifying(false);
      // Reload to force the auth state to update and log the user in
      window.location.reload();
    } catch (err: any) {
      toast.error(`Verification failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDER BLOCK 1: VERIFICATION UI (Matches your theme exactly) ---
  if (isVerifying) {
    return (
      <div className="w-full flex flex-col gap-6 animate-in fade-in slide-in-from-right-8 duration-300">
        {/* Header area specifically for verification */}
        <div className="space-y-2">
          <button
            onClick={() => setIsVerifying(false)}
            className="flex items-center gap-2 text-[10px] font-mono text-ghost/60 hover:text-sentinel transition-colors mb-2"
          >
            <ArrowLeft size={12} /> BACK_TO_LOGIN
          </button>
          <h3 className="text-lg font-bold text-white font-sans">SECURITY CHECK</h3>
          <p className="text-xs text-ghost/70 font-mono">
            Enter the sequence sent to <span className="text-white">{pendingEmail}</span>
          </p>
        </div>

        {/* The Code Input - Uses your exact inputClasses */}
        <div className="space-y-1">
          <label className="block text-[10px] font-mono font-semibold text-ghost/60 uppercase tracking-wider">
            VERIFICATION_CODE
          </label>
          <input
            type="text"
            {...register('code', { required: 'Verification code is required' })}
            className={`${inputClasses} text-center tracking-[0.5em] text-lg font-bold`}
            placeholder="000000"
            maxLength={6}
            disabled={isLoading}
            autoFocus
          />
          {errors.code && <span className="text-red-500 text-[10px] font-mono mt-1 block">{errors.code.message}</span>}
        </div>

        {/* The Button - Uses your exact Button styling */}
        <Button
          type="button"
          onClick={handleVerifySubmit}
          className="w-full mt-2 bg-sentinel hover:bg-sentinel/90 text-black font-mono tracking-widest text-xs py-6"
          disabled={isLoading}
        >
          {isLoading ? <span className="animate-pulse">VERIFYING...</span> : 'CONFIRM_SEQUENCE'}
        </Button>
      </div>
    );
  }

  // --- RENDER BLOCK 2: YOUR ORIGINAL LOGIN FORM (Untouched) ---
  return (
    <form className="w-full flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>

      {/* Email Field */}
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

      {/* Password Field */}
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
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && <span className="text-red-500 text-[10px] font-mono mt-1 block">{errors.password.message}</span>}
      </div>

      {/* Confirm Password (Signup Only) */}
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
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <span className="text-red-500 text-[10px] font-mono mt-1 block">{errors.confirmPassword.message}</span>
          )}
        </div>
      )}

      {/* Footer Actions */}
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