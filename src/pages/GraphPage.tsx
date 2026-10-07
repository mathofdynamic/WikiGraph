import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitFork,
  Search,
  Filter,
  Maximize2,
  Minimize2,
  RotateCcw,
  Layers,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  X,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useRepository } from '../services/RepositoryContext';
import { useLocale } from '../locales/useLocale';
import {
  Collection,
  KnowledgeItem,
  KnowledgeRelationship,
  KnowledgeType,
  RelationshipType,
} from '../types';
import { Badge } from '../components/common/Badge';

interface GraphNode {
  id: string;
  item: KnowledgeItem;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: KnowledgeRelationship;
}

const TYPE_COLORS: Record<KnowledgeType, string> = {
  procedure: '#0284c7', // sky
  research_finding: '#059669', // emerald
  tip: '#d97706', // amber
  skill: '#7c3aed', // violet
  example: '#2563eb', // blue
  failure: '#e11d48', // rose
  lesson: '#4f46e5', // indigo
};

const RELATION_STYLES: Record<RelationshipType, { stroke: string; dash?: string }> = {
  supports: { stroke: '#059669' },
  conflicts_with: { stroke: '#dc2626', dash: '4,4' },
  prerequisite_for: { stroke: '#7c3aed' },
  complements: { stroke: '#0284c7' },
  supersedes: { stroke: '#ea580c', dash: '3,3' },
  alternative_to: { stroke: '#64748b', dash: '2,2' },
  derived_from: { stroke: '#0891b2' },
  relates_to: { stroke: '#64748b' },
  requires: { stroke: '#7c3aed' },
};

