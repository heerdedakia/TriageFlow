'use client';

import { useState, useTransition, useMemo } from 'react';
import { IssueStatus, Severity, Priority, Role } from '@prisma/client';
import { SessionUser } from '@/lib/session';
import Link from 'next/link';
import { formatDate } from '@/lib/date';
import { computeSlaDeadline, getSlaStatus } from '@/lib/sla';

interface UserSelectOption {
  id: string;
  name: string;
  role: Role;
}

interface WorkspaceClientProps {
  issue: any; // Rich DB Issue object
  users: UserSelectOption[];
  currentUser: SessionUser;
  transitionAction: (issueId: string, status: IssueStatus) => Promise<{ error?: string; success?: boolean }>;
  assignAction: (issueId: string, assigneeId: string | null) => Promise<{ error?: string; success?: boolean }>;
  commentAction: (issueId: string, content: string) => Promise<{ error?: string; success?: boolean }>;
  attachmentAction: (data: any) => Promise<{ error?: string; success?: boolean }>;
}

const LIFECYCLE_STATUSES: IssueStatus[] = [
  IssueStatus.NEW,
  IssueStatus.TRIAGED,
  IssueStatus.ASSIGNED,
  IssueStatus.IN_PROGRESS,
  IssueStatus.RESOLVED,
  IssueStatus.VERIFICATION,
  IssueStatus.CLOSED,
];

