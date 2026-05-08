// src/pages/TestDesign/ScenarioModal.jsx

import { createScenario } from "../testDesignApi";
import { useState } from "react";
import FilterListbox from "../../../../components/filter/FilterListbox";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";

export default function ScenarioModal({ open, close }) {
  const [title, setTitle] = useState("");
  const [storyId, setStoryId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");

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
    <Modal isOpen={open} onClose={close} title="Add Scenario">
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
          <Button variant="secondary" size="small" onClick={close}>Cancel</Button>
          <Button variant="primary" size="small" onClick={handleSubmit}>Save</Button>
        </div>
    </Modal>
  );
}
