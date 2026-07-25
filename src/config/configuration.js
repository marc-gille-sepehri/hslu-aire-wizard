// Use VITE_CONFIG_MODE=production when building for deploy (e.g. in GitHub Actions). Omit for local dev (defaults to test).
const buildMode = import.meta.env.VITE_CONFIG_MODE

export const config = {
  mode: buildMode === 'production' ? 'production' : 'test',
  // In production, ?bypass=thisSecret in the URL shows the Test Bypass button (e.g. /check?bypass=your-secret)
  bypassSecret: '666',
}

export const apiBaseUrl =
  config.mode === 'production'
    ? 'https://api.ai-in-real-estate.ch'
    : 'http://localhost:9011'

// Contact email shown in footer, imprint, privacy, contact section (e.g. use test inbox in test mode)
export const contactEmail =
  config.mode === 'production'
    ? 'info@ai-in-real-estate.ch'
    : 'info@ai-in-real-estate.ch' // change to your test inbox when testing locally
