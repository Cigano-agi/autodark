import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
    proxy: {
      '/api-ai': {
        target: 'https://api.ai33.pro',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-ai/, ''),
      },
      '/api-kie': {
        target: 'https://api.kie.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-kie/, ''),
      },
      '/api-pollinations': {
        target: 'https://image.pollinations.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-pollinations/, ''),
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['cross-origin-resource-policy'] = 'cross-origin';
          });
        },
      },
      '/api-tts': {
        target: 'https://translate.google.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-tts/, ''),
      },
      '/api-streamelements': {
        target: 'https://api.streamelements.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-streamelements/, ''),
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['access-control-allow-origin'] = '*';
          });
        },
      },
      '/api-unsplash': {
        target: 'https://source.unsplash.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-unsplash/, ''),
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['cross-origin-resource-policy'] = 'cross-origin';
            proxyRes.headers['access-control-allow-origin'] = '*';
          });
        },
      }
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', 'framer-motion', 'clsx', 'tailwind-merge'],
          'vendor-supabase': ['@supabase/supabase-js']
        }
      }
    }
  }
}));
