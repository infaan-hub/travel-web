"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, useRef, type ChangeEvent, type FormEvent } from "react";
import { companyAPI } from "@/lib/api/client";
import {
  Car,
  Plus,
  Search,
  Users,
  Briefcase,
  Upload,
  X,
  Trash2,
  Pencil,
  CheckCircle,
  AlertCircle,
  Loader,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import styles from "./company-private-hire.module.css";

type PrivateHireVehicle = {
  id: number;
  company_id: number;
  name: string;
  plate_number: string;
  category: string;
  capacity: number;
  luggage_capacity: number;
  description: string;
  includes: string[];
  excludes: string[];
  front_image: string;
  front_image_url: string | null;
  side_image: string | null;
  side_image_url: string | null;
  back_image: string | null;
  back_image_url: string | null;
  is_available: boolean;
  created_at: string;
};

const CATEGORIES = [
  "Sedan",
  "SUV 4x4",
  "Minivan",
  "Safari Cruiser",
  "Coaster Bus",
  "Luxury VIP",
];

export default function CompanyPrivateHirePage() {
  const toast = useToast();
  const [vehicles, setVehicles] = useState<PrivateHireVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<PrivateHireVehicle | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [category, setCategory] = useState("Sedan");
  const [capacity, setCapacity] = useState(4);
  const [luggageCapacity, setLuggageCapacity] = useState(2);
  const [description, setDescription] = useState("");
  const [includesText, setIncludesText] = useState("A/C\nFuel\nMineral Water\nLuggage Assistance");
  const [excludesText, setExcludesText] = useState("Driver Tips\nPark Entry Fees");
  const [isAvailable, setIsAvailable] = useState(true);

  // Images state
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [sideFile, setSideFile] = useState<File | null>(null);
  const [sidePreview, setSidePreview] = useState<string | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const sideInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await companyAPI.privateHireVehicles({ search: search.trim() || undefined });
      setVehicles(res.data?.results || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load vehicles";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const openCreateModal = () => {
    setEditingVehicle(null);
    setName("");
    setPlateNumber("");
    setCategory("Sedan");
    setCapacity(4);
    setLuggageCapacity(2);
    setDescription("");
    setIncludesText("A/C\nFuel\nMineral Water\nLuggage Assistance");
    setExcludesText("Driver Tips\nPark Entry Fees");
    setIsAvailable(true);
    setFrontFile(null);
    setFrontPreview(null);
    setSideFile(null);
    setSidePreview(null);
    setBackFile(null);
    setBackPreview(null);
    setModalOpen(true);
  };

  const openEditModal = (v: PrivateHireVehicle) => {
    setEditingVehicle(v);
    setName(v.name);
    setPlateNumber(v.plate_number);
    setCategory(v.category);
    setCapacity(v.capacity);
    setLuggageCapacity(v.luggage_capacity);
    setDescription(v.description || "");
    setIncludesText(v.includes.join("\n"));
    setExcludesText(v.excludes.join("\n"));
    setIsAvailable(v.is_available);
    setFrontFile(null);
    setFrontPreview(v.front_image_url || null);
    setSideFile(null);
    setSidePreview(v.side_image_url || null);
    setBackFile(null);
    setBackPreview(v.back_image_url || null);
    setModalOpen(true);
  };

  const handleFrontFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFrontFile(file);
      setFrontPreview(URL.createObjectURL(file));
    }
  };

  const handleSideFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSideFile(file);
      setSidePreview(URL.createObjectURL(file));
    }
  };

  const handleBackFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackFile(file);
      setBackPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a vehicle name / model.");
      return;
    }
    if (!plateNumber.trim()) {
      toast.error("Please enter a plate / registration number.");
      return;
    }
    if (!editingVehicle && !frontFile) {
      toast.error("Front vehicle image is mandatory.");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("plate_number", plateNumber.trim());
      formData.append("category", category);
      formData.append("capacity", String(capacity));
      formData.append("luggage_capacity", String(luggageCapacity));
      formData.append("description", description.trim());
      formData.append("is_available", String(isAvailable));

      const includesArray = includesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      formData.append("includes", JSON.stringify(includesArray));

      const excludesArray = excludesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      formData.append("excludes", JSON.stringify(excludesArray));

      if (frontFile) formData.append("front_image", frontFile);
      if (sideFile) formData.append("side_image", sideFile);
      if (backFile) formData.append("back_image", backFile);

      if (editingVehicle) {
        await companyAPI.updatePrivateHireVehicle(editingVehicle.id, formData);
        toast.success("Private Hire Vehicle updated successfully.");
      } else {
        await companyAPI.createPrivateHireVehicle(formData);
        toast.success("Private Hire Vehicle created successfully.");
      }

      setModalOpen(false);
      fetchVehicles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save vehicle";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this vehicle?")) return;
    try {
      await companyAPI.deletePrivateHireVehicle(id);
      toast.success("Vehicle removed.");
      fetchVehicles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete vehicle";
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
            <span>Private hire</span>
          </nav>
          <p className={styles.eyebrow}>Fleet management</p>
          <h1>
            <Car size={22} aria-hidden="true" />
            Private Hire Vehicles
          </h1>
          <p>Maintain your vehicle catalogue, availability, passenger capacity and fleet details.</p>
        </div>
        <div className={styles.actionsArea}>
          <div className={styles.searchBox}>
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Search by vehicle name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className={styles.primaryBtn} onClick={openCreateModal}>
            <Plus size={18} />
            Add Vehicle
          </button>
        </div>
      </div>

      <section className={styles.overview} aria-label="Fleet overview">
        <div className={styles.overviewMain}>
          <div className={styles.overviewHeading}>
            <span className={styles.overviewIcon} aria-hidden="true"><Car size={21} /></span>
            <div>
              <h2>Fleet catalogue</h2>
              <p>Manage the vehicles available for your private-hire services.</p>
            </div>
          </div>
          <ul className={styles.stats}>
            <li><span>Total vehicles</span><strong>{vehicles.length}</strong><small>In your fleet</small></li>
            <li><span>Available</span><strong>{vehicles.filter((vehicle) => vehicle.is_available).length}</strong><small>Ready for hire</small></li>
            <li><span>Unavailable</span><strong>{vehicles.filter((vehicle) => !vehicle.is_available).length}</strong><small>Currently inactive</small></li>
          </ul>
        </div>
        <aside className={styles.overviewAside}>
          <span>Fleet size</span>
          <strong>{vehicles.length.toLocaleString()}</strong>
          <p>{vehicles.length === 1 ? "vehicle registered" : "vehicles registered"}</p>
          <button type="button" onClick={openCreateModal}><Plus size={16} /> Add a vehicle</button>
        </aside>
      </section>

      {/* Grid of Vehicles */}
      {loading ? (
        <div className={styles.emptyState}>
          <Loader className="animate-spin" size={32} color="#08428c" />
          <div className={styles.emptyStateSub}>Loading your fleet vehicles...</div>
        </div>
      ) : vehicles.length === 0 ? (
        <div className={styles.emptyState}>
          <Car size={48} color="#94a3b8" />
          <div className={styles.emptyStateTitle}>No Private Hire Vehicles Registered</div>
          <div className={styles.emptyStateSub}>
            Register your company cars, vans, safari cruisers or VIP vehicles here so they can be assigned to Private Hire Services.
          </div>
          <button className={styles.primaryBtn} onClick={openCreateModal}>
            <Plus size={18} /> Add Your First Vehicle
          </button>
        </div>
      ) : (
        <div className={styles.vehiclesGrid}>
          {vehicles.map((v) => (
            <div key={v.id} className={styles.vehicleCard}>
              <div className={styles.imageGallery}>
                {v.front_image_url ? (
                  <Image
                    src={v.front_image_url}
                    alt={v.name}
                    className={styles.mainImage}
                    width={400}
                    height={220}
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                    <Car size={36} />
                  </div>
                )}
                <span className={styles.categoryBadge}>{v.category}</span>
                <span className={styles.plateBadge}>{v.plate_number}</span>
                <span
                  className={`${styles.availabilityBadge} ${
                    v.is_available ? styles.availActive : styles.availInactive
                  }`}
                >
                  {v.is_available ? "Available" : "Unavailable"}
                </span>

                {/* Sub images indicators */}
                <div className={styles.subImagesRow}>
                  {v.side_image_url && (
                    <div className={styles.subThumb} title="Side View">
                      <Image src={v.side_image_url} alt="Side" fill className="object-cover" unoptimized />
                    </div>
                  )}
                  {v.back_image_url && (
                    <div className={styles.subThumb} title="Back View">
                      <Image src={v.back_image_url} alt="Back" fill className="object-cover" unoptimized />
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{v.name}</h3>

                <div className={styles.specsRow}>
                  <div className={styles.specItem}>
                    <Users size={15} />
                    <span>{v.capacity} Passengers</span>
                  </div>
                  <div className={styles.specItem}>
                    <Briefcase size={15} />
                    <span>{v.luggage_capacity} Bags</span>
                  </div>
                </div>

                {v.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 m-0">{v.description}</p>
                )}

                <div className={styles.inclusionsList}>
                  {v.includes && v.includes.length > 0 && (
                    <div className={styles.inclusionGroup}>
                      <span className={styles.incLabel}>Included:</span>
                      {v.includes.slice(0, 3).map((item, idx) => (
                        <span key={idx} className={styles.pillInc}>
                          {item}
                        </span>
                      ))}
                      {v.includes.length > 3 && (
                        <span className="text-[11px] text-slate-400">+{v.includes.length - 3}</span>
                      )}
                    </div>
                  )}

                  {v.excludes && v.excludes.length > 0 && (
                    <div className={styles.inclusionGroup}>
                      <span className={styles.excLabel}>Excluded:</span>
                      {v.excludes.slice(0, 2).map((item, idx) => (
                        <span key={idx} className={styles.pillExc}>
                          {item}
                        </span>
                      ))}
                      {v.excludes.length > 2 && (
                        <span className="text-[11px] text-slate-400">+{v.excludes.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.cardFooter}>
                <span className="text-xs text-slate-400">
                  ID: #{v.id}
                </span>
                <div className={styles.cardActions}>
                  <button className={styles.btnSecondary} onClick={() => openEditModal(v)}>
                    <Pencil size={13} /> Edit
                  </button>
                  <button className={styles.btnDanger} onClick={() => handleDelete(v.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Vehicle Modal */}
      {modalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{editingVehicle ? "Edit Private Hire Vehicle" : "Add Private Hire Vehicle"}</h2>
              <button className={styles.closeBtn} onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.formBody}>
                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label>
                      Vehicle Name / Model <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.inputControl}
                      placeholder="e.g. Toyota Alphard VIP"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.formField}>
                    <label>
                      Plane / Plate Number <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.inputControl}
                      placeholder="e.g. Z 942 AB"
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.formField}>
                    <label>Category</label>
                    <select
                      className={styles.selectControl}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGrid} style={{ gap: 10 }}>
                    <div className={styles.formField}>
                      <label>Seats (Pax)</label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        className={styles.inputControl}
                        value={capacity}
                        onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 1)}
                      />
                    </div>
                    <div className={styles.formField}>
                      <label>Luggage Bags</label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        className={styles.inputControl}
                        value={luggageCapacity}
                        onChange={(e) => setLuggageCapacity(parseInt(e.target.value, 10) || 0)}
                      />
                    </div>
                  </div>
                </div>

                {/* Images Upload Section */}
                <div className={styles.formField}>
                  <label>
                    Vehicle Images <span className={styles.requiredMark}>* (Front image is required)</span>
                  </label>
                  <div className={styles.imageUploadGrid}>
                    {/* Front Image (Must) */}
                    <div
                      className={styles.imageBox}
                      onClick={() => frontInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={frontInputRef}
                        onChange={handleFrontFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                      {frontPreview ? (
                        <Image
                          src={frontPreview}
                          alt="Front"
                          width={150}
                          height={90}
                          className={styles.imageBoxPreview}
                          unoptimized
                        />
                      ) : (
                        <Upload size={24} color="#08428c" />
                      )}
                      <span className={styles.imageBoxTitle}>
                        Front View <span className={styles.requiredMark}>* (Must)</span>
                      </span>
                      <span className={styles.imageBoxSub}>Click to upload</span>
                    </div>

                    {/* Side Image (Optional) */}
                    <div
                      className={styles.imageBox}
                      onClick={() => sideInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={sideInputRef}
                        onChange={handleSideFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                      {sidePreview ? (
                        <Image
                          src={sidePreview}
                          alt="Side"
                          width={150}
                          height={90}
                          className={styles.imageBoxPreview}
                          unoptimized
                        />
                      ) : (
                        <Upload size={24} color="#64748b" />
                      )}
                      <span className={styles.imageBoxTitle}>Side View</span>
                      <span className={styles.imageBoxSub}>(Optional)</span>
                    </div>

                    {/* Back Image (Optional) */}
                    <div
                      className={styles.imageBox}
                      onClick={() => backInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={backInputRef}
                        onChange={handleBackFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                      {backPreview ? (
                        <Image
                          src={backPreview}
                          alt="Back"
                          width={150}
                          height={90}
                          className={styles.imageBoxPreview}
                          unoptimized
                        />
                      ) : (
                        <Upload size={24} color="#64748b" />
                      )}
                      <span className={styles.imageBoxTitle}>Back View</span>
                      <span className={styles.imageBoxSub}>(Optional)</span>
                    </div>
                  </div>
                </div>

                {/* Inclusions & Exclusions */}
                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label>What&apos;s Included (one per line)</label>
                    <textarea
                      rows={3}
                      className={styles.textareaControl}
                      placeholder="A/C&#10;Fuel&#10;Mineral Water"
                      value={includesText}
                      onChange={(e) => setIncludesText(e.target.value)}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label>What&apos;s Excluded (one per line)</label>
                    <textarea
                      rows={3}
                      className={styles.textareaControl}
                      placeholder="Driver tips&#10;Park entry fees"
                      value={excludesText}
                      onChange={(e) => setExcludesText(e.target.value)}
                    />
                  </div>
                </div>

                {/* Description and Availability */}
                <div className={styles.formField}>
                  <label>Vehicle Description / Notes (Optional)</label>
                  <textarea
                    rows={2}
                    className={styles.textareaControl}
                    placeholder="Provide any details about the vehicle features, comfort, or luggage guidelines..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_available_chk"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="w-4 h-4 text-blue-800 rounded"
                  />
                  <label htmlFor="is_available_chk" className="text-sm font-medium text-slate-700 cursor-pointer">
                    Vehicle is currently active and available for hire
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
                  ) : editingVehicle ? (
                    "Update Vehicle"
                  ) : (
                    "Register Vehicle"
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
