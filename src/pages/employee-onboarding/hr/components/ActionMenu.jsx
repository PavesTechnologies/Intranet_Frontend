import { AddIcon, EditIcon, ViewIcon } from "../../../../components/icons/ActionIcons";

export default function ActionMenu({
  onView,
  onCreate,
  onEdit,
  showCreate,
  showEdit,
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={onView}
        className="rounded-md bg-gray-100 p-1.5 text-gray-700 transition hover:bg-gray-200 hover:text-gray-900"
        aria-label="View profile"
        title="View profile"
      >
        <ViewIcon className="h-4 w-4" />
      </button>

      {showCreate && (
        <button
          type="button"
          onClick={onCreate}
          className="rounded-md bg-blue-50 p-1.5 text-blue-700 transition hover:bg-blue-100 hover:text-blue-800"
          aria-label="Create employee"
          title="Create employee"
        >
          <AddIcon className="h-4 w-4" />
        </button>
      )}

      {showEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md bg-amber-50 p-1.5 text-amber-700 transition hover:bg-amber-100 hover:text-amber-800"
          aria-label="Edit joining details"
          title="Edit joining details"
        >
          <EditIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
