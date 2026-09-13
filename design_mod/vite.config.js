import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({build:{rollupOptions:{input:{main:resolve(import.meta.dirname,'index.html'),corolla:resolve(import.meta.dirname,'corolla.html'),learning:resolve(import.meta.dirname,'learning.html')}}}});
