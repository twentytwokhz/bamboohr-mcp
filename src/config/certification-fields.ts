// Certification Field Configuration
// Maps certification codes to their BambooHR custom field IDs

export interface CertificationFieldConfig {
  completed: string;
  due: string;
  expires: string | null;  // Some certs don't have expires field
  name: string;
  category: 'azure' | 'data' | 'power-platform' | 'aws' | 'other';
}

export const CERTIFICATION_FIELDS: Record<string, CertificationFieldConfig> = {
  // === Microsoft Azure Certifications ===
  'AI-102':      { completed: '4575', due: '4575.2', expires: '4575.1', name: 'Azure AI Solution', category: 'azure' },
  'AI-102-ESI':  { completed: '4576', due: '4576.2', expires: '4576.1', name: 'AI-102 ESI Prep', category: 'azure' },
  'AI-900':      { completed: '4613', due: '4613.2', expires: '4613.1', name: 'Azure AI Fundamentals', category: 'azure' },
  'AZ-104':      { completed: '4524', due: '4524.2', expires: '4524.1', name: 'Azure Administrator', category: 'azure' },
  'AZ-104-ESI':  { completed: '4525', due: '4525.2', expires: '4525.1', name: 'AZ-104 ESI Prep', category: 'azure' },
  'AZ-204':      { completed: '4519', due: '4519.2', expires: '4519.1', name: 'Azure Developer', category: 'azure' },
  'AZ-204-ESI':  { completed: '4520', due: '4520.2', expires: '4520.1', name: 'AZ-204 ESI Prep', category: 'azure' },
  'AZ-305':      { completed: '4529', due: '4529.2', expires: '4529.1', name: 'Azure Solutions Architect', category: 'azure' },
  'AZ-305-ESI':  { completed: '4528', due: '4528.2', expires: '4528.1', name: 'AZ-305 ESI Prep', category: 'azure' },
  'AZ-400':      { completed: '4526', due: '4526.2', expires: '4526.1', name: 'Azure DevOps', category: 'azure' },
  'AZ-400-ESI':  { completed: '4527', due: '4527.2', expires: '4527.1', name: 'AZ-400 ESI Prep', category: 'azure' },
  'AZ-700':      { completed: '4535', due: '4535.2', expires: '4535.1', name: 'Azure Network Engineer', category: 'azure' },
  'AZ-700-ESI':  { completed: '4536', due: '4536.2', expires: '4536.1', name: 'AZ-700 ESI Prep', category: 'azure' },
  'AZ-900':      { completed: '4589', due: '4589.2', expires: '4589.1', name: 'Azure Fundamentals', category: 'azure' },

  // === Data & Analytics Certifications ===
  'DP-100':      { completed: '4582', due: '4582.2', expires: '4582.1', name: 'Azure Data Science', category: 'data' },
  'DP-100-ESI':  { completed: '4585', due: '4585.2', expires: '4585.1', name: 'DP-100 ESI Prep', category: 'data' },
  'DP-203':      { completed: '4521', due: '4521.2', expires: '4521.1', name: 'Azure Data Engineering', category: 'data' },
  'DP-203-ESI':  { completed: '4522', due: '4522.2', expires: '4522.1', name: 'DP-203 ESI Prep', category: 'data' },
  'DP-300':      { completed: '4583', due: '4583.2', expires: '4583.1', name: 'Azure SQL Admin', category: 'data' },
  'DP-300-ESI':  { completed: '4584', due: '4584.2', expires: '4584.1', name: 'DP-300 ESI Prep', category: 'data' },
  'DP-420':      { completed: '4534', due: '4534.2', expires: '4534.1', name: 'Azure Cosmos DB', category: 'data' },
  'DP-420-ESI':  { completed: '4533', due: '4533.2', expires: '4533.1', name: 'DP-420 ESI Prep', category: 'data' },
  'DP-600':      { completed: '4574', due: '4574.2', expires: '4574.1', name: 'Microsoft Fabric', category: 'data' },

  // === Power Platform Certifications ===
  'PL-300':      { completed: '4523', due: '4523.2', expires: '4523.1', name: 'Power BI Data Analyst', category: 'power-platform' },
  'PL-300-ESI':  { completed: '4581', due: '4581.2', expires: '4581.1', name: 'PL-300 ESI Prep', category: 'power-platform' },
  'PL-400':      { completed: '4580', due: '4580.2', expires: '4580.1', name: 'Power Platform Developer', category: 'power-platform' },
  'PL-400-ESI':  { completed: '4579', due: '4579.2', expires: '4579.1', name: 'PL-400 ESI Prep', category: 'power-platform' },
  'PL-600':      { completed: '4577', due: '4577.2', expires: '4577.1', name: 'Power Platform Architect', category: 'power-platform' },
  'PL-600-ESI':  { completed: '4578', due: '4578.2', expires: '4578.1', name: 'PL-600 ESI Prep', category: 'power-platform' },

  // === AWS Certifications ===
  'AWS-CP':      { completed: '4588', due: '4588.2', expires: '4588.1', name: 'AWS Cloud Practitioner', category: 'aws' },
  'AWS-SAA':     { completed: '4587', due: '4587.2', expires: '4587.1', name: 'AWS Solutions Architect Associate', category: 'aws' },

  // === Other Training/Certifications ===
  'JIRA':        { completed: '4532', due: '4532.2', expires: null, name: 'Atlassian Jira Fundamentals', category: 'other' },
  'KNOWBE4':     { completed: '4530', due: '4530.2', expires: '4530.1', name: 'KnowBe4 Security Trainings', category: 'other' },
  'TKW-ISMS':    { completed: '4531', due: '4531.2', expires: '4531.1', name: 'TKW Security ISMS', category: 'other' },
  'HIGHBRIDGE':  { completed: '4596', due: '4596.2', expires: null, name: 'High Bridge Business Bootcamp', category: 'other' },
};

/**
 * Get all field IDs needed for Custom Report queries.
 * Includes employee identifiers plus all certification date fields.
 */
export function getAllCertificationFieldIds(): string[] {
  const fields: string[] = ['displayName', 'department', 'id'];
  for (const cert of Object.values(CERTIFICATION_FIELDS)) {
    fields.push(cert.completed);
    if (cert.due) fields.push(cert.due);
    if (cert.expires) fields.push(cert.expires);
  }
  return fields;
}

/**
 * Get certification field IDs for a specific category.
 */
export function getCertificationFieldsByCategory(
  category: CertificationFieldConfig['category']
): Record<string, CertificationFieldConfig> {
  return Object.fromEntries(
    Object.entries(CERTIFICATION_FIELDS).filter(([, config]) => config.category === category)
  );
}

/**
 * Get the certification code from a field ID.
 * Returns null if the field ID doesn't match any known certification.
 */
export function getCertificationCodeFromFieldId(fieldId: string): string | null {
  // Remove any suffix (.1 or .2) to get base field ID
  const baseFieldId = fieldId.split('.')[0];

  for (const [code, config] of Object.entries(CERTIFICATION_FIELDS)) {
    if (config.completed === baseFieldId) {
      return code;
    }
  }
  return null;
}

// Related metadata fields (not certifications, but useful for filtering)
export const METADATA_FIELDS = {
  skills: '4592',
  seniority: '4586',
  teams: '4595',
} as const;

// Certification status thresholds
export const CERTIFICATION_STATUS_THRESHOLDS = {
  expiringWithinDays: 30,  // "expiring_soon" if expires within 30 days
} as const;
