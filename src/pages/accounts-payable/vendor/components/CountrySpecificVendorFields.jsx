import { useMemo } from "react";
import { State, City } from "country-state-city";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import { FIELD_META_BY_KIND, getIsoCodeForKind } from "../config/vendorCountryConfig";

/**
 * Config-driven grid for the non-India, country-specific vendor fields
 * (Brazil/US/UK/Other). Renders from FIELD_META_BY_KIND so adding another
 * country only means adding a config entry, not a new form.
 */
const CountrySpecificVendorFields = ({ kind, countryLabel, values, errors = {}, onChange }) => {
  const fieldMeta = FIELD_META_BY_KIND[kind];
  const isoCode = getIsoCodeForKind(kind, countryLabel);
  const stateFieldName = fieldMeta?.find((f) => f.type === "state")?.name;
  const stateValue = stateFieldName ? values[stateFieldName] : undefined;

  const stateOptions = useMemo(() => {
    if (!isoCode) return [];
    return State.getStatesOfCountry(isoCode).map((s) => ({ value: s.isoCode, label: s.name }));
  }, [isoCode]);

  const cityOptions = useMemo(() => {
    if (!isoCode || !stateValue) return [];
    return City.getCitiesOfState(isoCode, stateValue).map((c) => ({ value: c.name, label: c.name }));
  }, [isoCode, stateValue]);

  if (!fieldMeta) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {fieldMeta.map((field) => {
        const commonProps = {
          key: field.name,
          label: field.label,
          name: field.name,
          value: values[field.name] || "",
          onChange,
        };

        if (field.type === "state") {
          return stateOptions.length > 0 ? (
            <FormSelect {...commonProps} options={stateOptions} placeholder="Select" />
          ) : (
            <FormInput {...commonProps} error={errors[field.name]} requiredMark={field.required} />
          );
        }

        if (field.type === "city") {
          return stateOptions.length > 0 ? (
            <FormSelect
              {...commonProps}
              options={cityOptions}
              placeholder={stateValue ? "Select city" : "Select state/UF first"}
            />
          ) : (
            <FormInput {...commonProps} error={errors[field.name]} requiredMark={field.required} />
          );
        }

        return (
          <FormInput
            {...commonProps}
            error={errors[field.name]}
            requiredMark={field.required}
            className={field.fullWidth ? "md:col-span-2" : ""}
          />
        );
      })}
    </div>
  );
};

export default CountrySpecificVendorFields;
