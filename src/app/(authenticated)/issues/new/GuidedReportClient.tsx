'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Severity, Priority, Project } from '@prisma/client';
import type { CreateIssueData } from '@/app/actions/issues';

interface ProjectWithComponents {
  id: string;
  name: string;
  key: string;
}

interface GuidedReportClientProps {
  projects: ProjectWithComponents[];
  initialProjectId: string;
  createIssueAction: (data: CreateIssueData) => Promise<{ error?: string; success?: boolean; issueKey?: string }>;
}

const STEPS = [
  { id: 1, label: 'Problem', icon: '❓' },
  { id: 2, label: 'Reproduction', icon: '🔁' },
  { id: 3, label: 'Environment', icon: '💻' },
  { id: 4, label: 'Evidence', icon: '📎' },
  { id: 5, label: 'Classification', icon: '🏷️' },
  { id: 6, label: 'Review', icon: '📋' },
];

export default function GuidedReportClient({ projects, initialProjectId, createIssueAction }: GuidedReportClientProps) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form Fields State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');
  const [urlOccurred, setUrlOccurred] = useState('');
  
  // Environment Fields (Auto-detected on mount)
  const [os, setOs] = useState('');
  const [browser, setBrowser] = useState('');

  // File Upload State
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileMimeType, setFileMimeType] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [fileInputFocused, setFileInputFocused] = useState(false);

  // Classification Fields (Plain English options)
  const initialProjName = projects.find(p => p.id === initialProjectId)?.name || '';
  const [projectName, setProjectName] = useState(initialProjName);
  const [severity, setSeverity] = useState<Severity>(Severity.MEDIUM);
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);

  // Auto-detect OS & Browser details
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent;
      
      // Basic OS detection
      let detectedOs = 'Windows';
      if (ua.indexOf('Mac') !== -1) detectedOs = 'macOS';
      else if (ua.indexOf('Linux') !== -1) detectedOs = 'Linux';
      else if (ua.indexOf('Android') !== -1) detectedOs = 'Android';
      else if (ua.indexOf('like Mac') !== -1) detectedOs = 'iOS';
      
      // Basic Browser detection
      let detectedBrowser = 'Chrome';
      if (ua.indexOf('Firefox') !== -1) detectedBrowser = 'Firefox';
      else if (ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1) detectedBrowser = 'Safari';
      else if (ua.indexOf('Edge') !== -1) detectedBrowser = 'Edge';
      
      setOs(detectedOs);
      setBrowser(detectedBrowser);
    }
  }, []);

  const handleNext = () => {
    setError(null);
    
    // Step validation checks
    if (activeStep === 1) {
      if (title.trim().length < 5) {
        setError('Summary/Title must be at least 5 characters long.');
        return;
      }
      if (description.trim().length < 10) {
        setError('Description details must be at least 10 characters long.');
        return;
      }
    }
    
    if (activeStep === 5) {
      if (projectName.trim().length < 2) {
        setError('Please enter a product or project name.');
        return;
      }
    }

    setActiveStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement> | DragEvent) => {
    let file: File | undefined;
    
    if ('dataTransfer' in e && e.dataTransfer) {
      file = e.dataTransfer.files?.[0];
    } else if ('target' in e && e.target) {
      const target = e.target as HTMLInputElement;
      file = target.files?.[0];
    }

    if (!file) return;

    // Enforce 4MB max size
    if (file.size > 4 * 1024 * 1024) {
      setError('File is too large. Maximum attachment size is 4MB.');
      return;
    }

    setError(null);
    setFileName(file.name);
    setFileMimeType(file.type);
    setFileSize(file.size);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await res.json();
      setFileUrl(data.url);
    } catch (err) {
      setError('Failed to upload attachment. Please try again.');
      setFileName('');
      setFileMimeType('');
      setFileSize(0);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFileChange(e.nativeEvent as unknown as DragEvent);
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    const environmentText = `OS: ${os || 'Not Specified'} | Browser: ${browser || 'Not Specified'}`;

    const payload = {
      title,
      description,
      stepsToReproduce: stepsToReproduce || null,
      expectedBehavior: expectedBehavior || null,
      actualBehavior: actualBehavior || null,
      environment: environmentText,
      projectName: projectName.trim(),
      urlOccurred: urlOccurred || null,
      severity,
      priority,
      attachmentName: fileName || undefined,
      attachmentUrl: fileUrl || undefined,
      attachmentMimeType: fileMimeType || undefined,
      attachmentSize: fileSize || undefined,
    };

    const res = await createIssueAction(payload);
    if (res && res.error) {
      setError(res.error);
      setLoading(false);
    } else if (res && res.issueKey) {
      router.push(`/issues/${res.issueKey}`);
    }
  };

  return (
    <div style={styles.container}>
      {/* Wizard Header Progress Indicator */}
      <div style={styles.stepsHeader} className="glass-panel">
        {STEPS.map((step) => {
          const isActive = step.id === activeStep;
          const isCompleted = step.id < activeStep;
          return (
            <div key={step.id} style={styles.stepIndicator}>
              <div
                style={{
                  ...styles.stepCircle,
                  backgroundColor: isActive
                    ? '#6366f1'
                    : isCompleted
                    ? '#10b981'
                    : 'rgba(255,255,255,0.05)',
                  border: isActive
                    ? '2px solid rgba(99, 102, 241, 0.4)'
                    : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {isCompleted ? '✓' : step.icon}
              </div>
              <span
                style={{
                  ...styles.stepLabel,
                  color: isActive ? '#ffffff' : '#6b7280',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main Form Box */}
      <div style={styles.formCard} className="glass-panel">
        {error && <div style={styles.errorBox} aria-live="assertive" role="alert">{error}</div>}

        {/* STEP 1: PROBLEM */}
        {activeStep === 1 && (
          <div style={styles.stepContent} role="group" aria-labelledby="step-1-title">
            <h2 id="step-1-title">❓ Step 1: Describe the Problem</h2>
            <p style={styles.stepDesc}>Briefly summarize what is wrong, specify the URL if applicable, and write details about the bug.</p>

            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="issue-title">Summary / Issue Title *</label>
              <input
                id="issue-title"
                type="text"
                required
                placeholder="e.g. Shopping cart reset after checkout"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="issue-url">URL where the issue occurred (optional)</label>
              <input
                id="issue-url"
                type="text"
                placeholder="e.g. https://example.com/checkout"
                value={urlOccurred}
                onChange={(e) => setUrlOccurred(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="issue-desc">Full Description *</label>
              <textarea
                id="issue-desc"
                rows={5}
                required
                placeholder="Explain what went wrong in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={styles.textarea}
              />
            </div>
          </div>
        )}

        {/* STEP 2: REPRODUCTION */}
        {activeStep === 2 && (
          <div style={styles.stepContent} role="group" aria-labelledby="step-2-title">
            <h2 id="step-2-title">🔁 Step 2: How to Reproduce</h2>
            <p style={styles.stepDesc}>Outline the actions you took and what happened.</p>

            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="issue-steps">Steps to Reproduce</label>
              <textarea
                id="issue-steps"
                rows={4}
                placeholder="1. Click checkout&#10;2. Fill details&#10;3. Refresh the page..."
                value={stepsToReproduce}
                onChange={(e) => setStepsToReproduce(e.target.value)}
                style={styles.textarea}
              />
            </div>

            <div style={styles.gridFields}>
              <div style={styles.fieldGroup}>
                <label style={styles.label} htmlFor="issue-expected">Expected Behavior</label>
                <textarea
                  id="issue-expected"
                  rows={3}
                  placeholder="What should have happened..."
                  value={expectedBehavior}
                  onChange={(e) => setExpectedBehavior(e.target.value)}
                  style={styles.textarea}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label} htmlFor="issue-actual">Actual Behavior</label>
                <textarea
                  id="issue-actual"
                  rows={3}
                  placeholder="What went wrong instead..."
                  value={actualBehavior}
                  onChange={(e) => setActualBehavior(e.target.value)}
                  style={styles.textarea}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: ENVIRONMENT */}
        {activeStep === 3 && (
          <div style={styles.stepContent} role="group" aria-labelledby="step-3-title">
            <h2 id="step-3-title">💻 Step 3: Run Environment</h2>
            <p style={styles.stepDesc}>State details about your operating system and browser (we have auto-detected these, you can edit if needed).</p>

            <div style={styles.gridFields}>
              <div style={styles.fieldGroup}>
                <label style={styles.label} htmlFor="issue-os">Operating System (OS)</label>
                <input
                  id="issue-os"
                  type="text"
                  placeholder="e.g. Windows 11, macOS"
                  value={os}
                  onChange={(e) => setOs(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label} htmlFor="issue-browser">Browser / Device Version</label>
                <input
                  id="issue-browser"
                  type="text"
                  placeholder="e.g. Chrome, Safari"
                  value={browser}
                  onChange={(e) => setBrowser(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: EVIDENCE */}
        {activeStep === 4 && (
          <div style={styles.stepContent} role="group" aria-labelledby="step-4-title">
            <h2 id="step-4-title">📎 Step 4: Evidence & Logs</h2>
            <p style={styles.stepDesc}>Attach a screenshot, error log, or console output file to help illustrate the issue.</p>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                ...styles.dropzone,
                borderColor: dragging || fileInputFocused ? '#6366f1' : 'rgba(255,255,255,0.08)',
                backgroundColor: dragging || fileInputFocused ? 'rgba(99,102,241,0.03)' : 'rgba(255,255,255,0.01)',
                outline: fileInputFocused ? '2px dashed #6366f1' : 'none',
              }}
            >
              <div style={styles.dropzoneContent}>
                <span style={styles.uploadIcon}>📁</span>
                <label style={styles.uploadTitle} htmlFor="issue-file">Drag & drop evidence file here, or click to upload</label>
                <p style={styles.uploadLimit}>Max size: 4MB (images, logs, text)</p>
                <input
                  id="issue-file"
                  type="file"
                  onChange={handleFileChange}
                  onFocus={() => setFileInputFocused(true)}
                  onBlur={() => setFileInputFocused(false)}
                  style={styles.fileInput}
                  accept="image/*,.log,.txt,.pdf"
                />
              </div>
            </div>

            {fileName && (
              <div style={styles.fileDetailsCard}>
                <span style={styles.fileDetailsIcon}>📄</span>
                <div>
                  <p style={styles.fileName}>{fileName}</p>
                  <p style={styles.fileSize}>{(fileSize / 1024).toFixed(1)} KB | {fileMimeType}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFileName('');
                    setFileUrl('');
                    setFileMimeType('');
                    setFileSize(0);
                  }}
                  style={styles.removeFileBtn}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: CLASSIFICATION */}
        {activeStep === 5 && (
          <div style={styles.stepContent} role="group" aria-labelledby="step-5-title">
            <h2 id="step-5-title">🏷️ Step 5: Issue Classification</h2>
            <p style={styles.stepDesc}>Specify the product/project name and select how serious the bug is.</p>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Product / Project Name *</label>
              <input
                type="text"
                required
                placeholder="Type the project or product name (e.g. Bugzilla Reconstruction)"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.gridFields}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Severity Level</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as Severity)}
                  style={styles.select}
                >
                  <option value={Severity.LOW}>Low</option>
                  <option value={Severity.MEDIUM}>Medium</option>
                  <option value={Severity.HIGH}>High</option>
                  <option value={Severity.CRITICAL}>Critical</option>
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  style={styles.select}
                >
                  <option value={Priority.LOW}>Low</option>
                  <option value={Priority.MEDIUM}>Medium</option>
                  <option value={Priority.HIGH}>High</option>
                  <option value={Priority.URGENT}>Urgent</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: REVIEW */}
        {activeStep === 6 && (
          <div style={styles.stepContent} role="group" aria-labelledby="step-6-title">
            <h2 id="step-6-title">📋 Step 6: Review & Submit</h2>
            <p style={styles.stepDesc}>Review all bug specifications before submitting to the developer queue.</p>

            <div style={styles.reviewWrapper}>
              <div style={styles.reviewGroup}>
                <span style={styles.reviewLabel}>Summary:</span>
                <p style={styles.reviewTextValTitle}>{title}</p>
              </div>

              <div style={styles.reviewGroup}>
                <span style={styles.reviewLabel}>Full Description:</span>
                <p style={styles.reviewTextValBlock}>{description}</p>
              </div>

              <div style={styles.gridFields}>
                <div style={styles.reviewGroup}>
                  <span style={styles.reviewLabel}>Product / Project Name:</span>
                  <p style={styles.reviewTextVal}>{projectName}</p>
                </div>
                <div style={styles.reviewGroup}>
                  <span style={styles.reviewLabel}>URL:</span>
                  <p style={styles.reviewTextVal}>{urlOccurred || 'Not Specified'}</p>
                </div>
              </div>

              <div style={styles.gridFields}>
                <div style={styles.reviewGroup}>
                  <span style={styles.reviewLabel}>Severity:</span>
                  <p style={styles.reviewTextVal}>{severity}</p>
                </div>
                <div style={styles.reviewGroup}>
                  <span style={styles.reviewLabel}>Priority:</span>
                  <p style={styles.reviewTextVal}>{priority}</p>
                </div>
              </div>

              <div style={styles.reviewGroup}>
                <span style={styles.reviewLabel}>Environment Details:</span>
                <p style={styles.reviewTextVal}>
                  OS: {os || 'N/A'} | Browser: {browser || 'N/A'}
                </p>
              </div>

              {fileName && (
                <div style={styles.reviewGroup}>
                  <span style={styles.reviewLabel}>Attachment:</span>
                  <p style={styles.reviewTextVal}>📎 {fileName} ({(fileSize/1024).toFixed(1)} KB)</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Actions Panel */}
        <div style={styles.actionsPanel}>
          {activeStep > 1 && (
            <button type="button" onClick={handleBack} style={styles.backBtn} disabled={loading}>
              ← Back
            </button>
          )}

          {activeStep < STEPS.length ? (
            <button type="button" onClick={handleNext} style={styles.nextBtn}>
              Next Step →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                ...styles.submitBtn,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Filing Bug...' : '🚀 File Bug Report'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
  },
  stepsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '1.25rem 2rem',
    borderRadius: '12px',
    backgroundColor: 'rgba(17, 19, 28, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  stepIndicator: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.4rem',
  },
  stepCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.95rem',
    transition: 'all 0.25s ease',
  },
  stepLabel: {
    fontSize: '0.75rem',
  },
  formCard: {
    backgroundColor: 'rgba(17, 19, 28, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderRadius: '16px',
    padding: '2.5rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
  },
  stepDesc: {
    fontSize: '0.9rem',
    color: '#9ca3af',
    marginTop: '-1rem',
    marginBottom: '0.5rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.4rem',
    width: '100%',
  },
  gridFields: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.25rem',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#9ca3af',
  },
  input: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(15, 17, 26, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    fontSize: '0.95rem',
    
  },
  textarea: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(15, 17, 26, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    fontSize: '0.95rem',
    
    resize: 'vertical' as const,
  },
  select: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(15, 17, 26, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    fontSize: '0.95rem',
    
  },
  dropzone: {
    border: '2px dashed rgba(255,255,255,0.08)',
    borderRadius: '10px',
    padding: '2.5rem 1rem',
    textAlign: 'center' as const,
    cursor: 'pointer',
    position: 'relative' as const,
    transition: 'all 0.2s ease',
  },
  dropzoneContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.5rem',
  },
  uploadIcon: {
    fontSize: '2.2rem',
    color: '#6b7280',
  },
  uploadTitle: {
    fontSize: '0.95rem',
    color: '#d1d5db',
    fontWeight: 500,
  },
  uploadLimit: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  fileInput: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
  },
  fileDetailsCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    border: '1px solid rgba(99, 102, 241, 0.15)',
    borderRadius: '8px',
  },
  fileDetailsIcon: {
    fontSize: '1.2rem',
  },
  fileName: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#ffffff',
  },
  fileSize: {
    fontSize: '0.75rem',
    color: '#9ca3af',
  },
  removeFileBtn: {
    marginLeft: 'auto',
    background: 'transparent',
    border: 'none',
    color: '#ef4444',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  reviewWrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.2rem',
    backgroundColor: 'rgba(255,255,255,0.01)',
    border: '1px solid rgba(255,255,255,0.03)',
    borderRadius: '10px',
    padding: '1.5rem',
  },
  reviewGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
  },
  reviewLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  reviewTextValTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#ffffff',
  },
  reviewTextValBlock: {
    fontSize: '0.9rem',
    color: '#d1d5db',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap' as const,
  },
  reviewTextVal: {
    fontSize: '0.9rem',
    color: '#ffffff',
  },
  actionsPanel: {
    display: 'flex',
    justifyContent: 'space-between',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '1.5rem',
    marginTop: '1rem',
  },
  backBtn: {
    padding: '0.6rem 1.25rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#d1d5db',
    fontWeight: 500,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  nextBtn: {
    padding: '0.6rem 1.5rem',
    borderRadius: '8px',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: 'none',
    fontWeight: 600,
    fontSize: '0.9rem',
    marginLeft: 'auto',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '0.6rem 1.5rem',
    borderRadius: '8px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    fontWeight: 600,
    fontSize: '0.9rem',
    marginLeft: 'auto',
    boxShadow: '0 0 10px rgba(16, 185, 129, 0.25)',
  },
  errorBox: {
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    color: '#fc8181',
    fontSize: '0.9rem',
  },
};
