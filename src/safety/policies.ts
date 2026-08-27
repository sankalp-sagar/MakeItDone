// src/safety/policies.ts

export interface SafetyPolicy {
  name: string;
  description: string;
  risk: "medium" | "high" | "critical";
}

export const DEFAULT_SAFETY_POLICIES: SafetyPolicy[] = [
  {
    name: "destructive-filesystem-actions",
    description:
      "Deleting or destroying files requires explicit human approval.",
    risk: "high",
  },
  {
    name: "production-changes",
    description:
      "Changes to production systems require explicit human approval.",
    risk: "critical",
  },
  {
    name: "unversioned-sensitive-files",
    description:
      "Do not modify potentially sensitive unversioned files without human confirmation.",
    risk: "high",
  },
];