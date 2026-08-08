import { z } from 'zod';

const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const clientFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Client name is required')
    .max(255, 'Client name must not exceed 255 characters'),
  email: z
    .string()
    .trim()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters'),
  phone: z.string().trim().max(50, 'Phone must not exceed 50 characters').optional().or(z.literal('')),
  website: z
    .string()
    .trim()
    .url('Website must be a valid URL')
    .max(255, 'Website must not exceed 255 characters')
    .optional()
    .or(z.literal('')),
  companyName: z
    .string()
    .trim()
    .max(255, 'Company name must not exceed 255 characters')
    .optional()
    .or(z.literal('')),
  gstNumber: z
    .string()
    .trim()
    .regex(gstRegex, 'Invalid GST number format (e.g. 29AABCM1234D1ZX)')
    .optional()
    .or(z.literal('')),
  contactPerson: z
    .string()
    .trim()
    .max(255, 'Contact person must not exceed 255 characters')
    .optional()
    .or(z.literal('')),
  department: z
    .string()
    .trim()
    .max(255, 'Department must not exceed 255 characters')
    .optional()
    .or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  city: z.string().trim().max(100, 'City must not exceed 100 characters').optional().or(z.literal('')),
  state: z.string().trim().max(100, 'State must not exceed 100 characters').optional().or(z.literal('')),
  postalCode: z.string().trim().max(20, 'Postal code must not exceed 20 characters').optional().or(z.literal('')),
  country: z.string().trim().max(100, 'Country must not exceed 100 characters').optional().or(z.literal('')),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
