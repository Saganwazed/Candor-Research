import type { AnalysisResponse } from "./schema";

/**
 * Returns a realistic mock analysis response for testing without an API key.
 * Simulates processing delay.
 */
export async function getMockAnalysis(text: string): Promise<AnalysisResponse> {
  // Simulate AI processing time
  await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 1500));

  const wordCount = text.split(/\s+/).length;

  if (wordCount < 30) {
    return {
      bias_summary: "No clear bias detected.",
      bias_direction: "Unclear",
      bias_justification:
        "The submitted text is too short to perform a meaningful bias analysis — insufficient content for pattern detection.",
      credibility_flags: [],
      hidden_agenda:
        "This article appears to present information without a strong persuasive agenda.",
      analysis_confidence: "Low",
      content_suitable: false,
    };
  }

  // Deterministic mock based on text length to give varied results
  const seed = text.length % 5;

  const mockResponses: AnalysisResponse[] = [
    {
      bias_summary: "Pro-regulation framing with lopsided sourcing favoring consumer advocates over industry.",
      bias_direction: "Center-Left",
      bias_justification:
        'The article frames regulatory intervention as a necessary correction, uses "corporate greed" without attribution, and quotes consumer advocates three times versus one industry representative.',
      credibility_flags: [
        {
          flag_type: "Missing Context",
          description:
            'The claim that "prices have risen 40% since deregulation" omits that the period includes two supply chain crises that affected all sectors regardless of regulation.',
        },
        {
          flag_type: "Loaded Language",
          description:
            'Phrases like "industry lobbyists quietly pushed" and "backroom dealings" imply corruption without providing evidence of specific improper conduct.',
        },
        {
          flag_type: "Anonymous Sourcing",
          description:
            '"Sources familiar with the negotiations" are cited for the central claim about executive compensation packages without any named confirmation.',
        },
      ],
      hidden_agenda:
        "This article wants you to feel outraged at corporate practices and supportive of increased government oversight. The framing consistently positions regulation as the solution without examining potential downsides.",
      analysis_confidence: "High",
      content_suitable: true,
    },
    {
      bias_summary: "Credits tax policy for growth while framing regulation as a jobs threat.",
      bias_direction: "Center-Right",
      bias_justification:
        'The article emphasizes economic growth figures while attributing them to tax policy, uses "job creators" to describe corporations, and frames regulatory proposals primarily as threats to employment.',
      credibility_flags: [
        {
          flag_type: "Statistical Misuse",
          description:
            "The cited employment figure compares a post-recession trough to a recovery peak, overstating the policy impact by conflating cyclical recovery with legislative effects.",
        },
        {
          flag_type: "Missing Context",
          description:
            'The article states "small businesses report record optimism" but omits that the survey sample included franchises of large corporations classified as small businesses.',
        },
      ],
      hidden_agenda:
        "The framing pushes you to conclude that economic deregulation directly caused prosperity, encouraging skepticism toward new government programs and regulatory proposals.",
      analysis_confidence: "High",
      content_suitable: true,
    },
    {
      bias_summary: "Balanced sourcing and neutral framing with one unverified cost figure.",
      bias_direction: "Center",
      bias_justification:
        "The article presents statements from both proponents and critics of the legislation with roughly equal length and framing, and uses neutral descriptors for all parties involved.",
      credibility_flags: [
        {
          flag_type: "Unverified Claim",
          description:
            'The projected cost figure of "$2.3 trillion over ten years" is attributed to an unnamed congressional analysis — no specific CBO or committee report is cited.',
        },
      ],
      hidden_agenda:
        "This article appears to present information without a strong persuasive agenda.",
      analysis_confidence: "Medium",
      content_suitable: true,
    },
    {
      bias_summary: "Advocacy framing that excludes law enforcement perspectives entirely.",
      bias_direction: "Left",
      bias_justification:
        'The article exclusively quotes civil rights organizations and uses emotive phrases like "systemic injustice" and "communities under siege" while omitting law enforcement perspectives entirely.',
      credibility_flags: [
        {
          flag_type: "Missing Context",
          description:
            "The cited statistic about arrest disparities does not control for crime rates by neighborhood, which multiple sociological studies identify as a significant variable.",
        },
        {
          flag_type: "Loaded Language",
          description:
            'Describing policy as "state-sanctioned violence" throughout the article uses an advocacy frame rather than a journalistic one, prejudging the policy outcome.',
        },
        {
          flag_type: "Anonymous Sourcing",
          description:
            '"A senior official who spoke on condition of anonymity" provides the only rebuttal to the main claim, undermining its weight compared to named advocate sources.',
        },
        {
          flag_type: "False Balance",
          description:
            "The single paragraph presenting an alternative view is placed at the end after twelve paragraphs of advocacy framing, structurally minimizing its impact.",
        },
      ],
      hidden_agenda:
        "This article wants you to feel moral urgency about systemic reform and to view opposition to the proposed changes as complicity in harm.",
      analysis_confidence: "High",
      content_suitable: true,
    },
    {
      bias_summary: "Frames immigration as a security crisis using unverified threat claims.",
      bias_direction: "Right",
      bias_justification:
        'The article frames immigration primarily as a security threat, uses "illegal aliens" rather than neutral terminology, and cites border patrol union representatives as objective sources.',
      credibility_flags: [
        {
          flag_type: "Unverified Claim",
          description:
            'The assertion that "known terrorists were apprehended at the border last month" cites no official source and conflicts with published DHS encounter data.',
        },
        {
          flag_type: "Missing Context",
          description:
            "Economic studies showing net positive fiscal impact of immigration are absent, presenting only cost estimates from a single restrictionist think tank.",
        },
        {
          flag_type: "Loaded Language",
          description:
            'Repeated use of "invasion," "flood," and "crisis" frames migration in military terms that presuppose a threat conclusion.',
        },
      ],
      hidden_agenda:
        "The framing pushes you to conclude that current border policy is a dangerous failure, building support for restrictive enforcement measures by emphasizing fear over data.",
      analysis_confidence: "High",
      content_suitable: true,
    },
  ];

  return mockResponses[seed];
}
