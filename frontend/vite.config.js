import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_API_URL || 'http://127.0.0.1:8000';

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        }
      }
    },
    // In production build, replace /api calls with the actual backend URL
    define: {
      __API_BASE__: JSON.stringify(
        mode === 'production' ? backendUrl : ''
      )
    }
  };
});
