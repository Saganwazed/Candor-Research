"use client";

import { GraphNode, GraphEdge } from "@/lib/claim-verification-schema";

interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface Props {
  graph: Graph;
}

export default function ClaimGraphVisualization({ graph }: Props) {
  if (!graph.nodes || graph.nodes.length === 0) {
    return (
      <div className="text-sm text-black/60 italic">
        No graph data available.
      </div>
    );
  }

  const nodeTypeColors: Record<string, string> = {
    claim: "bg-blue-100 text-blue-900 border-blue-300",
    source: "bg-green-100 text-green-900 border-green-300",
    entity: "bg-purple-100 text-purple-900 border-purple-300",
    evidence: "bg-yellow-100 text-yellow-900 border-yellow-300",
  };

  const edgeTypeLabels: Record<string, string> = {
    claims: "claims",
    about: "about",
    supports: "supports ✓",
    contradicts: "contradicts ✗",
    related_to: "related",
    evidence_for: "evidence",
  };

  return (
    <div className="border border-black/10 rounded p-4 bg-black/2">
      <div className="text-xs text-black/60 mb-4">
        Graph visualization showing {graph.nodes.length} entities and{" "}
        {graph.edges.length} relationships.
      </div>

      <div className="space-y-4">
        {/* Nodes */}
        <div>
          <h3 className="text-xs font-medium text-black/70 mb-2">Entities</h3>
          <div className="grid grid-cols-1 gap-2">
            {graph.nodes.map((node) => (
              <div
                key={node.id}
                className={`p-2 rounded border text-xs ${
                  nodeTypeColors[node.type] ||
                  "bg-gray-100 text-gray-900 border-gray-300"
                }`}
              >
                <div className="font-medium flex items-center gap-2">
                  <span className="capitalize text-xs opacity-70">
                    {node.type}
                  </span>
                  {node.confidence !== undefined && (
                    <span className="text-xs opacity-70">
                      {node.confidence}%
                    </span>
                  )}
                </div>
                <div className="mt-1">{node.label}</div>
                {node.description && (
                  <div className="text-xs opacity-80 mt-1">
                    {node.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Edges */}
        {graph.edges.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-black/70 mb-2">
              Relationships
            </h3>
            <div className="space-y-1 text-xs">
              {graph.edges.map((edge, idx) => {
                const sourceNode = graph.nodes.find((n) => n.id === edge.source);
                const targetNode = graph.nodes.find((n) => n.id === edge.target);
                return (
                  <div key={idx} className="text-black/60 py-1">
                    <span className="font-medium">
                      {sourceNode?.label || edge.source}
                    </span>
                    <span className="mx-2">
                      {edgeTypeLabels[edge.type] || edge.type}
                    </span>
                    <span className="font-medium">
                      {targetNode?.label || edge.target}
                    </span>
                    {edge.label && (
                      <span className="ml-2 italic opacity-70">
                        ({edge.label})
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-black/10">
        <div className="text-xs text-black/60">
          <p className="mb-2">
            <strong>Legend:</strong>
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(nodeTypeColors).map(([type, colors]) => (
              <div key={type} className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${colors.split(" ")[0]}`}
                ></span>
                <span className="capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
