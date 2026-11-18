"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, useRef, type ChangeEvent, type FormEvent } from "react";
import { companyAPI } from "@/lib/api/client";
import {
  UserCheck,
  Plus,
  Search,
  Phone,
  Mail,
  CreditCard,
  FileText,
  Upload,
  X,
  Trash2,
  Pencil,
  Loader,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import styles from "./company-private-driver.module.css";

type PrivateHireDriver = {
  id: number;
  company_id: number;
  name: string;
  phone: string;
  email: string;
  image: string | null;
  image_url: string | null;
  license_number: string;
  id_type: "ZAN_ID" | "NIDA" | "PASSPORT";
  id_number: string;
  is_active: boolean;
  created_at: string;
};

const ID_TYPE_LABELS: Record<string, string> = {
  ZAN_ID: "ZanID (Zanzibar ID)",
  NIDA: "NIDA (Tanzania National ID)",
  PASSPORT: "Passport",
};

export default function CompanyPrivateDriverPage() {
  const toast = useToast();
  const [drivers, setDrivers] = useState<PrivateHireDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<PrivateHireDriver | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [idType, setIdType] = useState<"ZAN_ID" | "NIDA" | "PASSPORT">("ZAN_ID");
  const [idNumber, setIdNumber] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Image upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await companyAPI.privateHireDrivers({ search: search.trim() || undefined });
      setDrivers(res.data?.results || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load drivers";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const openCreateModal = () => {
    setEditingDriver(null);
    setName("");
    setPhone("");
    setEmail("");
    setLicenseNumber("");
    setIdType("ZAN_ID");
    setIdNumber("");
    setIsActive(true);
    setImageFile(null);
    setImagePreview(null);
    setModalOpen(true);
  };

  const openEditModal = (d: PrivateHireDriver) => {
    setEditingDriver(d);
    setName(d.name);
    setPhone(d.phone);
    setEmail(d.email || "");
    setLicenseNumber(d.license_number);
    setIdType(d.id_type);
    setIdNumber(d.id_number);
    setIsActive(d.is_active);
    setImageFile(null);
    setImagePreview(d.image_url || null);
    setModalOpen(true);
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter the driver's full name.");
      return;
    }
    if (!phone.trim()) {
      toast.error("Please enter the driver's phone number.");
      return;
    }
    if (!licenseNumber.trim()) {
      toast.error("Please enter the driver's license number.");
      return;
    }
    if (!idNumber.trim()) {
      toast.error("Please enter the driver's ID number.");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("phone", phone.trim());
      formData.append("email", email.trim());
      formData.append("license_number", licenseNumber.trim());
      formData.append("id_type", idType);
      formData.append("id_number", idNumber.trim());
      formData.append("is_active", String(isActive));

      if (imageFile) formData.append("image", imageFile);

      if (editingDriver) {
        await companyAPI.updatePrivateHireDriver(editingDriver.id, formData);
        toast.success("Driver updated successfully.");
      } else {
        await companyAPI.createPrivateHireDriver(formData);
        toast.success("Private Hire Driver registered successfully.");
      }

      setModalOpen(false);
      fetchDrivers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save driver";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this driver?")) return;
    try {
      await companyAPI.deletePrivateHireDriver(id);
      toast.success("Driver removed.");
      fetchDrivers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete driver";
      toast.error(msg);
    }
  };

  return (
    <div className={styles.root}>
      {/* Top Header */}
      <div className={styles.topBar}>
        <div className={styles.titleArea}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/company/dashboard/">Company workspace</Link>
            <span aria-hidden="true">/</span>
            <span>Private drivers</span>
          </nav>
          <p className={styles.eyebrow}>People management</p>
          <h1>
            <UserCheck size={22} aria-hidden="true" />
            Private Hire Drivers
          </h1>
          <p>Maintain driver contact and identification details for your private-hire fleet.</p>
        </div>
        <div className={styles.actionsArea}>
          <div className={styles.searchBox}>
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Search driver by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className={styles.primaryBtn} onClick={openCreateModal}>
            <Plus size={18} />
            Register Driver
          </button>
        </div>
      </div>

      <section className={styles.overview} aria-label="Driver overview">
        <div className={styles.overviewMain}>
          <div className={styles.overviewHeading}>
            <span className={styles.overviewIcon} aria-hidden="true"><UserCheck size={21} /></span>
            <div>
              <h2>Driver directory</h2>
              <p>Keep verified driver records organized and ready for service assignments.</p>
            </div>
          </div>
          <ul className={styles.stats}>
            <li><span>Total drivers</span><strong>{drivers.length}</strong><small>In your directory</small></li>
            <li><span>Active</span><strong>{drivers.filter((driver) => driver.is_active).length}</strong><small>Available for assignment</small></li>
            <li><span>Inactive</span><strong>{drivers.filter((driver) => !driver.is_active).length}</strong><small>Not currently assigned</small></li>
          </ul>
        </div>
        <aside className={styles.overviewAside}>
          <span>Driver records</span>
          <strong>{drivers.length.toLocaleString()}</strong>
          <p>{drivers.length === 1 ? "verified driver" : "verified drivers"}</p>
          <button type="button" onClick={openCreateModal}><Plus size={16} /> Register a driver</button>
        </aside>
      </section>

      {/* Drivers Grid */}
      {loading ? (
        <div className={styles.emptyState}>
          <Loader className="animate-spin" size={32} color="#08428c" />
          <div className={styles.emptyStateSub}>Loading drivers...</div>
        </div>
      ) : drivers.length === 0 ? (
        <div className={styles.emptyState}>
          <UserCheck size={48} color="#94a3b8" />
          <div className={styles.emptyStateTitle}>No Private Hire Drivers Registered</div>
          <div className={styles.emptyStateSub}>
            Register your company drivers with their ZanID, NIDA or passport numbers so you can assign them to Private Hire Services.
          </div>
          <button className={styles.primaryBtn} onClick={openCreateModal}>
            <Plus size={18} /> Register First Driver
          </button>
        </div>
      ) : (
        <div className={styles.driversGrid}>
          {drivers.map((d) => (
            <div key={d.id} className={styles.driverCard}>
              <div className={styles.driverCardHeader}>
                {d.image_url ? (
                  <Image
                    src={d.image_url}
                    alt={d.name}
                    width={64}
                    height={64}
                    className={styles.avatar}
                    unoptimized
                  />
                ) : (
                  <div className={styles.avatarFallback}>
                    {d.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className={styles.driverMeta}>
                  <h3 className={styles.driverName}>{d.name}</h3>
                  <span
                    className={`${styles.statusPill} ${
                      d.is_active ? styles.statusActive : styles.statusInactive
                    }`}
                  >
                    {d.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className={styles.driverCardBody}>
                <div className={styles.infoRow}>
                  <Phone size={15} />
                  <span>{d.phone}</span>
                </div>

                {d.email && (
                  <div className={styles.infoRow}>
                    <Mail size={15} />
                    <span>{d.email}</span>
                  </div>
                )}

                <div className={styles.idBadgeGroup}>
                  <div className={styles.idItem}>
                    <span className={styles.idLabel}>Driving License:</span>
                    <span className={styles.idVal}>{d.license_number}</span>
                  </div>
                  <div className={styles.idItem}>
                    <span className={styles.idLabel}>{ID_TYPE_LABELS[d.id_type] || d.id_type}:</span>
                    <span className={styles.idVal}>{d.id_number}</span>
                  </div>
                </div>
              </div>

              <div className={styles.driverCardFooter}>
                <span className="text-xs text-slate-400">ID: #{d.id}</span>
                <div className={styles.cardActions}>
                  <button className={styles.btnSecondary} onClick={() => openEditModal(d)}>
                    <Pencil size={13} /> Edit
                  </button>
                  <button className={styles.btnDanger} onClick={() => handleDelete(d.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register / Edit Driver Modal */}
      {modalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{editingDriver ? "Edit Private Hire Driver" : "Register Private Hire Driver"}</h2>
              <button className={styles.closeBtn} onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.formBody}>
                {/* Photo upload */}
                <div className={styles.formField}>
                  <label>Driver Photo</label>
                  <div className={styles.avatarUploadArea}>
                    {imagePreview ? (
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        width={64}
                        height={64}
                        className={styles.uploadPreviewThumb}
                        unoptimized
                      />
                    ) : (
                      <div className={styles.avatarFallback}>
                        {name ? name.slice(0, 2).toUpperCase() : "DR"}
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        className={styles.btnSecondary}
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <Upload size={14} /> Upload Driver Photo
                      </button>
                      <span className="text-xs text-slate-400">JPEG, PNG or WebP</span>
                      <input
                        type="file"
                        ref={imageInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label>
                      Driver Full Name <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.inputControl}
                      placeholder="e.g. Ali Khamis Juma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.formField}>
                    <label>
                      Phone Number <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      type="tel"
                      className={styles.inputControl}
                      placeholder="e.g. +255 777 123 456"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.formField}>
                    <label>Email Address</label>
                    <input
                      type="email"
                      className={styles.inputControl}
                      placeholder="driver@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label>
                      Driving License Number <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.inputControl}
                      placeholder="e.g. DL-ZN-98214"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.formField}>
                    <label>
                      ID Document Type <span className={styles.requiredMark}>*</span>
                    </label>
                    <select
                      className={styles.selectControl}
                      value={idType}
                      onChange={(e) => setIdType(e.target.value as "ZAN_ID" | "NIDA" | "PASSPORT")}
                    >
                      <option value="ZAN_ID">ZanID (Zanzibar Resident ID)</option>
                      <option value="NIDA">NIDA (National Identification Authority)</option>
                      <option value="PASSPORT">Passport</option>
                    </select>
                  </div>

                  <div className={styles.formField}>
                    <label>
                      ID / Passport Number <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.inputControl}
                      placeholder="e.g. 19900812-42100-00001-24"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="driver_active_chk"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="driver_active_chk" className="text-sm font-medium text-slate-700 cursor-pointer">
                    Driver is active and available for trip assignments
                  </label>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={styles.primaryBtn}
                >
                  {submitting ? (
                    <>
                      <Loader className="animate-spin" size={16} /> Saving...
                    </>
                  ) : editingDriver ? (
                    "Update Driver"
                  ) : (
                    "Register Driver"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
