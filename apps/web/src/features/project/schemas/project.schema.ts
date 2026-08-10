import { z } from 'zod';

export const projectFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Project name is required')
      .max(255, 'Project name must not exceed 255 characters'),
    clientId: z.string().optional(),
    pricingModel: z.enum(['fixed', 'hourly', 'retainer']),
    budgetCurrency: z.string().optional(),
    budgetAmount: z
      .string()
      .optional()
      .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
        message: 'Budget amount must be a positive number',
      }),
    startDate: z.string().optional(),
    targetDate: z.string().optional(),
    description: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.targetDate) {
        return new Date(data.targetDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'Target completion date cannot be before start date',
      path: ['targetDate'],
    }
  );

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

