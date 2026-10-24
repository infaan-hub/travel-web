"use client";

import dynamic from "next/dynamic";
import styles from "@/features/pages/company-operations.module.css";

const CompanyDashboardCharts = dynamic(
  () => import("@/features/pages/CompanyDashboardCharts"),
  {
    ssr: false,
    loading: () => (
      <div className={styles.loading} role="status">
        Loading company charts...
      </div>
    ),
  },
);

export default CompanyDashboardCharts;
