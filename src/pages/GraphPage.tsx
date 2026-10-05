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
  Search,
  Sparkles,
  Info,
  ChevronRight,
  Layers,
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
        const total = filteredK.length;
        const radius = Math.min(320, 48 * Math.sqrt(Math.max(total, 6)));

        const gNodes: GraphNode[] = filteredK.map((k, i) => {
          const angle = (i / Math.max(total, 1)) * 2 * Math.PI;
          return {
            id: k.id,
            title: k.title,
            type: k.type,
            summary: k.summary,
            collectionId: k.collectionId,
            x: 480 + radius * Math.cos(angle),
            y: 340 + radius * Math.sin(angle),
            vx: 0,
            vy: 0,
          };
        });

        const gLinks: GraphLink[] = [];
        relList.forEach((r) => {
          const src = r.sourceKnowledgeId || r.sourceId;
          const tgt = r.targetKnowledgeId || r.targetId;
          if (src && tgt && validIds.has(src) && validIds.has(tgt)) {
            gLinks.push({
              sourceId: src,
              targetId: tgt,
              relationshipType: r.relationshipType || 'supports',
              label: r.relationshipType || 'supports',
            });
          }
        });

        setNodes(gNodes);
        setLinks(gLinks);
      } else {
        // Citation View: Sources in center, Knowledge around
        const sNodes: GraphNode[] = sList.map((s, i) => ({
          id: s.id,
          title: s.title,
          type: 'source',
          collectionId: s.collectionId,
          x: 480 + (i % 3 - 1) * 220,
          y: 260 + Math.floor(i / 3) * 160,
          vx: 0,
          vy: 0,
          isSource: true,
        }));

        const kNodes: GraphNode[] = kList.map((k, i) => {
          const angle = (i / Math.max(kList.length, 1)) * 2 * Math.PI;
          const r = 360;
          return {
            id: k.id,
            title: k.title,
            type: k.type,
            summary: k.summary,
            collectionId: k.collectionId,
            x: 480 + r * Math.cos(angle),
            y: 340 + r * Math.sin(angle),
            vx: 0,
            vy: 0,
          };
        });

        const gLinks: GraphLink[] = kList.map((k) => ({
          sourceId: k.sourceId,
          targetId: k.id,
          relationshipType: 'cites',
          label: 'cites',
        }));

        setNodes([...sNodes, ...kNodes]);
        setLinks(gLinks);
      }
    };

    loadGraph();
    return () => {
      active = false;
    };
  }, [repository, version, viewMode, selectedCollection, selectedType, searchQuery]);

  // Connected nodes map
  const connectedNodeIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const set = new Set<string>([selectedNode.id]);
    links.forEach((l) => {
      if (l.sourceId === selectedNode.id) set.add(l.targetId);
      if (l.targetId === selectedNode.id) set.add(l.sourceId);
    });
    return set;
  }, [selectedNode, links]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).tagName === 'DIV') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const getNodeColor = (type: string, isSource?: boolean) => {
    if (isSource) return '#10b981'; // emerald
    switch (type) {
      case 'procedure':
        return '#006FEE'; // HeroUI Blue
      case 'research_finding':
        return '#6366f1'; // Indigo
      case 'tip':
        return '#06b6d4'; // Cyan
      case 'skill':
        return '#a855f7'; // Purple
      case 'failure':
        return '#f43f5e'; // Rose
      case 'lesson':
        return '#f59e0b'; // Amber
      default:
        return '#71717a'; // Zinc
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] flex flex-col bg-[#09090b] overflow-hidden select-none">
      
      {/* Floating Top Control Toolbar (HeroUI Glass Bar) */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        
        {/* Left Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-md shadow-lg pointer-events-auto">
          {/* Mode Switcher */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setViewMode('knowledge');
                setSelectedNode(null);
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'knowledge'
                  ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Knowledge Topology
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('citation');
                setSelectedNode(null);
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'citation'
                  ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Citation Provenance
            </button>
          </div>

          {/* Search in Graph */}
          <div className="relative w-36 sm:w-48">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute start-2.5 top-2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter graph nodes..."
              className="heroui-input ps-8 py-1 text-xs"
            />
          </div>

          {/* Collection Filter */}
          <select
            value={selectedCollection}
            onChange={(e) => setSelectedCollection(e.target.value)}
            className="heroui-select text-xs py-1"
          >
            <option value="all">All Collections</option>
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
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="heroui-select text-xs py-1"
            >
              <option value="all">All Types</option>
              <option value="procedure">Procedure</option>
              <option value="research_finding">Research Finding</option>
              <option value="tip">Tip</option>
              <option value="skill">Skill</option>
              <option value="failure">Failure</option>
              <option value="lesson">Lesson</option>
            </select>
          )}
        </div>

        {/* Right Info Chip */}
        <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-mono text-zinc-400 backdrop-blur-md shadow-lg pointer-events-auto">
          <span>{nodes.length} nodes</span>
          <span>•</span>
          <span>{links.length} relationships</span>
        </div>
      </div>

      {/* Floating Bottom-Right Zoom & Fit Controls */}
      <div className="absolute bottom-5 right-5 z-20 flex items-center p-1 rounded-xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-md shadow-xl">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg cursor-pointer"
          title={t('graph.zoomIn')}
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg cursor-pointer"
          title={t('graph.zoomOut')}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={resetView}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg cursor-pointer"
          title={t('graph.resetZoom')}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Bottom-Left Legend */}
      <div className="absolute bottom-5 left-5 z-20 hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-md text-[11px] text-zinc-400 shadow-xl">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#006FEE]" />
          <span>Procedure</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#6366f1]" />
          <span>Finding</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#10b981]" />
          <span>Source Doc</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#f43f5e]" />
          <span>Failure</span>
        </span>
      </div>

      {/* Main Graph Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing"
      >
        <svg
          className="w-full h-full"
          style={{ touchAction: 'none' }}
        >
          <defs>
            <marker
              id="heroui-arrow"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#006FEE" />
            </marker>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Graph Edges */}
            {links.map((link, idx) => {
              const src = nodeMap.get(link.sourceId);
              const tgt = nodeMap.get(link.targetId);
              if (!src || !tgt) return null;

              const isHighlighted =
                connectedNodeIds.has(link.sourceId) && connectedNodeIds.has(link.targetId);

              const midX = (src.x + tgt.x) / 2;
              const midY = (src.y + tgt.y) / 2;

              return (
                <g key={idx}>
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={isHighlighted ? '#006FEE' : '#27272a'}
                    strokeWidth={isHighlighted ? 2 : 1}
                    strokeDasharray={
                      link.relationshipType === 'conflicts_with' ? '4 3' : undefined
                    }
                    markerEnd="url(#heroui-arrow)"
                    opacity={connectedNodeIds.size === 0 || isHighlighted ? 0.9 : 0.25}
                  />
                  {isHighlighted && (
                    <text
                      x={midX}
                      y={midY - 4}
                      textAnchor="middle"
                      className="text-[10px] fill-blue-400 font-medium"
                    >
                      {link.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Graph Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isConnected = connectedNodeIds.has(node.id);
              const color = getNodeColor(node.type, node.isSource);
              const isHovered = hoveredNodeId === node.id;
              const opacity = connectedNodeIds.size === 0 || isConnected ? 1 : 0.25;

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
                  {(isSelected || isHovered) && (
                    <circle
                      r={node.isSource ? 26 : 22}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      strokeDasharray="3 3"
                    />
                  )}

                  <circle
                    r={node.isSource ? 18 : 14}
                    fill={color}
                    className="shadow-sm"
                  />

                  <text
                    y={node.isSource ? 30 : 26}
                    textAnchor="middle"
                    className="text-[11px] fill-zinc-300 font-medium select-none pointer-events-none"
                  >
                    {node.title.length > 24 ? `${node.title.slice(0, 22)}...` : node.title}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Floating Side Inspector for Selected Node */}
      {selectedNode && (
        <div className="absolute top-20 right-4 z-30 w-80 sm:w-96 rounded-xl border border-zinc-800 bg-[#18181b]/95 backdrop-blur-md p-4 space-y-3 shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Node Details
            </span>
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="text-zinc-400 hover:text-zinc-100 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <Badge type="knowledgeType" value={selectedNode.type} size="sm" />
            <h4 className="text-sm font-bold text-zinc-100 leading-snug">
              {selectedNode.title}
            </h4>
            {selectedNode.summary && (
              <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                {selectedNode.summary}
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-[11px] text-zinc-500 font-mono">
              {connectedNodeIds.size - 1} connected nodes
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
              className="heroui-btn-primary text-xs"
            >
              <span>{t('common.openDetail')}</span>
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
