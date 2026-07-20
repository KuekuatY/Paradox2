import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
              priority: 4,
            },
            {
              name: 'motion-vendor',
              test: /node_modules[\\/]framer-motion[\\/]/,
              priority: 3,
            },
            {
              name: 'state-vendor',
              test: /node_modules[\\/]zustand[\\/]/,
              priority: 3,
            },
            {
              name: 'reincarnation-data',
              test: /[\\/]src[\\/]data[\\/]reincarnation\.ts$/,
              priority: 3,
            },
            {
              name: 'game-data',
              test: /[\\/]src[\\/]data[\\/]/,
              priority: 2,
            },
            {
              name: 'game-store',
              test: /[\\/]src[\\/]stores[\\/]gameStore\.ts$/,
              priority: 2,
            },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
