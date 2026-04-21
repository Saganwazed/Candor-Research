"use client";

import type { GraphNode, GraphEdge, NodeType, EdgeRelation } from "@/lib/schema";

interface ClaimGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// SVG canvas
const W = 720;
const H = 340;
const NODE_W = 156;
const NODE_H = 42;
const R = 5;

const COL_X: Record<NodeType, number> = {
  source: 100,
  claim: 360,
  entity: 620,
};

const NODE_COLOR: Record<NodeType, { fill: string; stroke: string; text: string }> = {
  source: { fill: "#141410", stroke: "#141410", text: "#F7F6F2" },
  claim:  { fill: "#FFF7ED", stroke: "#C2410C", text: "#7C2D12" },
  entity: { fill: "#EEF2FF", stroke: "#4338CA", text: "#312E81" },
};

const EDGE_COLOR: Record<EdgeRelation, string> = {
  claims:      "#9E9B96",
  about:       "#9E9B96",
  cites:       "#9E9B96",
  supports:    "#16A34A",
  contradicts: "#DC2626",
  misleading:  "#D97706",
};

const EDGE_DASH: Partial<Record<EdgeRelation, string>> = {
  misleading: "5,3",
  contradicts: "4,2",
};

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

function computePositions(nodes: GraphNode[]): Record<string, { x: number; y: number }> {
  const cols: Record<NodeType, GraphNode[]> = { source: [], claim: [], entity: [] };
  for (const n of nodes) cols[n.type].push(n);

  const pos: Record<string, { x: number; y: number }> = {};
  const PADDING_TOP = 40;
  const USABLE_H = H - PADDING_TOP * 2;

  for (const type of ["source", "claim", "entity"] as NodeType[]) {
    const list = cols[type];
    if (!list.length) continue;
    const step = USABLE_H / list.length;
    list.forEach((n, i) => {
      pos[n.id] = {
        x: COL_X[type],
        y: PADDING_TOP + step * i + step / 2,
      };
    });
  }
  return pos;
}

function buildEdgePath(
  from: { x: number; y: number },
  to: { x: number; y: number }
): string {
  const dx = to.x - from.x;
  const sameCol = Math.abs(dx) < 20;

  if (!sameCol) {
    const startX = from.x + (dx > 0 ? NODE_W / 2 : -NODE_W / 2);
    const endX   = to.x   + (dx > 0 ? -NODE_W / 2 + 10 : NODE_W / 2 - 10);
    const midX   = (startX + endX) / 2;
    return `M ${startX} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${endX} ${to.y}`;
  }

  // Same column: arc to the right
  const dy = to.y - from.y;
  const startY = from.y + (dy > 0 ? NODE_H / 2 : -NODE_H / 2);
  const endY   = to.y   + (dy > 0 ? -NODE_H / 2 + 10 : NODE_H / 2 - 10);
  const bulge  = from.x + NODE_W / 2 + 60;
  return `M ${from.x} ${startY} C ${bulge} ${startY}, ${bulge} ${endY}, ${from.x} ${endY}`;
}

function edgeMidpoint(
  from: { x: number; y: number },
  to: { x: number; y: number }
): { x: number; y: number } {
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
}

const RELATION_LABELS: Record<EdgeRelation, string> = {
  claims:      "claims",
  about:       "about",
  contradicts: "contradicts",
  supports:    "supports",
  misleading:  "misleading",
  cites:       "cites",
};

export default function ClaimGraph({ nodes, edges }: ClaimGraphProps) {
  if (!nodes.length) return null;

  const pos = computePositions(nodes);
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <div className="claim-graph-wrapper" aria-label="Claim graph visualisation">
      {/* Column headers */}
      <div className="claim-graph-headers">
        <span style={{ width: NODE_W, textAlign: "center" }}>Sources</span>
        <span style={{ width: NODE_W, textAlign: "center" }}>Claims</span>
        <span style={{ width: NODE_W, textAlign: "center" }}>Entities</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className="claim-graph-svg"
        role="img"
        aria-label="Claim knowledge graph"
      >
        <defs>
          <marker id="arrow-gray"  markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
            <polygon points="0 0,7 2.5,0 5" fill="#9E9B96" />
          </marker>
          <marker id="arrow-green" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
            <polygon points="0 0,7 2.5,0 5" fill="#16A34A" />
          </marker>
          <marker id="arrow-red"   markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
            <polygon points="0 0,7 2.5,0 5" fill="#DC2626" />
          </marker>
          <marker id="arrow-amber" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
            <polygon points="0 0,7 2.5,0 5" fill="#D97706" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const fromPos = pos[edge.from];
          const toPos   = pos[edge.to];
          if (!fromPos || !toPos) return null;

          const color = EDGE_COLOR[edge.relation];
          const dash  = EDGE_DASH[edge.relation];
          const mid   = edgeMidpoint(fromPos, toPos);
          const path  = buildEdgePath(fromPos, toPos);

          let markerId = "arrow-gray";
          if (color === "#16A34A") markerId = "arrow-green";
          else if (color === "#DC2626") markerId = "arrow-red";
          else if (color === "#D97706") markerId = "arrow-amber";

          return (
            <g key={i}>
              <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeDasharray={dash}
                markerEnd={`url(#${markerId})`}
                opacity="0.8"
              />
              <text
                x={mid.x}
                y={mid.y - 5}
                textAnchor="middle"
                fontSize="9"
                fill={color}
                fontFamily="var(--font-sans)"
                fontWeight="500"
                letterSpacing="0.04em"
                style={{ userSelect: "none" }}
              >
                {RELATION_LABELS[edge.relation]}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const p = pos[node.id];
          if (!p) return null;
          const c = NODE_COLOR[node.type];
          const x = p.x - NODE_W / 2;
          const y = p.y - NODE_H / 2;

          return (
            <g key={node.id} role="img" aria-label={`${node.type}: ${node.label}`}>
              <rect
                x={x} y={y}
                width={NODE_W} height={NODE_H}
                rx={R} ry={R}
                fill={c.fill}
                stroke={c.stroke}
                strokeWidth="1.5"
              />
              <text
                x={p.x}
                y={p.y + 4}
                textAnchor="middle"
                fontSize="11"
                fill={c.text}
                fontFamily="var(--font-sans)"
                fontWeight="500"
              >
                {truncate(node.label, 22)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="claim-graph-legend">
        <span className="graph-legend-item graph-legend-source">Source</span>
        <span className="graph-legend-item graph-legend-claim">Claim</span>
        <span className="graph-legend-item graph-legend-entity">Entity</span>
        <span className="graph-legend-sep" />
        <span className="graph-legend-edge graph-legend-edge--green">supports</span>
        <span className="graph-legend-edge graph-legend-edge--red">contradicts</span>
        <span className="graph-legend-edge graph-legend-edge--amber">misleading</span>
      </div>

      {/* Node label index — full labels for readability */}
      <div className="claim-graph-index">
        {nodes.map((n) => (
          <div key={n.id} className="graph-index-row">
            <span className={`graph-index-badge graph-index-badge--${n.type}`}>
              {n.id}
            </span>
            <span className="graph-index-label">{n.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
