import { PrismaClient, Role, Severity, Priority, IssueStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clean database
  await prisma.notification.deleteMany();
  await prisma.savedFilter.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.component.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users with hashed passwords
  const passwordHash = bcrypt.hashSync('Password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@bugzilla.dev',
      passwordHash,
      name: 'Alice Admin',
      role: Role.ADMIN,
    },
  });

  const pm = await prisma.user.create({
    data: {
      email: 'pm@bugzilla.dev',
      passwordHash,
      name: 'Peter Manager',
      role: Role.PROJECT_MANAGER,
    },
  });

  const qa = await prisma.user.create({
    data: {
      email: 'qa@bugzilla.dev',
      passwordHash,
      name: 'Quincy Tester',
      role: Role.QA,
    },
  });

  const developer = await prisma.user.create({
    data: {
      email: 'developer@bugzilla.dev',
      passwordHash,
      name: 'Devin Coder',
      role: Role.DEVELOPER,
    },
  });

  const reporter = await prisma.user.create({
    data: {
      email: 'reporter@bugzilla.dev',
      passwordHash,
      name: 'Rachel Reporter',
      role: Role.REPORTER,
    },
  });

  console.log('Users seeded successfully!');

  // 3. Create Projects
  const coreProject = await prisma.project.create({
    data: {
      name: 'SaaS Platform Core',
      key: 'CORE',
      description: 'The main SaaS application infrastructure portal managing security, workflows, analytics and user data.',
      leadId: pm.id,
    },
  });

  const hackProject = await prisma.project.create({
    data: {
      name: 'Hackathon Tracker',
      key: 'HACK',
      description: 'Special tracking system for college hackathon event registrations and judge evaluations.',
      leadId: pm.id,
    },
  });

  console.log('Projects seeded successfully!');

  // 4. Create Components
  const authComponent = await prisma.component.create({
    data: {
      name: 'Authentication',
      description: 'User sessions, cookies, JWT verification, and RBAC role validation.',
      projectId: coreProject.id,
    },
  });

  const lifecycleComponent = await prisma.component.create({
    data: {
      name: 'Workflows',
      description: 'Status transitions, assignee changes, state-machine validation.',
      projectId: coreProject.id,
    },
  });

  const searchComponent = await prisma.component.create({
    data: {
      name: 'Search & Filters',
      description: 'Grep-like query construction, search bar, and saved filters.',
      projectId: coreProject.id,
    },
  });

  const dashboardComponent = await prisma.component.create({
    data: {
      name: 'Dashboard Widgets',
      description: 'Analytics widgets, aging issue calculations, role dashboard items.',
      projectId: coreProject.id,
    },
  });

  const registerComponent = await prisma.component.create({
    data: {
      name: 'Registration',
      description: 'Hackathon participant registration portals and form validation.',
      projectId: hackProject.id,
    },
  });

  console.log('Components seeded successfully!');

  // 5. Create Issues (covering all status lifecycles)
  // Issue 1: IN_PROGRESS
  const issue1 = await prisma.issue.create({
    data: {
      key: 'CORE-101',
      title: 'Auth session JWT cookie missing Secure & HttpOnly flags',
      description: 'The authentication cookie is sent over HTTP in development but also lacks HttpOnly on server endpoints, which exposes it to potential XSS attacks. We must secure this immediately.',
      stepsToReproduce: '1. Log in to the application.\n2. Open browser developer tools.\n3. Navigate to Application -> Cookies.\n4. Check the attributes of the session token.',
      expectedBehavior: 'The session cookie must contain HttpOnly, Secure, and SameSite=Lax flags.',
      actualBehavior: 'Cookie is accessible via document.cookie and has no Secure flag.',
      environment: 'Windows 11, Chrome v127, Localhost',
      severity: Severity.CRITICAL,
      priority: Priority.URGENT,
      status: IssueStatus.IN_PROGRESS,
      projectId: coreProject.id,
      componentId: authComponent.id,
      reporterId: reporter.id,
      assigneeId: developer.id,
    },
  });

  // Issue 2: RESOLVED
  const issue2 = await prisma.issue.create({
    data: {
      key: 'CORE-102',
      title: 'Status bar transition UI elements overlap on mobile viewports',
      description: 'When viewing an issue on a mobile browser, the step-by-step progress/status timeline wraps awkwardly and overlaps with the main issue details header.',
      stepsToReproduce: '1. Navigate to /issues/CORE-101 on a mobile browser or emulator (width < 600px).\n2. View the visual progress bar at the top of the issue workspace.',
      expectedBehavior: 'The progress bar should scale down, stack vertically, or show a simplified mobile-friendly version.',
      actualBehavior: 'Buttons overlap and title text is illegible.',
      environment: 'iOS 17.5, Safari Mobile, iPhone 15 Pro',
      severity: Severity.MEDIUM,
      priority: Priority.LOW,
      status: IssueStatus.RESOLVED,
      projectId: coreProject.id,
      componentId: lifecycleComponent.id,
      reporterId: qa.id,
      assigneeId: developer.id,
    },
  });

  // Issue 3: NEW
  const issue3 = await prisma.issue.create({
    data: {
      key: 'CORE-103',
      title: 'Database seed missing PM role permissions in RBAC config',
      description: 'The database seeds correctly, but during the role permission matrix check, users with the PROJECT_MANAGER role are rejected from editing components in the project.',
      stepsToReproduce: '1. Log in as Peter Manager.\n2. Navigate to projects detail page.\n3. Attempt to create a component.\n4. Receive 403 Access Denied error.',
      expectedBehavior: 'Project Managers should be allowed to create and edit components for projects.',
      actualBehavior: 'Server Action rejects request as unauthorized.',
      environment: 'Server Logs, Node v20.12',
      severity: Severity.HIGH,
      priority: Priority.HIGH,
      status: IssueStatus.NEW,
      projectId: coreProject.id,
      componentId: authComponent.id,
      reporterId: admin.id,
      assigneeId: pm.id,
    },
  });

  // Issue 4: CLOSED
  const issue4 = await prisma.issue.create({
    data: {
      key: 'CORE-104',
      title: 'Search filters dropdown closes prematurely on checkbox select',
      description: 'In the main issue directory, when trying to select multiple severity levels, clicking any option immediately closes the dropdown menu instead of waiting for a outside click.',
      stepsToReproduce: '1. Go to /issues.\n2. Click the Severity filter dropdown.\n3. Click "CRITICAL".\n4. Dropdown closes immediately before you can click "HIGH".',
      expectedBehavior: 'Dropdown remains open until user clicks outside the filter container.',
      actualBehavior: 'Dropdown hides on first toggle select.',
      environment: 'macOS, Firefox v126',
      severity: Severity.LOW,
      priority: Priority.LOW,
      status: IssueStatus.CLOSED,
      projectId: coreProject.id,
      componentId: searchComponent.id,
      reporterId: qa.id,
      assigneeId: developer.id,
      closedAt: new Date(Date.now() - 24 * 3600 * 1000), // closed 1 day ago
    },
  });

  // Issue 5: VERIFICATION
  const issue5 = await prisma.issue.create({
    data: {
      key: 'CORE-105',
      title: 'State transition verification is bypassable by reporters',
      description: 'A reporter is able to transition an issue from RESOLVED straight to CLOSED without waiting for QA to verify the fix. This breaches the strict workflow.',
      stepsToReproduce: '1. Log in as Rachel Reporter.\n2. Open own issue which is currently in RESOLVED state.\n3. Click "Close Issue".\n4. Request succeeds.',
      expectedBehavior: 'Only QA, Admin, or PM roles should be able to verify and CLOSE issues. Reporters should only close if they verified it with QA role permission.',
      actualBehavior: 'State change goes through for the reporter directly.',
      environment: 'Ubuntu, Chrome v125',
      severity: Severity.HIGH,
      priority: Priority.HIGH,
      status: IssueStatus.VERIFICATION,
      projectId: coreProject.id,
      componentId: lifecycleComponent.id,
      reporterId: qa.id,
      assigneeId: developer.id,
    },
  });

  // Issue 6: TRIAGED
  const issue6 = await prisma.issue.create({
    data: {
      key: 'CORE-106',
      title: 'Implement Dark Mode themes for developer dashboards',
      description: 'The dashboard views currently only support a bright light theme. As this is a modern developer tool reconstruction, a high-contrast dark mode/glassmorphic interface is crucial for judges.',
      stepsToReproduce: 'None - Feature Request.',
      expectedBehavior: 'High quality CSS variables mapping for light/dark responsive styling.',
      actualBehavior: 'Light theme only.',
      environment: 'All devices',
      severity: Severity.LOW,
      priority: Priority.MEDIUM,
      status: IssueStatus.TRIAGED,
      projectId: coreProject.id,
      componentId: dashboardComponent.id,
      reporterId: pm.id,
    },
  });

  console.log('Issues seeded successfully!');

  // 6. Create Comments
  await prisma.comment.createMany({
    data: [
      {
        issueId: issue1.id,
        authorId: qa.id,
        content: 'This is a serious security risk for our hackathon demo. If the judges check cookie options, it will reflect poorly on the security section.',
      },
      {
        issueId: issue1.id,
        authorId: developer.id,
        content: 'Working on this. I will update our auth cookie helpers to sign cookie values and set httpOnly: true, secure: process.env.NODE_ENV === "production", and sameSite: "lax".',
      },
      {
        issueId: issue2.id,
        authorId: developer.id,
        content: 'Fixed this in our main layout CSS. Flex-wrap has been applied and step names hide on smaller viewports, leaving just the numbered circles.',
      },
      {
        issueId: issue5.id,
        authorId: developer.id,
        content: 'Implemented verification block. Now submitting this for QA validation. Quincy, please double check.',
      },
    ],
  });

  console.log('Comments seeded successfully!');

  // 7. Create Activities
  await prisma.activity.createMany({
    data: [
      {
        issueId: issue1.id,
        actorId: reporter.id,
        action: 'CREATE',
        details: JSON.stringify({ summary: 'Auth session JWT cookie missing flags' }),
      },
      {
        issueId: issue1.id,
        actorId: pm.id,
        action: 'STATUS_CHANGE',
        details: JSON.stringify({ old: 'NEW', new: 'TRIAGED' }),
      },
      {
        issueId: issue1.id,
        actorId: pm.id,
        action: 'ASSIGNEE_CHANGE',
        details: JSON.stringify({ old: null, new: 'Devin Coder' }),
      },
      {
        issueId: issue1.id,
        actorId: developer.id,
        action: 'STATUS_CHANGE',
        details: JSON.stringify({ old: 'ASSIGNED', new: 'IN_PROGRESS' }),
      },
      {
        issueId: issue2.id,
        actorId: qa.id,
        action: 'CREATE',
        details: JSON.stringify({ summary: 'Status bar transition UI elements overlap' }),
      },
      {
        issueId: issue2.id,
        actorId: developer.id,
        action: 'STATUS_CHANGE',
        details: JSON.stringify({ old: 'ASSIGNED', new: 'RESOLVED' }),
      },
      {
        issueId: issue5.id,
        actorId: developer.id,
        action: 'STATUS_CHANGE',
        details: JSON.stringify({ old: 'IN_PROGRESS', new: 'VERIFICATION' }),
      },
    ],
  });

  console.log('Activities seeded successfully!');

  // 8. Create Saved Filters
  await prisma.savedFilter.createMany({
    data: [
      {
        userId: developer.id,
        name: 'My Assigned Bugs',
        query: JSON.stringify({ assigneeId: developer.id, status: { notIn: [IssueStatus.CLOSED] } }),
      },
      {
        userId: qa.id,
        name: 'Ready for QA Verification',
        query: JSON.stringify({ status: IssueStatus.VERIFICATION }),
      },
    ],
  });

  console.log('Saved Filters seeded successfully!');

  // 9. Create Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: developer.id,
        title: 'New Assignment',
        content: 'You have been assigned to: "Auth session JWT cookie missing Secure & HttpOnly flags" (CORE-101)',
        link: '/issues/CORE-101',
      },
      {
        userId: pm.id,
        title: 'Critical Issue Reported',
        content: 'Rachel Reporter submitted a CRITICAL issue: "Auth session JWT cookie missing Secure & HttpOnly flags" (CORE-101)',
        link: '/issues/CORE-101',
      },
      {
        userId: qa.id,
        title: 'Issue Ready for Verification',
        content: 'CORE-102: "Status bar transition UI elements overlap on mobile viewports" is ready for testing.',
        link: '/issues/CORE-102',
      },
    ],
  });

  console.log('Notifications seeded successfully!');
  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
