// SPEC-016: Office domain types — catálogo administrable de consultorios
export interface Office {
  number: string;
  enabled: boolean;
  occupied: boolean;
  occupied_by_doctor_id: string | null;
  occupied_by_doctor_name: string | null;
  occupied_by_status: string | null;
  can_disable: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ApplyCapacityResult {
  target_total: number;
  created_offices: string[];
  unchanged: boolean;
}
