import { ImageResponse } from "next/og";
import { getSharedReport } from "@/lib/share";

export const runtime = "nodejs";

const POSITION_MAP: Record<string, number> = {
  Left: 4,
  "Center-Left": 28,
  Center: 50,
  "Center-Right": 72,
  Right: 96,
  Unclear: 50,
};

export async function GET(
  _request: Request,
  { params }: { params: { share_id: string } }
) {
  const report = await getSharedReport(params.share_id);
  if (!report) {
    return new Response("Not found", { status: 404 });
  }

  const snapshot = report.report_snapshot;
  const position = POSITION_MAP[snapshot.bias_direction] ?? 50;
  const flagCount = snapshot.credibility_flags.length;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#F7F6F2",
          padding: "60px 72px",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: "36px",
              fontWeight: 700,
              color: "#141410",
              letterSpacing: "-0.02em",
            }}
          >
            Candor
          </div>
          <div
            style={{
              fontSize: "18px",
              color: "#9E9B96",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            candor.app
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: "100%",
            height: "1px",
            backgroundColor: "#DDD9D2",
            marginTop: "20px",
          }}
        />

        {/* Bias Summary */}
        <div
          style={{
            fontSize: "32px",
            fontWeight: 700,
            color: "#141410",
            lineHeight: 1.3,
            marginTop: "24px",
            display: "flex",
            maxHeight: "130px",
            overflow: "hidden",
          }}
        >
          &ldquo;{snapshot.bias_summary.slice(0, 160)}&rdquo;
        </div>

        {/* Spectrum Bar */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "14px",
              color: "#9E9B96",
              fontFamily: "system-ui, sans-serif",
              marginBottom: "8px",
            }}
          >
            <span>Left</span>
            <span>Right</span>
          </div>
          <div
            style={{
              display: "flex",
              position: "relative",
              width: "100%",
              height: "8px",
              backgroundColor: "#DDD9D2",
              borderRadius: "4px",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "20px",
                height: "20px",
                backgroundColor: "#141410",
                borderRadius: "50%",
                top: "-6px",
                left: `calc(${position}% - 10px)`,
              }}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: "flex",
            gap: "32px",
            marginTop: "28px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: "#141410",
              }}
            >
              {snapshot.bias_direction}
            </span>
            <span style={{ fontSize: "16px", color: "#6B6860" }}>
              bias detected
            </span>
          </div>
          <div
            style={{
              width: "1px",
              height: "28px",
              backgroundColor: "#DDD9D2",
              alignSelf: "center",
            }}
          />
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: "#141410",
              }}
            >
              {flagCount}
            </span>
            <span style={{ fontSize: "16px", color: "#6B6860" }}>
              credibility {flagCount === 1 ? "flag" : "flags"}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: "100%",
            height: "1px",
            backgroundColor: "#DDD9D2",
            marginTop: "auto",
          }}
        />

        {/* CTA Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "20px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <span style={{ fontSize: "16px", color: "#6B6860" }}>
            Analyze your own article →
          </span>
          <span
            style={{
              fontSize: "16px",
              fontWeight: 500,
              color: "#141410",
            }}
          >
            candor.app
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    }
  );
}
