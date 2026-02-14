export const config = {
  mode: 'test', // 'test' | 'production'
  // In production, ?bypass=thisSecret in the URL shows the Test Bypass button (e.g. /check?bypass=your-secret)
  bypassSecret: '666',
}

export const apiBaseUrl =
  config.mode === 'production'
    ? 'https://d3nr6vksmj.eu-central-1.awsapprunner.com'
    : 'http://localhost:9011'

// Contact email shown in footer, imprint, privacy, contact section (e.g. use test inbox in test mode)
export const contactEmail =
  config.mode === 'production'
    ? 'info@ai-in-real-estate.ch'
    : 'info@ai-in-real-estate.ch' // change to your test inbox when testing locally
