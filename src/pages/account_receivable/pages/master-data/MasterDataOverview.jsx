import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Landmark,
  Percent,
  Receipt,
  Coins,
  FileText,
  CalendarClock,
  Layers,
  CheckCircle2,
  XCircle,
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
    key: "tax-regions",
    title: "Tax Configuration",
    description: "Manage tax regions, currencies, tax regimes and tax rules.",
    icon: <Landmark className="h-5 w-5" />,
    implemented: true,
    route: "/account-receivable/master-data/tax-configuration",
    dataKey: "taxRegions",
  },
  {
    key: "proportion-rules",
    title: "Proportion Rules",
    description: "Configure allocation and proportion rules used for billing calculations.",
    icon: <Percent className="h-5 w-5" />,
    implemented: false,
    route: "/account-receivable/configurations",
    legacyMaster: "proportion_rule",
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
];

const TOTAL_MASTERS = MASTER_DEFINITIONS.length;

export default function MasterDataOverview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState({
    taxRegions: [],
    paymentTerms: [],
    billingTypes: [],
    billingFrequencies: [],
  });
  const [failedKeys, setFailedKeys] = useState([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const [billingTypes, billingFrequencies, paymentTerms, taxRegions] = await Promise.allSettled([
        getBillingTypes(),
        getBillingFrequencies(),
        getPaymentTerms(),
        getTaxRegions(),
      ]);
      if (!mounted) return;

      const results = { billingTypes, billingFrequencies, paymentTerms, taxRegions };
      const failed = Object.keys(results).filter((key) => results[key].status === "rejected");

      setRecords({
        billingTypes: billingTypes.status === "fulfilled" ? billingTypes.value : [],
        billingFrequencies: billingFrequencies.status === "fulfilled" ? billingFrequencies.value : [],
        paymentTerms: paymentTerms.status === "fulfilled" ? paymentTerms.value : [],
        taxRegions: taxRegions.status === "fulfilled" ? taxRegions.value : [],
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
    const activeMasters = implementedMasters.length;

    return {
      totalMasters: TOTAL_MASTERS,
      activeMasters,
      inactiveMasters: TOTAL_MASTERS - activeMasters,
    };
  }, [implementedMasters]);

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
        <BackIconButton onClick={() => navigate("/account-receivable/dashboard")} label="Back to Dashboard" />
        <div className="flex-1">
          <PageHeader
            title="Configurations"
            subtitle="Manage the foundational configuration used across AR & Billing"
          />
        </div>
      </div>

      <MasterStatCards
        items={[
          { label: "Total Configurations", value: globalStats.totalMasters, icon: <Layers className="h-5 w-5" /> },
          {
            label: "Active Configurations",
            value: globalStats.activeMasters,
            tone: "success",
            icon: <CheckCircle2 className="h-5 w-5" />,
          },
          {
            label: "Inactive Configurations",
            value: globalStats.inactiveMasters,
            tone: "danger",
            icon: <XCircle className="h-5 w-5" />,
          },
        ]}
      />

      <div>
        <h2 className="mb-3 text-base font-bold text-slate-800">Configuration Masters</h2>
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
