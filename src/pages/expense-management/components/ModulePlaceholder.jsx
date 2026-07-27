import React from "react";
import { Construction } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import { PageCard, PageCardContent } from "@/components/Cards/PageCard";

/**
 * Shared placeholder shell for every not-yet-built Expense Management page.
 * Gives each route its layout, breadcrumb, and title now so pages can be
 * implemented story-by-story without touching routing/nav again.
 */
export default function ModulePlaceholder({ title, breadcrumbs = [], description }) {
  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumbs} />

      <div>
        <h1 className="text-xl font-bold text-[#0a174e]">{title}</h1>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>

      <PageCard>
        <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
          <Construction className="h-10 w-10 text-gray-300 mb-3" />
          <h2 className="text-sm font-semibold text-gray-700">Coming soon</h2>
          <p className="text-xs text-gray-400 mt-1 max-w-sm">
            This page is a placeholder for {title}. Functionality will be implemented in an upcoming story.
          </p>
        </PageCardContent>
      </PageCard>
    </div>
  );
}
