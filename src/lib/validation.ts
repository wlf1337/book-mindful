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

// OpenLibrary API response validation schemas
export const openLibrarySearchBookSchema = z.object({
  title: z.string().max(1000).default("Unknown Title"),
  author_name: z.array(z.string()).optional(),
  cover_i: z.number().optional(),
  isbn: z.array(z.string()).optional(),
  number_of_pages_median: z.number().optional(),
  publisher: z.array(z.string()).optional(),
  first_publish_year: z.number().optional(),
});

export const openLibrarySearchResponseSchema = z.object({
  docs: z.array(openLibrarySearchBookSchema).default([]),
});

export const openLibraryIsbnResponseSchema = z.object({
  title: z.string().max(1000),
  covers: z.array(z.number()).optional(),
  authors: z.array(z.object({ key: z.string() })).optional(),
  number_of_pages: z.number().optional(),
  publishers: z.array(z.string()).optional(),
  publish_date: z.string().optional(),
  description: z.union([z.string(), z.object({ value: z.string() })]).optional(),
});

export const openLibraryAuthorSchema = z.object({
  name: z.string().max(500).default("Unknown Author"),
});
