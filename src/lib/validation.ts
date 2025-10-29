import { z } from "zod";

// Book validation schemas
export const manualBookSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500, "Title must be less than 500 characters"),
  author: z.string().trim().max(200, "Author name must be less than 200 characters").optional().or(z.literal("")),
  pageCount: z.number().int().positive("Page count must be positive").max(50000, "Page count must be less than 50,000").optional(),
  coverUrl: z.string().trim().url("Must be a valid URL").max(2048, "URL must be less than 2048 characters").optional().or(z.literal("")),
});

// Note validation schema
export const noteSchema = z.object({
  content: z.string().trim().min(1, "Note cannot be empty").max(10000, "Note must be less than 10,000 characters"),
});

// Goal validation schema
export const goalSchema = z.object({
  goalType: z.enum(["daily_minutes", "weekly_minutes", "books_per_month", "books_per_year"]),
  targetValue: z.number().int().positive("Target must be positive").max(100000, "Target value is too large"),
});

// Page number validation
export const pageNumberSchema = z.object({
  page: z.number().int().min(0, "Page number cannot be negative").max(50000, "Page number is too large"),
});

// AI Prompt validation schema
export const aiPromptSchema = z.object({
  systemPrompt: z.string().trim().min(1, "Prompt cannot be empty").max(5000, "Prompt must be less than 5,000 characters"),
});

// ISBN validation (basic format check)
export const isbnSchema = z.string().trim().regex(/^[0-9X-]{10,17}$/, "Invalid ISBN format");
