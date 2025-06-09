# Build Guide for uWork with Vite

## 🚀 Build Process Setup

Your uWork application now supports both development and production builds using Vite alongside the Express server.

## 📋 Available Scripts

```bash
# Development
npm run dev              # Start Express server with nodemon
npm run dev:frontend     # Start Vite dev server (for React components)

# Building
npm run build           # Build frontend assets with Vite
npm run build:check     # TypeScript check + build
npm run build:production # Build + start production server

# Other
npm run preview         # Preview built assets
npm run init-db         # Initialize database
```

## 🔧 Development Workflow

### Option 1: Full Stack Development
```bash
# Terminal 1: Start the Express server
npm run dev

# Terminal 2: Start Vite dev server (if using React components)
npm run dev:frontend

# Your app will be available at:
# - Express server: http://localhost:3000
# - Vite dev server: http://localhost:5173 (for React components)
```

### Option 2: Express Only (Current EJS Setup)
```bash
# Just start the Express server
npm run dev

# Your app will be available at: http://localhost:3000
```

## 🏗️ Production Build

### 1. Build Assets
```bash
npm run build
```
This will:
- Compile TypeScript
- Bundle React components
- Optimize CSS and JS
- Generate asset manifest
- Output files to `public/dist/`

### 2. Start Production Server
```bash
# Option 1: Use the combined script
npm run build:production

# Option 2: Manual steps
npm run build
NODE_ENV=production npm start
```

## 📁 Build Output Structure

After running `npm run build`, you'll have:
```
public/
├── dist/
│   ├── .vite/
│   │   └── manifest.json    # Asset manifest
│   ├── js/
│   │   └── main-[hash].js   # Bundled JavaScript
│   └── assets/
│       └── main-[hash].css  # Bundled CSS
├── css/
│   └── styles.css           # Your custom styles
├── js/
│   ├── main.js              # Your existing JS
│   └── pwa.js               # PWA functionality
└── ...                      # Other static assets
```

## 🎯 How It Works

### Development Mode
- Vite dev server provides hot reload for React components
- Express server serves EJS templates and API routes
- Assets are served directly from source

### Production Mode
- Vite builds optimized bundles with hashing
- Express server serves built assets from `public/dist/`
- Manifest file maps original filenames to hashed versions
- EJS templates automatically include correct asset URLs

## 🔧 Configuration Files

### vite.config.ts
- Build output directory: `public/dist`
- Asset naming with hashes
- Proxy setup for API routes
- Manifest generation

### package.json
- Build scripts
- Dependencies for React and Vite
- TypeScript configuration

### server.js
- Static file serving for built assets
- Manifest loading for production
- Asset URL generation

## 🚨 Troubleshooting

### Build Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite

# TypeScript errors
npm run build:check
```

### Asset Loading Issues
1. Check `public/dist/.vite/manifest.json` exists after build
2. Verify `NODE_ENV=production` is set
3. Check Express static file serving configuration
4. Ensure CSP headers allow built assets

### Development Issues
```bash
# If Vite dev server conflicts
# Change port in vite.config.ts:
server: {
  port: 5174, // Different port
  // ...
}
```

## 🌟 Benefits of This Setup

### Development
- ⚡ Hot reload for React components
- 🔧 TypeScript support
- 📦 Modern bundling
- 🎯 API proxy to Express

### Production
- 📦 Optimized bundles
- 🗜️ Asset minification
- 🔄 Cache-friendly hashing
- 📱 PWA support maintained

## 🎨 Extending the Build

### Adding React Components
1. Create components in `src/components/`
2. Import in `src/main.tsx`
3. Use in EJS templates with mounting points

### Custom Build Steps
Add to `vite.config.ts`:
```typescript
export default defineConfig({
  // ... existing config
  build: {
    rollupOptions: {
      input: {
        main: 'src/main.tsx',
        admin: 'src/admin.tsx',  // Additional entry point
      }
    }
  }
});
```

## 🚀 Deployment

### Production Environment
```bash
# Set environment variable
export NODE_ENV=production

# Build and start
npm run build:production
```

### Docker
```dockerfile
# Build stage
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-slim
WORKDIR /app
COPY --from=builder /app .
EXPOSE 3000
CMD ["npm", "start"]
```

Your uWork application now has a modern build process! 🎉 