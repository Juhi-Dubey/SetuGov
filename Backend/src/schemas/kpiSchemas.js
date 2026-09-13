import { z } from 'zod';

export const createKpiSchema = z.object({
  name: z.string().min(2, 'KPI name must be at least 2 characters').max(150),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unit of measurement is required (e.g. minutes, %, count)'),
  baseline_value: z.number({ required_error: 'Baseline value is required' }),
  target_value: z.number({ required_error: 'Target value is required' }),
  actual_value: z.number().optional(),
  weight: z.number().positive().default(1.0)
});

export const updateKpiSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
  baseline_value: z.number().optional(),
  target_value: z.number().optional(),
  actual_value: z.number().optional(),
  weight: z.number().positive().optional(),
  status: z.string().optional()
});

export const createMeasurementSchema = z.object({
  kpi_id: z.string().uuid('Invalid KPI ID'),
  measurement_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  value: z.number({ required_error: 'Measurement value is required' }),
  source: z.string().min(2, 'Source is required (e.g., Hospital HMS, Edge Camera Logs, Field Audit)'),
  verified: z.boolean().default(false)
});

export default {
  createKpiSchema,
  updateKpiSchema,
  createMeasurementSchema
};
