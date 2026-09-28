export type BrandId = "cdw" | "softwareone" | "softchoice";

export type Brand = {
  id: BrandId;
  partnerName: string;
  productName: string;
  mark: string;
  accent: string;
  accentDark: string;
  emailIntro: string;
  artifactIntro: string;
  artifactClosing: string;
  signoff: string;
};

export function withBrandPeople(brand: Brand) {
  return {
    facilitatorOrg: brand.partnerName,
    sponsorLine: `Tom Brennan · ${brand.partnerName} AI & Data Practice Lead`,
    signoff: `Ravi Menon · ${brand.partnerName}`,
  };
}

export const brands: Record<BrandId, Brand> = {
  cdw: {
    id: "cdw",
    partnerName: "CDW",
    productName: "Value session",
    mark: "CDW",
    accent: "#cc1827",
    accentDark: "#a70f1c",
    emailIntro: "We’ll keep the session practical and grounded in Heartland’s operating reality.",
    artifactIntro: "Prepared by CDW with Heartland Mutual Insurance",
    artifactClosing: "CDW will carry the evidence into the hackathon booking and keep Heartland’s operating team in control of the next step.",
    signoff: "Ravi Menon · CDW",
  },
  softwareone: {
    id: "softwareone",
    partnerName: "SoftwareOne",
    productName: "Value session",
    mark: "softwareone",
    accent: "#c84318",
    accentDark: "#c84318",
    emailIntro: "Together, we’ll turn Heartland’s operational friction into a focused, measurable pilot.",
    artifactIntro: "A SoftwareOne Value Lab brief for Heartland Mutual Insurance",
    artifactClosing: "SoftwareOne will turn this evidence into a dated hackathon while Heartland retains ownership of the operating decision.",
    signoff: "Ravi Menon · SoftwareOne",
  },
  softchoice: {
    id: "softchoice",
    partnerName: "Softchoice",
    productName: "Value session",
    mark: "softchoice",
    accent: "#6f2cff",
    accentDark: "#5420c7",
    emailIntro: "We’ll make the case practical, measurable, and ready for a customer-owned pilot decision.",
    artifactIntro: "A Softchoice business case prepared with Heartland Mutual Insurance",
    artifactClosing: "Softchoice will help Heartland validate the evidence in a three-day hackathon before either team treats the estimate as proved value.",
    signoff: "Ravi Menon · Softchoice",
  },
};
