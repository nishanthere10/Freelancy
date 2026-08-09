import { z } from 'zod';

export const projectFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Project name is required')
      .max(255, 'Project name must not exceed 255 characters'),
    clientId: z.string(),
    pricingModel: z.enum(['fixed', 'hourly', 'retainer']),
    budgetCurrency: z.string(),
    budgetAmount: z.string(),
    startDate: z.string(),
    targetDate: z.string(),
    description: z.string(),
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
