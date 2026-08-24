"use client";

// =============================================================
//  Milestone Library — create page
//  Route: /admin/milestone_library/create
//
//  Hosts the 4-step MilestoneBuilder. On save, creates a new
//  library milestone (with its alert rules) and returns to the
//  library list.
// =============================================================

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T } from "@/styles/tokens";
import MilestoneBuilderShell from "@/components/milestones/MilestoneBuilder/MilestoneBuilderShell";

const API = "http://127.0.0.1:5001";

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function CreateLibraryMilestonePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSave = async (milestone) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/milestone-library`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(milestone),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to create milestone");
      router.push("/admin/milestone_library");
    } catch (e) {
      alert(e.message);
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.pageBg, fontFamily: T.font }}>
      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "28px 24px" }}>

        {/* Breadcrumb / header */}
        <div style={{ marginBottom: "20px" }}>
          <Link href="/admin/milestone_library"
            style={{ fontSize: "12px", color: T.blue, textDecoration: "none", fontWeight: "600" }}>
            ← Milestone Library
          </Link>
          <h1 style={{ fontSize: "22px", fontWeight: "800", color: T.gray900, margin: "8px 0 4px", letterSpacing: "-0.02em" }}>
            New Milestone
          </h1>
          <p style={{ fontSize: "13px", color: T.gray500, margin: 0 }}>
            Define what this milestone tracks and when it should alert. It will be saved to the library and can be added to any template.
          </p>
        </div>

        <MilestoneBuilderShell
          onSave={handleSave}
          onCancel={() => router.push("/admin/milestone_library")}
          saving={saving}
        />
      </div>
    </div>
  );
}
