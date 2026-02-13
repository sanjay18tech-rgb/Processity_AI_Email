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
                background: "var(--background)",
                foreground: "var(--foreground)",
                sidebar: {
                    DEFAULT: "var(--sidebar)",
                    foreground: "var(--sidebar-foreground)",
                    primary: "var(--sidebar-primary)",
                    "primary-foreground": "var(--sidebar-primary-foreground)",
                    accent: "var(--sidebar-accent)",
                    "accent-foreground": "var(--sidebar-accent-foreground)",
                    border: "var(--sidebar-border)",
                    ring: "var(--sidebar-ring)",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "ai-pulse": {
                    "0%": { boxShadow: "0 0 0 0 rgba(99, 102, 241, 0.4)", backgroundColor: "rgba(99, 102, 241, 0.05)" },
                    "30%": { boxShadow: "0 0 0 6px rgba(99, 102, 241, 0.2)", backgroundColor: "rgba(99, 102, 241, 0.12)" },
                    "70%": { boxShadow: "0 0 0 10px rgba(99, 102, 241, 0)", backgroundColor: "rgba(99, 102, 241, 0.08)" },
                    "100%": { boxShadow: "0 0 0 0 rgba(99, 102, 241, 0)", backgroundColor: "transparent" },
                },
            },
            animation: {
                "ai-pulse": "ai-pulse 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
            },
        },
    },
    plugins: [],
};
export default config;
