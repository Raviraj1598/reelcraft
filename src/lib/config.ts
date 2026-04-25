export const config = {
  api: {
    baseURL: import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '',
  },
  app: {
    isDevelopment: import.meta.env.DEV,
  },
};
