import React from "react";
import { DISBURSEMENT_MODE, DISBURSEMENT_MODE_OPTIONS } from "./disbursementConfirmation";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none";

export const Field = ({ id, label, error, required = true, children }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">
      {label}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
);

export const confirmationInputClass = inputClass;

const FileInput = ({ id, label, error, fileKey, onFieldChange }) => (
  <Field id={id} label={label} error={error}>
    <input
      id={id}
      type="file"
      accept=".pdf,.jpg,.jpeg,.png"
      className="block w-full text-sm text-gray-700"
      onChange={(e) => onFieldChange(fileKey, e.target.files?.[0] || null)}
    />
    <p className="text-xs text-gray-500">PDF, JPG or PNG, up to 10 MB.</p>
  </Field>
);

/**
 * Mode and proof fields for a recorded payment. Controlled: the owner holds `values` and applies
 * `onFieldChange(key, value)`. File inputs also report through onFieldChange with their field key.
 * `modes` limits the choices for a context.
 */
export default function DisbursementConfirmationFields({
  values,
  errors = {},
  onFieldChange,
  modes = [DISBURSEMENT_MODE.CASH, DISBURSEMENT_MODE.BANK_TRANSFER, DISBURSEMENT_MODE.UPI],
}) {
  const modeOptions = DISBURSEMENT_MODE_OPTIONS.filter((opt) => modes.includes(opt.value));
  const set = (key) => (e) => onFieldChange(key, e.target.value);
  const isCash = values.mode === DISBURSEMENT_MODE.CASH;
  const isBank = values.mode === DISBURSEMENT_MODE.BANK_TRANSFER;
  const isUpi = values.mode === DISBURSEMENT_MODE.UPI;

  return (
    <div className="space-y-4">
      <Field id="disb-mode" label="Disbursement mode" error={errors.mode}>
        <select id="disb-mode" className={inputClass} value={values.mode} onChange={set("mode")}>
          <option value="">Select mode</option>
          {modeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      {isCash && (
        <>
          <Field id="disb-received-by" label="Received by (name)" error={errors.receivedByName}>
            <input
              id="disb-received-by"
              type="text"
              maxLength={150}
              className={inputClass}
              value={values.receivedByName}
              onChange={set("receivedByName")}
            />
          </Field>
          <FileInput
            id="disb-ack-file"
            label="Signed acknowledgment"
            error={errors.signedAcknowledgment}
            fileKey="signedAcknowledgment"
            onFieldChange={onFieldChange}
          />
        </>
      )}

      {isBank && (
        <>
          <Field id="disb-txn-ref" label="Transaction reference" error={errors.transactionReference}>
            <input
              id="disb-txn-ref"
              type="text"
              maxLength={100}
              className={inputClass}
              value={values.transactionReference}
              onChange={set("transactionReference")}
            />
          </Field>
          <Field id="disb-transfer-date" label="Transfer date" error={errors.transferDate}>
            <input
              id="disb-transfer-date"
              type="date"
              className={inputClass}
              value={values.transferDate}
              onChange={set("transferDate")}
            />
          </Field>
          <Field id="disb-transfer-details" label="Transfer details" error={errors.transferDetails}>
            <textarea
              id="disb-transfer-details"
              rows={2}
              maxLength={500}
              className={inputClass}
              placeholder="Bank, beneficiary account, UTR"
              value={values.transferDetails}
              onChange={set("transferDetails")}
            />
          </Field>
        </>
      )}

      {isUpi && (
        <>
          <Field id="disb-upi-txn" label="UPI transaction ID" error={errors.upiTransactionId}>
            <input
              id="disb-upi-txn"
              type="text"
              maxLength={100}
              className={inputClass}
              value={values.upiTransactionId}
              onChange={set("upiTransactionId")}
            />
          </Field>
          <Field id="disb-payee-upi" label="Payee UPI ID" error={errors.payeeUpiId}>
            <input
              id="disb-payee-upi"
              type="text"
              maxLength={256}
              placeholder="name@bank"
              className={inputClass}
              value={values.payeeUpiId}
              onChange={set("payeeUpiId")}
            />
          </Field>
          <Field id="disb-upi-date" label="Payment date" error={errors.transferDate}>
            <input
              id="disb-upi-date"
              type="date"
              className={inputClass}
              value={values.transferDate}
              onChange={set("transferDate")}
            />
          </Field>
          <FileInput
            id="disb-upi-proof"
            label="Payment screenshot"
            error={errors.paymentProof}
            fileKey="paymentProof"
            onFieldChange={onFieldChange}
          />
        </>
      )}
    </div>
  );
}
