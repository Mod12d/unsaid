export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  modules: ['@nuxtjs/supabase'],
  css: ['~/assets/css/main.css'],

  // SUPABASE_URL / SUPABASE_KEY / SUPABASE_SERVICE_KEY は環境変数から読まれる
  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: [],
    },
  },

  // NUXT_ANTHROPIC_API_KEY などで上書きされる（サーバー側だけで使う秘密値）
  runtimeConfig: {
    anthropicApiKey: '',
    anthropicModel: 'claude-sonnet-5-5',
    cronSecret: process.env.CRON_SECRET ?? '',
  },

  app: {
    head: {
      title: 'Unsaid',
      htmlAttrs: { lang: 'ja' },
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;600&display=swap',
        },
      ],
    },
  },
})
