"use client";

import dynamic from "next/dynamic";
import styles from "@/features/pages/company-operations.module.css";

const CompanyAnalyticsCharts = dynamic(
  () => import("@/features/pages/CompanyAnalyticsCharts"),
  {
    ssr: false,
    loading: () => (
      <div className={styles.loading} role="status">
        Loading company charts...
      </div>
    ),
  },
);

export default CompanyAnalyticsCharts;
