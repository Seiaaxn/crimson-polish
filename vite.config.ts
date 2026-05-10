import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api/proxy': {
          target: 'https://dinz-streaming.vercel.app/api/v1',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/proxy/, '')
        },
        '/api/sanka-proxy': {
          target: 'https://www.sankavollerei.com',
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/api\/sanka-proxy/, '/anime/animasu'),
          headers: {
            Referer: 'https://www.sankavollerei.com/',
            Origin: 'https://www.sankavollerei.com',
          },
        },
        '/api/comic-proxy': {
          target: 'https://www.sankavollerei.com',
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/api\/comic-proxy/, '/comic'),
          headers: {
            Referer: 'https://www.sankavollerei.com/',
            Origin: 'https://www.sankavollerei.com',
          },
        },
        '/api/dev-proxy': {
          target: 'https://dev.nefusoft.cloud',
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/api\/dev-proxy/, ''),
          headers: {
            Referer: 'https://dev.nefusoft.cloud/',
            Origin: 'https://dev.nefusoft.cloud',
          },
        },
        '/api/backup-proxy': {
          target: 'https://api.hsoft.eu.cc',
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/api\/backup-proxy/, '/api'),
          headers: {
            Referer: 'https://hsoft.eu.cc/',
            Origin: 'https://hsoft.eu.cc',
          },
        },
        '/api/image-proxy': {
          target: 'https://www.sankavollerei.com',
          changeOrigin: true,
          secure: false,
          bypass: (req, res) => {
            try {
              const u = new URL(req.url || '', 'http://localhost');
              const target = u.searchParams.get('url');
              if (target && res) {
                res.writeHead(302, { Location: decodeURIComponent(target) });
                res.end();
                return false;
              }
            } catch {}
          },
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
