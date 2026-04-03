"use client";

interface ConversionFooterProps {
  ctaUrl?: string;
}

export default function ConversionFooter({
  ctaUrl = "/",
}: ConversionFooterProps) {
  return (
    <div className="conversion-footer" id="conversion-footer">
      <h2 className="conversion-heading">See something others missed?</h2>
      <p className="conversion-body">
        Candor analyzes any news article for bias, credibility issues, and
        hidden agendas — in under 10 seconds.
      </p>
      <a
        href={ctaUrl}
        className="btn-primary conversion-cta"
        id="btn-conversion-cta"
      >
        Analyze your own article
      </a>
      <p className="conversion-sublabel">Free · No sign-up required</p>
    </div>
  );
}
