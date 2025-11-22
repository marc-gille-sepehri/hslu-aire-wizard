# HSLU AI Readiness Wizard

A React-based questionnaire wizard for assessing AI readiness across 5 dimensions.

## Features

- 📊 5 dimensions of AI readiness assessment
- 🎯 Slide deck-style navigation
- 📱 Responsive design
- 🎨 Modern UI with FS Albert Web Regular font
- 📈 Results page with personalized recommendations
- 🔗 Ready for iframe embedding

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy to GitHub Pages

### Option 1: GitHub Actions (Recommended)

1. Push your code to the `main` branch
2. Go to Settings → Pages in your GitHub repository
3. Select "GitHub Actions" as the source
4. The workflow will automatically deploy on push to main

### Option 2: Manual Deploy

```bash
npm run deploy
```

**Important:** Make sure to update the `base` path in `vite.config.js` to match your repository name. For example, if your repo is `username/hslu-aire-wizard`, the base should be `/hslu-aire-wizard/`.

## Embedding in Your Website

After deployment, you can embed the wizard in any website using an iframe:

```html
<iframe 
  src="https://[YOUR-USERNAME].github.io/hslu-aire-wizard/" 
  width="100%" 
  height="800" 
  frameborder="0"
></iframe>
```

See `demo.html` for a complete example.

