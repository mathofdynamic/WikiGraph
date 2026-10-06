import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  FileText,
  Search,
  ChevronRight,
  GitFork,
  AlertCircle,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import { Collection, KnowledgeType } from '../types';
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
        const radius = Math.min(340, 52 * Math.sqrt(Math.max(total, 6)));

        const gNodes: GraphNode[] = filteredK.map((k, i) => {
          const angle = (i / Math.max(total, 1)) * 2 * Math.PI;
          return {
            id: k.id,
            title: k.title,
            type: k.type,
            summary: k.summary,
            collectionId: k.collectionId,
            x: 520 + radius * Math.cos(angle),
            y: 360 + radius * Math.sin(angle),
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
          x: 520 + ((i % 3) - 1) * 240,
          y: 280 + Math.floor(i / 3) * 170,
          vx: 0,
          vy: 0,
          isSource: true,
        }));

        const kNodes: GraphNode[] = kList.map((k, i) => {
          const angle = (i / Math.max(kList.length, 1)) * 2 * Math.PI;
          const r = 380;
          return {
            id: k.id,
            title: k.title,
            type: k.type,
            summary: k.summary,
            collectionId: k.collectionId,
            x: 520 + r * Math.cos(angle),
            y: 360 + r * Math.sin(angle),
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

  // Connected relationships for inspector
  const inspectorRelationships = useMemo(() => {
    if (!selectedNode) return [];
    return links
      .filter((l) => l.sourceId === selectedNode.id || l.targetId === selectedNode.id)
      .map((l) => {
        const isOrigin = l.sourceId === selectedNode.id;
        const targetId = isOrigin ? l.targetId : l.sourceId;
        const targetNode = nodes.find((n) => n.id === targetId);
        return {
          id: `${l.sourceId}-${l.targetId}-${l.relationshipType}`,
          targetNode,
          type: l.relationshipType,
          isOrigin,
        };
      })
      .filter((r) => Boolean(r.targetNode));
  }, [selectedNode, links, nodes]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).tagName === 'DIV' || (e.target as HTMLElement).tagName === 'rect') {
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

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] flex flex-col bg-[var(--background)] overflow-hidden select-none">
      {/* Floating Top Control Toolbar */}
      <div className="absolute top-3.5 start-4 end-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-md pointer-events-auto">
          {/* Mode Switcher */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)]">
            <button
              type="button"
              onClick={() => {
                setViewMode('knowledge');
                setSelectedNode(null);
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'knowledge'
                  ? 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
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
                  ? 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              Citation Provenance
            </button>
          </div>

          {/* Search in Graph */}
          <div className="relative w-36 sm:w-48">
            <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute start-2.5 top-2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search graph..."
              className="ui-input ps-8 py-1 text-xs h-8"
            />
          </div>

          {/* Collection Filter */}
          <select
            value={selectedCollection}
            onChange={(e) => setSelectedCollection(e.target.value)}
            className="ui-select text-xs h-8"
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
              className="ui-select text-xs h-8"
            >
              <option value="all">All Types</option>
              <option value="procedure">{t('types.procedure')}</option>
              <option value="skill">{t('types.skill')}</option>
              <option value="research_finding">{t('types.research_finding')}</option>
              <option value="tip">{t('types.tip')}</option>
              <option value="example">{t('types.example')}</option>
              <option value="failure">{t('types.failure')}</option>
              <option value="lesson">{t('types.lesson')}</option>
            </select>
          )}
        </div>

        {/* Right Topology Statistics */}
        <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs font-mono text-[var(--muted)] shadow-md pointer-events-auto">
          <span className="font-semibold text-[var(--foreground)]">{nodes.length}</span>
          <span>nodes</span>
          <span className="text-[var(--separator)]">•</span>
          <span className="font-semibold text-[var(--foreground)]">{links.length}</span>
          <span>edges</span>
        </div>
      </div>

      {/* Floating Bottom-End Zoom & Fit Controls */}
      <div className="absolute bottom-4 end-4 z-20 flex items-center p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-md">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))}
          className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] rounded-lg cursor-pointer transition-colors"
          title={t('graph.zoomIn')}
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
          className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] rounded-lg cursor-pointer transition-colors"
          title={t('graph.zoomOut')}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={resetView}
          className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] rounded-lg cursor-pointer transition-colors"
          title={t('graph.resetZoom')}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Bottom-Start Neutral Legend */}
      <div className="absolute bottom-4 start-4 z-20 hidden md:flex items-center gap-4 px-3.5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[11px] text-[var(--muted)] shadow-md select-none">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-[var(--border)] bg-[var(--surface)] shrink-0" />
          <span>Source Document</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] shrink-0" />
          <span>Knowledge Item</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-[var(--border)] bg-[var(--surface-secondary)] shrink-0 flex items-center justify-center">
            <span className="w-1 h-1 rounded-full bg-[var(--muted)]" />
          </span>
          <span>Core Skill / Procedure</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-[#006FEE] bg-[var(--surface-secondary)] shrink-0" />
          <span className="text-[var(--foreground)]">Selected Node</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-[var(--border)] shrink-0" />
          <span>Direct Edge</span>
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
            {/* Extremely faint neutral dot pattern */}
            <pattern id="graph-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="16" cy="16" r="0.75" fill="var(--border)" opacity="0.3" />
            </pattern>
            {/* Default neutral arrow marker */}
            <marker
              id="ui-arrow-default"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--border)" opacity="0.8" />
            </marker>
            {/* Active blue arrow marker */}
            <marker
              id="ui-arrow-active"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#006FEE" />
            </marker>
          </defs>

          {/* Neutral Background Texture */}
          <rect width="100%" height="100%" fill="url(#graph-grid)" />

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
                    stroke={isHighlighted ? '#006FEE' : 'var(--border)'}
                    strokeWidth={isHighlighted ? 2 : 1}
                    strokeDasharray={
                      link.relationshipType === 'conflicts_with' || link.relationshipType === 'cites'
                        ? '4 3'
                        : undefined
                    }
                    markerEnd={isHighlighted ? 'url(#ui-arrow-active)' : 'url(#ui-arrow-default)'}
                    opacity={connectedNodeIds.size === 0 || isHighlighted ? 0.85 : 0.15}
                  />
                  {isHighlighted && (
                    <text
                      x={midX}
                      y={midY - 4}
                      textAnchor="middle"
                      className="text-[10px] fill-[var(--accent)] font-medium select-none pointer-events-none"
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
              const isHovered = hoveredNodeId === node.id;
              const isCore = node.type === 'procedure' || node.type === 'skill';
              const opacity = connectedNodeIds.size === 0 || isConnected ? 1 : 0.2;

              const baseRadius = node.isSource ? 18 : isCore ? 14 : 12;

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
                  {/* Selection / Hover Accent Ring */}
                  {isSelected && (
                    <circle
                      r={baseRadius + 6}
                      fill="none"
                      stroke="#006FEE"
                      strokeWidth="2"
                    />
                  )}
                  {isHovered && !isSelected && (
                    <circle
                      r={baseRadius + 5}
                      fill="none"
                      stroke="var(--border)"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                  )}

                  {/* Main Node Body */}
                  <circle
                    r={baseRadius}
                    fill={isSelected ? 'var(--surface-tertiary)' : 'var(--surface-secondary)'}
                    stroke={isSelected ? '#006FEE' : 'var(--border)'}
                    strokeWidth={isSelected ? 2 : node.isSource ? 2 : 1.2}
                  />

                  {/* Core Skill center pip */}
                  {isCore && !node.isSource && (
                    <circle
                      r={2.5}
                      fill={isSelected ? '#006FEE' : 'var(--muted)'}
                    />
                  )}

                  {/* Source Document inner icon glyph */}
                  {node.isSource && (
                    <rect
                      x="-5"
                      y="-6"
                      width="10"
                      height="12"
                      rx="1"
                      fill="none"
                      stroke={isSelected ? '#006FEE' : 'var(--muted)'}
                      strokeWidth="1.2"
                    />
                  )}

                  {/* Label */}
                  <text
                    y={baseRadius + 14}
                    textAnchor="middle"
                    className={`text-[11px] select-none pointer-events-none transition-colors ${
                      isSelected
                        ? 'fill-[var(--foreground)] font-semibold'
                        : 'fill-[var(--muted)] font-normal'
                    }`}
                  >
                    {node.title.length > 24 ? `${node.title.slice(0, 22)}...` : node.title}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Empty Search Overlay */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center max-w-sm mx-4 space-y-2.5 shadow-xl pointer-events-auto">
              <AlertCircle className="w-7 h-7 text-[var(--muted)] mx-auto" />
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                No matching graph nodes
              </h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                No knowledge or source nodes match the active search or collection filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCollection('all');
                  setSelectedType('all');
                }}
                className="ui-button ui-button-secondary text-xs"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Node Inspector Sidebar */}
      {selectedNode && (
        <div className="absolute top-16 end-4 bottom-4 z-30 w-80 sm:w-96 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl p-5 flex flex-col space-y-4 overflow-y-auto animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--separator)]">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
              Node Inspector
            </span>
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="p-1 rounded text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
              title="Close inspector"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Classification & Title */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedNode.isSource ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--surface-secondary)] text-[var(--foreground)] border border-[var(--border)]">
                  <FileText className="w-3 h-3 text-[var(--muted)]" />
                  <span>Source Document</span>
                </span>
              ) : (
                <Badge type="knowledgeType" value={selectedNode.type} size="sm" />
              )}
            </div>

            <h3
              dir="auto"
              className="text-sm sm:text-base font-semibold text-[var(--foreground)] leading-snug"
            >
              {selectedNode.title}
            </h3>

            {selectedNode.summary && (
              <p
                dir="auto"
                className="text-xs text-[var(--muted)] leading-relaxed"
              >
                {selectedNode.summary}
              </p>
            )}
          </div>

          {/* Node Properties */}
          <div className="space-y-2 pt-3 border-t border-[var(--separator)] text-xs">
            <div className="text-[11px] font-medium text-[var(--muted)]">
              Topology Properties
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">Collection</span>
                <span className="font-medium text-[var(--foreground)]">
                  {collections.find((c) => c.id === selectedNode.collectionId)?.name || 'Default'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">Node ID</span>
                <span className="font-mono text-[11px] text-[var(--muted)] truncate max-w-[170px]" title={selectedNode.id}>
                  {selectedNode.id}
                </span>
              </div>
            </div>
          </div>

          {/* Connected Relationships List */}
          <div className="space-y-2.5 pt-3 border-t border-[var(--separator)] flex-1 overflow-y-auto">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-medium text-[var(--muted)] flex items-center gap-1.5">
                <GitFork className="w-3 h-3 text-[var(--muted)]" />
                <span>Connected Nodes ({inspectorRelationships.length})</span>
              </span>
            </div>

            {inspectorRelationships.length === 0 ? (
              <p className="text-xs text-[var(--muted)] italic">
                No active connections in the current graph filter.
              </p>
            ) : (
              <div className="space-y-1.5">
                {inspectorRelationships.map((rel) => {
                  if (!rel.targetNode) return null;
                  return (
                    <div
                      key={rel.id}
                      onClick={() => setSelectedNode(rel.targetNode!)}
                      className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]/50 hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer flex items-center justify-between gap-2 group text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--surface-tertiary)] text-[var(--foreground)] border border-[var(--border)] me-1.5 inline-block">
                          {rel.type}
                        </span>
                        <span className="text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors font-medium truncate block sm:inline">
                          {rel.targetNode.title}
                        </span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--accent)] shrink-0 rtl:rotate-180" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-[var(--separator)]">
            <button
              type="button"
              onClick={() => {
                if (selectedNode.isSource) {
                  navigate(`/documents/${selectedNode.id}`);
                } else {
                  navigate(`/knowledge/${selectedNode.id}`);
                }
              }}
              className="ui-button ui-button-primary text-xs w-full justify-center"
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
