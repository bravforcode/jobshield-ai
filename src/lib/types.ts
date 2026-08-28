/**
 * Pure types + helpers shared between server and client.
 * NO node:fs imports here — this file is safe to import from client components.
 */

export interface WageStats {
  median: number;
  p25: number;
  p75: number;
  sample_count: number;
}

export interface Occupation {
  code: string;
  label: string;
  category: string;
  wage: WageStats;
  risk: number;
  degree_centrality: number;
  betweenness_centrality: number;
  underpayment_gap: number;
  predicted_wage: number;
}

export interface HopExplanation {
  from: string;
  to: string;
  shared_skills: string[];
}

export interface Recommendation {
  target: string;
  target_label: string;
  score: number;
  wage_delta: number;
  path_cost: number;
  target_risk: number;
  path: string[];
  path_explanation: HopExplanation[];
}

export interface WageRadarRow {
  occ: string;
  label: string;
  centrality: number;
  wage: number;
  predicted: number;
  underpaid: boolean;
  gap_ratio: number;
}

export interface CorpusStats {
  occupations: number;
  skills: number;
  edges: number;
  sources: number;
}

export const CATEGORIES: Record<string, string> = {
  "occ.call_center_agent": "Service",
  "occ.customer_success": "Service",
  "occ.factory_technician": "Manufacturing",
  "occ.qa_quality_control": "Manufacturing",
  "occ.cashier": "Retail",
  "occ.retail_sales_assistant": "Retail",
  "occ.data_entry": "Office",
  "occ.junior_data_analyst": "Analytics",
  "occ.accounting_clerk": "Finance",
  "occ.bookkeeper": "Finance",
  "occ.marketing_coordinator": "Marketing",
  "occ.digital_marketer": "Marketing",
  "occ.recruiter": "People",
  "occ.hr_generalist": "People",
  "occ.warehouse_worker": "Logistics",
  "occ.logistics_coordinator": "Logistics",
  "occ.translator": "Creative",
  "occ.content_writer": "Creative",
};

export const LABELS: Record<string, string> = {
  "occ.call_center_agent": "เจ้าหน้าที่คอลเซ็นเตอร์ · Call Center Agent",
  "occ.customer_success": "เจ้าหน้าที่ดูแลลูกค้า · Customer Success",
  "occ.factory_technician": "ช่างเทคนิคโรงงาน · Factory Technician",
  "occ.qa_quality_control": "เจ้าหน้าที่ควบคุมคุณภาพ · QA / QC",
  "occ.cashier": "แคชเชียร์ · Cashier",
  "occ.retail_sales_assistant": "พนักงานขายปลีก · Retail Sales",
  "occ.data_entry": "เจ้าหน้าที่บันทึกข้อมูล · Data Entry",
  "occ.junior_data_analyst": "นักวิเคราะห์ข้อมูล (จูเนียร์) · Junior Data Analyst",
  "occ.accounting_clerk": "เจ้าหน้าที่บัญชี · Accounting Clerk",
  "occ.bookkeeper": "สมุดบัญชี · Bookkeeper",
  "occ.marketing_coordinator": "ผู้ประสานงานการตลาด · Marketing Coordinator",
  "occ.digital_marketer": "นักการตลาดดิจิทัล · Digital Marketer",
  "occ.recruiter": "นักสรรหาบุคลากร · Recruiter",
  "occ.hr_generalist": "เจ้าหน้าที่ HR · HR Generalist",
  "occ.warehouse_worker": "คนงานคลังสินค้า · Warehouse Worker",
  "occ.logistics_coordinator": "ผู้ประสานงานโลจิสติกส์ · Logistics Coordinator",
  "occ.translator": "นักแปลภาษา · Translator",
  "occ.content_writer": "นักเขียนคอนเทนต์ · Content Writer",
};

export function labelFor(code: string): string {
  return LABELS[code] ?? code.replace(/^occ\./, "").replace(/_/g, " ");
}

export function categoryFor(code: string): string {
  return CATEGORIES[code] ?? "Other";
}
