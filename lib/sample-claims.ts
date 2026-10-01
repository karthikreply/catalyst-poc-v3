export type SampleClaimFieldId = "claimant" | "policy" | "dateOfLoss" | "claimType";

export const sampleClaimFields: { id: SampleClaimFieldId; label: string }[] = [
  { id: "claimant", label: "Claimant" },
  { id: "policy", label: "Policy number" },
  { id: "dateOfLoss", label: "Date of loss" },
  { id: "claimType", label: "Claim type" },
];

export type SampleClaimLine = { label: string; value: string };

export type SampleClaim = {
  id: string;
  label: string;
  lines: SampleClaimLine[];
  pages?: { heading: string; lines: SampleClaimLine[] }[];
  marginNote?: string;
  extracted: Record<SampleClaimFieldId, string>;
};

function cleanClaim(
  number: number,
  claimant: string,
  policy: string,
  dateOfLoss: string,
  claimType: string,
): SampleClaim {
  return {
    id: `claim-${number}`,
    label: `Claim ${number}`,
    lines: [
      { label: "Claimant", value: claimant },
      { label: "Policy number", value: policy },
      { label: "Date of loss", value: dateOfLoss },
      { label: "Claim type", value: claimType },
    ],
    extracted: { claimant, policy, dateOfLoss, claimType },
  };
}

/** Eight made-up claims. Six match the document. Two are wrong on purpose. */
export const sampleClaims: SampleClaim[] = [
  cleanClaim(1, "Marcus Webb", "POL-48213", "14 Mar 2026", "Water damage"),
  cleanClaim(2, "Aisha Rahman", "POL-30977", "02 Feb 2026", "Auto collision"),
  {
    id: "claim-3",
    label: "Claim 3",
    lines: [
      { label: "Claimant", value: "Tom Reilly" },
      { label: "Policy number", value: "POL-51120" },
      { label: "Date of loss", value: "21 Jan 2026" },
      { label: "Claim type", value: "Fire" },
    ],
    marginNote: "date of loss 12 Jan, not 21",
    extracted: {
      claimant: "Tom Reilly",
      policy: "POL-51120",
      dateOfLoss: "21 Jan 2026",
      claimType: "Fire",
    },
  },
  cleanClaim(4, "Grace Lindqvist", "POL-27456", "09 Apr 2026", "Theft"),
  cleanClaim(5, "Omar Haddad", "POL-66031", "30 Mar 2026", "Hail"),
  {
    id: "claim-6",
    label: "Claim 6",
    lines: [],
    pages: [
      {
        heading: "Page 1",
        lines: [
          { label: "Claimant", value: "Priya Nanda" },
          { label: "Policy number", value: "POL-39802" },
          { label: "Date of loss", value: "17 Feb 2026" },
          { label: "Claim type", value: "Water damage" },
          { label: "Note", value: "Superseded. This policy number is no longer in force." },
        ],
      },
      {
        heading: "Page 2",
        lines: [
          { label: "Loss description", value: "Water entered the kitchen after a burst pipe. Continued from page 1." },
        ],
      },
      {
        heading: "Page 3",
        lines: [
          { label: "Policy number in force", value: "POL-39820" },
          { label: "Note", value: "The policy number changed. Use this page, not page 1." },
        ],
      },
    ],
    extracted: {
      claimant: "Priya Nanda",
      policy: "POL-39802",
      dateOfLoss: "17 Feb 2026",
      claimType: "Water damage",
    },
  },
  cleanClaim(7, "Ben Okafor", "POL-18764", "05 May 2026", "Auto collision"),
  cleanClaim(8, "Sofia Moreau", "POL-72345", "11 Jun 2026", "Theft"),
];

const claimIds = new Set(sampleClaims.map((claim) => claim.id));

export function isSampleClaimId(claimId: string) {
  return claimIds.has(claimId);
}

export function sampleRunTallies(marks: Record<string, { verdict: "right" | "fix"; fields: string[] }>) {
  let right = 0;
  let fix = 0;
  for (const claim of sampleClaims) {
    const verdict = marks[claim.id]?.verdict;
    if (verdict === "right") right += 1;
    if (verdict === "fix") fix += 1;
  }
  return { right, fix, reviewed: right + fix };
}

/** Next claim index without a verdict, wrapping after `fromIndex`. Stays put when all are marked. */
export function nextUnmarkedIndex(
  marks: Record<string, { verdict?: string } | undefined>,
  fromIndex: number,
) {
  for (let step = 1; step <= sampleClaims.length; step += 1) {
    const index = (fromIndex + step) % sampleClaims.length;
    if (!marks[sampleClaims[index].id]?.verdict) return index;
  }
  return fromIndex;
}
