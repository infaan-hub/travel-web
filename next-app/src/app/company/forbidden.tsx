import Link from "next/link";
import { Shield } from "@/components/icons";
import styles from "@/features/pages/company-workspace.module.css";

export default function CompanyForbidden() {
  return (
    <div className={`page ${styles.forbiddenPage}`}>
      <section className={`glass-card ${styles.forbiddenCard}`}>
        <span className={styles.forbiddenIcon} aria-hidden="true">
          <Shield size={30} />
        </span>
        <p className={styles.forbiddenCode}>403</p>
        <h1 className={styles.forbiddenTitle}>Company access unavailable</h1>
        <p className={styles.forbiddenCopy}>
          This company workspace is suspended, archived, or your membership is
          no longer active. Company data and operations are unavailable.
        </p>
        <Link className={styles.forbiddenLink} href="/dashboard/">
          Return to your dashboard
        </Link>
      </section>
    </div>
  );
}
