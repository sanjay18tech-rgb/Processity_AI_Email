"use client";

import { Bell, Search, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

import { useMailStore } from "@/lib/store/mail-store";
import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";

export function Header() {
    const { setTheme, theme } = useTheme();
    const { searchQuery, setSearchQuery } = useMailStore();
    const [inputValue, setInputValue] = useState(searchQuery);
    const debouncedValue = useDebounce(inputValue, 300);

    // Sync debounced value to global store
    useEffect(() => {
        setSearchQuery(debouncedValue);
    }, [debouncedValue, setSearchQuery]);

    // Sync local input with store if it changes externally
    useEffect(() => {
        setInputValue(searchQuery);
    }, [searchQuery]);

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/40 bg-background px-6 transition-all">
            <div className="flex flex-1 items-center gap-4">
                <div className="relative w-full max-w-md group">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                        placeholder="Search emails..."
                        className="h-10 w-full rounded-xl border-none bg-secondary/50 pl-10 ring-1 ring-transparent transition-all focus-visible:bg-background focus-visible:ring-primary/20 focus-visible:shadow-lg focus-visible:ring-offset-0 focus-visible:outline-none"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 rounded-full hover:bg-secondary transition-colors"
                >
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-secondary transition-colors"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </div>
        </header>
    );
}
