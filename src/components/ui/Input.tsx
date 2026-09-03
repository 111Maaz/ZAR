import { type InputHTMLAttributes, forwardRef, type ReactNode, type ElementType, isValidElement, createElement } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  icon?: ElementType | ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, required, className, id, icon, ...props }, ref) => {
    const inputId = id || props.name;
    const renderedIcon = icon
      ? isValidElement(icon)
        ? (icon as ReactNode)
        : createElement(icon as ElementType, { className: 'h-4 w-4' })
      : null;
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
        <div className="relative">
          {renderedIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              {renderedIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`input-base ${renderedIcon ? 'pl-10' : ''} ${error ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20' : ''} ${className ?? ''}`}
            {...props}
          />
        </div>
        {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        {error && <p className="mt-1 text-xs text-error-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
