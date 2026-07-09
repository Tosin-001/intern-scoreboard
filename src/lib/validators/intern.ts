import { z } from "zod";

export const internCreateSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  department: z.string().trim().min(2, "Department is required").max(60),
  score: z
    .number()
    .int("Score must be a whole number")
    .min(0, "Score cannot be negative")
    .max(100, "Score cannot exceed 100"),
});

export const internUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  department: z.string().trim().min(2).max(60).optional(),
  score: z.number().int().min(0).max(100).optional(),
});

export type InternCreateInput = z.infer<typeof internCreateSchema>;
export type InternUpdateInput = z.infer<typeof internUpdateSchema>;
