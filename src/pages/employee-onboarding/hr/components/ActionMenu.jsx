import { useRef, useState } from "react";

export default function ActionMenu({
  onView,
  onCreate,
  onEdit,
  showCreate,
  showEdit,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="px-2 py-1 text-xl font-bold text-gray-600 hover:text-gray-900"
      >
        &#8942;
      </button>

      {open && (
        <div className="absolute right-full mr-2 top-0 w-32 bg-white border rounded-md shadow-lg z-50">
          <button
            onClick={() => {
              onView();
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
          >
            View
          </button>

          {showCreate && (
            <button
              onClick={() => {
                onCreate();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
              Create
            </button>
          )}

          {showEdit && (
            <button
              onClick={() => {
                onEdit();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
              Edit
            </button>
          )}
        </div>
      )}
    </div>
  );
}
