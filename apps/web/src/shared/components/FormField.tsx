'use client';

/**
 * FormField component
 * Abstracts React Hook Form field logic with error rendering
 */
import { forwardRef, type InputHTMLAttributes } from 'react';
import { Controller, useFormContext, type FieldValues, type Path } from 'react-hook-form';
import { Input } from './Input';

interface FormFieldProps<T extends FieldValues>
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> {
  name: Path<T>;
  label?: string;
  required?: boolean;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps<any>>(
  (
    {
      name,
      label,
      placeholder,
      type = 'text',
      required = false,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const { control, formState } = useFormContext<any>();
    const fieldError = formState.errors[name];
    const errorMessage = fieldError?.message as string | undefined;

    return (
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <div className="flex flex-col gap-2">
            {label && (
              <label htmlFor={name} className="text-sm font-medium text-gray-700">
                {label}
                {required && <span className="text-red-600 ml-1">*</span>}
              </label>
            )}
            <Input
              {...field}
              ref={ref}
              id={name}
              type={type}
              placeholder={placeholder}
              disabled={disabled}
              error={errorMessage}
              {...props}
            />
          </div>
        )}
      />
    );
  }
);

FormField.displayName = 'FormField';
