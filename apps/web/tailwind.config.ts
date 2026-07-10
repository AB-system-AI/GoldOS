import type { Config } from 'tailwindcss';
import uiConfig from '@goldos/ui/tailwind.config';

const config: Config = {
  ...uiConfig,
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
};

export default config;
