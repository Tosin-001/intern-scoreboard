"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { InternRecord } from "@/lib/actions/interns";
import { computeStatus } from "@/types/firestore";
import StatusBadge from "@/components/shared/StatusBadge";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import InternFormModal from "@/components/interns/InternFormModal";
import ConfirmDeleteModal from "@/components/interns/ConfirmDeleteModal";

export default function InternsPage() {
  const [interns, setInterns] = useState<InternRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingIntern, setEditingIntern] = useState<InternRecord | null>(null);
  const [deletingIntern, setDeletingIntern] = useState<InternRecord | null>(null);

  const loadInterns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/interns");
      if (!res.ok) throw new Error("Failed to load interns.");
      const body = await res.json();
      setInterns(body.interns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load interns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInterns();
  }, [loadInterns]);

  // All derived client-side from `interns`, already loaded via the fetch
  // above — the department filter adds no new Firestore reads.
  const activeInterns = interns.filter((i) => !i.isDeleted);

  const departments = useMemo(
    () => Array.from(new Set(activeInterns.map((i) => i.department))).sort(),
    [activeInterns]
  );

  const visibleInterns = activeInterns
    .filter((i) => (department ? i.department === department : true))
    .filter((i) =>
      search.trim() === ""
        ? true
        : i.fullName.toLowerCase().includes(search.trim().toLowerCase()) ||
          i.department.toLowerCase().includes(search.trim().toLowerCase())
    );

  function openCreateModal() {
    setEditingIntern(null);
    setFormOpen(true);
  }

  function openEditModal(intern: InternRecord) {
    setEditingIntern(intern);
    setFormOpen(true);
  }

  return (
    <main className="container-fluid py-4 px-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">Interns</h1>
          <p className="text-muted-2 mb-0">Manage intern records and scores.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Add Intern
        </button>
      </div>

      <div className="card mb-3">
        <div className="card-body py-2">
          <div className="row g-2">
            <div className="col-12 col-md-8">
              <input
                type="search"
                className="form-control"
                placeholder="Search by name or department…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-4">
              <select
                className="form-select"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading && <Spinner label="Loading interns…" />}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && visibleInterns.length === 0 && (
        <EmptyState
          icon="🧑‍💻"
          title={search || department ? "No matching interns" : "No interns yet"}
          description={
            search || department
              ? "Try a different search term or department."
              : "Add your first intern to get started."
          }
          action={
            !search &&
            !department && (
              <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
                + Add Intern
              </button>
            )
          }
        />
      )}

      {!loading && !error && visibleInterns.length > 0 && (
        <div className="card">
          <div className="table-responsive">
            <table className="table table-clean mb-0">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Department</th>
                  <th scope="col">Score</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleInterns.map((intern) => (
                  <tr key={intern.id}>
                    <td className="fw-medium">{intern.fullName}</td>
                    <td className="text-muted-2">{intern.email}</td>
                    <td>{intern.department}</td>
                    <td className="fw-bold">{intern.score}</td>
                    <td>
                      <StatusBadge status={computeStatus(intern.score)} />
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-outline-secondary btn-sm me-2"
                        onClick={() => openEditModal(intern)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => setDeletingIntern(intern)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <InternFormModal
        key={editingIntern?.id ?? "create"}
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={loadInterns}
        intern={editingIntern}
      />

      {deletingIntern && (
        <ConfirmDeleteModal
          isOpen={!!deletingIntern}
          onClose={() => setDeletingIntern(null)}
          onConfirmed={loadInterns}
          internId={deletingIntern.id}
          internName={deletingIntern.fullName}
        />
      )}
    </main>
  );
}
