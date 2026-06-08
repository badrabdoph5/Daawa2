"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      onCancel={handleCancel}
    >
      <div className="confirm-dialog-content">
        <div className="confirm-dialog-header">
          {isDangerous && <AlertTriangle size={24} className="confirm-dialog-icon danger" />}
          <h2>{title}</h2>
          <button
            className="confirm-dialog-close"
            onClick={handleCancel}
            type="button"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        <p className="confirm-dialog-message">{message}</p>

        <div className="confirm-dialog-actions">
          <button
            className="btn btn-soft"
            onClick={handleCancel}
            disabled={isLoading}
            type="button"
          >
            {cancelText}
          </button>
          <button
            className={`btn ${isDangerous ? "btn-danger" : "btn-gold"}`}
            onClick={handleConfirm}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? "جاري..." : confirmText}
          </button>
        </div>
      </div>
    </dialog>
  );
}
