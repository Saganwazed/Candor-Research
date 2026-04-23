"use client";

import type { GraphNode, GraphEdge, NodeType, EdgeRelation } from "@/lib/schema";

interface ClaimGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const NODE_W = 140;
const NODE_H = 36;
const R = 4;
const PADDING_Y = 40;
const PADDING_X = 60;
const LAYER_GAP = 80;
const NODE_GAP_X = 60;

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

const RELATION_LABELS: Record<EdgeRelation, string> = {
  claims:      "claims",
  about:       "about",
  contradicts: "contradicts",
  supports:    "supports",
  misleading:  "misleading",
  cites:       "cites",
};

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

interface Position { x: number; y: number }

function computeHierarchicalLayout(
  nodes: GraphNode[],
  edges: GraphEdge[]
): Record<string, Position> {
  const pos: Record<string, Position> = {};
  const claimNodes = nodes.filter(n => n.type === "claim");
  const sourceNodes = nodes.filter(n => n.type === "source");
  const entityNodes = nodes.filter(n => n.type === "entity");

  if (!claimNodes.length) {
    // Fallback: if no claims, just spread all nodes
    const allNodes = nodes;
    allNodes.forEach((n, i) => {
      pos[n.id] = {
        x: PADDING_X + (i % 3) * NODE_GAP_X * 2,
        y: PADDING_Y + Math.floor(i / 3) * LAYER_GAP,
      };
    });
    return pos;
  }

  // Build adjacency to find claim relationships
  const claimAdj: Record<string, Set<string>> = {};
  claimNodes.forEach(c => { claimAdj[c.id] = new Set(); });
  edges.forEach(e => {
    if (claimAdj[e.from] && claimAdj[e.to]) {
      claimAdj[e.from].add(e.to);
      claimAdj[e.to].add(e.from);
    }
  });

  // Identify primary claim (most connections or least contradicted)
  let primaryClaimId = claimNodes[0].id;
  let maxConnections = 0;
  claimNodes.forEach(c => {
    const connCount = claimAdj[c.id].size;
    if (connCount >= maxConnections) {
      maxConnections = connCount;
      primaryClaimId = c.id;
    }
  });

  // Layer claims: primary at layer 0, others at layer 1+
  const claimLayers: Record<string, number> = {};
  claimLayers[primaryClaimId] = 0;
  const visited = new Set([primaryClaimId]);

  // BFS to assign layers
  const queue = [primaryClaimId];
  let layer = 1;
  while (queue.length > 0 && layer <= 2) {
    const nextQueue = [];
    for (const cid of queue) {
      claimAdj[cid].forEach(neighbor => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          claimLayers[neighbor] = layer;
          nextQueue.push(neighbor);
        }
      });
    }
    queue.splice(0);
    queue.push(...nextQueue);
    layer++;
  }

  // Position claims in layers
  const claimsByLayer: Record<number, GraphNode[]> = {};
  claimNodes.forEach(c => {
    const l = claimLayers[c.id] ?? 1;
    if (!claimsByLayer[l]) claimsByLayer[l] = [];
    claimsByLayer[l].push(c);
  });

  const maxLayerY = Math.max(...Object.keys(claimsByLayer).map(Number));
  const maxNodesInLayer = Math.max(...Object.values(claimsByLayer).map(arr => arr.length));
  const totalWidth = Math.max(320, maxNodesInLayer * (NODE_W + NODE_GAP_X));

  // Position each claim
  for (let ly = 0; ly <= maxLayerY; ly++) {
    const claimsInLayer = claimsByLayer[ly] || [];
    const y = PADDING_Y + ly * LAYER_GAP;
    const baseX = (totalWidth - claimsInLayer.length * (NODE_W + NODE_GAP_X)) / 2;

    claimsInLayer.forEach((c, i) => {
      pos[c.id] = { x: baseX + i * (NODE_W + NODE_GAP_X) + NODE_W / 2, y };
    });
  }

  // Position sources: find which claim each source makes, position below that claim
  sourceNodes.forEach(source => {
    const claimsMade = edges
      .filter(e => e.from === source.id && e.to in claimLayers)
      .map(e => e.to);

    if (claimsMade.length > 0) {
      const claimId = claimsMade[0];
      const claimPos = pos[claimId];
      const claimY = claimsByLayer[claimLayers[claimId]]?.[0]?.id === claimId
        ? claimPos.y
        : PADDING_Y;
      const sourceY = claimY + LAYER_GAP * (maxLayerY + 1) / (maxLayerY + 2);

      // Spread sources below their claims
      const claimsSourced = sourceNodes.filter(s =>
        edges.some(e => e.from === s.id && claimsMade.includes(e.to))
      );
      const srcIdx = claimsSourced.indexOf(source);
      const srcBaseX = claimPos.x - ((claimsSourced.length - 1) * NODE_GAP_X) / 2;

      pos[source.id] = {
        x: srcBaseX + srcIdx * NODE_GAP_X,
        y: sourceY,
      };
    } else {
      // Fallback: position sources at bottom left
      const srcIdx = sourceNodes.indexOf(source);
      pos[source.id] = {
        x: PADDING_X + srcIdx * NODE_GAP_X,
        y: PADDING_Y + (maxLayerY + 2) * LAYER_GAP,
      };
    }
  });

  // Position entities: to the right of claims they relate to
  entityNodes.forEach(entity => {
    const relatedClaims = edges
      .filter(e => (e.from === entity.id || e.to === entity.id) && claimLayers[e.from] !== undefined)
      .map(e => (e.from === entity.id ? e.to : e.from));

    if (relatedClaims.length > 0) {
      const claimId = relatedClaims[0];
      const claimPos = pos[claimId];
      pos[entity.id] = {
        x: claimPos.x + 220,
        y: claimPos.y,
      };
    } else {
      const entIdx = entityNodes.indexOf(entity);
      pos[entity.id] = {
        x: totalWidth - PADDING_X + entIdx * NODE_GAP_X,
        y: PADDING_Y,
      };
    }
  });

  return pos;
}

