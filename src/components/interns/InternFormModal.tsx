"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/components/shared/Modal";
import type { InternRecord } from "@/lib/actions/interns";

interface InternFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  intern?: InternRecord | null; // present = edit mode, absent = create mode
}

export default function InternFormModal({
  isOpen,
  onClose,
  onSaved,
  intern,
}: InternFormModalProps) {
  const isEdit = !!intern;
  const [fullName, setFullName] = useState(intern?.fullName ?? "");
  const [email, setEmail] = useState(intern?.email ?? "");
  const [department, setDepartment] = useState(intern?.department ?? "");
  const [score, setScore] = useState(intern?.score?.toString() ?? "0");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      fullName: fullName.trim(),
      email: email.trim(),
      department: department.trim(),
      score: Number(score),
    };

    try {
      const res = await fetch(
        isEdit ? `/api/interns/${intern!.id}` : "/api/interns",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong.");
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save intern.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Edit Intern" : "Add Intern"}>
      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label small fw-medium">Full Name</label>
          <input
            type="text"
            className="form-control"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
          />
        </div>
        <div className="mb-3">
          <label className="form-label small fw-medium">Email</label>
          <input
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label small fw-medium">Department</label>
          <input
            type="text"
            className="form-control"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
            minLength={2}
          />
        </div>

        <div className="mb-4">
          <label className="form-label small fw-medium">Score (0–100)</label>
          <input
            type="number"
            className="form-control"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            required
            min={0}
            max={100}
            step={1}
          />
        </div>

        <div className="d-flex gap-2 justify-content-end">
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save Changes" : "Add Intern"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
