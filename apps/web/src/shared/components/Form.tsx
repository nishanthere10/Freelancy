/**
 * Form wrapper component
 * Composes React Hook Form FormProvider for easier field composition
 */

'use client';

import React from 'react';
import { FormProvider, type UseFormReturn, type FieldValues, type SubmitHandler } from 'react-hook-form';

interface FormProps<T extends FieldValues = FieldValues>
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  methods: UseFormReturn<T>;
  onSubmit: SubmitHandler<T>;
  children: React.ReactNode;
}

export const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ methods, onSubmit, children, ...props }, ref) => {
    return (
      <FormProvider {...methods}>
        <form ref={ref} onSubmit={methods.handleSubmit(onSubmit)} {...props}>
          {children}
        </form>
      </FormProvider>
    );
  }
);

Form.displayName = 'Form';