function buildEdgePath(
  from: Position,
  to: Position
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  const startX = from.x + (dx > 0 ? NODE_W / 2 : -NODE_W / 2);
  const endX = to.x + (dx > 0 ? -NODE_W / 2 + 10 : NODE_W / 2 - 10);
  const startY = from.y;
  const endY = to.y;

  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const controlX = midX + dx * 0.15;

  return `M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`;
}

function edgeMidpoint(from: Position, to: Position): Position {
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 + 20 };
}

export default function ClaimGraph({ nodes, edges }: ClaimGraphProps) {
  if (!nodes.length) return null;

  const pos = computeHierarchicalLayout(nodes, edges);
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));

  // Compute SVG bounds
  const xPos = Object.values(pos).map(p => p.x);
  const yPos = Object.values(pos).map(p => p.y);
  const minX = Math.min(...xPos) - NODE_W / 2 - 20;
  const maxX = Math.max(...xPos) + NODE_W / 2 + 20;
  const minY = Math.min(...yPos) - NODE_H / 2 - 20;
  const maxY = Math.max(...yPos) + NODE_H / 2 + 20;
  const W = maxX - minX;
  const H = maxY - minY;

  // Adjust positions to viewport
  const adjustPos = (p: Position) => ({
    x: p.x - minX,
    y: p.y - minY,
  });

  return (
    <div className="claim-graph-wrapper" aria-label="Claim graph visualisation">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className="claim-graph-svg"
        role="img"
        aria-label="Claim knowledge graph"
        style={{ minHeight: "360px" }}
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
          const toPos = pos[edge.to];
          if (!fromPos || !toPos) return null;

          const adjFrom = adjustPos(fromPos);
          const adjTo = adjustPos(toPos);
          const color = EDGE_COLOR[edge.relation];
          const dash = EDGE_DASH[edge.relation];
          const mid = edgeMidpoint(adjFrom, adjTo);
          const path = buildEdgePath(adjFrom, adjTo);

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
                y={mid.y}
                textAnchor="middle"
                fontSize="8"
                fill={color}
                fontFamily="var(--font-sans)"
                fontWeight="500"
                letterSpacing="0.04em"
                style={{ userSelect: "none", pointerEvents: "none" }}
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
          const ap = adjustPos(p);
          const c = NODE_COLOR[node.type];
          const x = ap.x - NODE_W / 2;
          const y = ap.y - NODE_H / 2;

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
                x={ap.x}
                y={ap.y + 5}
                textAnchor="middle"
                fontSize="11"
                fill={c.text}
                fontFamily="var(--font-sans)"
                fontWeight="500"
              >
                {truncate(node.label, 18)}
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

      {/* Node label index */}
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
