import React, { useRef } from "react";
import { X, Camera, Trash2, Loader2 } from "lucide-react";
import styles from "./ProfilePhotoModal.module.css";

export default function ProfilePhotoModal({
  isOpen,
  profileImg,
  initials,
  onClose,
  onUpdatePhoto,
  onDeletePhoto,
  isUploading,
  isDeleting,
}) {
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onUpdatePhoto(file);
      e.target.value = "";
    }
  };

  const busy = isUploading || isDeleting;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <span className={styles.title}>Profile Photo</span>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Preview */}
        <div className={styles.previewSection}>
          <div className={styles.avatar}>
            {profileImg ? (
              <img
                src={profileImg}
                alt="Profile"
                className={styles.avatarImg}
                onError={(e) => { e.target.style.display = "none"; }}
              />
            ) : (
              <span className={styles.avatarInitials}>{initials || "?"}</span>
            )}
            {isUploading && (
              <div className={styles.uploadOverlay}>
                <Loader2 size={28} className="animate-spin" style={{ color: "#fff" }} />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={styles.btnPrimary}
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            {isUploading ? (
              <><Loader2 size={14} className="animate-spin" />Uploading…</>
            ) : (
              <><Camera size={14} />{profileImg ? "Update Photo" : "Add Photo"}</>
            )}
          </button>

          {profileImg && (
            <button
              className={styles.btnDanger}
              onClick={onDeletePhoto}
              disabled={busy}
            >
              {isDeleting ? (
                <><Loader2 size={14} className="animate-spin" />Deleting…</>
              ) : (
                <><Trash2 size={14} />Delete Photo</>
              )}
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
