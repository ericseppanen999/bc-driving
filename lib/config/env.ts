import { z } from "zod";

const envSchema = z.object({
  APP_DEFAULT_LAT: z.coerce.number().default(49.2827),
  APP_DEFAULT_LNG: z.coerce.number().default(-123.1207),
  APP_DEFAULT_ZOOM: z.coerce.number().default(11),
  CACHE_TTL_EVENTS_SECONDS: z.coerce.number().default(90),
  CACHE_TTL_VANCOUVER_CAMERAS_SECONDS: z.coerce.number().default(900),
  CACHE_TTL_DRIVEBC_CAMERAS_SECONDS: z.coerce.number().default(1800),
  FEATURE_ENABLE_SCRAPE_FALLBACK: z.coerce.boolean().default(true),
  FEATURE_SHOW_PROVIDER_HEALTH: z.coerce.boolean().default(true)
});

export const env = envSchema.parse(process.env);
