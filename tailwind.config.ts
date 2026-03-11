import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#152033",
        mist: "#edf2f7",
        pine: "#234b43",
        amber: "#d78d28",
        coral: "#d56a4d",
        sky: "#6ea6d9"
      },
      boxShadow: {
        panel: "0 24px 60px rgba(18, 27, 45, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
