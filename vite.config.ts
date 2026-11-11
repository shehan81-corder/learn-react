import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * In development, serve the same mock CRM API that Vercel runs as serverless
 * functions in production, so `npm run dev` behaves like the deployed site.
 */
function mockCrmApi(): Plugin {
  return {
    name: 'mock-crm-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();
        try {
          const mod = await server.ssrLoadModule('/api/_lib/router.ts');
          await mod.handleApiRequest(req, res);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: (err as Error).message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), mockCrmApi()],
  build: {
    // The 30 days of lesson text ship in the main bundle (the sidebar and home page need progress counts).
    chunkSizeWarningLimit: 2500,
  },
});
