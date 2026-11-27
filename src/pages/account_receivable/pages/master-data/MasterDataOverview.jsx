import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Landmark,
  Percent,
  Receipt,
  Coins,
  FileText,
  CalendarClock,
  Building2,
  Layers,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from "lucide-react";

import PageHeader from "../../../../components/ui/PageHeader";
import { showStatusToast } from "../../../../components/toastfy/toast";
import MasterStatCards from "../../components/common/MasterStatCards";
import MasterModuleCard from "../../components/master-data/MasterModuleCard";
import BackIconButton from "../../components/common/BackIconButton";
import { getBillingTypes } from "../../services/billingTypeService";
import { getBillingFrequencies } from "../../services/billingFrequencyService";
import { getPaymentTerms } from "../../services/paymentTermsService";
import { getTaxRegions } from "../../services/taxRegionService";
import { getActiveCompanyProfile } from "../../services/companyProfileService";
import { getExchangeRates } from "../../services/currencyExchangeRateService";

const formatDateValue = (val) => {
  if (!val) return null;
  try {
    const date = new Date(val);
    if (isNaN(date.getTime())) return null;
    const day = String(date.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
  } catch {
    return null;
  }
};

const latestTimestamp = (records) => {
  const timestamps = records
    .map((r) => r.updatedAt || r.createdAt)
    .filter(Boolean)
    .map((t) => new Date(t).getTime())
    .filter((t) => !isNaN(t));
  if (!timestamps.length) return null;
  return formatDateValue(new Date(Math.max(...timestamps)));
};

const MASTER_DEFINITIONS = [
  {
    key: "company-profile",
    title: "Seller Information / Company Profile",
    description: "Configure the legal seller identity, address and contact information used for AR invoices.",
    icon: <Building2 className="h-5 w-5" />,
    implemented: true,
    route: "/account-receivable/master-data/company-profile",
    dataKey: "companyProfile",
  },
  {
    key: "tax-regions",
    title: "Tax Configuration",
    description: "Manage tax regions, currencies, tax regimes and tax rules.",
    icon: <Landmark className="h-5 w-5" />,
    implemented: true,
    route: "/account-receivable/master-data/tax-configuration",
    dataKey: "taxRegions",
  },
  {
    key: "payment-terms",
    title: "Payment Terms",
    description: "Define customer payment conditions and due-date rules.",
    icon: <Receipt className="h-5 w-5" />,
    implemented: true,
    route: "/account-receivable/master-data/payment-terms",
    dataKey: "paymentTerms",
  },
  {
    key: "currencies",
    title: "Currencies",
    description: "Manage supported currencies used across AR and billing transactions.",
    icon: <Coins className="h-5 w-5" />,
    implemented: false,
    route: "/account-receivable/configurations",
    legacyMaster: "currency",
  },
  {
    key: "billing-types",
    title: "Billing Types",
    description: "Define how customers are charged for products and services.",
    icon: <FileText className="h-5 w-5" />,
    implemented: true,
    route: "/account-receivable/master-data/billing-types",
    dataKey: "billingTypes",
  },
  {
    key: "billing-frequency",
    title: "Billing Frequencies",
    description: "Define when and how frequently customers are billed.",
    icon: <CalendarClock className="h-5 w-5" />,
    implemented: true,
    route: "/account-receivable/master-data/billing-frequency",
    dataKey: "billingFrequencies",
  },
  {
    key: "exchange-rates",
    title: "Currency Exchange Rates",
    description: "Manage authoritative currency conversion rates for cross-currency expenses and billing snapshots.",
    icon: <TrendingUp className="h-5 w-5" />,
    implemented: true,
    route: "/account-receivable/master-data/exchange-rates",
    dataKey: "exchangeRates",
  },
];

const TOTAL_MASTERS = MASTER_DEFINITIONS.length;

export default function MasterDataOverview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState({
    companyProfile: null,
    taxRegions: [],
    paymentTerms: [],
    billingTypes: [],
    billingFrequencies: [],
    exchangeRates: [],
  });
  const [failedKeys, setFailedKeys] = useState([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const [billingTypes, billingFrequencies, paymentTerms, taxRegions, companyProfile, exchangeRates] = await Promise.allSettled([
        getBillingTypes(),
        getBillingFrequencies(),
        getPaymentTerms(),
        getTaxRegions(),
        getActiveCompanyProfile(),
        getExchangeRates(),
      ]);
      if (!mounted) return;

      const results = { billingTypes, billingFrequencies, paymentTerms, taxRegions, companyProfile, exchangeRates };
      const failed = Object.keys(results).filter(
        (key) => key !== "companyProfile" && key !== "exchangeRates" && results[key].status === "rejected"
      );

      const resolvedRates = exchangeRates.status === "fulfilled"
        ? (exchangeRates.value?.data || [])
        : [];

      setRecords({
        companyProfile: companyProfile.status === "fulfilled" ? companyProfile.value : null,
        billingTypes: billingTypes.status === "fulfilled" ? billingTypes.value : [],
        billingFrequencies: billingFrequencies.status === "fulfilled" ? billingFrequencies.value : [],
        paymentTerms: paymentTerms.status === "fulfilled" ? paymentTerms.value : [],
        taxRegions: taxRegions.status === "fulfilled" ? taxRegions.value : [],
        exchangeRates: resolvedRates,
      });
      setFailedKeys(failed);
      if (failed.length) {
        showStatusToast("Some configurations could not be loaded.", "error");
      }
      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const implementedMasters = useMemo(
    () => MASTER_DEFINITIONS.filter((m) => m.implemented),
    []
  );

  const globalStats = useMemo(() => {
    const hasCompanyProfile = Boolean(records.companyProfile);
    const otherActiveCount = implementedMasters
      .filter((m) => m.key !== "company-profile")
      .filter((m) => {
        const items = records[m.dataKey] || [];
        return items.some((r) => r.isActive);
      }).length;

    const activeMasters = otherActiveCount + (hasCompanyProfile ? 1 : 0);

    return {
      totalMasters: TOTAL_MASTERS,
      activeMasters,
      inactiveMasters: TOTAL_MASTERS - activeMasters,
    };
  }, [implementedMasters, records]);

  const handleManage = (master) => {
    if (master.implemented) {
      navigate(master.route);
    } else {
      navigate(master.route, { state: { master: master.legacyMaster } });
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-3">
        <BackIconButton
          onClick={() => navigate("/account-receivable/dashboard")}
          label="Back to Configurations"
        />
        <div className="flex-1">
          <PageHeader
            title="Configuration"
            subtitle="Manage the foundational configuration used across AR & Billing"
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Configuration Masters</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MASTER_DEFINITIONS.map((master) => {
            if (!master.implemented) {
              return (
                <MasterModuleCard
                  key={master.key}
                  icon={master.icon}
                  title={master.title}
                  description={master.description}
                  pending
                  onManage={() => handleManage(master)}
                />
              );
            }

            if (master.key === "company-profile") {
              const profile = records.companyProfile;
              const hasProfile = Boolean(profile);
              return (
                <MasterModuleCard
                  key={master.key}
                  icon={master.icon}
                  title={master.title}
                  description={master.description}
                  badgeLabel={hasProfile ? "Active Profile" : "No Profile Configured"}
                  badgeTone={hasProfile ? "success" : "warning"}
                  stats={hasProfile ? { total: 1, active: 1, inactive: 0 } : null}
                  onManage={() => handleManage(master)}
                />
              );
            }

            const items = records[master.dataKey] || [];
            const loadFailed = failedKeys.includes(master.dataKey);

            if (loading) {
              return (
                <MasterModuleCard
                  key={master.key}
                  icon={master.icon}
                  title={master.title}
                  description={master.description}
                  pending
                  pendingLabel="Loading…"
                  onManage={() => handleManage(master)}
                />
              );
            }

            if (loadFailed) {
              return (
                <MasterModuleCard
                  key={master.key}
                  icon={master.icon}
                  title={master.title}
                  description={master.description}
                  pending
                  pendingLabel="Unable to load"
                  onManage={() => handleManage(master)}
                />
              );
            }

            const stats = {
              total: items.length,
              active: items.filter((r) => r.isActive).length,
              inactive: items.filter((r) => !r.isActive).length,
            };

            return (
              <MasterModuleCard
                key={master.key}
                icon={master.icon}
                title={master.title}
                description={master.description}
                stats={stats}
                lastUpdated={latestTimestamp(items)}
                onManage={() => handleManage(master)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
