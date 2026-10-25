"use client";

import dynamic from "next/dynamic";
import styles from "@/features/pages/company-analytics.module.css";

const CompanyAnalyticsCharts = dynamic(
  () => import("@/features/pages/CompanyAnalyticsCharts"),
  {
    ssr: false,
    loading: () => (
      <div
        className={styles.analyticsChartsGrid}
        role="status"
        aria-label="Loading company charts"
      >
        <span className={styles.analyticsSrOnly}>
          Loading company charts…
        </span>
        {[0, 1, 2].map((item) => (
          <div
            className={`${styles.analyticsChartCard} ${styles.analyticsChartSkeleton}`}
            aria-hidden="true"
            key={item}
          >
            <div className={styles.analyticsChartSkeletonHead} />
            <div className={styles.analyticsChartSkeletonBody} />
          </div>
        ))}
        <div
          className={`${styles.analyticsChartCard} ${styles.analyticsChartSkeleton} ${styles.analyticsChartCardWide}`}
          aria-hidden="true"
        >
          <div className={styles.analyticsChartSkeletonHead} />
          <div className={styles.analyticsChartSkeletonBody} />
        </div>
      </div>
    ),
  },
);

export default CompanyAnalyticsCharts;
