import * as Joi from 'joi';

/**
 * Environment variable validation schema
 * Ensures all required configuration is present and valid
 */
export const configValidationSchema = Joi.object({
  // Server Configuration
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),

  // Redis Configuration
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),

  // OpenAI Configuration
  OPENAI_API_KEY: Joi.string().required(),

  // Cache Configuration
  CACHE_TTL: Joi.number().default(86400), // 24 hours in seconds

  // File System
  TEMP_DIR: Joi.string().default('./temp'),
});

