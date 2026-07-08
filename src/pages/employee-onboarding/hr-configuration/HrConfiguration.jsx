import { useNavigate } from "react-router-dom";
import {
  Globe,
  CreditCard,
  GraduationCap,
  Link2,
} from "lucide-react";
import AppCard from "../../../components/Cards/AppCard";
import { Fonts } from "../../../components/Fonts/Fonts";
import PageHeader from "../../../components/ui/PageHeader";

export default function HrConfiguration() {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Country Management",
      description: "Add, activate or deactivate countries",
      icon: <Globe className="h-5 w-5" />,
      path: "/employee-onboarding/hr-configuration/country",
    },
    {
      title: "Identity Types",
      description: "Manage Aadhaar, PAN, Passport and other IDs",
      icon: <CreditCard className="h-5 w-5" />,
      path: "/employee-onboarding/hr-configuration/identity",
    },
    {
      title: "Education Qualifications",
      description: "Configure education types per country",
      icon: <GraduationCap className="h-5 w-5" />,
      path: "/employee-onboarding/hr-configuration/education",
    },
    {
      title: "Country ↔ Identity Mapping",
      description: "Define required identity documents by country",
      icon: <Link2 className="h-5 w-5" />,
      path: "/employee-onboarding/hr-configuration/mapping",
    },
    {
      title: "Department ↔ Designation",
      description: "Configure department to designation mapping",
      icon: <Link2 className="h-5 w-5" />,
      path: "/employee-onboarding/hr-configuration/departments",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 font-sans space-y-6">
      <PageHeader
        title="HR Configuration"
        subtitle="Manage onboarding masters and compliance rules"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => (
          <AppCard
            key={card.title}
            title={card.title}
            subtitle={card.description}
            icon={card.icon}
            iconBg="bg-blue-50"
            iconColor="text-blue-700"
            onClick={() => !card.disabled && navigate(card.path)}
            disabled={card.disabled}
            density="spacious"
            className="transition h-full cursor-pointer hover:shadow-lg border-gray-200"
          >
            {card.disabled && (
              <p className={`${Fonts.smallText} mt-2 font-medium`}>
                Coming soon
              </p>
            )}
          </AppCard>
        ))}
      </div>
    </div>
  );
}
