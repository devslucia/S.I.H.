import type { EffectiveRole } from "@/lib/quirofano-rbac";

export type { EffectiveRole };

export interface CirugiaFormData {
  [key: string]: any;
}

export interface TabProps {
  formData: CirugiaFormData;
  update: (field: string, value: any) => void;
  isReadOnly: boolean;
  effectiveRole: EffectiveRole;
  canEdit: (field: string) => boolean;
}
