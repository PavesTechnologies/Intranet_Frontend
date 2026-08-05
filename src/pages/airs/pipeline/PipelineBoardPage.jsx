import React from "react";
import { RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/Button/Button";
import usePipelineBoard from "./hooks/usePipelineBoard";
import PipelineColumn from "./components/PipelineColumn";

export default function PipelineBoardPage() {
  const navigate = useNavigate();
  const { columns, startDrag, dropOnStage, refresh } = usePipelineBoard();

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Pipeline Board</h1>
          <p className="text-xs text-slate-500 mt-1">Drag candidate cards across stages. Changes sync to their record instantly.</p>
        </div>
        <Button variant="ghost" size="small" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
        </Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map(({ stage, cards }) => (
          <PipelineColumn
            key={stage}
            stage={stage}
            cards={cards}
            onDragStart={startDrag}
            onDrop={() => dropOnStage(stage)}
            onCardClick={(card) => navigate(`/airs/pipeline/candidates/${card.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
