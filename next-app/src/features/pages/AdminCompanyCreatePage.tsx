"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Building2 } from "@/components/icons";
import CompanyForm from "@/features/pages/CompanyForm";
import type { Company } from "@/features/pages/types";

export default function AdminCompanyCreatePage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !isAdmin) router.push("/admin/login");
  }, [loading, isAuthenticated, isAdmin, router]);

  if (loading || !isAuthenticated || !isAdmin) {
    return (
      <div className="page">
        <div className="loading">Checking access…</div>
      </div>
    );
  }

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h1>
          <Building2 size={20} /> Add company
        </h1>
        <p>Create a company profile. It starts pending and private.</p>
      </div>

      <Link href="/admin/companies" className="btn btn-outline btn-back">
        <ArrowLeft size={16} /> Back to companies
      </Link>

      <div className="admin-content">
        <CompanyForm
          onSaved={(company: Company) => {
            router.push(`/admin/companies/${company.id}`);
          }}
        />
      </div>
    </div>
  );
}
