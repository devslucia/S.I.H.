import React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex border-b border-border overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
              isActive
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-text hover:border-border-hover"
            )}
          >
            {Icon && <Icon size={15} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export { Tabs, type Tab };
