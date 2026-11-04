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
        cobalt: {
          DEFAULT: "#1D2BFF",
          light: "#3d4aff",
          dark: "#0f1acc",
        },
        crimson: {
          DEFAULT: "#E11D24",
          dark: "#ba1117",
        },
        cream: {
          DEFAULT: "#F6F3EC",
          dark: "#ede9de",
        },
        blush: {
          DEFAULT: "#FCE4EC",
          light: "#fff0f5",
        },
        lime: {
          DEFAULT: "#CCFF00",
          hover: "#b5e600",
        },
        pitch: "#000000",
        chrome: "#E5E5E5",
      },
      borderWidth: {
        "3": "3px",
      },
      boxShadow: {
        "brutal-sm": "3px 3px 0px #000000",
        "brutal": "4px 4px 0px #000000",
        "brutal-lg": "8px 8px 0px #000000",
        "brutal-xl": "12px 12px 0px #000000",
        "brutal-hover": "1px 1px 0px #000000",
      },
    },
  },
  plugins: [],
};

export default config;

