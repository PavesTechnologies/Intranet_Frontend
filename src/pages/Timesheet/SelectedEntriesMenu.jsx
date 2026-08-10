import React from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronDown, Trash2 } from "lucide-react";

/**
 * Bulk-action control for the entries selected on a single timesheet day.
 * Purely presentational — the parent owns the selection and the delete call.
 *
 * Props:
 *  - count:    number of selected entries (renders nothing when 0)
 *  - onDelete: () => void — parent opens its own confirmation dialog
 *  - disabled: boolean — true while another delete is in flight
 *  - label:    optional accessible name for the trigger
 *
 * Uses headlessui's Menu so the panel portals out of the day header (which is
 * full of overflow/z-index workarounds) and closes on outside click + Escape.
 */
const SelectedEntriesMenu = ({ count = 0, onDelete, disabled = false, label }) => {
  if (!count) return null;

  return (
    <Menu as="div" className="relative">
      <MenuButton
        disabled={disabled}
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-[#263383] transition-colors hover:bg-[#f4f6fc] focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {count} {count === 1 ? "entry" : "entries"} selected
        <ChevronDown size={14} className="flex-shrink-0" />
      </MenuButton>

      <MenuItems
        anchor="bottom start"
        className="z-[9999] mt-1 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white py-1.5 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
      >
        <MenuItem>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-red-500 transition-colors data-[focus]:bg-red-50"
          >
            <Trash2 size={16} className="flex-shrink-0" /> Delete
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
};

export default SelectedEntriesMenu;
