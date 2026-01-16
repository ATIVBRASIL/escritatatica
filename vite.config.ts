import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // CRÍTICO: Esta linha resolve o erro 404 do CSS e do JS que vimos no seu console
  base: '/', 
  
  plugins: [react()],
  
  server: {
    port: 3000,
    host: '0.0.0.0',
  },

  resolve: {
    alias: {
      // Mantém a organização das suas pastas
      '@': path.resolve(__dirname, '.'),
    }
  }
});
