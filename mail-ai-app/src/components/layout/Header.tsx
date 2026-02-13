"use client";

import { Bell, Search, Moon, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

import { useMailStore } from "@/lib/store/mail-store";
import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";

export function Header() {
    const { setTheme, theme } = useTheme();
    const { searchQuery, setSearchQuery, dateFrom, dateTo, setDateRange } = useMailStore();
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
                <div className="flex items-center gap-2">
                    <DateRangePicker
                        className="w-auto"
                        date={{
                            from: dateFrom ? new Date(dateFrom) : undefined,
                            to: dateTo ? new Date(dateTo) : undefined
                        }}
                        setDate={(range: DateRange | undefined) => {
                            if (range?.from) {
                                // If single date selected, default to=from to filter specifically for that day
                                // This fulfills "select single date -> get emails from that day"
                                // Users can still select a different end date by clicking again (react-day-picker handles this behavior usually, 
                                // though resetting 'to' might make it act like a new start selection. Let's see.)
                                // Actually, standard behavior: Click 1 -> From sets. Click 2 -> To sets.
                                // If we set To=From immediately, we lock the range.
                                // Better approach: Let range be open in UI, but implicit in Query?
                                // No, user wants explicit "emails from that day".
                                // If I auto-fill TO, it acts as single day.
                                const toDate = range.to || range.from;
                                setDateRange(
                                    format(range.from, 'yyyy/MM/dd'),
                                    toDate ? format(toDate, 'yyyy/MM/dd') : null
                                );
                            } else {
                                setDateRange(null, null);
                            }
                        }}
                    />
                    {(dateFrom || dateTo) && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDateRange(null, null)}
                            title="Clear Dates"
                            className="h-10 w-10 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
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
