import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import NdaPanel from "./NdaPanel";

/**
 * NDA execution for one invited vendor, opened from the RFQ's Invited Vendors table.
 *
 * NDA execution belongs to the RFQ step, not Vendor Onboarding: onboarding decides *whether*
 * an NDA is required, and the RFQ is where it is generated, sent, signed and reviewed. This is
 * only a shell around the existing NdaPanel so each vendor's NDA is managed independently
 * without a second NDA UI.
 *
 * @param {{ isOpen:boolean, onClose:()=>void, vendorId:number, vendorName?:string,
 *   prId:number, departmentId:number, purchaseCategoryId:number,
 *   ndaRequired:boolean|null, recipientEmail?:string|null }} props
 */
export default function VendorNdaModal({
  isOpen,
  onClose,
  vendorId,
  vendorName,
  prId,
  departmentId,
  purchaseCategoryId,
  ndaRequired,
  recipientEmail,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`NDA — ${vendorName || `Vendor #${vendorId}`}`}
      subtitle="Generate, send, receive the signed copy and review it. RFQ stays blocked until the NDA is completed."
      size="lg"
      bodyClassName="max-w-full overflow-x-hidden p-4 sm:p-5"
      footer={
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {isOpen && (
        <NdaPanel
          vendorId={vendorId}
          departmentId={departmentId}
          purchaseCategoryId={purchaseCategoryId}
          prId={prId}
          ndaRequired={ndaRequired}
          recipientEmail={recipientEmail}
        />
      )}
    </Modal>
  );
}
