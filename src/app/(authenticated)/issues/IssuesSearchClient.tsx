'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Severity, Priority, IssueStatus } from '@prisma/client';
import { SessionUser } from '@/lib/session';
import { getSlaStatus } from '@/lib/sla';

interface SavedFilterRecord {
  id: string;
  name: string;
  query: string;
}

interface IssuesSearchClientProps {
  initialIssues: any[];
  projects: { id: string; name: string; key: string }[];
  components: { id: string; name: string; projectId: string }[];
  users: { id: string; name: string; role: string }[];
  initialSavedFilters: SavedFilterRecord[];
  currentUser: SessionUser;
  saveFilterAction: (name: string, queryJson: string) => Promise<{ error?: string; success?: boolean }>;
  deleteFilterAction: (id: string) => Promise<{ error?: string; success?: boolean }>;
  initialStatus: string;
  initialProjectId: string;
}

export default function IssuesSearchClient({
  initialIssues,
  projects,
  components,
  users,
  initialSavedFilters,
  currentUser,
  saveFilterAction,
  deleteFilterAction,
  initialStatus,
  initialProjectId,
}: IssuesSearchClientProps) {
  const [issues, setIssues] = useState(initialIssues);
  const [savedFilters, setSavedFilters] = useState<SavedFilterRecord[]>(initialSavedFilters);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState(initialProjectId || '');
  const [selectedComponent, setSelectedComponent] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(initialStatus || '');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [selectedReporter, setSelectedReporter] = useState('');

  // Save Filter Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Dynamic Component Options based on selected project
  const filteredComponentOptions = useMemo(() => {
    if (!selectedProject) return components;
    return components.filter((c) => c.projectId === selectedProject);
  }, [selectedProject, components]);

  // Client side filtering logic
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText =
          issue.title.toLowerCase().includes(q) ||
          issue.description.toLowerCase().includes(q) ||
          issue.key.toLowerCase().includes(q);
        if (!matchesText) return false;
      }
      if (selectedProject && issue.projectId !== selectedProject) return false;
      if (selectedComponent && issue.componentId !== selectedComponent) return false;
      if (selectedSeverity && issue.severity !== selectedSeverity) return false;
      if (selectedPriority && issue.priority !== selectedPriority) return false;
      if (selectedStatus && issue.status !== selectedStatus) return false;
      if (selectedAssignee) {
        if (selectedAssignee === 'unassigned' && issue.assigneeId !== null) return false;
        if (selectedAssignee !== 'unassigned' && issue.assigneeId !== selectedAssignee) return false;
      }
      if (selectedReporter && issue.reporterId !== selectedReporter) return false;
      return true;
    });
  }, [issues, searchQuery, selectedProject, selectedComponent, selectedSeverity, selectedPriority, selectedStatus, selectedAssignee, selectedReporter]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedProject('');
    setSelectedComponent('');
    setSelectedSeverity('');
    setSelectedPriority('');
    setSelectedStatus('');
    setSelectedAssignee('');
    setSelectedReporter('');
  };

  // Preset Handlers (Quick Views)
  const applyPreset = (presetName: string) => {
    handleResetFilters();
    switch (presetName) {
      case 'unresolved':
        setSelectedStatus(''); // filters handled dynamically in custom presets
        // Custom check below for not in CLOSED
        break;
      case 'my-active':
        setSelectedAssignee(currentUser.id);
        break;
      case 'critical':
        setSelectedSeverity(Severity.CRITICAL);
        break;
      case 'reported-by-me':
        setSelectedReporter(currentUser.id);
        break;
    }
  };

  // Custom filters matching for custom presets
  const finalFilteredIssues = useMemo(() => {
    return filteredIssues; // if we want status-unresolved preset, we can filter further.
  }, [filteredIssues]);

  // Apply Saved Filter
  const applySavedFilter = (filter: SavedFilterRecord) => {
    try {
      const q = JSON.parse(filter.query);
      setSearchQuery(q.searchQuery || '');
      setSelectedProject(q.selectedProject || '');
      setSelectedComponent(q.selectedComponent || '');
      setSelectedSeverity(q.selectedSeverity || '');
      setSelectedPriority(q.selectedPriority || '');
      setSelectedStatus(q.selectedStatus || '');
      setSelectedAssignee(q.selectedAssignee || '');
      setSelectedReporter(q.selectedReporter || '');
    } catch (e) {
      console.error('Error applying saved filter:', e);
    }
  };

  // Save Filter Submit Handler
  const handleSaveFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilterName.trim()) return;
    setSaveError(null);

    const queryState = {
      searchQuery,
      selectedProject,
      selectedComponent,
      selectedSeverity,
      selectedPriority,
      selectedStatus,
      selectedAssignee,
      selectedReporter,
    };

    const res = await saveFilterAction(newFilterName, JSON.stringify(queryState));
    if (res && res.error) {
      setSaveError(res.error);
    } else {
      // Re-fetch locally or add to local state
      setSavedFilters(prev => [
        { id: Math.random().toString(), name: newFilterName, query: JSON.stringify(queryState) },
        ...prev,
      ]);
      setNewFilterName('');
      setShowSaveModal(false);
    }
  };

  const handleDeleteSavedFilter = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await deleteFilterAction(id);
    if (res && !res.error) {
      setSavedFilters(prev => prev.filter(f => f.id !== id));
    }
  };

  // Check if any filter is active
  const hasActiveFilters =
    searchQuery ||
    selectedProject ||
    selectedComponent ||
    selectedSeverity ||
    selectedPriority ||
    selectedStatus ||
    selectedAssignee ||
    selectedReporter;

  return (
    <div style={styles.containerGrid}>
      {/* 1. LEFT SIDEBAR PANEL: PRESETS & SAVED FILTERS */}
      <aside style={styles.sidebar}>
        {/* Quick Views */}
        <div style={styles.sidebarCard} className="glass-panel">
          <h4>⚡ Quick Views</h4>
          <ul style={styles.presetsList}>
            <li>
              <button type="button" onClick={() => applyPreset('my-active')} style={styles.presetLink}>
                👤 Assigned to Me
              </button>
            </li>
            <li>
              <button type="button" onClick={() => applyPreset('critical')} style={styles.presetLink}>
                🔴 Critical Severity
              </button>
            </li>
            <li>
              <button type="button" onClick={() => applyPreset('reported-by-me')} style={styles.presetLink}>
                🖊️ Reported by Me
              </button>
            </li>
          </ul>
        </div>

        {/* Saved Filters */}
        <div style={styles.sidebarCard} className="glass-panel">
          <div style={styles.sidebarHeaderWithAction}>
            <h4>📂 Saved Filters</h4>
            <button
              type="button"
              onClick={() => {
                setSaveError(null);
                setShowSaveModal(!showSaveModal);
              }}
              style={styles.saveFilterBtnCta}
            >
              Save Current
            </button>
          </div>

          {showSaveModal && (
            <form onSubmit={handleSaveFilter} style={styles.saveFilterForm}>
              {saveError && <p style={styles.saveErrorText}>{saveError}</p>}
              <input
                type="text"
                required
                aria-label="Filter preset name"
                placeholder="Filter preset name..."
                value={newFilterName}
                onChange={(e) => setNewFilterName(e.target.value)}
                style={styles.saveFilterInput}
              />
              <div style={styles.saveFilterFormActions}>
                <button type="submit" style={styles.saveFilterSubmitBtn}>Save</button>
                <button type="button" onClick={() => setShowSaveModal(false)} style={styles.saveFilterCancelBtn}>Cancel</button>
              </div>
            </form>
          )}

          {savedFilters.length === 0 ? (
            <div style={styles.emptySavedFiltersCard}>
              <span style={{ fontSize: '1.25rem', marginBottom: '0.25rem', display: 'block' }}>📁</span>
              <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>No saved filters yet.</p>
            </div>
          ) : (
            <ul style={styles.savedFiltersList}>
              {savedFilters.map((filter) => (
                <li
                  key={filter.id}
                  onClick={() => applySavedFilter(filter)}
                  style={styles.savedFilterItem}
                >
                  <span>📁 {filter.name}</span>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSavedFilter(filter.id, e)}
                    style={styles.deleteSavedFilterBtn}
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* 2. RIGHT CONTENT AREA: FILTERS BAR & SEARCH RESULTS */}
      <main style={styles.resultsArea}>
        {/* Search & Inputs Bar */}
        <div style={styles.searchBarCard} className="glass-panel">
          <div style={styles.searchInputRow}>
            <input
              type="text"
              aria-label="Search issues"
              placeholder="Search issues by summary description or key (e.g. DTR-101)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.textSearchInput}
            />
            {hasActiveFilters && (
              <button type="button" onClick={handleResetFilters} style={styles.resetFiltersBtn}>
                Reset Filters ✕
              </button>
            )}
          </div>

          {/* Classification Dropdown Row */}
          <div style={styles.filtersDropdownRow}>
            <select
              aria-label="Filter by project"
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setSelectedComponent('');
              }}
              style={styles.filterSelect}
            >
              <option value="">📁 All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              aria-label="Filter by component"
              value={selectedComponent}
              onChange={(e) => setSelectedComponent(e.target.value)}
              style={styles.filterSelect}
              disabled={!selectedProject}
            >
              <option value="">🧱 All Components</option>
              {filteredComponentOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              aria-label="Filter by status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">📊 All Statuses</option>
              {Object.values(IssueStatus).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              aria-label="Filter by severity"
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">🔴 All Severities</option>
              {Object.values(Severity).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              aria-label="Filter by priority"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">⚡ All Priorities</option>
              {Object.values(Priority).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <select
              aria-label="Filter by assignee"
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">👤 All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count Summary */}
        <div style={styles.resultsSummary}>
          Showing {finalFilteredIssues.length} of {issues.length} issues
        </div>

        {/* Issues List Table Card */}
        <div style={styles.tableCard} className="glass-panel">
          {finalFilteredIssues.length === 0 ? (
            <p style={styles.emptyResultsText}>No issues matched your search parameters. Try adjusting filters.</p>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableTh}>Key ID</th>
                    <th style={styles.tableTh}>Summary</th>
                    <th style={styles.tableTh}>Project</th>
                    <th style={styles.tableTh}>Component</th>
                    <th style={styles.tableTh}>Status</th>
                    <th style={styles.tableTh}>Severity</th>
                    <th style={styles.tableTh}>SLA</th>
                    <th style={styles.tableTh}>Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  {finalFilteredIssues.map((issue) => (
                    <tr key={issue.id} style={styles.tableRow}>
                      <td style={styles.issueKeyTd}>
                        <Link href={`/issues/${issue.key}`} style={styles.issueLink}>
                          {issue.key}
                        </Link>
                      </td>
                      <td style={styles.issueTitleTd}>
                        <Link href={`/issues/${issue.key}`} style={styles.issueTitleLink}>
                          {issue.title}
                        </Link>
                      </td>
                      <td style={styles.issueTdText}>{issue.project.name}</td>
                      <td style={styles.issueTdText}>{issue.component?.name || 'Global'}</td>
                      <td style={styles.issueTdText}>
                        <span style={{ ...styles.statusDot, backgroundColor: getStatusColor(issue.status) }}></span>
                        <span>{issue.status}</span>
                      </td>
                      <td style={styles.issueTd}>
                        <span style={{ ...styles.severityBadge, ...getSeverityStyle(issue.severity) }}>
                          {issue.severity}
                        </span>
                      </td>
                      <td style={styles.issueTd}>
                        {(() => {
                          const sla = getSlaStatus(issue.severity, new Date(issue.createdAt));
                          switch (sla) {
                            case 'breached': return <span style={{ ...styles.slaBadge, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }}>🔴 BREACHED</span>;
                            case 'at-risk': return <span style={{ ...styles.slaBadge, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>🟡 AT RISK</span>;
                            default: return <span style={{ ...styles.slaBadge, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>🟢 ON TRACK</span>;
                          }
                        })()}
                      </td>
                      <td style={styles.issueTdText}>{issue.assignee?.name || <span style={{ color: '#6b7280' }}>Unassigned</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'NEW': return '#3b82f6';
    case 'TRIAGED': return '#06b6d4';
    case 'ASSIGNED': return '#8b5cf6';
    case 'IN_PROGRESS': return '#f59e0b';
    case 'RESOLVED': return '#10b981';
    case 'VERIFICATION': return '#ec4899';
    default: return '#6b7280';
  }
}

function getSeverityStyle(sev: string) {
  switch (sev) {
    case 'CRITICAL': return { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' };
    case 'HIGH': return { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' };
    case 'MEDIUM': return { backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' };
    default: return { backgroundColor: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af' };
  }
}

const styles = {
  containerGrid: {
    display: 'grid',
    gridTemplateColumns: '260px 1fr',
    gap: '2rem',
    alignItems: 'start',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
  },
  sidebarCard: {
    backgroundColor: 'rgba(17, 19, 28, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  sidebarHeaderWithAction: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveFilterBtnCta: {
    background: 'transparent',
    border: 'none',
    color: '#818cf8',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  saveFilterForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  saveFilterInput: {
    width: '100%',
    padding: '0.4rem 0.6rem',
    borderRadius: '4px',
    backgroundColor: '#090a0f',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#ffffff',
    fontSize: '0.8rem',
    
  },
  saveFilterFormActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  saveFilterSubmitBtn: {
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
    backgroundColor: '#0d9488',
    color: '#ffffff',
    fontSize: '0.75rem',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },
  saveFilterCancelBtn: {
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: '#9ca3af',
    fontSize: '0.75rem',
    border: 'none',
    cursor: 'pointer',
  },
  saveErrorText: {
    color: '#fc8181',
    fontSize: '0.7rem',
  },
  presetsList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  presetLink: {
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    fontSize: '0.85rem',
    textAlign: 'left' as const,
    cursor: 'pointer',
    width: '100%',
    padding: '0.25rem 0',
    transition: 'color 0.2s ease',
  },
  emptySavedFilters: {
    color: '#6b7280',
    fontSize: '0.8rem',
  },
  savedFiltersList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.4rem',
  },
  savedFilterItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.4rem 0.6rem',
    backgroundColor: 'rgba(255,255,255,0.01)',
    border: '1px solid rgba(255,255,255,0.03)',
    borderRadius: '6px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    color: '#d1d5db',
    transition: 'all 0.2s ease',
  },
  deleteSavedFilterBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.75rem',
    opacity: 0.6,
  },
  resultsArea: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.25rem',
  },
  searchBarCard: {
    backgroundColor: 'rgba(17, 19, 28, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderRadius: '12px',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  searchInputRow: {
    display: 'flex',
    gap: '1rem',
  },
  textSearchInput: {
    flexGrow: 1,
    padding: '0.6rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(15, 17, 26, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    fontSize: '0.9rem',
    
  },
  resetFiltersBtn: {
    padding: '0.6rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#fc8181',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    fontWeight: 500,
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  filtersDropdownRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '0.75rem',
  },
  filterSelect: {
    padding: '0.45rem 0.6rem',
    borderRadius: '6px',
    backgroundColor: 'rgba(15, 17, 26, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    color: '#d1d5db',
    fontSize: '0.8rem',
    
  },
  resultsSummary: {
    fontSize: '0.8rem',
    color: '#6b7280',
    paddingLeft: '0.25rem',
  },
  tableCard: {
    backgroundColor: 'rgba(17, 19, 28, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderRadius: '12px',
    padding: '1.5rem',
  },
  emptyResultsText: {
    color: '#6b7280',
    textAlign: 'center' as const,
    padding: '3rem',
    fontSize: '0.9rem',
  },
  tableWrapper: {
    overflowX: 'auto' as const,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    textAlign: 'left' as const,
  },
  tableHeaderRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  tableTh: {
    padding: '0.75rem 1rem',
    color: '#9ca3af',
    fontWeight: 600,
    fontSize: '0.85rem',
  },
  tableRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    transition: 'background-color 0.2s ease',
  },
  issueKeyTd: {
    padding: '1rem',
    fontSize: '0.85rem',
  },
  issueLink: {
    color: '#818cf8',
    fontWeight: 600,
  },
  issueTitleTd: {
    padding: '1rem',
    maxWidth: '220px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  issueTitleLink: {
    color: '#ffffff',
    fontWeight: 500,
  },
  issueTdText: {
    padding: '1rem',
    fontSize: '0.85rem',
    color: '#d1d5db',
  },
  statusDot: {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    marginRight: '0.4rem',
  },
  severityBadge: {
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
    textTransform: 'uppercase' as const,
  },
  issueTd: {
    padding: '1rem',
  },
  emptySavedFiltersCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px dashed rgba(255, 255, 255, 0.08)',
    textAlign: 'center' as const,
    marginTop: '0.5rem',
  },
  slaBadge: {
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    textTransform: 'uppercase' as const,
    whiteSpace: 'nowrap' as const,
  },
};
