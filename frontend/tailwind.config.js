/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ribbon tokens (src/styles/tokens.css): every colour goes through a token.
        paper: 'var(--color-paper)', 'paper-2': 'var(--color-paper-2)', 'paper-3': 'var(--color-paper-3)',
        ink: 'var(--color-ink)', 'ink-2': 'var(--color-ink-2)', muted: 'var(--color-muted)',
        rule: 'var(--color-rule)', 'rule-2': 'var(--color-rule-2)',
        accent: 'var(--color-accent)', 'accent-soft': 'var(--color-accent-soft)', 'accent-ink': 'var(--color-accent-ink)', focus: 'var(--color-focus)',
        band: 'var(--color-band)', 'band-ink': 'var(--color-band-ink)', error: 'var(--color-error)', success: 'var(--color-success)',
        // Old palette names, kept as aliases so pages not redesigned yet stay readable on the light ground.
        'mercury-blue': 'var(--color-accent)', 'ghost-blue': 'var(--color-accent-soft)', 'deep-space': 'var(--color-paper)', 'midnight-slate': 'var(--color-paper)',
        graphite: 'var(--color-rule)', lead: 'var(--color-muted)', starlight: 'var(--color-ink)', silver: 'var(--color-muted)', plum: 'var(--color-accent)', ash: 'var(--color-paper-2)',
        iron: 'var(--color-rule-2)', cinder: 'var(--color-paper-3)', 'storm-gray': 'var(--color-muted)', aubergine: 'var(--color-paper-2)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        'serif-accent': ['var(--font-display)'],
        mono: ['var(--font-body)'],
      },
      fontSize: {
        caption: ['12px', { lineHeight: '1.5', letterSpacing: '0.24px' }],
        'body-sm': ['14px', { lineHeight: '1.5', letterSpacing: '0.28px' }],
        body: ['16px', { lineHeight: '1.5', letterSpacing: '0.16px' }],
        subheading: ['18px', { lineHeight: '1.4' }],
        'heading-sm': ['21px', { lineHeight: '1.35' }],
        heading: ['32px', { lineHeight: '1.2' }],
        'heading-lg': ['49px', { lineHeight: '1.15' }],
        display: ['65px', { lineHeight: '1.1', letterSpacing: '0.65px' }],
      },
      fontWeight: {
        w360: '360',
        w420: '420',
        w480: '480',
        w530: '530',
      },
      spacing: {
        4: '4px',
        8: '8px',
        12: '12px',
        16: '16px',
        20: '20px',
        24: '24px',
        32: '32px',
        40: '40px',
        56: '56px',
        72: '72px',
        80: '80px',
        112: '112px',
        128: '128px',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        part: 'var(--radius-part)',
        input: '12px',
        btn: 'var(--radius-pill)',
        'btn-lg': 'var(--radius-pill)',
        container: 'var(--radius-card)',
      },
      boxShadow: {
        part: 'var(--edge-light), var(--shadow-part)',
        panel: 'var(--edge-light), var(--shadow-panel)',
      },
      maxWidth: {
        page: '1200px',
      },
    },
  },
  plugins: [],
};
