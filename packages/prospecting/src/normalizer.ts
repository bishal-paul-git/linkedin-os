import type { ProspectCandidate } from "../../core/src/index.ts";

function clean(value?: string | null): string | null {
  const text=value?.trim();
  return text ? text : null;
}

export function normalizeLinkedInProfileUrl(value?: string | null): string | null {
  const raw=clean(value);
  if(!raw)return null;
  try{
    const withProtocol=/^https?:\/\//i.test(raw)?raw:"https://"+raw;
    const url=new URL(withProtocol);
    const host=url.hostname.toLowerCase().replace(/^www\./,"");
    if(host!=="linkedin.com"||!url.pathname.toLowerCase().startsWith("/in/"))return null;
    url.protocol="https:";
    url.hostname="www.linkedin.com";
    url.search="";
    url.hash="";
    url.pathname=url.pathname.replace(/\/+$/,"");
    return url.toString().replace(/\/$/,"");
  }catch{
    return null;
  }
}

export function normalizeProspectCandidate(candidate: ProspectCandidate): ProspectCandidate {
  const name=clean(candidate.name);
  if(!name)throw new Error("Prospect candidate name is required.");
  return {
    externalId:clean(candidate.externalId),
    name,
    roleTitle:clean(candidate.roleTitle),
    company:clean(candidate.company),
    location:clean(candidate.location),
    linkedInUrl:normalizeLinkedInProfileUrl(candidate.linkedInUrl),
    reason:clean(candidate.reason),
    evidence:candidate.evidence??{},
    rawData:candidate.rawData??{},
  };
}

export function prospectIdentityKey(candidate: ProspectCandidate): string {
  const normalized=normalizeProspectCandidate(candidate);
  if(normalized.linkedInUrl)return "linkedin:"+normalized.linkedInUrl.toLowerCase();
  if(normalized.externalId)return "external:"+normalized.externalId.toLowerCase();
  return "fallback:"+[
    normalized.name,
    normalized.company??"",
    normalized.roleTitle??"",
  ].map(v=>v.toLowerCase().trim()).join("|");
}