export const GraphPage: React.FC = () => {
  const { repository, version } = useRepository();
  const { t, locale } = useLocale();
  const navigate = useNavigate();

  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([]);
  const [relationshipsList, setRelationshipsList] = useState<KnowledgeRelationship[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('all');
  const [selectedRelationType, setSelectedRelationType] = useState<string>('all');
  const [showRetired, setShowRetired] = useState(false);

  // Interaction
  const [hoveredNode, setHoveredNode] = useState<{ node: GraphNode; screenX: number; screenY: number } | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<{ edge: GraphEdge; screenX: number; screenY: number } | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Zoom & Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Load data
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const [kItems, rels, cols] = await Promise.all([
          repository.listKnowledge({ includeRetired: showRetired }),
          repository.listRelationships(),
          repository.listCollections(),
        ]);
        if (active) {
          setKnowledgeList(kItems);
          setRelationshipsList(rels);
          setCollections(cols);
        }
      } catch (err) {
        console.error('Failed to load graph data', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [repository, version, showRetired]);

  // Filter nodes
  const filteredItems = useMemo(() => {
    let items = [...knowledgeList];
    if (selectedCollection !== 'all') {
      items = items.filter((k) => k.collectionId === selectedCollection);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (k) =>
          k.title.toLowerCase().includes(q) ||
          k.summary.toLowerCase().includes(q) ||
          (k.requirements && k.requirements.some((r) => r.toLowerCase().includes(q)))
      );
    }
    return items;
  }, [knowledgeList, selectedCollection, searchQuery]);

  const filteredNodeIds = useMemo(() => new Set(filteredItems.map((k) => k.id)), [filteredItems]);

  // Filter edges
  const filteredEdges = useMemo(() => {
    return relationshipsList.filter((rel) => {
      const src = rel.sourceKnowledgeId || rel.sourceId;
      const tgt = rel.targetKnowledgeId || rel.targetId;
      if (!src || !tgt) return false;
      if (!filteredNodeIds.has(src) || !filteredNodeIds.has(tgt)) return false;

      const relType = rel.relationshipType || rel.type || 'supports';
      if (selectedRelationType !== 'all' && relType !== selectedRelationType) {
        return false;
      }
      return true;
    });
  }, [relationshipsList, filteredNodeIds, selectedRelationType]);

  // Compute node positions (stratified organic circle layout)
  const nodes = useMemo<GraphNode[]>(() => {
    const count = filteredItems.length;
    if (count === 0) return [];

    const centerX = 500;
    const centerY = 350;
    const radiusBase = Math.min(320, 160 + count * 10);

    return filteredItems.map((item, index) => {
      // Golden ratio angle distribution for organic balance
      const angle = index * (Math.PI * (3 - Math.sqrt(5))) + (index % 2) * 0.2;
      const r = Math.sqrt((index + 1) / count) * radiusBase;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);

      return {
        id: item.id,
        item,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 20,
      };
    });
  }, [filteredItems]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Handle Pan & Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsDragging(true);
      dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background)] select-none overflow-hidden">
      {/* Top Header & Filter Toolbar */}
      <div className="p-4 sm:px-6 border-b border-[var(--separator)] bg-[var(--surface)] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-semibold text-[var(--foreground)] tracking-tight">
              {locale === 'fa' ? 'گراف شبکه دانش' : 'Knowledge Network Graph'}
            </h1>
            <p className="text-xs text-[var(--muted)]">
              {locale === 'fa'
                ? `${nodes.length} گره دانشی فعال و ${filteredEdges.length} پیوند ساختاریافته`
                : `${nodes.length} knowledge nodes & ${filteredEdges.length} verified connections`}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[160px] sm:min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
            <input
              type="text"
              dir="auto"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === 'fa' ? 'جستجوی گره...' : 'Filter nodes...'}
              className="ui-input ps-8 py-1.5 text-xs h-8"
            />
          </div>

          {/* Collection Filter */}
          <select
            value={selectedCollection}
            onChange={(e) => setSelectedCollection(e.target.value)}
            className="ui-select text-xs h-8 py-1"
          >
            <option value="all">{locale === 'fa' ? 'همه مجموعه‌ها' : 'All Collections'}</option>
            {collections.map((col) => (
              <option key={col.id} value={col.id}>
                {locale === 'fa' && col.nameFa ? col.nameFa : col.name}
              </option>
            ))}
          </select>

          {/* Relation Filter */}
          <select
            value={selectedRelationType}
            onChange={(e) => setSelectedRelationType(e.target.value)}
            className="ui-select text-xs h-8 py-1"
          >
            <option value="all">{locale === 'fa' ? 'همه پیوندها' : 'All Relationships'}</option>
            <option value="supports">supports (پشتیبانی)</option>
            <option value="conflicts_with">conflicts_with (تناقض)</option>
            <option value="prerequisite_for">prerequisite_for (پیش‌نیاز)</option>
            <option value="supersedes">supersedes (جایگزین)</option>
            <option value="complements">complements (مکمل)</option>
          </select>

          {/* Zoom controls */}
          <div className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] p-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
              className="p-1 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
              className="p-1 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={resetView}
              className="p-1 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
              title="Reset View"
              aria-label="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Graph Visualization Workspace */}
      <div className="relative flex-1 overflow-hidden bg-[var(--field-background)]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--muted)]">
            <span>{t('common.loading')}</span>
          </div>
        ) : nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-[var(--muted)]">
            <GitFork className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm font-semibold text-[var(--foreground)]">{t('common.emptyTitle')}</p>
            <p className="text-xs mt-1 max-w-sm">{t('common.emptyDesc')}</p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Defs for arrow markers */}
            <defs>
              <marker
                id="arrow-supports"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669" />
              </marker>
              <marker
                id="arrow-conflicts"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#dc2626" />
              </marker>
              <marker
                id="arrow-default"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
              </marker>
            </defs>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Edges */}
              {filteredEdges.map((rel) => {
                const srcId = rel.sourceKnowledgeId || rel.sourceId;
                const tgtId = rel.targetKnowledgeId || rel.targetId;
                if (!srcId || !tgtId) return null;
                const srcNode = nodeMap.get(srcId);
                const tgtNode = nodeMap.get(tgtId);
                if (!srcNode || !tgtNode) return null;

                const relType = (rel.relationshipType || rel.type || 'supports') as RelationshipType;
                const style = RELATION_STYLES[relType] || { stroke: '#64748b' };
                const markerId =
                  relType === 'conflicts_with'
                    ? 'url(#arrow-conflicts)'
                    : relType === 'supports'
                    ? 'url(#arrow-supports)'
                    : 'url(#arrow-default)';

                return (
                  <g key={rel.id} className="cursor-pointer">
                    <line
                      x1={srcNode.x}
                      y1={srcNode.y}
                      x2={tgtNode.x}
                      y2={tgtNode.y}
                      stroke={style.stroke}
                      strokeWidth={2}
                      strokeDasharray={style.dash}
                      strokeOpacity={0.65}
                      markerEnd={markerId}
                    />
                    {/* Invisible fat hit area for edge tooltip */}
                    <line
                      x1={srcNode.x}
                      y1={srcNode.y}
                      x2={tgtNode.x}
                      y2={tgtNode.y}
                      stroke="transparent"
                      strokeWidth={14}
                      onMouseEnter={(e) => {
                        const rect = svgRef.current?.getBoundingClientRect();
                        setHoveredEdge({
                          edge: { id: rel.id, source: srcId, target: tgtId, relationship: rel },
                          screenX: e.clientX - (rect?.left || 0),
                          screenY: e.clientY - (rect?.top || 0),
                        });
                      }}
                      onMouseLeave={() => setHoveredEdge(null)}
                    />
                  </g>
                );
              })}

              {/* Nodes */}
              {nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const color = TYPE_COLORS[node.item.type] || '#006FEE';
                const isPersian = node.item.language === 'fa';

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer group"
                    onClick={() => setSelectedNode(node)}
                    onMouseEnter={(e) => {
                      const rect = svgRef.current?.getBoundingClientRect();
                      setHoveredNode({
                        node,
                        screenX: e.clientX - (rect?.left || 0),
                        screenY: e.clientY - (rect?.top || 0),
                      });
                    }}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {/* Selection halo */}
                    {isSelected && (
                      <circle
                        r={node.radius + 6}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth={2.5}
                        strokeDasharray="4,2"
                        className="animate-spin"
                        style={{ animationDuration: '6s' }}
                      />
                    )}

                    {/* Node circle */}
                    <circle
                      r={node.radius}
                      fill={color}
                      stroke="var(--surface)"
                      strokeWidth={2}
                      className="transition-transform group-hover:scale-110 shadow-sm"
                    />

                    {/* Node text label rendered with proper Persian direction & anchor */}
                    <text
                      y={node.radius + 14}
                      textAnchor="middle"
                      direction={isPersian ? 'rtl' : 'ltr'}
                      className="fill-[var(--foreground)] text-[11px] font-medium pointer-events-none select-none transition-all"
                      style={{
                        fontFamily: isPersian ? 'Vazirmatn, var(--font-sans)' : 'var(--font-sans)',
                      }}
                    >
                      {node.item.title.length > 24
                        ? node.item.title.substring(0, 22) + '…'
                        : node.item.title}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {/* Floating Node Tooltip (Bilingual and RTL aware) */}
        {hoveredNode && !isDragging && (
          <div
            dir="auto"
            className="absolute z-30 pointer-events-none p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xl max-w-xs text-xs space-y-1.5 transition-opacity"
            style={{
              left: Math.min(window.innerWidth - 320, hoveredNode.screenX + 15),
              top: Math.max(10, hoveredNode.screenY - 10),
            }}
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge type="knowledgeType" value={hoveredNode.node.item.type} size="sm" />
              <Badge type="evidence" value={hoveredNode.node.item.evidenceLevel} size="sm" />
              <Badge type="review" value={hoveredNode.node.item.reviewStatus} size="sm" />
            </div>
            <h4
              dir="auto"
              className="font-semibold text-[var(--foreground)] leading-snug pt-0.5 text-start"
            >
              {hoveredNode.node.item.title}
            </h4>
            <p
              dir="auto"
              className="text-[11px] text-[var(--muted)] line-clamp-2 leading-relaxed text-start"
            >
              {hoveredNode.node.item.summary}
            </p>
          </div>
        )}

        {/* Floating Edge Tooltip */}
        {hoveredEdge && !isDragging && (
          <div
            dir="auto"
            className="absolute z-30 pointer-events-none px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-lg text-[11px] font-mono text-[var(--foreground)] text-start"
            style={{
              left: Math.min(window.innerWidth - 220, hoveredEdge.screenX + 12),
              top: Math.max(10, hoveredEdge.screenY - 10),
            }}
          >
            <span className="font-semibold text-[var(--accent)]">
              {hoveredEdge.edge.relationship.relationshipType || hoveredEdge.edge.relationship.type}
            </span>
            {hoveredEdge.edge.relationship.rationale && (
              <p className="text-[10px] text-[var(--muted)] mt-0.5 font-sans">
                {hoveredEdge.edge.relationship.rationale}
              </p>
            )}
          </div>
        )}

        {/* Selected Node Inspector Drawer */}
        {selectedNode && (
          <div className="absolute top-4 end-4 w-80 max-w-[calc(100vw-32px)] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-4 space-y-3 z-20 animate-in fade-in slide-in-from-right-4 duration-150">
            <div className="flex items-start justify-between gap-2 border-b border-[var(--separator)] pb-2.5">
              <div className="min-w-0">
                <span className="text-[10px] font-mono text-[var(--muted)] uppercase block">
                  {selectedNode.item.id}
                </span>
                <h3 dir="auto" className="text-sm font-semibold text-[var(--foreground)] truncate mt-0.5">
                  {selectedNode.item.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] cursor-pointer"
                aria-label={t('common.close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge type="knowledgeType" value={selectedNode.item.type} size="sm" />
              <Badge type="evidence" value={selectedNode.item.evidenceLevel} size="sm" />
              <Badge type="review" value={selectedNode.item.reviewStatus} size="sm" />
            </div>

            <div className="text-xs space-y-2 max-h-56 overflow-y-auto pe-1">
              <div>
                <span className="text-[10px] text-[var(--muted)] font-medium block">
                  {locale === 'fa' ? 'خلاصه' : 'Summary'}
                </span>
                <p dir="auto" className="text-[11px] text-[var(--foreground)] leading-relaxed mt-0.5">
                  {selectedNode.item.summary}
                </p>
              </div>

              {selectedNode.item.applicability && (
                <div>
                  <span className="text-[10px] text-[var(--muted)] font-medium block">
                    {locale === 'fa' ? 'دامنه کاربرد' : 'Applicability'}
                  </span>
                  <p dir="auto" className="text-[11px] text-[var(--muted)] leading-relaxed mt-0.5">
                    {selectedNode.item.applicability}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[var(--separator)] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => navigate(`/knowledge/${selectedNode.id}`)}
                className="w-full ui-button ui-button-primary text-xs justify-center gap-1.5"
              >
                <span>{locale === 'fa' ? 'مشاهده برگه کامل دانش' : 'Open Knowledge Note'}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
