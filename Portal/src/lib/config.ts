// DeepSeek API configuration
// Priority: Environment variable > config file > mock mode

const ENV_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;

interface DeepSeekConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  isConfigured: boolean;
}

interface AppConfig {
  deepseek: DeepSeekConfig;
}

// Determine API key from environment or fallback
function getApiKey(): string {
  // Check environment variable first (Vite format)
  if (ENV_API_KEY && ENV_API_KEY !== "your-deepseek-api-key-here") {
    return ENV_API_KEY;
  }

  // Fallback to placeholder (will trigger mock mode)
  return "your-deepseek-api-key-here";
}

const apiKey = getApiKey();
const isConfigured = apiKey !== "your-deepseek-api-key-here";

export const config: AppConfig = {
  deepseek: {
    apiKey,
    baseURL: "https://api.deepseek.com",
    model: "deepseek-v4-flash",
    isConfigured,
  },
} as const;

// Utility to check if we're using real API
export function isApiConfigured(): boolean {
  return config.deepseek.isConfigured;
}

// Debug info (safe to log, doesn't expose key)
export function getApiStatus(): {
  configured: boolean;
  hasEnv: boolean;
  source: string;
} {
  return {
    configured: isConfigured,
    hasEnv: !!ENV_API_KEY,
    source: ENV_API_KEY ? "environment" : "not-configured",
  };
}
