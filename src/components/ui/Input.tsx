import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, required, className, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="label-base">
            {label}
            {required && <span className="ml-0.5 text-error-500">*</span>}
            {!required && hint === undefined && (
              <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`input-base ${error ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20' : ''} ${className ?? ''}`}
          {...props}
        />
        {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        {error && <p className="mt-1 text-xs text-error-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
