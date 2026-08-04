import React from "react";
import { PageCard } from "../../../../components/Cards/PageCard";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { formatNumber } from "../../utils/formatters";

export default function InvoicePipelineStepper({ pipeline }) {
  if (!pipeline) return null;

  return (
    <PageCard className="p-4">
      <h2 className={`${Fonts.subheading} mb-3`}>Invoice Pipeline — Month to Date</h2>
      <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
        <div className="grid flex-1 grid-cols-2 divide-y divide-dashed divide-gray-200 sm:grid-cols-3 sm:divide-y-0 sm:divide-x lg:grid-cols-6">
          {pipeline.stages.map((stage) => (
            <div key={stage.key} className="px-4 py-2">
              <p className="text-lg font-bold text-slate-800">{formatNumber(stage.count)}</p>
              <p className="text-xs text-slate-500">{stage.label}</p>
              <div className="mt-2 h-1 rounded-full bg-[#0A0082]/70" />
            </div>
          ))}
        </div>
        <div className="flex min-w-[190px] items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div>
            <p className="text-lg font-bold text-red-600">{formatNumber(pipeline.exceptionBranch.count)}</p>
            <p className="text-xs text-red-500">↳ {pipeline.exceptionBranch.label}</p>
          </div>
        </div>
      </div>
    </PageCard>
  );
}
