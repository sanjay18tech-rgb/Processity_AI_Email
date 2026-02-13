"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Mail,
    Send,
    Archive,
    Trash2,
    Settings,
    ChevronLeft,
    ChevronRight,
    Plus,
    LogOut,
    User,
    Inbox
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useComposeStore } from "@/lib/store/compose-store";
import { useMailStore } from "@/lib/store/mail-store";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/actions/mail";

export interface SidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
    const pathname = usePathname();
    const { openCompose } = useComposeStore();
    const { userProfile, setUserProfile } = useMailStore();

    useQuery({
        queryKey: ["user-profile"],
        queryFn: async () => {
            try {
                const profile = await getProfile();
                setUserProfile(profile);
                return profile;
            } catch (err) {
                console.error("Failed to fetch profile:", err);
                return null;
            }
        },
        staleTime: Infinity,
    });

    const links = [
        {
            title: "Inbox",
            icon: Inbox,
            href: "/inbox",
            variant: "ghost",
        },
        {
            title: "Sent",
            icon: Send,
            href: "/sent",
            variant: "ghost",
        },
        {
            title: "Trash",
            icon: Trash2,
            href: "/trash",
            variant: "ghost",
        },
    ];

    return (
        <motion.aside
            initial={false}
            animate={{
                width: isCollapsed ? 80 : 280,
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
                "relative z-40 hidden h-screen flex-col border-r border-[#ffffff14] bg-[#0c0c16]/50 backdrop-blur-xl md:flex",
                "glass"
            )}
        >
            {/* Toggle Button */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute -right-4 top-10 z-50 h-8 w-8 rounded-full border border-border bg-background shadow-md backdrop-blur-sm hover:bg-accent"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                ) : (
                    <ChevronLeft className="h-4 w-4" />
                )}
            </Button>

            {/* Logo Area */}
            <div className={cn("flex h-16 items-center px-4", isCollapsed ? "justify-center" : "justify-between")}>
                <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary ring-1 ring-primary/30 shadow-lg shadow-primary/10">
                        <Mail className="h-6 w-6" />
                    </div>
                    <AnimatePresence>
                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                className="overflow-hidden whitespace-nowrap"
                            >
                                Mail AI
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="px-3 py-4">
                <Button
                    onClick={() => openCompose()}
                    className={cn(
                        "w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]",
                        isCollapsed ? "justify-center px-0" : "px-4"
                    )}
                    size={isCollapsed ? "icon" : "default"}
                >
                    <Plus className="h-5 w-5" />
                    {!isCollapsed && <span>Compose</span>}
                </Button>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 space-y-1.5 px-3 py-2">
                {links.map((link, index) => {
                    const isActive = pathname === link.href;
                    return (
                        <Tooltip key={index} delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Link
                                    href={link.href}
                                    className={cn(
                                        "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                                        isActive ? "bg-primary/15 text-primary shadow-sm ring-1 ring-primary/20" : "text-muted-foreground",
                                        isCollapsed ? "justify-center" : "justify-start gap-3"
                                    )}
                                >
                                    <link.icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", isActive && "text-primary")} />
                                    {!isCollapsed && (
                                        <span className="truncate">{link.title}</span>
                                    )}
                                    {isActive && !isCollapsed && (
                                        <motion.div
                                            layoutId="active-pill"
                                            className="ml-auto h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]"
                                        />
                                    )}
                                </Link>
                            </TooltipTrigger>
                            {isCollapsed && <TooltipContent side="right">{link.title}</TooltipContent>}
                        </Tooltip>
                    );
                })}
            </div>

            {/* Bottom Actions */}
            <div className="mt-auto space-y-2 px-3 py-4">
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full justify-start gap-3 text-muted-foreground hover:text-foreground",
                                isCollapsed && "justify-center px-0"
                            )}
                        >
                            <Settings className="h-5 w-5" />
                            {!isCollapsed && <span>Settings</span>}
                        </Button>
                    </TooltipTrigger>
                    {isCollapsed && <TooltipContent side="right">Settings</TooltipContent>}
                </Tooltip>
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive",
                                isCollapsed && "justify-center px-0"
                            )}
                        >
                            <LogOut className="h-5 w-5" />
                            {!isCollapsed && <span>Logout</span>}
                        </Button>
                    </TooltipTrigger>
                    {isCollapsed && <TooltipContent side="right">Logout</TooltipContent>}
                </Tooltip>

                <div className={cn("mt-4 flex items-center gap-3 rounded-xl bg-card/50 p-2 ring-1 ring-border/50", isCollapsed && "justify-center")}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                        {userProfile?.emailAddress ? (
                            <span className="text-white font-bold text-sm">
                                {userProfile.emailAddress.charAt(0).toUpperCase()}
                            </span>
                        ) : (
                            <User className="h-5 w-5 text-white" />
                        )}
                    </div>
                    {!isCollapsed && (
                        <div className="grid flex-1 gap-0.5 leading-none overflow-hidden">
                            <span className="font-semibold text-sm">User</span>
                            <span className="truncate text-xs text-muted-foreground">
                                {userProfile?.emailAddress || "Loading..."}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </motion.aside>
    );
}
