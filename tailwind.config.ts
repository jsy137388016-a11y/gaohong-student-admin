import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef8f4",
          100: "#d7f0e6",
          500: "#2c9c72",
          600: "#23805e",
          700: "#1e684d"
        }
      }
    }
  },
  plugins: []
};

export default config;
