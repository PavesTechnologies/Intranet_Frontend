// src/pages/TestDesign/ScenarioModal.jsx

import { createScenario } from "../testDesignApi";
import { useState } from "react";
import FilterListbox from "../../../../components/filter/FilterListbox";

export default function ScenarioModal({ open, close }) {
  const [title, setTitle] = useState("");
  const [storyId, setStoryId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");

  if (!open) return null;

  const handleSubmit = async () => {
    await createScenario({
      title,
      testStoryId: storyId,
      priority: priority
    });

    close();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-[400px]">

        <h2 className="text-lg font-semibold mb-4">Add Scenario</h2>

        <label className="text-sm">Title</label>
        <input 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 rounded w-full mb-3"
        />

        <label className="text-sm">Story ID</label>
        <input 
          value={storyId}
          onChange={(e) => setStoryId(e.target.value)}
          className="border p-2 rounded w-full mb-3"
        />

        <label className="text-sm">Priority</label>
        <FilterListbox
          options={[{value:"HIGH",label:"High"},{value:"MEDIUM",label:"Medium"},{value:"LOW",label:"Low"}]}
          value={priority}
          onChange={setPriority}
        />

        <div className="flex justify-end gap-2">
          <button onClick={close} className="px-4 py-1 bg-gray-300 rounded">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-1 bg-blue-600 text-white rounded">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
