import { Fonts } from "../../../../../components/Fonts/Fonts";

export function Header({ title, onAdd }) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className={Fonts.heading4}>{title}</h1>
      {onAdd && (
        <button
          onClick={onAdd}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800"
        >
          + Add
        </button>
      )}
    </div>
  );
}

export function Table({ children }) {
  return (
    <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
      <thead className="bg-gray-100">
        <tr>
          <th className="p-3 text-left">Name</th>
          <th className="p-3 text-left">Description</th>
          <th className="p-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export function Row({ name, desc, onEdit, onDelete }) {
  return (
    <tr className="border-t">
      <td className="p-3">{name}</td>
      <td className="p-3">{desc || "—"}</td>
      <td className="p-3 text-right space-x-4">
        <button onClick={onEdit} className="text-blue-700 hover:underline">
          Edit
        </button>
        <button onClick={onDelete} className="text-red-600 hover:underline">
          Delete
        </button>
      </td>
    </tr>
  );
}

export function Modal({ title, children, onClose, onSave }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h2 className={`${Fonts.subheading} mb-4`}>{title}</h2>
        {children}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">
            Cancel
          </button>
          <button onClick={onSave} className="px-4 py-2 bg-blue-700 text-white rounded-lg">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
