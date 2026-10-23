"use client";

import {
  COMPANY_WEEKDAYS,
  type CompanyOpeningHours,
  type CompanyWeekday,
} from "@/lib/company-opening-hours";
import styles from "@/components/OpeningHoursEditor.module.css";

type OpeningHoursEditorProps = {
  value: CompanyOpeningHours;
  onChange: (value: CompanyOpeningHours) => void;
  disabled?: boolean;
  legacyText?: string | null;
};

const DAY_LABELS: Record<CompanyWeekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export default function OpeningHoursEditor({
  value,
  onChange,
  disabled = false,
  legacyText,
}: OpeningHoursEditorProps) {
  const updateDay = (
    day: CompanyWeekday,
    update: Partial<CompanyOpeningHours[CompanyWeekday]>,
  ) => {
    onChange({
      ...value,
      [day]: {
        ...value[day],
        ...update,
      },
    });
  };

  return (
    <fieldset className={styles.editor} disabled={disabled}>
      <legend className={styles.legend}>Opening hours</legend>
      <p className={styles.legacy}>
        Set each day as open or closed and choose one opening and closing time.
      </p>
      {legacyText && (
        <p className={styles.legacy}>
          Previously saved as text: <strong>{legacyText}</strong>. Add the hours
          below to replace it with a weekly schedule.
        </p>
      )}
      <div className={styles.rows}>
        {COMPANY_WEEKDAYS.map((day) => {
          const schedule = value[day];
          return (
            <div className={styles.row} key={day}>
              <label className={styles.day}>
                <input
                  type="checkbox"
                  checked={schedule.is_open}
                  onChange={(event) => {
                    const isOpen = event.target.checked;
                    updateDay(day, {
                      is_open: isOpen,
                      opens_at: isOpen ? schedule.opens_at ?? "09:00" : null,
                      closes_at: isOpen ? schedule.closes_at ?? "17:00" : null,
                    });
                  }}
                  aria-label={`${DAY_LABELS[day]} open`}
                />
                <span>{DAY_LABELS[day]}</span>
              </label>
              {schedule.is_open ? (
                <>
                  <input
                    className={styles.time}
                    type="time"
                    value={schedule.opens_at ?? ""}
                    onChange={(event) =>
                      updateDay(day, { opens_at: event.target.value || null })
                    }
                    aria-label={`${DAY_LABELS[day]} opens at`}
                    required
                  />
                  <input
                    className={styles.time}
                    type="time"
                    value={schedule.closes_at ?? ""}
                    onChange={(event) =>
                      updateDay(day, { closes_at: event.target.value || null })
                    }
                    aria-label={`${DAY_LABELS[day]} closes at`}
                    required
                  />
                </>
              ) : (
                <span className={styles.closed}>Closed</span>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
