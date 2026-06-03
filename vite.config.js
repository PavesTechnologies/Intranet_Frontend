
// vite.config.js
import { defineConfig } from 'vite';  
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({          
  plugins: [
    react({
      include: /\.(jsx|js)$/,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "./src"),
    },
  },
  base: '/',    
});