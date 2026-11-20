import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function handleModuleDirectivesPlugin() {
  return {
    name: 'handle-module-directives-plugin',
    transform(code: string, id: string) {
      if (id.includes('@vkontakte/icons')) {
        code = code.replace(/"use-client";?/g, '');
      }
      return { code };
    },
  };
}

export default defineConfig(({ mode }) => {
  const proxyTarget = loadEnv(mode, process.cwd(), '').BACKEND_PROXY_TARGET;
  return {
  server: proxyTarget ? { proxy: { '/api/progress': { target: proxyTarget, changeOrigin: true }, '/api/moderation': { target: proxyTarget, changeOrigin: true }, '/api/leaderboards': { target: proxyTarget, changeOrigin: true }, '/api/shop': { target: proxyTarget, changeOrigin: true } } } : undefined,
  base: './',

  plugins: [
    react(),
    handleModuleDirectivesPlugin(),
  ],

  build: {
    outDir: 'build',
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-vkui': ['@vkontakte/vkui', '@vkontakte/icons'],
          'vendor-vk': ['@vkontakte/vk-bridge', '@vkontakte/vk-bridge-react', '@vkontakte/vk-mini-apps-router'],
        },
      },
    },
  },
  };
});
