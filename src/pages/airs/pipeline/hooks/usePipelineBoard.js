import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { MOCK_CANDIDATES } from "../../candidates/mock/candidateMockData";
import { PIPELINE_STAGES, PIPELINE_BOARD_SIZE } from "../constants/pipelineConstants";

const STORAGE_KEY = "airs_pipeline_board";

function buildInitialBoard() {
  return MOCK_CANDIDATES.slice(0, PIPELINE_BOARD_SIZE).map((c, i) => ({
    id: c.id,
    name: c.name,
    initials: c.initials,
    role: c.role,
    composite: c.composite,
    starred: c.starred,
    stage: PIPELINE_STAGES[i % PIPELINE_STAGES.length],
  }));
}

const readStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : buildInitialBoard();
  } catch {
    return buildInitialBoard();
  }
};

const persist = (board) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  } catch {
    // Ignore storage quota errors.
  }
};

export default function usePipelineBoard() {
  const [board, setBoard] = useState(readStored);
  const dragId = useRef(null);

  useEffect(() => {
    persist(board);
  }, [board]);

  const columns = useMemo(
    () => PIPELINE_STAGES.map((stage) => ({ stage, cards: board.filter((c) => c.stage === stage) })),
    [board]
  );

  const startDrag = (id) => {
    dragId.current = id;
  };

  const dropOnStage = (stage) => {
    if (!dragId.current) return;
    setBoard((prev) => prev.map((c) => (c.id === dragId.current ? { ...c, stage } : c)));
    dragId.current = null;
  };

  const refresh = () => {
    setBoard(buildInitialBoard());
    toast.success("Pipeline board refreshed from source data.");
  };

  return { columns, startDrag, dropOnStage, refresh };
}
