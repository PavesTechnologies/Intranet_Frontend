/**
 * Recursively filters a sidebar menu config array by role and/or permission.
 *
 * Rules:
 *   - No allowedRoles on an item        → role check passes automatically.
 *   - allowedRoles present              → visible only when hasRole(allowedRoles) returns true.
 *   - No requiredPermissions on an item → permission check passes automatically.
 *   - requiredPermissions present       → visible only when hasAnyPermission(requiredPermissions)
 *                                         returns true (any-of, not all-of).
 *   - An item with both must pass both (AND) — e.g. Invoice Management/Payments stay under the
 *     Finance Management role gate but additionally require INVOICE_VIEW, so a user whose UMS
 *     permission mapping is incomplete (holds an AP role but not INVOICE_VIEW yet) doesn't land
 *     on a nav item whose page will just 403.
 *   - Items with children                → children are filtered first; the parent is
 *                                          suppressed automatically if no children survive.
 *
 * @param {Array}    items              - Menu config items (from sidebarConfig.js)
 * @param {Function} hasRole            - hasRole(rolesArray: string[]) from useAuth()
 * @param {Function} [hasAnyPermission] - hasAnyPermission(permissions: string[]) from useAuth();
 *   omit (or pass nothing) for menus with no requiredPermissions entries — every item's
 *   permission check then trivially passes.
 * @returns {Array} Filtered copy visible to the current user
 */
export function filterMenuByRole(items, hasRole, hasAnyPermission = () => true) {
  return items.reduce((acc, item) => {
    const passesRole = !item.allowedRoles || hasRole(item.allowedRoles);
    const passesPermission = !item.requiredPermissions || hasAnyPermission(item.requiredPermissions);
    if (!passesRole || !passesPermission) return acc;

    if (item.children?.length) {
      const visibleChildren = filterMenuByRole(item.children, hasRole, hasAnyPermission);
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
