const isPages = process.env.ELEVENTY_ENV === 'pages'

export const baseUrl = isPages
  ? '/11ty-landing-page/'
  : '/'