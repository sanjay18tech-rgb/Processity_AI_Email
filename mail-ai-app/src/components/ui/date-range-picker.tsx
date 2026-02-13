"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
    className?: string
    date: DateRange | undefined
    setDate: (date: DateRange | undefined) => void
    onClear?: () => void
}

export function DateRangePicker({
    className,
    date,
    setDate,
    onClear,
}: DateRangePickerProps) {
    const [open, setOpen] = React.useState(false)

    // Internal state to track the selection while picker is open
    const [internalDate, setInternalDate] = React.useState<DateRange | undefined>(date)

    // Sync internal state when external date changes (e.g. AI or Clear)
    React.useEffect(() => {
        setInternalDate(date)
    }, [date])

    const handleSelect = (range: DateRange | undefined) => {
        setInternalDate(range)

        // If we have both from and to, close and apply
        if (range?.from && range?.to) {
            setDate(range)
            setOpen(false)
        }
        // If we have a from date, and the user clicked it again (range would be just {from: Date} or undefined depending on RDP version)
        // Actually RDP v9 in range mode: if you click the same date twice, it usually stays as 'from'.
        // To allow single day selection, we could add a button "Apply" or detect a double click.
        // For now, let's just make it stay open until two dates are selected.

        if (!range) {
            setDate(undefined)
            // Still close if they clear it
            setOpen(false)
        }
    }

    return (
        <div className={cn("grid gap-2", className)}>
            <div className="flex items-center gap-2">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-[260px] justify-start text-left font-normal bg-card/50 backdrop-blur-sm border-border/50",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                                date.to ? (
                                    <>
                                        {format(date.from, "LLL dd, y")} -{" "}
                                        {format(date.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(date.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Pick a date range</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from || new Date()}
                            selected={internalDate}
                            onSelect={handleSelect}
                            numberOfMonths={1}
                        />
                    </PopoverContent>
                </Popover>
                {date?.from && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClear}
                        className="h-9 w-9 rounded-full hover:bg-destructive/10 hover:text-destructive"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}
