export const INSTITUTION_SETTINGS_ID = "00000000-0000-4000-8000-000000000001";

export type ServiceCatalogItem = { id: string; name: string; icon: string; subservices: string[] };
export type InstitutionSettings = {
  id: string;
  organization: { name: string; address: string; city: string; state: string; zip: string; phone: string; email: string; taxId: string; logoPath: string };
  templates: { letterHeader: string; letterFooter: string; reportHeader: string; reportFooter: string };
  serviceCatalog: ServiceCatalogItem[];
  caseStatuses: string[];
  storage: { provider: "supabase" | "google-drive" | "dropbox" | "sharepoint"; status: "active" | "planned" };
  updatedAt?: string;
};

export const defaultInstitutionSettings: InstitutionSettings = {
  id: INSTITUTION_SETTINGS_ID,
  organization: { name: "UCCW", address: "", city: "", state: "NY", zip: "", phone: "", email: "", taxId: "", logoPath: "" },
  templates: { letterHeader: "", letterFooter: "", reportHeader: "", reportFooter: "" },
  serviceCatalog: [
    { id: "social-services", name: "Social Services", icon: "🤝", subservices: ["Snap Application", "Snap Recertification", "Periodic Snap Report", "Domestic Violence Support", "DV Case Follow up", "P/A Application", "P/A Recertification", "Eviction Prevention", "Medicaid Application", "Medicaid Recertification", "Housing Application", "Housing Recertification", "Child Care Application", "Homeless Outreach", "School Placement Application", "Affordable Housing Application", "Support Letter", "Self-Employment Income Letter", "Emergency Food", "Diaper Donation", "Passport / Social Security Application"] },
    { id: "legal-immigration", name: "Legal / Immigration", icon: "⚖", subservices: ["Naturalization", "Family Petition", "Green Card Renewals", "Remove Conditions on Permanent Resident Card", "Adjustment of Status", "DACA Renewal", "Consular Processes", "TPS", "U-Visa", "VAWA", "Asylum", "601-Waiver", "Work Authorization Renewals", "Replacement of Naturalization Certificate", "Certificate of Naturalization", "Change of Address / FOIA", "Legal Consultation", "Translation"] },
    { id: "worker-resource-center", name: "Worker Resource Center", icon: "💼", subservices: ["Collection on Unpaid Wages", "Mediation", "Small Claims Application Assistance", "DOL Complaint Application Assistance", "Human Rights Complaint Application Assistance", "District Attorney Complaint Application Assistance", "Consumer Services Complaint Assistance", "Worker's Compensation Application Assistance", "Worker Center ID Application Assistance", "OSHA-30 Hours", "SST-10 Hours", "Job Application Assistance", "DMV Form Filling Appointment", "Resume Writing Assistance", "Unemployment Benefit Application Assistance", "Victim of Discrimination", "Victim of Abuse", "Job and Apartment Listing"] },
    { id: "educational-empowerment", name: "Educational Empowerment", icon: "🎓", subservices: ["ESOL", "Computer Training", "Know Your Rights Workshops", "Health and Safety Workshops", "Summer Tutoring Program", "Tenants' Rights Workshop", "Domestic Violence Awareness Workshops", "Immigration Law Changes Workshops", "Naturalization Exam Training"] },
    { id: "health-wellness-events", name: "Health / Wellness / Events", icon: "💚", subservices: ["Health Insurance", "Yoga with Healing Sounds", "Yoga for Seniors", "Essential Plan", "Medicare Supplemental Basics", "Medicare Advance Application", "Mental Health Referrals", "Emergency Medicaid"] },
    { id: "food-distribution", name: "General Food Distribution", icon: "🥫", subservices: [] },
    { id: "clothing-drive", name: "Clothing Drive", icon: "👕", subservices: [] }
  ],
  caseStatuses: ["Abierto", "En proceso", "Cerrado", "Cancelado"],
  storage: { provider: "supabase", status: "active" }
};

export function mergeInstitutionSettings(value?: Partial<InstitutionSettings>): InstitutionSettings {
  return {
    ...defaultInstitutionSettings,
    ...value,
    organization: { ...defaultInstitutionSettings.organization, ...value?.organization },
    templates: { ...defaultInstitutionSettings.templates, ...value?.templates },
    storage: { ...defaultInstitutionSettings.storage, ...value?.storage },
    serviceCatalog: value?.serviceCatalog?.length ? value.serviceCatalog : defaultInstitutionSettings.serviceCatalog,
    caseStatuses: value?.caseStatuses?.length ? value.caseStatuses : defaultInstitutionSettings.caseStatuses
  };
}
