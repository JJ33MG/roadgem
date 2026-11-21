type Props = { placeId?: string; rating?: number; reviews?: number };

/** The line that shows a gem is a real place: found on Google, with its rating and how many people rated it. */
export function gemProofText({ placeId, rating, reviews }: Props): string | null {
  if (!placeId || !rating) return null;
  return reviews ? `Real place, rated ${rating.toFixed(1)} by ${reviews.toLocaleString('en')} Google reviewers` : `Real place, rated ${rating.toFixed(1)} on Google`;
}

export function GemProof(props: Props) {
  const text = gemProofText(props);
  if (!text) return null;
  return (
    <span className="inline-flex items-center gap-8 text-[16px] text-accent" style={{ fontWeight: 500 }}>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {text}
    </span>
  );
}
