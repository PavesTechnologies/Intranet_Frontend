/**
 * Recursively filters a sidebar menu config array by role.
 *
 * Rules:
 *   - No allowedRoles on an item → always visible.
 *   - allowedRoles present       → visible only when hasRole(allowedRoles) returns true.
 *   - Items with children        → children are filtered first; the parent is suppressed
 *                                  automatically if no children survive the filter.
 *
 * @param {Array}    items    - Menu config items (from sidebarConfig.js)
 * @param {Function} hasRole  - hasRole(rolesArray: string[]) from useAuth()
 * @returns {Array} Filtered copy visible to the current user
 */
export function filterMenuByRole(items, hasRole) {
  return items.reduce((acc, item) => {
    const isVisible = !item.allowedRoles || hasRole(item.allowedRoles);
    if (!isVisible) return acc;

    if (item.children?.length) {
      const visibleChildren = filterMenuByRole(item.children, hasRole);
      if (visibleChildren.length > 0) {
        acc.push({ ...item, children: visibleChildren });
      }
      // parent suppressed when all children are hidden for this role
    } else {
      acc.push(item);
    }

    return acc;
  }, []);
}
