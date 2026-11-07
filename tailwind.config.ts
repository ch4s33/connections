import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        burgundy: {
          50: "#fdf2f4",
          100: "#fbe6ea",
          200: "#f6d0d8",
          300: "#eea9b8",
          400: "#e27891",
          500: "#cf4b6d",
          600: "#b52f55",
          700: "#942143",
          800: "#781b37",
          900: "#541126",
          950: "#2b0712",
        },
        ivory: {
          DEFAULT: "#FAF7F5",
          soft: "#F2EAE6",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
