// // vite.config.js
// import { defineConfig, loadEnv } from 'vite';
// import react from '@vitejs/plugin-react';
// import { config } from 'dotenv';
// import { plugin } from 'postcss';

// // export default defineConfig({
// //   const env = loadEnv(process.env(), '' ),
// //   plugins: [react()],
// // });

// config();
// export default defineConfig({
//   // Your Vite configuration
//   define: {
//     'process.env': process.env
//   },
//   plugins: [react()]
// });


// import { defineConfig, loadEnv } from 'vite';
// import react from '@vitejs/plugin-react';
// import { config } from 'dotenv';

// config();
// export default ({ mode }) => {
//     // Load app-level env vars to node-level env vars.    
//     // process.env = {...process.env, ...loadEnv(mode, process.cwd())};
//     return defineConfig({

//       // To access env vars here use process.env.TEST_VAR
//       plugins: [react()]
//     });
// }
 

//vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  process.env = { ...process.env, ...env };
  return {
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
    define: {
      // __BASE_URL__: JSON.stringify(env.VITE_BASE_URL),
    },
  };
});
