import { toast } from "react-toastify";
import Button from "../../../components/Button/Button";

export const showConfirmToast = ({ onConfirm, saving }) => {
  toast.info(
    ({ closeToast }) => (
      <div
        style={{
          background: "#ffffff",
          borderRadius: 8,
          padding: "16px",
          width: "280px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontWeight: "600",
            fontSize: "16px",
            marginBottom: "8px",
            color: "#333",
          }}
        >
          Confirm Profile Edit
        </div>
        <p
          style={{
            fontSize: "14px",
            marginBottom: "16px",
            color: "#555",
          }}
        >
          Are you sure you want to save these changes?
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <Button
            onClick={() => {
              closeToast?.();
              onConfirm?.();
            }}
            disabled={saving}
            variant="primary"
            style={{
              flex: 1,
              background: "#1d4ed8",
              color: "#fff",
              padding: "8px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            {saving ? "Saving..." : "Confirm"}
          </Button>
          <Button
            onClick={() => closeToast?.()}
            disabled={saving}
            variant="outline"
            style={{
              flex: 1,
              background: "#fff",
              color: "#333",
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    ),
    {
      position: "top-right",
      autoClose: true,
      closeOnClick: true,
      closeButton: true,
      draggable: false,
    }
  );
};





// how to use

// import { showConfirmToast } from "../../utils/showConfirmToast"; // adjust the path if needed

// const handleSave = () => {
//   showConfirmToast({
//     onConfirm: doSave,
//     saving,
//   });
// };


// 