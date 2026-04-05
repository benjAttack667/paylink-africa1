/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f5efe4",
        ink: "#101010",
        brand: {
          50: "#fff3d9",
          100: "#fde2a9",
          300: "#efb84f",
          500: "#d68a16",
          700: "#8f530a"
        },
        pine: "#1b4d3e"
      },
      boxShadow: {
        card: "0 30px 80px rgba(16, 16, 16, 0.10)"
      },
      fontFamily: {
        body: ["var(--font-dm-sans)", "sans-serif"],
        heading: ["var(--font-space-grotesk)", "sans-serif"]
      }
    }
  },
  plugins: []
};

