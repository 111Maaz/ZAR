import { type TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, required, className, id, ...props }, ref) => {
    const textareaId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="label-base">
            {label}
            {required && <span className="ml-0.5 text-error-500">*</span>}
            {!required && <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`input-base min-h-[80px] resize-y ${error ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20' : ''} ${className ?? ''}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-error-600">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
