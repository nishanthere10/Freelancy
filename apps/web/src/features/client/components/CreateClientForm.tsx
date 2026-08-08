'use client';

import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, FormField } from '@shared/components';
import { clientFormSchema, type ClientFormValues } from '../schemas';
import type { CreateClientInput } from '../api';

interface CreateClientFormProps {
  onSubmit: (data: CreateClientInput) => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<ClientFormValues>;
  submitLabel?: string;
}

export function CreateClientForm({
  onSubmit,
  isSubmitting = false,
  defaultValues,
  submitLabel = 'Create Client',
}: CreateClientFormProps) {
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      website: '',
      companyName: '',
      gstNumber: '',
      contactPerson: '',
      department: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'IN',
      ...defaultValues,
    },
  });

  const handleFormSubmit = (values: ClientFormValues) => {
    const cleaned: CreateClientInput = {
      name: values.name,
      email: values.email,
      phone: values.phone || undefined,
      website: values.website || undefined,
      companyName: values.companyName || undefined,
      gstNumber: values.gstNumber || undefined,
      contactPerson: values.contactPerson || undefined,
      department: values.department || undefined,
      address: values.address || undefined,
      city: values.city || undefined,
      state: values.state || undefined,
      postalCode: values.postalCode || undefined,
      country: values.country || 'IN',
    };
    onSubmit(cleaned);
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="name"
            label="Client / Contact Name"
            placeholder="Acme Corp or Rahul Sharma"
            required
            disabled={isSubmitting}
          />
          <FormField
            name="email"
            label="Email Address"
            type="email"
            placeholder="contact@acme.com"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="companyName"
            label="Company Name"
            placeholder="Acme Corporation Pvt Ltd"
            disabled={isSubmitting}
          />
          <FormField
            name="gstNumber"
            label="GST Number (India B2B)"
            placeholder="29AABCM1234D1ZX"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="phone"
            label="Phone Number"
            placeholder="+91 98765 43210"
            disabled={isSubmitting}
          />
          <FormField
            name="website"
            label="Website"
            placeholder="https://acme.com"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="contactPerson"
            label="Contact Person"
            placeholder="Primary Contact Person"
            disabled={isSubmitting}
          />
          <FormField
            name="department"
            label="Department"
            placeholder="Engineering / Procurement"
            disabled={isSubmitting}
          />
        </div>

        <FormField
          name="address"
          label="Street Address"
          placeholder="123 Innovation Drive, Koramangala"
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-3 gap-3">
          <FormField
            name="city"
            label="City"
            placeholder="Bangalore"
            disabled={isSubmitting}
          />
          <FormField
            name="state"
            label="State"
            placeholder="Karnataka"
            disabled={isSubmitting}
          />
          <FormField
            name="postalCode"
            label="Postal Code"
            placeholder="560001"
            disabled={isSubmitting}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-hairline)]">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
