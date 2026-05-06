import { useNavigate } from "react-router-dom";
import {
  Globe,
  CreditCard,
  GraduationCap,
  Link2,
  FileText,
} from "lucide-react";



export default function HrConfiguration() {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Country Management",
      description: "Add, activate or deactivate countries",
      icon: <Globe />,
      path: "/employee-onboarding/hr-configuration/country",
    },
    {
      title: "Identity Types",
      description: "Manage Aadhaar, PAN, Passport and other IDs",
      icon: <CreditCard />,
      path: "/employee-onboarding/hr-configuration/identity",
    },
    {
      title: "Education Qualifications",
      description: "Configure education types per country",
      icon: <GraduationCap />,
      path: "/employee-onboarding/hr-configuration/education",
    },
    {
      title: "Country ↔ Identity Mapping",
      description: "Define required identity documents by country",
      icon: <Link2 />,
      path: "/employee-onboarding/hr-configuration/mapping",
    },
    {
      title: "Department ↔ Designation",
      description: "configure department to designation mapping",
      icon: <Link2 />,
      path: "/employee-onboarding/hr-configuration/departments",
    },

   
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">
        HR Configuration
      </h1>
      <p className="text-gray-600 mb-8">
        Manage onboarding masters and compliance rules
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => (
          <div
            key={card.title}
            onClick={() => !card.disabled && navigate(card.path)}
            className={`rounded-xl shadow p-6 border transition ${
              card.disabled
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white cursor-pointer hover:shadow-lg"
            }`}
          >
            <div className="flex items-center gap-3 mb-2 text-blue-900">
              {card.icon}
              <h2 className="text-lg font-semibold">{card.title}</h2>
            </div>
            <p className="text-sm">{card.description}</p>

            {card.disabled && (
              <p className="text-xs text-gray-500 mt-2">
                Coming soon
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
