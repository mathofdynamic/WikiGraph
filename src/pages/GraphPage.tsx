import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  ExternalLink,
  X,
  FileText,
  Lightbulb,
  Search,
  Sparkles,
  Info,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import { Collection, KnowledgeItem, KnowledgeType, SourceDocument } from '../types';
import { Badge } from '../components/common/Badge';

interface GraphNode {
  id: string;
  title: string;
  type: KnowledgeType | 'source';
  summary?: string;
  collectionId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isSource?: boolean;
}

interface GraphLink {
  sourceId: string;
  targetId: string;
  relationshipType: string;
  label: string;
}

export const GraphPage: React.FC = () => {
  const { repository, version } = useRepository();
  const { t, locale } = useLocale();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<'knowledge' | 'citation'>('knowledge');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<KnowledgeType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // SVG Pan & Zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Load Graph Data
  useEffect(() => {
    let active = true;

    const loadGraph = async () => {
      const [kList, sList, cols, relList] = await Promise.all([
        repository.listKnowledge(),
        repository.listSources(),
        repository.listCollections(),
        repository.listRelationships(),
      ]);

      if (!active) return;
      setCollections(cols);

      if (viewMode === 'knowledge') {
        // Filter knowledge items
        let filteredK = kList;
        if (selectedCollection !== 'all') {
          filteredK = filteredK.filter((k) => k.collectionId === selectedCollection);
        }
        if (selectedType !== 'all') {
          filteredK = filteredK.filter((k) => k.type === selectedType);
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          filteredK = filteredK.filter(
            (k) => k.title.toLowerCase().includes(q) || k.summary.toLowerCase().includes(q)
          );
        }

        const validIds = new Set(filteredK.map((k) => k.id));

        // Circular / organic initial layout
        const total = filteredK.length;
        const radius = Math.min(320, 45 * Math.sqrt(Math.max(total, 6)));
        const centerX = 400;
        const centerY = 300;

        const calculatedNodes: GraphNode[] = filteredK.map((k, i) => {
          const angle = (i / Math.max(total, 1)) * 2 * Math.PI;
          return {
            id: k.id,
            title: k.title,
            type: k.type,
            summary: k.summary,
            collectionId: k.collectionId,
            x: centerX + radius * Math.cos(angle) + (Math.sin(i * 3) * 20),
            y: centerY + radius * Math.sin(angle) + (Math.cos(i * 3) * 20),
            vx: 0,
            vy: 0,
          };
        });

        // Extract Links
        const calculatedLinks: GraphLink[] = [];
        relList.forEach((rel) => {
          const sId = rel.sourceId || rel.sourceKnowledgeId;
          const tId = rel.targetId || rel.targetKnowledgeId;
          const rType = rel.relationshipType || rel.type || 'supports';
          if (sId && tId && validIds.has(sId) && validIds.has(tId)) {
            calculatedLinks.push({
              sourceId: sId,
              targetId: tId,
              relationshipType: String(rType),
              label: t(`relationships.${String(rType)}`),
            });
          }
        });

        setNodes(calculatedNodes);
        setLinks(calculatedLinks);
      } else {
        // Citation Map View: Sources in outer ring, Knowledge items linked to their sources
        let filteredK = kList;
        let filteredS = sList;

        if (selectedCollection !== 'all') {
          filteredK = filteredK.filter((k) => k.collectionId === selectedCollection);
          filteredS = filteredS.filter((s) => s.collectionId === selectedCollection);
        }

        const calculatedNodes: GraphNode[] = [];
        const calculatedLinks: GraphLink[] = [];

        // Sources circle
        const sTotal = filteredS.length;
        const sRadius = 260;
        filteredS.forEach((s, idx) => {
          const angle = (idx / Math.max(sTotal, 1)) * 2 * Math.PI;
          calculatedNodes.push({
            id: s.id,
            title: s.title,
            type: 'source',
            summary: s.filename,
            collectionId: s.collectionId,
            x: 400 + sRadius * Math.cos(angle),
            y: 300 + sRadius * Math.sin(angle),
            vx: 0,
            vy: 0,
            isSource: true,
          });
        });

        // Knowledge items inner circle
        const kTotal = filteredK.length;
        const kRadius = 140;
        filteredK.forEach((k, idx) => {
          const angle = (idx / Math.max(kTotal, 1)) * 2 * Math.PI;
          calculatedNodes.push({
            id: k.id,
            title: k.title,
            type: k.type,
            summary: k.summary,
            collectionId: k.collectionId,
            x: 400 + kRadius * Math.cos(angle),
            y: 300 + kRadius * Math.sin(angle),
            vx: 0,
            vy: 0,
          });

          // Link to source
          calculatedLinks.push({
            sourceId: k.sourceId,
            targetId: k.id,
            relationshipType: 'derived_from',
            label: 'Extracted from',
          });
        });

        setNodes(calculatedNodes);
        setLinks(calculatedLinks);
      }
    };

    loadGraph();
    return () => {
      active = false;
    };
  }, [repository, version, viewMode, selectedCollection, selectedType, searchQuery, t]);

  // Color lookup for node types (Linear palette)
  const getNodeColor = (type: string, isSource?: boolean) => {
    if (isSource) return '#3b82f6'; // Blue for source documents
    switch (type) {
      case 'procedure':
        return '#5e6ad2'; // Lavender-indigo
      case 'research_finding':
        return '#828fff'; // Bright lavender
      case 'tip':
        return '#10b981'; // Emerald
      case 'skill':
        return '#06b6d4'; // Cyan
      case 'example':
        return '#8a8f98'; // Neutral
      case 'failure':
        return '#f43f5e'; // Rose
      case 'lesson':
        return '#f59e0b'; // Amber
      default:
        return '#5e6ad2';
    }
  };

  // Node Map for fast coordinate lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Connected nodes set for highlight
  const connectedNodeIds = useMemo(() => {
    if (!hoveredNodeId && !selectedNode) return new Set<string>();
    const activeId = hoveredNodeId || selectedNode?.id;
    const set = new Set<string>();
    set.add(activeId!);
    links.forEach((l) => {
      if (l.sourceId === activeId) set.add(l.targetId);
      if (l.targetId === activeId) set.add(l.sourceId);
    });
    return set;
  }, [hoveredNodeId, selectedNode, links]);

  // Pan & Zoom controls
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-[#010102]">
      {/* Top Toolbar */}
      <div className="px-4 sm:px-6 py-3 border-b border-[#23252a] bg-[#0f1011] flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center p-0.5 rounded-md bg-[#141516] border border-[#23252a] text-xs">
            <button
              type="button"
              onClick={() => setViewMode('knowledge')}
              className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                viewMode === 'knowledge'
                  ? 'bg-[#1b1c1d] text-[#f7f8f8] border border-[#2e3036]'
                  : 'text-[#8a8f98] hover:text-[#f7f8f8]'
              }`}
            >
              {t('graph.viewKnowledge')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('citation')}
              className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                viewMode === 'citation'
                  ? 'bg-[#1b1c1d] text-[#f7f8f8] border border-[#2e3036]'
                  : 'text-[#8a8f98] hover:text-[#f7f8f8]'
              }`}
            >
              {t('graph.viewCitation')}
            </button>
          </div>

          {/* Collection Filter */}
          <select
            value={selectedCollection}
            onChange={(e) => setSelectedCollection(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
          >
            <option value="all">{t('library.allCollections')}</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {locale === 'fa' ? c.nameFa : c.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          {viewMode === 'knowledge' && (
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as KnowledgeType | 'all')}
              className="px-2.5 py-1 text-xs rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
            >
              <option value="all">{t('library.allTypes')}</option>
              <option value="procedure">{t('types.procedure')}</option>
              <option value="research_finding">{t('types.research_finding')}</option>
              <option value="tip">{t('types.tip')}</option>
              <option value="skill">{t('types.skill')}</option>
              <option value="example">{t('types.example')}</option>
              <option value="failure">{t('types.failure')}</option>
              <option value="lesson">{t('types.lesson')}</option>
            </select>
          )}
        </div>

        {/* Zoom & Centering controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8a8f98] absolute start-2.5 top-2 pointer-events-none" />
            <input
              type="text"
              dir="auto"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('graph.searchNodes')}
              className="ps-8 pe-3 py-1 text-xs rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder-[#62666d] w-36 sm:w-48 focus:outline-none focus:border-[#5e6ad2]"
            />
          </div>

          <div className="flex items-center rounded-md border border-[#23252a] bg-[#141516] p-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))}
              className="p-1.5 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#1b1c1d] rounded cursor-pointer"
              title={t('graph.zoomIn')}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
              className="p-1.5 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#1b1c1d] rounded cursor-pointer"
              title={t('graph.zoomOut')}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={resetView}
              className="p-1.5 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#1b1c1d] rounded cursor-pointer"
              title={t('graph.reset')}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
      >
        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-[#8a8f98]">
            <div>
              <Network className="w-10 h-10 mx-auto mb-2 text-[#62666d]" />
              <p className="text-sm font-medium">{t('graph.noNodes')}</p>
            </div>
          </div>
        ) : (
          <svg
            className="w-full h-full"
            style={{
              touchAction: 'none',
            }}
          >
            <defs>
              {/* Arrow marker for directional relationship edges */}
              <marker
                id="graph-arrow"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#5e6ad2" />
              </marker>
            </defs>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Edges */}
              {links.map((link, idx) => {
                const src = nodeMap.get(link.sourceId);
                const tgt = nodeMap.get(link.targetId);
                if (!src || !tgt) return null;

                const isHighlighted =
                  connectedNodeIds.has(link.sourceId) && connectedNodeIds.has(link.targetId);

                // Midpoint for text label
                const midX = (src.x + tgt.x) / 2;
                const midY = (src.y + tgt.y) / 2;

                return (
                  <g key={idx} className="transition-opacity">
                    <line
                      x1={src.x}
                      y1={src.y}
                      x2={tgt.x}
                      y2={tgt.y}
                      stroke={isHighlighted ? '#5e6ad2' : '#23252a'}
                      strokeWidth={isHighlighted ? 2 : 1}
                      strokeDasharray={
                        link.relationshipType === 'conflicts_with' ? '4 3' : undefined
                      }
                      markerEnd="url(#graph-arrow)"
                      opacity={connectedNodeIds.size === 0 || isHighlighted ? 0.9 : 0.25}
                    />
                    {isHighlighted && (
                      <text
                        x={midX}
                        y={midY - 4}
                        textAnchor="middle"
                        className="text-[9px] fill-[#828fff] font-medium"
                      >
                        {link.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const isConnected = connectedNodeIds.has(node.id);
                const color = getNodeColor(node.type, node.isSource);
                const isHovered = hoveredNodeId === node.id;

                const opacity =
                  connectedNodeIds.size === 0 || isConnected ? 1 : 0.25;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer transition-transform"
                    style={{ opacity }}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(node);
                    }}
                  >
                    {/* Ring highlight if selected or connected */}
                    {(isSelected || isHovered) && (
                      <circle
                        r={node.isSource ? 26 : 22}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeDasharray="3 3"
                        className="animate-spin-slow"
                      />
                    )}

                    {/* Node circle */}
                    <circle
                      r={node.isSource ? 18 : 14}
                      fill={color}
                      className="shadow-sm transition-all hover:scale-110"
                    />

                    {/* Node Label text */}
                    <text
                      y={node.isSource ? 30 : 26}
                      textAnchor="middle"
                      className="text-[11px] font-medium fill-[#d0d6e0] pointer-events-none select-none max-w-28"
                    >
                      {node.title.length > 20 ? `${node.title.slice(0, 18)}…` : node.title}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {/* Node Inspector Side Panel */}
        {selectedNode && (
          <div className="absolute top-4 end-4 w-80 sm:w-96 rounded-xl border border-[#23252a] bg-[#0f1011]/95 backdrop-blur-md shadow-2xl p-5 space-y-3.5 z-20">
            <div className="flex items-center justify-between pb-2 border-b border-[#23252a]">
              <span className="text-[11px] uppercase tracking-wider text-[#8a8f98]">
                {selectedNode.isSource ? t('library.tabSources') : t('library.tabKnowledge')}
              </span>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded text-[#8a8f98] hover:text-[#f7f8f8] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {!selectedNode.isSource && (
                <Badge type="knowledgeType" value={selectedNode.type} size="sm" />
              )}
              <h4
                dir="auto"
                className="text-base font-semibold tracking-title text-[#f7f8f8] leading-snug"
              >
                {selectedNode.title}
              </h4>
              {selectedNode.summary && (
                <p dir="auto" className="text-xs text-[#8a8f98] leading-relaxed">
                  {selectedNode.summary}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-[#23252a] flex items-center justify-between">
              <span className="text-xs text-[#8a8f98]">
                {links.filter(
                  (l) => l.sourceId === selectedNode.id || l.targetId === selectedNode.id
                ).length}{' '}
                {t('knowledgeDetail.relationships')}
              </span>

              <button
                type="button"
                onClick={() => {
                  if (selectedNode.isSource) {
                    navigate(`/documents/${selectedNode.id}`);
                  } else {
                    navigate(`/knowledge/${selectedNode.id}`);
                  }
                }}
                className="linear-btn-primary text-xs gap-1.5"
              >
                <span>{t('common.openDetail')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