export default function WorkspaceClient({
  issue,
  users,
  currentUser,
  transitionAction,
  assignAction,
  commentAction,
  attachmentAction,
}: WorkspaceClientProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [loadingComment, setLoadingComment] = useState(false);
  const [loadingAttachment, setLoadingAttachment] = useState(false);

  const deadline = computeSlaDeadline(issue.severity, new Date(issue.createdAt));
  const slaStatus = getSlaStatus(issue.severity, new Date(issue.createdAt));

  // File states
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileMimeType, setFileMimeType] = useState('');
  const [fileSize, setFileSize] = useState(0);

  const getStatusColor = (status: IssueStatus) => {
    switch (status) {
      case 'NEW': return '#3b82f6';
      case 'TRIAGED': return '#06b6d4';
      case 'ASSIGNED': return '#8b5cf6';
      case 'IN_PROGRESS': return '#f59e0b';
      case 'RESOLVED': return '#10b981';
      case 'VERIFICATION': return '#ec4899';
      case 'CLOSED': return '#6b7280';
    }
  };

  // Check roles permissions for status triggers
  const canTransitionTo = (targetStatus: IssueStatus) => {
    const currentStatus = issue.status;
    const isAssignee = issue.assigneeId === currentUser.id;
    const isReporter = issue.reporterId === currentUser.id;
    const isPMOrAdmin = currentUser.role === Role.ADMIN || currentUser.role === Role.PROJECT_MANAGER;
    const isQA = currentUser.role === Role.QA;

    // 1. Triage: NEW -> TRIAGED / ASSIGNED
    if (currentStatus === IssueStatus.NEW && (targetStatus === IssueStatus.TRIAGED || targetStatus === IssueStatus.ASSIGNED)) {
      return isPMOrAdmin || isQA;
    }
    // 2. Assign: TRIAGED -> ASSIGNED
    if (currentStatus === IssueStatus.TRIAGED && targetStatus === IssueStatus.ASSIGNED) {
      return isPMOrAdmin || isQA;
    }
    // 3. Untriage/Unassign
    if (currentStatus === IssueStatus.TRIAGED && targetStatus === IssueStatus.NEW) {
      return isPMOrAdmin || isQA;
    }
    if (currentStatus === IssueStatus.ASSIGNED && targetStatus === IssueStatus.TRIAGED) {
      return isPMOrAdmin || isQA;
    }
    // 4. Work: ASSIGNED -> IN_PROGRESS
    if (currentStatus === IssueStatus.ASSIGNED && targetStatus === IssueStatus.IN_PROGRESS) {
      return isAssignee || isPMOrAdmin;
    }
    // 5. Work: IN_PROGRESS -> ASSIGNED
    if (currentStatus === IssueStatus.IN_PROGRESS && targetStatus === IssueStatus.ASSIGNED) {
      return isAssignee || isPMOrAdmin;
    }
    // 6. Resolve: IN_PROGRESS -> RESOLVED / VERIFICATION
    if (currentStatus === IssueStatus.IN_PROGRESS && (targetStatus === IssueStatus.RESOLVED || targetStatus === IssueStatus.VERIFICATION)) {
      return isAssignee || isPMOrAdmin;
    }
    // 7. Verify: RESOLVED -> VERIFICATION
    if (currentStatus === IssueStatus.RESOLVED && targetStatus === IssueStatus.VERIFICATION) {
      return isAssignee || isPMOrAdmin;
    }
    // 8. Close: VERIFICATION -> CLOSED
    if (currentStatus === IssueStatus.VERIFICATION && targetStatus === IssueStatus.CLOSED) {
      return isQA || isPMOrAdmin || isReporter;
    }
    // 9. Reopen: CLOSED -> IN_PROGRESS / NEW
    if (
      (currentStatus === IssueStatus.CLOSED || currentStatus === IssueStatus.VERIFICATION || currentStatus === IssueStatus.RESOLVED) &&
      (targetStatus === IssueStatus.IN_PROGRESS || targetStatus === IssueStatus.NEW)
    ) {
      return isQA || isPMOrAdmin || isReporter;
    }

    return false;
  };

  const handleStatusChange = (targetStatus: IssueStatus) => {
    setError(null);
    startTransition(async () => {
      const res = await transitionAction(issue.id, targetStatus);
      if (res && res.error) {
        setError(res.error);
      }
    });
  };

  const handleSelfAssign = () => {
    setError(null);
    startTransition(async () => {
      const res = await assignAction(issue.id, currentUser.id);
      if (res && res.error) {
        setError(res.error);
      } else {
        if (issue.status === IssueStatus.NEW || issue.status === IssueStatus.TRIAGED) {
          await transitionAction(issue.id, IssueStatus.ASSIGNED);
        }
      }
    });
  };

  const handleAssigneeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    setError(null);
    const val = e.target.value;
    const assigneeId = val === 'unassigned' ? null : val;
    
    startTransition(async () => {
      const res = await assignAction(issue.id, assigneeId);
      if (res && res.error) {
        setError(res.error);
      }
    });
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setError(null);
    setLoadingComment(true);

    const res = await commentAction(issue.id, commentText);
    if (res && res.error) {
      setError(res.error);
    } else {
      setCommentText('');
    }
    setLoadingComment(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setError('File exceeds 4MB size limit.');
      return;
    }

    setError(null);
    setLoadingAttachment(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        const base64Url = event.target.result as string;
        
        const payload = {
          issueId: issue.id,
          name: file.name,
          url: base64Url,
          mimeType: file.type,
          size: file.size,
        };

        const res = await attachmentAction(payload);
        if (res && res.error) {
          setError(res.error);
        }
        setLoadingAttachment(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Compile timeline of activities + comments sorted chronologically
  const timeline = useMemo(() => {
    const items: any[] = [];
    
    // Add activities
    issue.activities.forEach((act: any) => {
      items.push({
        id: act.id,
        type: 'activity',
        date: new Date(act.createdAt),
        actor: act.actor.name,
        action: act.action,
        details: JSON.parse(act.details),
      });
    });

    // Add comments
    issue.comments.forEach((comm: any) => {
      items.push({
        id: comm.id,
        type: 'comment',
        date: new Date(comm.createdAt),
        author: comm.author.name,
        role: comm.author.role,
        content: comm.content,
      });
    });

    // Sort ascending
    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [issue.activities, issue.comments]);

  const activeIndex = LIFECYCLE_STATUSES.indexOf(issue.status);

  return (
    <div style={styles.container}>
      {/* 1. VISUAL STATUS PROGRESS BAR */}
      <section style={styles.progressBarSection} className="glass-panel">
        <div style={styles.statusBar}>
          {LIFECYCLE_STATUSES.map((status, index) => {
            const isCompleted = index < activeIndex;
            const isActive = index === activeIndex;
            return (
              <div key={status} style={styles.statusStep}>
                <div
                  style={{
                    ...styles.statusCircle,
                    backgroundColor: isActive
                      ? getStatusColor(status)
                      : isCompleted
                      ? '#10b981'
                      : 'rgba(255,255,255,0.04)',
                    borderColor: isActive ? '#ffffff' : 'transparent',
                    boxShadow: isActive ? `0 0 15px ${getStatusColor(status)}` : 'none',
                  }}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                <span
                  style={{
                    ...styles.statusLabel,
                    color: isActive ? '#ffffff' : '#6b7280',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {status.replace('_', ' ')}
                </span>
                {index < LIFECYCLE_STATUSES.length - 1 && (
                  <div
                    style={{
                      ...styles.statusConnector,
                      backgroundColor: index < activeIndex ? '#10b981' : 'rgba(255,255,255,0.06)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Action transitions panel */}
        <div style={styles.actionTransitionsRow}>
          <span style={styles.transitionTitle}>Transition Status:</span>
          <div style={styles.transitionButtons}>
            {/* Take Ownership Button (visible if unassigned and in NEW/TRIAGED/ASSIGNED states) */}
            {!issue.assigneeId && (issue.status === IssueStatus.NEW || issue.status === IssueStatus.TRIAGED || issue.status === IssueStatus.ASSIGNED) && (
              <button
                onClick={() => handleSelfAssign()}
                disabled={isPending}
                style={styles.transitionBtn}
              >
                🙋 Take Ownership / Self-Assign
              </button>
            )}

            {issue.status === IssueStatus.NEW && (
              <button
                onClick={() => handleStatusChange(IssueStatus.TRIAGED)}
                disabled={!canTransitionTo(IssueStatus.TRIAGED) || isPending}
                style={styles.transitionBtnSec}
              >
                📋 Triage Bug
              </button>
            )}

            {issue.status === IssueStatus.TRIAGED && (
              <button
                onClick={() => handleStatusChange(IssueStatus.NEW)}
                disabled={!canTransitionTo(IssueStatus.NEW) || isPending}
                style={styles.transitionBtnSec}
              >
                Untriage
              </button>
            )}

            {issue.status === IssueStatus.ASSIGNED && (
              <>
                <button
                  onClick={() => handleStatusChange(IssueStatus.IN_PROGRESS)}
                  disabled={!canTransitionTo(IssueStatus.IN_PROGRESS) || isPending}
                  style={styles.transitionBtn}
                >
                  🛠️ Start Development
                </button>
                <button
                  onClick={() => handleStatusChange(IssueStatus.TRIAGED)}
                  disabled={!canTransitionTo(IssueStatus.TRIAGED) || isPending}
                  style={styles.transitionBtnSec}
                >
                  Stop Work / Unassign
                </button>
              </>
            )}

            {issue.status === IssueStatus.IN_PROGRESS && (
              <>
                <button
                  onClick={() => handleStatusChange(IssueStatus.RESOLVED)}
                  disabled={!canTransitionTo(IssueStatus.RESOLVED) || isPending}
                  style={styles.transitionBtn}
                >
                  ✅ Resolve Fix
                </button>
                <button
                  onClick={() => handleStatusChange(IssueStatus.VERIFICATION)}
                  disabled={!canTransitionTo(IssueStatus.VERIFICATION) || isPending}
                  style={styles.transitionBtnPink}
                >
                  🧪 Submit for QA Verification
                </button>
              </>
            )}

            {issue.status === IssueStatus.RESOLVED && (
              <button
                onClick={() => handleStatusChange(IssueStatus.VERIFICATION)}
                disabled={!canTransitionTo(IssueStatus.VERIFICATION) || isPending}
                style={styles.transitionBtnPink}
              >
                🧪 Submit for QA Verification
              </button>
            )}

            {issue.status === IssueStatus.VERIFICATION && (
              <>
                <button
                  onClick={() => handleStatusChange(IssueStatus.CLOSED)}
                  disabled={!canTransitionTo(IssueStatus.CLOSED) || isPending}
                  style={styles.transitionBtnGreen}
                >
                  🔒 Approve & Close Bug
                </button>
                <button
                  onClick={() => handleStatusChange(IssueStatus.IN_PROGRESS)}
                  disabled={!canTransitionTo(IssueStatus.IN_PROGRESS) || isPending}
                  style={styles.transitionBtnRed}
                >
                  ❌ Reject & Reopen (Failed Verification)
                </button>
              </>
            )}

            {issue.status === IssueStatus.CLOSED && (
              <button
                onClick={() => handleStatusChange(IssueStatus.IN_PROGRESS)}
                disabled={!canTransitionTo(IssueStatus.IN_PROGRESS) || isPending}
                style={styles.transitionBtnRed}
              >
                📂 Reopen Bug
              </button>
            )}

            {isPending && <span style={styles.savingText}>Processing...</span>}
          </div>
        </div>
      </section>

      {error && <div style={styles.errorBox}>{error}</div>}

      {/* 2. TWO-COLUMN ISSUE DETAIL WORKSPACE */}
      <div style={styles.workspaceGrid}>
        {/* Left Column: What's wrong details, attachments, comments timeline */}
        <div style={styles.leftCol}>
          {/* Issue summary description card */}
          <div style={styles.detailsCard} className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h2 style={styles.titleText}>{issue.title}</h2>
              <a 
                href={`/status/${issue.key}`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ ...styles.transitionBtnSec, textDecoration: 'none', display: 'inline-block' } as React.CSSProperties}
              >
                🔗 Public Status Link
              </a>
            </div>
            
            <div style={styles.metaRow}>
              <span style={styles.metaItem}>Reported by: <strong>{issue.reporter.name}</strong></span>
              <span style={styles.metaDivider}>|</span>
              <span style={styles.metaItem}>Created: {formatDate(issue.createdAt)}</span>
              <span style={styles.metaDivider}>|</span>
              <span style={styles.metaItem}>Updated: {formatDate(issue.updatedAt)}</span>
            </div>

            <div style={styles.descBlock}>
              <h4 style={styles.descBlockHeader}>Description</h4>
              <p style={styles.descText}>{issue.description}</p>
            </div>

            {issue.urlOccurred && (
              <div style={styles.descBlock}>
                <h4 style={styles.descBlockHeader}>URL where issue occurred</h4>
                <a href={issue.urlOccurred} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline', fontSize: '0.9rem' }}>
                  {issue.urlOccurred}
                </a>
              </div>
            )}

            {issue.stepsToReproduce && (
              <div style={styles.descBlock}>
                <h4 style={styles.descBlockHeader}>Steps to Reproduce</h4>
                <p style={styles.descTextCode}>{issue.stepsToReproduce}</p>
              </div>
            )}

            <div style={styles.gridFields}>
              {issue.expectedBehavior && (
                <div style={styles.descBlock}>
                  <h4 style={styles.descBlockHeader}>Expected Behavior</h4>
                  <p style={styles.descText}>{issue.expectedBehavior}</p>
                </div>
              )}
              {issue.actualBehavior && (
                <div style={styles.descBlock}>
                  <h4 style={styles.descBlockHeader}>Actual Behavior</h4>
                  <p style={styles.descText}>{issue.actualBehavior}</p>
                </div>
              )}
            </div>

            {issue.environment && (
              <div style={styles.descBlock}>
                <h4 style={styles.descBlockHeader}>Environment Specifications</h4>
                <p style={styles.envText}>{issue.environment}</p>
              </div>
            )}
          </div>

          {/* Attachments Section */}
          <div style={styles.card} className="glass-panel">
            <div style={styles.cardHeaderWithCta}>
              <h3>📎 Evidence Attachments</h3>
              <div style={styles.uploadBtnWrapper}>
                <button type="button" style={styles.uploadCtaBtn} disabled={loadingAttachment}>
                  {loadingAttachment ? 'Uploading...' : 'Upload File'}
                </button>
                <input
                  type="file"
                  onChange={handleFileChange}
                  style={styles.uploadFileInput}
                  disabled={loadingAttachment}
                  accept="image/*,.log,.txt,.pdf"
                />
              </div>
            </div>

            {issue.attachments.length === 0 ? (
              <p style={styles.emptyText}>No attachments uploaded yet.</p>
            ) : (
              <div style={styles.attachmentsGrid}>
                {issue.attachments.map((file: any) => {
                  const isImage = file.mimeType.startsWith('image/');
                  return (
                    <div key={file.id} style={styles.attachmentCard}>
                      <div style={styles.attachmentPreview}>
                        {isImage ? (
                          <img src={file.url} alt={file.name} style={styles.imgPreview} />
                        ) : (
                          <span style={styles.fileIcon}>📄</span>
                        )}
                      </div>
                      <div style={styles.attachmentMeta}>
                        <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer" style={styles.attachmentName}>
                          {file.name}
                        </a>
                        <span style={styles.attachmentSize}>
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chronological Timeline Audit & Comments Feed */}
          <div style={styles.card} className="glass-panel">
            <h3>💬 Activity & Discussion Timeline</h3>
            
            <div style={styles.timelineFeed}>
              {timeline.map((item, idx) => {
                if (item.type === 'activity') {
                  return (
                    <div key={item.id} style={styles.timelineActivityRow}>
                      <div style={styles.timelineLine} />
                      <span style={styles.activityIcon}>⚡</span>
                      <p style={styles.activityText}>
                        <strong>{item.actor}</strong>{' '}
                        {item.action === 'CREATE' && `filed this issue report`}
                        {item.action === 'STATUS_CHANGE' && `changed status from ${item.details.old} to ${item.details.new}`}
                        {item.action === 'ASSIGNEE_CHANGE' && `reassigned issue from ${item.details.old} to ${item.details.new}`}
                        {item.action === 'COMMENT_ADDED' && `commented`}
                        {item.action === 'ATTACHMENT_ADDED' && `attached file "${item.details.name}"`}
                        <span style={styles.timelineDate}>({formatDate(item.date)})</span>
                      </p>
                    </div>
                  );
                } else {
                  return (
                    <div key={item.id} style={styles.timelineCommentRow}>
                      <div style={styles.timelineLine} />
                      <div style={styles.commentAvatar}>
                        {item.author.charAt(0).toUpperCase()}
                      </div>
                      <div style={styles.commentBubble}>
                        <div style={styles.commentBubbleHeader}>
                          <span style={styles.commentAuthorName}>{item.author}</span>
                          <span style={styles.commentAuthorRole}>{item.role}</span>
                          <span style={styles.commentDate}>{formatDate(item.date)}</span>
                        </div>
                        <p style={styles.commentBody}>{item.content}</p>
                      </div>
                    </div>
                  );
                }
              })}
            </div>

            {/* Comment Form box */}
            <form onSubmit={handleCommentSubmit} style={styles.commentForm}>
              <textarea
                rows={3}
                required
                placeholder="Post a comment... Use @mentions like @Devin Coder to loop in members."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                style={styles.commentInput}
              />
              <button
                type="submit"
                disabled={loadingComment}
                style={styles.commentSubmitBtn}
              >
                {loadingComment ? 'Posting...' : 'Send Comment'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Classification metadata, Assignee, Actions */}
        <div style={styles.rightCol}>
          <div style={styles.metaCard} className="glass-panel">
            <h3>Issue Attributes</h3>

            {/* Assignee select box */}
            <div style={styles.attributeGroup}>
              <span style={styles.attributeLabel}>Assignee (Owner)</span>
              <select
                value={issue.assigneeId || 'unassigned'}
                onChange={handleAssigneeChange}
                style={styles.attributeSelect}
                disabled={isPending}
              >
                <option value="unassigned">👤 Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.attributeGroup}>
              <span style={styles.attributeLabel}>Current Status</span>
              <span style={{ ...styles.statusBadgeText, color: getStatusColor(issue.status) }}>
                ● {issue.status}
              </span>
            </div>

            <div style={styles.attributeGroup}>
              <span style={styles.attributeLabel}>Severity</span>
              <span style={{ ...styles.severityBadgeVal, ...getSeverityStyle(issue.severity) }}>
                {issue.severity}
              </span>
            </div>

            <div style={styles.attributeGroup}>
              <span style={styles.attributeLabel}>Priority</span>
              <span style={{ ...styles.priorityBadgeVal, ...getPriorityStyle(issue.priority) }}>
                {issue.priority}
              </span>
            </div>

            <div style={styles.attributeGroup}>
              <span style={styles.attributeLabel}>SLA Status</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                {slaStatus === 'breached' && (
                  <span style={{ ...styles.slaBadge, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }}>🔴 BREACHED</span>
                )}
                {slaStatus === 'at-risk' && (
                  <span style={{ ...styles.slaBadge, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>🟡 AT RISK</span>
                )}
                {slaStatus === 'ok' && (
                  <span style={{ ...styles.slaBadge, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>🟢 ON TRACK</span>
                )}
              </div>
            </div>

            <div style={styles.attributeGroup}>
              <span style={styles.attributeLabel}>SLA Deadline</span>
              <span style={styles.attributeValText}>{formatDate(deadline)}</span>
            </div>

            <div style={styles.attributeGroup}>
              <span style={styles.attributeLabel}>Project</span>
              <span style={styles.attributeValText}>{issue.project.name}</span>
            </div>

            <div style={styles.attributeGroup}>
              <span style={styles.attributeLabel}>Component Scope</span>
              <span style={styles.attributeValText}>{issue.component?.name || 'Global'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getSeverityStyle(sev: string) {
  switch (sev) {
    case 'CRITICAL': return { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' };
    case 'HIGH': return { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' };
    case 'MEDIUM': return { backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' };
    default: return { backgroundColor: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af' };
  }
}

function getPriorityStyle(pri: string) {
  switch (pri) {
    case 'URGENT': return { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' };
    case 'HIGH': return { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' };
    case 'MEDIUM': return { backgroundColor: 'rgba(13, 148, 136, 0.15)', color: '#a5b4fc' };
    default: return { backgroundColor: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af' };
  }
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2rem',
  },
  progressBarSection: {
    padding: '2rem',
    borderRadius: '16px',
    backgroundColor: 'rgba(17, 19, 28, 0.65)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
  },
  statusBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    position: 'relative' as const,
  },
  statusStep: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.4rem',
    zIndex: 2,
    position: 'relative' as const,
    flexGrow: 1,
  },
  statusCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  statusLabel: {
    fontSize: '0.7rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.02em',
  },
  statusConnector: {
    position: 'absolute' as const,
    top: '16px',
    left: 'calc(50% + 16px)',
    width: 'calc(100% - 32px)',
    height: '2px',
    zIndex: 1,
  },
  actionTransitionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '1rem',
  },
  transitionTitle: {
    fontSize: '0.85rem',
    color: '#9ca3af',
    fontWeight: 500,
  },
  transitionButtons: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  transitionBtn: {
    padding: '0.4rem 1rem',
    borderRadius: '6px',
    backgroundColor: '#0d9488',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.85rem',
    border: 'none',
    cursor: 'pointer',
  },
  transitionBtnGreen: {
    padding: '0.4rem 1rem',
    borderRadius: '6px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.85rem',
    border: 'none',
    cursor: 'pointer',
  },
  transitionBtnPink: {
    padding: '0.4rem 1rem',
    borderRadius: '6px',
    backgroundColor: '#ec4899',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.85rem',
    border: 'none',
    cursor: 'pointer',
  },
  transitionBtnRed: {
    padding: '0.4rem 1rem',
    borderRadius: '6px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.85rem',
    border: 'none',
    cursor: 'pointer',
  },
  transitionBtnSec: {
    padding: '0.4rem 1rem',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    color: '#d1d5db',
    fontWeight: 500,
    fontSize: '0.85rem',
    border: '1px solid rgba(255,255,255,0.08)',
    cursor: 'pointer',
  },
  savingText: {
    fontSize: '0.8rem',
    color: '#9ca3af',
  },
  errorBox: {
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    color: '#fc8181',
    fontSize: '0.9rem',
  },
  workspaceGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 280px',
    gap: '2rem',
    alignItems: 'start',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2rem',
  },
  gridFields: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.25rem',
  },
  rightCol: {
    position: 'sticky' as const,
    top: '80px',
  },
  detailsCard: {
    backgroundColor: 'rgba(17, 19, 28, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderRadius: '12px',
    padding: '2.5rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.25rem',
  },
  titleText: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#ffffff',
    lineHeight: '1.2',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.8rem',
    color: '#6b7280',
  },
  metaItem: {
    color: '#9ca3af',
  },
  metaDivider: {
    color: '#374151',
  },
  descBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.4rem',
  },
  descBlockHeader: {
    fontSize: '0.8rem',
    color: '#0d9488',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    fontWeight: 700,
  },
  descText: {
    fontSize: '0.95rem',
    color: '#d1d5db',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap' as const,
  },
  descTextCode: {
    fontSize: '0.9rem',
    fontFamily: 'var(--font-mono)',
    color: '#e5e7eb',
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '8px',
    padding: '1rem',
    whiteSpace: 'pre-wrap' as const,
    lineHeight: '1.5',
  },
  envText: {
    fontSize: '0.85rem',
    color: '#ec4899',
    backgroundColor: 'rgba(236,72,153,0.05)',
    borderRadius: '6px',
    padding: '0.6rem 0.8rem',
    border: '1px dashed rgba(236,72,153,0.15)',
  },
  card: {
    backgroundColor: 'rgba(17, 19, 28, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderRadius: '12px',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.25rem',
  },
  cardHeaderWithCta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  uploadBtnWrapper: {
    position: 'relative' as const,
    overflow: 'hidden',
    display: 'inline-block',
  },
  uploadCtaBtn: {
    padding: '0.4rem 0.8rem',
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  uploadFileInput: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    opacity: 0,
    cursor: 'pointer',
    fontSize: '100px',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: '0.9rem',
    textAlign: 'center' as const,
    padding: '1.5rem 0',
  },
  attachmentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '1rem',
  },
  attachmentCard: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  attachmentPreview: {
    height: '110px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgPreview: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  fileIcon: {
    fontSize: '2.5rem',
  },
  attachmentMeta: {
    padding: '0.6rem 0.8rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.15rem',
  },
  attachmentName: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#818cf8',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  attachmentSize: {
    fontSize: '0.65rem',
    color: '#6b7280',
  },
  timelineFeed: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.25rem',
    position: 'relative' as const,
    paddingLeft: '0.5rem',
  },
  timelineActivityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    position: 'relative' as const,
  },
  timelineLine: {
    position: 'absolute' as const,
    top: '30px',
    left: '10px',
    bottom: '-30px',
    width: '2px',
    backgroundColor: 'rgba(255,255,255,0.03)',
    zIndex: 1,
  },
  activityIcon: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.7rem',
    zIndex: 2,
  },
  activityText: {
    fontSize: '0.85rem',
    color: '#9ca3af',
  },
  timelineDate: {
    fontSize: '0.75rem',
    color: '#4b5563',
    marginLeft: '0.4rem',
  },
  timelineCommentRow: {
    display: 'flex',
    gap: '0.75rem',
    position: 'relative' as const,
  },
  commentAvatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#0d9488',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    zIndex: 2,
  },
  commentBubble: {
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '1rem',
  },
  commentBubbleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  commentAuthorName: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#ffffff',
  },
  commentAuthorRole: {
    fontSize: '0.65rem',
    padding: '0.1rem 0.4rem',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: '4px',
    color: '#9ca3af',
    fontWeight: 500,
  },
  commentDate: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginLeft: 'auto',
  },
  commentBody: {
    fontSize: '0.9rem',
    color: '#d1d5db',
    lineHeight: '1.5',
  },
  commentForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
    marginTop: '1.5rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '1.5rem',
  },
  commentInput: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(15, 17, 26, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    fontSize: '0.9rem',
    outline: 'none',
    resize: 'vertical' as const,
  },
  commentSubmitBtn: {
    alignSelf: 'flex-end',
    padding: '0.5rem 1.25rem',
    borderRadius: '6px',
    backgroundColor: '#0d9488',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.85rem',
    border: 'none',
    cursor: 'pointer',
  },
  metaCard: {
    backgroundColor: 'rgba(17, 19, 28, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.25rem',
  },
  attributeGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.35rem',
  },
  attributeLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    fontWeight: 600,
  },
  attributeSelect: {
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    backgroundColor: 'rgba(15, 17, 26, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    fontSize: '0.85rem',
    outline: 'none',
  },
  statusBadgeText: {
    fontSize: '0.85rem',
    fontWeight: 700,
  },
  severityBadgeVal: {
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    alignSelf: 'flex-start',
    textTransform: 'uppercase' as const,
  },
  priorityBadgeVal: {
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    alignSelf: 'flex-start',
    textTransform: 'uppercase' as const,
  },
  attributeValText: {
    fontSize: '0.9rem',
    color: '#ffffff',
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
