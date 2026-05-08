import { NavLink } from "react-router-dom";
import {
  Users,
  ShieldCheck,
  KeyRound,
  Layers,
  Globe2,
} from "lucide-react";

import AppCard from "../../../components/Cards/AppCard";
import DynamicCardGrid from "../../../components/Cards/DynamicCardGrid";
import { Fonts } from "../../../../components/Fonts/Fonts";

const managementCards = [
  {
    title: "Users",
    subtitle: "Manage users, add, edit, and deactivate accounts.",
    to: "users",
    icon: Users,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-700",
  },
  {
    title: "Roles",
    subtitle: "Manage user roles and assignments.",
    to: "roles",
    icon: ShieldCheck,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-700",
  },
  {
    title: "Permissions",
    subtitle: "Manage permissions assigned to roles.",
    to: "permissions",
    icon: KeyRound,
    iconBg: "bg-yellow-50",
    iconColor: "text-yellow-700",
  },
  {
    title: "Groups",
    subtitle: "Manage permission groups and mappings.",
    to: "groups",
    icon: Layers,
    iconBg: "bg-green-50",
    iconColor: "text-green-700",
  },
  {
    title: "Access Points",
    subtitle: "Manage application access points.",
    to: "access-points",
    icon: Globe2,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-700",
  },
];

export default function UserManagementHome() {
  return (
    <div className="px-6 py-4">
      <div className="mb-6">
        <h2 className={Fonts.heading3}>User Management</h2>
        <p className={Fonts.paragraphMuted}>
          Manage users, roles, permissions, groups, and access points from one place.
        </p>
      </div>

      <DynamicCardGrid
        data={managementCards}
        cardsPerRow={2}
        cardsPerPage={6}
        showPagination={false}
        getKey={(item) => item.to}
        renderCard={(item) => {
          const Icon = item.icon;

          return (
            <NavLink to={item.to} className="block h-full">
              <AppCard
                icon={<Icon size={22} />}
                iconBg={item.iconBg}
                iconColor={item.iconColor}
                title={item.title}
                subtitle={item.subtitle}
                className="h-full hover:border-[#0A0082]/40"
              />
            </NavLink>
          );
        }}
      />
    </div>
  );
}