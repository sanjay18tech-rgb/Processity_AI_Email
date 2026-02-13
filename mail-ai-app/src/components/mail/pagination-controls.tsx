"use client";

import { useMailStore } from "@/lib/store/mail-store";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
    count: number;
}

export function PaginationControls({ count }: PaginationControlsProps) {
    const { currentPage, setPage, nextPageToken } = useMailStore();

    const pageSize = 50;
    const start = currentPage * pageSize + 1;
    const end = start + count - 1;

    return (
        <div className="flex items-center gap-4 text-sm text-muted-foreground bg-secondary/30 px-3 py-1.5 rounded-lg border border-border/40 backdrop-blur-sm">
            <span className="font-medium whitespace-nowrap">
                {count > 0 ? `${start}–${end}` : '0–0'}
            </span>
            <div className="flex items-center gap-1 border-l border-border/40 pl-3">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md hover:bg-secondary/80 transition-colors"
                    disabled={currentPage === 0}
                    onClick={() => setPage(currentPage - 1)}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md hover:bg-secondary/80 transition-colors"
                    disabled={!nextPageToken}
                    onClick={() => setPage(currentPage + 1)}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
