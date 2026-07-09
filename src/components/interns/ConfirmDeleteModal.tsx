"use client";

import { useState } from "react";
import Modal from "@/components/shared/Modal";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmed: () => void;
  internId: string;
  internName: string;
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirmed,
  internId,
  internName,
}: ConfirmDeleteModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/interns/${internId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to remove intern.");
      }
      onConfirmed();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove intern.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Remove Intern">
      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      <p className="text-muted-2">
        Remove <strong>{internName}</strong> from the leaderboard? This is a
        soft delete — their record and score history are kept, just hidden
        from rankings.
      </p>
      <div className="d-flex gap-2 justify-content-end">
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? "Removing…" : "Remove Intern"}
        </button>
      </div>
    </Modal>
  );
}
