import type { ExamQuestion } from '@/entities/exam';

type SingleTopic = {
  prompt: string;
  options: string[];
  correctIndex: number;
  tags: string[];
  explanation: string;
};

type MultiTopic = {
  prompt: string;
  options: string[];
  correctIndexes: number[];
  tags: string[];
  explanation: string;
};

type OrderingTopic = {
  prompt: string;
  options: string[];
  correctOrder: number[];
  tags: string[];
  explanation: string;
};

type CaseTopic = {
  prompt: string;
  options: string[];
  correctIndex: number;
  tags: string[];
  explanation: string;
};

type SectionTopics = {
  single: SingleTopic[];
  multi: MultiTopic[];
  ordering: OrderingTopic;
  case: CaseTopic;
};

const optionId = (index: number): string => String.fromCharCode(97 + index);

const makeOptions = (texts: string[]) =>
  texts.map((text, index) => ({
    id: optionId(index),
    text,
  }));

const createId = (prefix: string, index: number): string =>
  `${prefix}${String(index).padStart(3, '0')}`;

const makeSingle = (id: string, topic: SingleTopic): ExamQuestion => ({
  id,
  type: 'singleChoice',
  prompt: topic.prompt,
  options: makeOptions(topic.options),
  correctOptionId: optionId(topic.correctIndex),
  explanation: topic.explanation,
  tags: topic.tags,
});

const makeCase = (id: string, topic: CaseTopic): ExamQuestion => ({
  id,
  type: 'caseDecision',
  prompt: topic.prompt,
  options: makeOptions(topic.options),
  correctOptionId: optionId(topic.correctIndex),
  explanation: topic.explanation,
  tags: topic.tags,
});

const makeMulti = (id: string, topic: MultiTopic): ExamQuestion => ({
  id,
  type: 'multiChoice',
  prompt: topic.prompt,
  options: makeOptions(topic.options),
  correctOptionIds: topic.correctIndexes.map(optionId),
  explanation: topic.explanation,
  tags: topic.tags,
});

const makeOrdering = (id: string, topic: OrderingTopic): ExamQuestion => ({
  id,
  type: 'ordering',
  prompt: topic.prompt,
  options: makeOptions(topic.options),
  correctOrderOptionIds: topic.correctOrder.map(optionId),
  explanation: topic.explanation,
  tags: topic.tags,
});

const buildSection = (prefix: string, topics: SectionTopics): ExamQuestion[] => [
  ...topics.single.map((topic, index) => makeSingle(createId(prefix, index + 1), topic)),
  ...topics.multi.map((topic, index) => makeMulti(createId(prefix, index + 11), topic)),
  makeOrdering(createId(prefix, 14), topics.ordering),
  makeCase(createId(prefix, 15), topics.case),
];

const GENERAL_SINGLE: SingleTopic[] = [
  {
    prompt: 'Two tasks conflict on deadline and scope. What is the best first step?',
    options: [
      'Ask stakeholders for impact and choose by value',
      'Pick the easiest task',
      'Do both without discussion',
      'Delay silently',
    ],
    correctIndex: 0,
    tags: ['general', 'prioritization'],
    explanation: 'Clarifying impact and value enables an informed trade-off.',
  },
  {
    prompt: 'A story is unclear. How should you estimate it?',
    options: [
      'Run a time-boxed spike to reduce uncertainty',
      'Guess a number quickly',
      'Refuse to estimate at all',
      'Double a similar estimate without research',
    ],
    correctIndex: 0,
    tags: ['general', 'planning'],
    explanation: 'A short spike produces evidence and reduces estimation risk.',
  },
  {
    prompt: 'During code review you see no tests for a critical change. Best response?',
    options: ['Ask to add tests', 'Approve and fix later', 'Rewrite the code yourself', 'Ignore'],
    correctIndex: 0,
    tags: ['general', 'code-review'],
    explanation: 'Tests are part of the definition of done for critical changes.',
  },
  {
    prompt: 'A bug report says "it crashes". Best action?',
    options: [
      'Request steps and environment details',
      'Close as invalid',
      'Fix without reproducing',
      'Wait for more complaints',
    ],
    correctIndex: 0,
    tags: ['general', 'bugs'],
    explanation: 'Reproduction steps and context are required to diagnose the issue.',
  },
  {
    prompt: 'You realize a deadline is at risk. What should you do?',
    options: [
      'Communicate early and negotiate scope',
      'Work weekends quietly',
      'Hide the risk',
      'Blame dependencies later',
    ],
    correctIndex: 0,
    tags: ['general', 'communication'],
    explanation: 'Early communication enables scope or timeline adjustments.',
  },
  {
    prompt: 'CI fails after a merge on main. Best immediate action?',
    options: [
      'Fix or rollback to restore green',
      'Ignore until tomorrow',
      'Disable CI',
      'Add more jobs',
    ],
    correctIndex: 0,
    tags: ['general', 'ci'],
    explanation: 'Keeping the main branch green prevents cascading failures.',
  },
  {
    prompt: 'You get a production alert. First check?',
    options: ['User impact and error rate', 'Start refactor', 'Reboot servers', 'Turn off alerts'],
    correctIndex: 0,
    tags: ['general', 'monitoring'],
    explanation: 'Impact assessment guides the correct response level.',
  },
  {
    prompt: 'Need to release a risky change. Best safety net?',
    options: ['Feature flag with rollback', 'Deploy on Friday', 'Skip testing', 'Hardcode'],
    correctIndex: 0,
    tags: ['general', 'release'],
    explanation: 'Feature flags allow fast rollback without redeploying.',
  },
  {
    prompt: 'Too many status meetings waste time. Best improvement?',
    options: [
      'Move status updates async',
      'Add another meeting',
      'Stop communicating',
      'Only DM the manager',
    ],
    correctIndex: 0,
    tags: ['general', 'workflow'],
    explanation: 'Async updates reduce context switching while keeping visibility.',
  },
  {
    prompt: 'Requirement is ambiguous. Best next step?',
    options: [
      'Write acceptance criteria with product',
      'Implement assumptions silently',
      'Wait for QA to decide',
      'Ask another engineer to guess',
    ],
    correctIndex: 0,
    tags: ['general', 'requirements'],
    explanation: 'Clear acceptance criteria prevent rework and mismatched expectations.',
  },
  {
    prompt: 'Tech debt slows delivery. Best approach?',
    options: [
      'Plan small refactors inside iterations',
      'Big bang rewrite',
      'Ignore forever',
      'Refactor without tests',
    ],
    correctIndex: 0,
    tags: ['general', 'quality'],
    explanation: 'Small, planned refactors reduce risk while improving velocity.',
  },
  {
    prompt: 'A new teammate joins. Best onboarding?',
    options: [
      'Pairing plus clear docs and goals',
      'Give a huge task alone',
      'No access until week two',
      'Wait until they ask questions',
    ],
    correctIndex: 0,
    tags: ['general', 'team'],
    explanation: 'Guided onboarding speeds up ramp-up and reduces mistakes.',
  },
];

const GENERAL_MULTI: MultiTopic[] = [
  {
    prompt: 'What belongs in a good PR description? (Select all)',
    options: [
      'What and why summary',
      'How to test',
      'Screenshots for UI changes',
      'Only "please review"',
    ],
    correctIndexes: [0, 1, 2],
    tags: ['general', 'code-review'],
    explanation: 'Context and testing info make reviews efficient and safer.',
  },
  {
    prompt: 'During incident response, which actions are essential? (Select all)',
    options: [
      'Mitigate user impact',
      'Communicate status',
      'Document timeline',
      'Argue about blame',
    ],
    correctIndexes: [0, 1, 2],
    tags: ['general', 'incident'],
    explanation: 'Mitigation, communication, and documentation are core incident steps.',
  },
  {
    prompt: 'A solid bug report includes: (Select all)',
    options: [
      'Steps to reproduce',
      'Expected vs actual',
      'Environment details',
      'Only a guess of root cause',
    ],
    correctIndexes: [0, 1, 2],
    tags: ['general', 'bugs'],
    explanation: 'Repro steps, expectations, and context are required for triage.',
  },
  {
    prompt: 'Ways to reduce context switching: (Select all)',
    options: ['Limit WIP', 'Batch notifications', 'Block focus time', 'Always keep chat open'],
    correctIndexes: [0, 1, 2],
    tags: ['general', 'workflow'],
    explanation: 'Reducing interruptions increases throughput and quality.',
  },
  {
    prompt: 'Release checklist should include: (Select all)',
    options: ['Rollback plan', 'Monitoring and alerts', 'Staged rollout', 'Skip QA to save time'],
    correctIndexes: [0, 1, 2],
    tags: ['general', 'release'],
    explanation: 'Rollback and monitoring reduce risk during rollout.',
  },
  {
    prompt: 'Good review feedback is: (Select all)',
    options: ['Specific', 'Respectful', 'Actionable', 'Personal'],
    correctIndexes: [0, 1, 2],
    tags: ['general', 'communication'],
    explanation: 'Professional, actionable feedback improves outcomes.',
  },
];

const GENERAL_CASE: CaseTopic[] = [
  {
    prompt: 'Product wants a big feature before a hard deadline. What do you do?',
    options: [
      'Split into MVP and follow-up work',
      'Promise full scope anyway',
      'Say no without alternatives',
      'Ship without testing',
    ],
    correctIndex: 0,
    tags: ['general', 'prioritization'],
    explanation: 'Scoping to an MVP preserves deadlines while reducing risk.',
  },
  {
    prompt: 'A teammate repeatedly misses deadlines. Best action?',
    options: [
      'Have a 1:1 and align expectations',
      'Publicly shame the teammate',
      'Ignore and cover their work',
      'Escalate without talking first',
    ],
    correctIndex: 0,
    tags: ['general', 'team'],
    explanation: 'Direct, respectful feedback is the most constructive first step.',
  },
];

const GENERAL_QUESTIONS: ExamQuestion[] = [
  ...GENERAL_SINGLE.map((topic, index) => makeSingle(createId('q_gen_', index + 1), topic)),
  ...GENERAL_MULTI.map((topic, index) => makeMulti(createId('q_gen_', index + 13), topic)),
  ...GENERAL_CASE.map((topic, index) => makeCase(createId('q_gen_', index + 19), topic)),
];

const FRONTEND_TOPICS: SectionTopics = {
  single: [
    {
      prompt: 'A large list re-renders on every keystroke. Best first fix?',
      options: [
        'Memoize rows and keep handlers stable',
        'Move list to global state',
        'Disable typing',
        'Use setInterval to batch renders',
      ],
      correctIndex: 0,
      tags: ['frontend', 'performance'],
      explanation: 'Memoization and stable props reduce unnecessary renders.',
    },
    {
      prompt: 'LCP is high because hero images are heavy. Best fix?',
      options: [
        'Optimize and lazy load images',
        'Add more fonts',
        'Disable caching',
        'Increase CSS animations',
      ],
      correctIndex: 0,
      tags: ['frontend', 'performance'],
      explanation: 'Smaller images and lazy loading improve LCP.',
    },
    {
      prompt: 'Icon-only button fails accessibility. Best change?',
      options: [
        'Add aria-label',
        'Increase font size only',
        'Remove the button',
        'Use div instead of button',
      ],
      correctIndex: 0,
      tags: ['frontend', 'accessibility'],
      explanation: 'Screen readers require accessible labels.',
    },
    {
      prompt: 'Two distant components need shared state. Best approach?',
      options: [
        'Lift to common parent or store',
        'Duplicate state in both components',
        'Use window globals',
        'Pass data via URL only',
      ],
      correctIndex: 0,
      tags: ['frontend', 'state'],
      explanation: 'Single source of truth avoids desynchronization.',
    },
    {
      prompt: 'Form validation happens only on server. Best improvement?',
      options: [
        'Validate on client and server',
        'Client only',
        'Server only without feedback',
        'Disable validation',
      ],
      correctIndex: 0,
      tags: ['frontend', 'forms'],
      explanation: 'Client validation improves UX; server validation ensures safety.',
    },
    {
      prompt: 'Initial JS bundle is too large. Best fix?',
      options: [
        'Lazy load routes/components',
        'Inline all assets',
        'Ship debug build',
        'Disable caching',
      ],
      correctIndex: 0,
      tags: ['frontend', 'performance'],
      explanation: 'Lazy loading reduces initial payload.',
    },
    {
      prompt: 'Text inside a flex item is clipped. Fix?',
      options: [
        'Add min-width: 0 to the flex child',
        'Set fixed width everywhere',
        'Increase font size',
        'Remove flex layout',
      ],
      correctIndex: 0,
      tags: ['frontend', 'css'],
      explanation: 'Flex items need min-width:0 to allow shrinking.',
    },
    {
      prompt: 'Need to prevent XSS from user content. Best approach?',
      options: [
        'Escape output and avoid innerHTML',
        'Store in localStorage',
        'Use GET requests only',
        'Disable CSP',
      ],
      correctIndex: 0,
      tags: ['frontend', 'security'],
      explanation: 'Escaping untrusted content blocks script injection.',
    },
    {
      prompt: 'App crashes on render error. Best safety net?',
      options: [
        'Add error boundary with fallback',
        'Remove try/catch',
        'Ignore errors',
        'Reload every render',
      ],
      correctIndex: 0,
      tags: ['frontend', 'reliability'],
      explanation: 'Error boundaries prevent the entire app from crashing.',
    },
    {
      prompt: 'Repeated API calls on focus cause flicker. Best approach?',
      options: [
        'Use cache with stale-while-revalidate',
        'Disable caching',
        'Poll every second',
        'Store on window',
      ],
      correctIndex: 0,
      tags: ['frontend', 'data'],
      explanation: 'Caching reduces unnecessary refetching while keeping data fresh.',
    },
  ],
  multi: [
    {
      prompt: 'Which actions improve web performance? (Select all)',
      options: [
        'Code splitting',
        'Memoize heavy components',
        'Reduce layout thrash',
        'Add blocking scripts',
      ],
      correctIndexes: [0, 1, 2],
      tags: ['frontend', 'performance'],
      explanation: 'Reducing bundle size and layout work improves performance.',
    },
    {
      prompt: 'Accessibility checks include: (Select all)',
      options: ['Keyboard navigation', 'Visible focus', 'Proper labels', 'Remove semantic HTML'],
      correctIndexes: [0, 1, 2],
      tags: ['frontend', 'accessibility'],
      explanation: 'Keyboard access and labeling are essential for accessibility.',
    },
    {
      prompt: 'State management smells include: (Select all)',
      options: [
        'Duplicated source of truth',
        'Storing derived data',
        'Unbounded global state',
        'Scoped local state',
      ],
      correctIndexes: [0, 1, 2],
      tags: ['frontend', 'state'],
      explanation: 'Duplicated or globalized state often leads to bugs.',
    },
  ],
  ordering: {
    prompt: 'Order the steps to handle a critical UI regression.',
    options: [
      'Reproduce the issue',
      'Identify the change or rollback',
      'Apply a hotfix',
      'Add a regression test',
    ],
    correctOrder: [0, 1, 2, 3],
    tags: ['frontend', 'incident'],
    explanation: 'Reproduce, mitigate, fix, and then prevent regression.',
  },
  case: {
    prompt: 'Marketing wants a new banner today with layout risk. Best decision?',
    options: [
      'Ship behind a feature flag and monitor',
      'Hardcode directly to main',
      'Skip review and tests',
      'Remove CSS constraints',
    ],
    correctIndex: 0,
    tags: ['frontend', 'release'],
    explanation: 'Feature flags reduce risk while meeting urgency.',
  },
};

const FRONTEND_SECTION = buildSection('q_fe_', FRONTEND_TOPICS);

const BACKEND_TOPICS: SectionTopics = {
  single: [
    {
      prompt: 'Client retries can create duplicates. Best design?',
      options: ['Use idempotency keys', 'Increase timeout', 'Disable retries', 'Log more'],
      correctIndex: 0,
      tags: ['backend', 'api'],
      explanation: 'Idempotency keys make retries safe.',
    },
    {
      prompt: 'Need to update two tables atomically. Best approach?',
      options: [
        'Use a database transaction',
        'Two separate requests',
        'Cache only',
        'Async job only',
      ],
      correctIndex: 0,
      tags: ['backend', 'database'],
      explanation: 'Transactions guarantee atomicity.',
    },
    {
      prompt: 'Read-heavy endpoint is slow. Best fix?',
      options: ['Use cache-aside', 'Disable indexes', 'Increase response size', 'Add debug logs'],
      correctIndex: 0,
      tags: ['backend', 'performance'],
      explanation: 'Caching reduces repeated read load.',
    },
    {
      prompt: 'Protect API from abuse. Best safeguard?',
      options: [
        'Apply rate limiting',
        'Return bigger payload',
        'Remove auth',
        'Allow unlimited requests',
      ],
      correctIndex: 0,
      tags: ['backend', 'security'],
      explanation: 'Rate limiting controls abusive traffic.',
    },
    {
      prompt: 'Image processing is slow in request path. Best change?',
      options: [
        'Move to async worker queue',
        'Block request thread',
        'Disable uploads',
        'Increase JSON size',
      ],
      correctIndex: 0,
      tags: ['backend', 'scaling'],
      explanation: 'Background workers keep API latency low.',
    },
    {
      prompt: 'Need pagination for large datasets. Best choice?',
      options: [
        'Use cursor-based pagination',
        'Return all items',
        'Random offset',
        'Client-only paging',
      ],
      correctIndex: 0,
      tags: ['backend', 'api'],
      explanation: 'Cursor pagination scales better for large tables.',
    },
    {
      prompt: 'N+1 query problem observed. Best fix?',
      options: ['Batch load or join', 'Add more loops', 'Disable ORM', 'Add sleeps'],
      correctIndex: 0,
      tags: ['backend', 'database'],
      explanation: 'Batching reduces redundant queries.',
    },
    {
      prompt: 'Schema change with existing data. Best strategy?',
      options: [
        'Add nullable column then backfill',
        'Drop column immediately',
        'Edit production manually',
        'Rename without migration',
      ],
      correctIndex: 0,
      tags: ['backend', 'database'],
      explanation: 'Backward-compatible changes reduce downtime risk.',
    },
    {
      prompt: 'Need to trace requests across services. Best approach?',
      options: [
        'Propagate a correlation id',
        'Log only errors',
        'Disable tracing',
        'Use random id per log line',
      ],
      correctIndex: 0,
      tags: ['backend', 'observability'],
      explanation: 'Correlation ids link logs and traces across services.',
    },
    {
      prompt: 'Need reliable event publishing after DB write. Best pattern?',
      options: ['Use outbox pattern', 'Publish before commit', 'Cron only', 'Ignore failures'],
      correctIndex: 0,
      tags: ['backend', 'reliability'],
      explanation: 'Outbox ensures events are not lost on failures.',
    },
  ],
  multi: [
    {
      prompt: 'Good API design practices include: (Select all)',
      options: [
        'Consistent error codes',
        'Pagination',
        'Versioning',
        'Changing responses silently',
      ],
      correctIndexes: [0, 1, 2],
      tags: ['backend', 'api'],
      explanation: 'Consistency and versioning reduce breaking changes.',
    },
    {
      prompt: 'How to reduce thundering herd? (Select all)',
      options: ['Cache with TTL', 'Request coalescing', 'Circuit breaker', 'Disable caching'],
      correctIndexes: [0, 1, 2],
      tags: ['backend', 'performance'],
      explanation: 'Caching and request coalescing reduce synchronized load spikes.',
    },
    {
      prompt: 'Input validation should: (Select all)',
      options: [
        'Validate on server',
        'Use schema validation',
        'Sanitize user input',
        'Trust client only',
      ],
      correctIndexes: [0, 1, 2],
      tags: ['backend', 'security'],
      explanation: 'Server-side validation is required for security.',
    },
  ],
  ordering: {
    prompt: 'Order the steps for a database incident.',
    options: [
      'Detect and assess impact',
      'Mitigate with failover or rollback',
      'Communicate status',
      'Fix root cause and follow up',
    ],
    correctOrder: [0, 1, 2, 3],
    tags: ['backend', 'incident'],
    explanation: 'Assess, mitigate, communicate, then resolve and learn.',
  },
  case: {
    prompt: 'Users report duplicate charges due to retries. Best decision?',
    options: [
      'Add idempotency keys and deduplicate',
      'Disable payments entirely',
      'Ignore duplicates',
      'Increase timeout only',
    ],
    correctIndex: 0,
    tags: ['backend', 'payments'],
    explanation: 'Idempotency prevents duplicates on retries.',
  },
};

const BACKEND_SECTION = buildSection('q_be_', BACKEND_TOPICS);

const FULLSTACK_TOPICS: SectionTopics = {
  single: [
    {
      prompt: 'UI shows stale data after updates. Best fix?',
      options: [
        'Define a single source of truth and invalidate cache',
        'Duplicate state in UI and API',
        'Hardcode values in UI',
        'Ignore the issue',
      ],
      correctIndex: 0,
      tags: ['fullstack', 'data'],
      explanation: 'Single source of truth avoids data drift.',
    },
    {
      prompt: 'Need aggregated data from multiple services. Best approach?',
      options: [
        'Use a BFF to aggregate',
        'Call all services from UI',
        'Hardcode in UI',
        'Disable auth',
      ],
      correctIndex: 0,
      tags: ['fullstack', 'architecture'],
      explanation: 'A BFF reduces client complexity and request fan-out.',
    },
    {
      prompt: 'Auth for SPA needs security. Best approach?',
      options: [
        'Use httpOnly cookies or secure storage with refresh',
        'Store tokens in localStorage only',
        'Put token in URL',
        'Disable HTTPS',
      ],
      correctIndex: 0,
      tags: ['fullstack', 'security'],
      explanation: 'Secure storage and rotation reduce token theft risk.',
    },
    {
      prompt: 'Large file upload is slow. Best design?',
      options: [
        'Use pre-signed URL and direct upload',
        'Send through JSON payload',
        'Split into many form posts',
        'Block UI until upload completes',
      ],
      correctIndex: 0,
      tags: ['fullstack', 'performance'],
      explanation: 'Direct upload avoids API bottlenecks.',
    },
    {
      prompt: 'Page is slow due to heavy query. Best fix?',
      options: [
        'Paginate and lazy load',
        'Load all items at once',
        'Increase CSS',
        'Disable cache',
      ],
      correctIndex: 0,
      tags: ['fullstack', 'performance'],
      explanation: 'Pagination reduces payload and server load.',
    },
    {
      prompt: 'Errors are inconsistent across API and UI. Best fix?',
      options: [
        'Standardize error shape',
        'Let each team decide',
        'Return HTML errors',
        'Hide errors',
      ],
      correctIndex: 0,
      tags: ['fullstack', 'api'],
      explanation: 'Standard errors improve handling and UX.',
    },
    {
      prompt: 'Static assets are slow globally. Best approach?',
      options: [
        'Use CDN and caching headers',
        'Disable caching',
        'Bundle into JS only',
        'Serve from DB',
      ],
      correctIndex: 0,
      tags: ['fullstack', 'performance'],
      explanation: 'CDNs reduce latency and improve cache hit rate.',
    },
    {
      prompt: 'Validation is duplicated in FE and BE. Best improvement?',
      options: [
        'Share validation schema',
        'Skip validation',
        'Validate only in UI',
        'Validate only in DB',
      ],
      correctIndex: 0,
      tags: ['fullstack', 'quality'],
      explanation: 'Shared schemas reduce drift and bugs.',
    },
    {
      prompt: 'Need SEO for a marketing page. Best rendering choice?',
      options: ['Use SSR or SSG', 'Pure CSR only', 'Disable metadata', 'Hide content'],
      correctIndex: 0,
      tags: ['fullstack', 'frontend'],
      explanation: 'SSR or SSG improves crawlability and initial load.',
    },
    {
      prompt: 'Need end-to-end tracing. Best approach?',
      options: [
        'Pass correlation id from UI through API',
        'Only log in frontend',
        'Only log in backend',
        'Disable logs',
      ],
      correctIndex: 0,
      tags: ['fullstack', 'observability'],
      explanation: 'Correlation ids connect user actions to server traces.',
    },
  ],
  multi: [
    {
      prompt: 'Fullstack release checklist includes: (Select all)',
      options: ['Run migrations', 'Deploy backend', 'Deploy frontend', 'Skip monitoring'],
      correctIndexes: [0, 1, 2],
      tags: ['fullstack', 'release'],
      explanation: 'Coordinated deploys and migrations reduce failures.',
    },
    {
      prompt: 'Improve UX for slow API responses: (Select all)',
      options: ['Skeleton loading', 'Optimistic UI', 'Client caching', 'Block UI without feedback'],
      correctIndexes: [0, 1, 2],
      tags: ['fullstack', 'ux'],
      explanation: 'Feedback and caching reduce perceived latency.',
    },
    {
      prompt: 'Secure auth setup should include: (Select all)',
      options: ['httpOnly cookies', 'CSRF protection', 'Token rotation', 'Token in query string'],
      correctIndexes: [0, 1, 2],
      tags: ['fullstack', 'security'],
      explanation: 'These measures protect against token theft and CSRF.',
    },
  ],
  ordering: {
    prompt: 'Order the steps to add a new field end-to-end.',
    options: ['Add DB migration', 'Update API contract', 'Update UI', 'Deploy in order'],
    correctOrder: [0, 1, 2, 3],
    tags: ['fullstack', 'delivery'],
    explanation: 'Database and API changes must precede UI usage.',
  },
  case: {
    prompt: 'A backend bug breaks the page for all users. Best decision?',
    options: [
      'Rollback backend and show a safe fallback UI',
      'Patch UI only',
      'Ignore backend errors',
      'Remove monitoring to stop alerts',
    ],
    correctIndex: 0,
    tags: ['fullstack', 'incident'],
    explanation: 'Rollback plus fallback restores service quickly.',
  },
};

const FULLSTACK_SECTION = buildSection('q_fs_', FULLSTACK_TOPICS);

const MOBILE_TOPICS: SectionTopics = {
  single: [
    {
      prompt: 'Users report battery drain. Best first fix?',
      options: [
        'Reduce background polling',
        'Increase refresh rate',
        'Disable device sleep',
        'Add more animations',
      ],
      correctIndex: 0,
      tags: ['mobile', 'performance'],
      explanation: 'Background polling is a common battery drain source.',
    },
    {
      prompt: 'Offline use is required. Best approach?',
      options: [
        'Cache data and queue actions',
        'Disable offline',
        'Show blank screen',
        'Delete data',
      ],
      correctIndex: 0,
      tags: ['mobile', 'offline'],
      explanation: 'Caching and queuing provide a reliable offline experience.',
    },
    {
      prompt: 'App store rejection for permissions. Best fix?',
      options: [
        'Provide clear permission rationale',
        'Request all permissions upfront',
        'Hide permission prompts',
        'Remove the feature entirely',
      ],
      correctIndex: 0,
      tags: ['mobile', 'release'],
      explanation: 'Clear rationale improves approval and user trust.',
    },
    {
      prompt: 'Crash happens in production. Best action?',
      options: [
        'Use crash reporting and ship a hotfix',
        'Ignore the crash',
        'Wait for users to email',
        'Remove logging',
      ],
      correctIndex: 0,
      tags: ['mobile', 'reliability'],
      explanation: 'Crash reporting provides evidence for a targeted hotfix.',
    },
    {
      prompt: 'Cold start is slow. Best improvement?',
      options: [
        'Defer heavy initialization',
        'Add more startup work',
        'Load all images at startup',
        'Disable caching',
      ],
      correctIndex: 0,
      tags: ['mobile', 'performance'],
      explanation: 'Deferring work reduces time-to-first-frame.',
    },
    {
      prompt: 'Push notifications annoy users. Best strategy?',
      options: [
        'Use opt-in and relevance',
        'Send every minute',
        'Disable unsubscribe',
        'Ignore guidelines',
      ],
      correctIndex: 0,
      tags: ['mobile', 'engagement'],
      explanation: 'Relevant, opt-in messaging reduces churn.',
    },
    {
      prompt: 'Network is flaky. Best handling?',
      options: [
        'Retry with exponential backoff',
        'Retry instantly forever',
        'Fail silently',
        'Block the UI completely',
      ],
      correctIndex: 0,
      tags: ['mobile', 'network'],
      explanation: 'Backoff reduces load while improving reliability.',
    },
    {
      prompt: 'UI jank during scroll. Best fix?',
      options: [
        'Move heavy work off the main thread',
        'Add more shadows',
        'Increase list size',
        'Disable GPU acceleration',
      ],
      correctIndex: 0,
      tags: ['mobile', 'performance'],
      explanation: 'Offloading work keeps frame time stable.',
    },
    {
      prompt: 'Token security on device. Best storage?',
      options: [
        'Secure storage or keychain',
        'Plain preferences',
        'Embed in app binary',
        'Print to logs',
      ],
      correctIndex: 0,
      tags: ['mobile', 'security'],
      explanation: 'Secure storage reduces credential leakage.',
    },
    {
      prompt: 'Risky release to many users. Best rollout?',
      options: ['Use staged rollout', 'Release to all users', 'Skip QA', 'Disable crash reporting'],
      correctIndex: 0,
      tags: ['mobile', 'release'],
      explanation: 'Staged rollouts reduce blast radius.',
    },
  ],
  multi: [
    {
      prompt: 'Ways to reduce app size: (Select all)',
      options: [
        'Remove unused assets',
        'Split by ABI',
        'Compress resources',
        'Bundle debug symbols',
      ],
      correctIndexes: [0, 1, 2],
      tags: ['mobile', 'performance'],
      explanation: 'Removing unused assets and compressing reduces APK size.',
    },
    {
      prompt: 'Offline sync best practices: (Select all)',
      options: ['Queue actions', 'Conflict resolution', 'Sync status UI', 'Discard user changes'],
      correctIndexes: [0, 1, 2],
      tags: ['mobile', 'offline'],
      explanation: 'Queueing and conflict handling maintain data integrity.',
    },
    {
      prompt: 'Mobile accessibility includes: (Select all)',
      options: ['Large touch targets', 'Screen reader labels', 'High contrast', 'Disable focus'],
      correctIndexes: [0, 1, 2],
      tags: ['mobile', 'accessibility'],
      explanation: 'Touch targets and labels are key for accessibility.',
    },
  ],
  ordering: {
    prompt: 'Order the steps to debug a crash.',
    options: ['Reproduce or collect logs', 'Identify root cause', 'Fix and test', 'Release patch'],
    correctOrder: [0, 1, 2, 3],
    tags: ['mobile', 'debugging'],
    explanation: 'Evidence first, then fix, test, and release.',
  },
  case: {
    prompt: 'Users complain the list loads slowly. Best decision?',
    options: [
      'Paginate and cache results',
      'Load all items at once',
      'Remove filters',
      'Disable the list',
    ],
    correctIndex: 0,
    tags: ['mobile', 'performance'],
    explanation: 'Pagination and caching reduce load time and memory usage.',
  },
};

const MOBILE_SECTION = buildSection('q_mob_', MOBILE_TOPICS);

const QA_TOPICS: SectionTopics = {
  single: [
    {
      prompt: 'Testing pyramid suggests most tests should be:',
      options: ['Unit tests', 'End-to-end tests', 'Manual only', 'UI snapshot only'],
      correctIndex: 0,
      tags: ['qa', 'testing'],
      explanation: 'Unit tests are fast and cover most logic.',
    },
    {
      prompt: 'A test is flaky. Best first fix?',
      options: [
        'Remove shared state and timing dependencies',
        'Increase timeout blindly',
        'Ignore it',
        'Disable CI',
      ],
      correctIndex: 0,
      tags: ['qa', 'flaky'],
      explanation: 'Stabilizing the root cause prevents future flakiness.',
    },
    {
      prompt: 'When should you use a stub instead of a mock?',
      options: [
        'For deterministic external responses',
        'For verifying internal calls',
        'Never',
        'Always use mock',
      ],
      correctIndex: 0,
      tags: ['qa', 'test-doubles'],
      explanation: 'Stubs provide consistent responses without behavior verification.',
    },
    {
      prompt: 'Choose the best level for critical user journeys:',
      options: ['End-to-end tests', 'Only unit tests', 'Only manual tests', 'No tests'],
      correctIndex: 0,
      tags: ['qa', 'testing'],
      explanation: 'Critical flows need end-to-end coverage.',
    },
    {
      prompt: 'A bug affects payment flow for many users. Severity is:',
      options: ['High', 'Low', 'Trivial', 'Cosmetic'],
      correctIndex: 0,
      tags: ['qa', 'bugs'],
      explanation: 'High impact and frequency means high severity.',
    },
    {
      prompt: 'When should regression suite run?',
      options: ['Before releases or major changes', 'Once a year', 'Only after failures', 'Never'],
      correctIndex: 0,
      tags: ['qa', 'release'],
      explanation: 'Regression testing reduces release risk.',
    },
    {
      prompt: 'Best practice for test data?',
      options: [
        'Deterministic and isolated data',
        'Shared mutable data',
        'Random untracked data',
        'Production data only',
      ],
      correctIndex: 0,
      tags: ['qa', 'data'],
      explanation: 'Deterministic data makes tests reliable.',
    },
    {
      prompt: 'Exploratory testing is most useful when:',
      options: [
        'The build is stable and time is available',
        'Right after every commit',
        'Never',
        'Only for UI colors',
      ],
      correctIndex: 0,
      tags: ['qa', 'exploratory'],
      explanation: 'Exploratory testing finds issues beyond scripts.',
    },
    {
      prompt: 'Best time to clarify acceptance criteria?',
      options: ['Before test planning', 'After release', 'Only during bug triage', 'Never'],
      correctIndex: 0,
      tags: ['qa', 'requirements'],
      explanation: 'Clear criteria guide accurate testing.',
    },
    {
      prompt: 'Best automation ROI comes from:',
      options: [
        'Stable, repetitive scenarios',
        'One-off edge cases',
        'Rare manual flows',
        'Changing prototypes',
      ],
      correctIndex: 0,
      tags: ['qa', 'automation'],
      explanation: 'Stable scenarios benefit most from automation.',
    },
  ],
  multi: [
    {
      prompt: 'Qualities of a good test case: (Select all)',
      options: ['Clear steps', 'Expected results', 'Relevant data', 'Ambiguous outcome'],
      correctIndexes: [0, 1, 2],
      tags: ['qa', 'testing'],
      explanation: 'Clarity and expected outcomes make tests reliable.',
    },
    {
      prompt: 'Common sources of flaky tests: (Select all)',
      options: ['Async timing issues', 'Shared state', 'Random data', 'Deterministic mocks'],
      correctIndexes: [0, 1, 2],
      tags: ['qa', 'flaky'],
      explanation: 'Timing, shared state, and randomness cause flakiness.',
    },
    {
      prompt: 'Smoke tests should cover: (Select all)',
      options: ['Login', 'Core user flow', 'Payments', 'All edge cases'],
      correctIndexes: [0, 1, 2],
      tags: ['qa', 'release'],
      explanation: 'Smoke tests verify core functionality quickly.',
    },
  ],
  ordering: {
    prompt: 'Order the steps to verify a bug fix.',
    options: [
      'Reproduce the bug',
      'Get the fixed build',
      'Retest the scenario',
      'Close the ticket',
    ],
    correctOrder: [0, 1, 2, 3],
    tags: ['qa', 'workflow'],
    explanation: 'Reproduce, verify fix, then close.',
  },
  case: {
    prompt: 'Release is tomorrow but a new feature is unstable. Best decision?',
    options: [
      'Disable the feature flag and test core flows',
      'Ship the feature anyway',
      'Stop all testing',
      'Ignore the instability',
    ],
    correctIndex: 0,
    tags: ['qa', 'release'],
    explanation: 'Stabilizing core flows protects the release.',
  },
};

const QA_SECTION = buildSection('q_qa_', QA_TOPICS);

const DEVOPS_TOPICS: SectionTopics = {
  single: [
    {
      prompt: 'Best first step to improve observability?',
      options: [
        'Add traces and structured logs',
        'Remove metrics',
        'Increase log noise',
        'Disable alerts',
      ],
      correctIndex: 0,
      tags: ['devops', 'observability'],
      explanation: 'Tracing and structured logs enable faster debugging.',
    },
    {
      prompt: 'During an incident, what should happen first?',
      options: [
        'Mitigate user impact',
        'Write a postmortem',
        'Refactor services',
        'Upgrade dependencies',
      ],
      correctIndex: 0,
      tags: ['devops', 'incident'],
      explanation: 'Mitigation restores service quickly.',
    },
    {
      prompt: 'Container health checks are used to:',
      options: [
        'Restart unhealthy instances',
        'Increase CPU usage',
        'Disable monitoring',
        'Force manual restarts',
      ],
      correctIndex: 0,
      tags: ['devops', 'containers'],
      explanation: 'Health checks keep services available.',
    },
    {
      prompt: 'Safe deployment strategy for a risky change:',
      options: ['Canary release', 'Big bang deploy', 'Deploy on Friday night', 'Skip monitoring'],
      correctIndex: 0,
      tags: ['devops', 'release'],
      explanation: 'Canary releases limit blast radius.',
    },
    {
      prompt: 'Secrets should be stored in:',
      options: [
        'Secret manager or vault',
        'Source control',
        'Plain env file in repo',
        'Client storage',
      ],
      correctIndex: 0,
      tags: ['devops', 'security'],
      explanation: 'Secret managers provide access control and rotation.',
    },
    {
      prompt: 'Best way to scale web traffic automatically:',
      options: [
        'Autoscaling on metrics',
        'Manual scaling only',
        'Disable caching',
        'Restart servers often',
      ],
      correctIndex: 0,
      tags: ['devops', 'scaling'],
      explanation: 'Autoscaling responds to demand changes.',
    },
    {
      prompt: 'Backups are only useful if you:',
      options: [
        'Test restores regularly',
        'Store them on the same disk',
        'Never verify',
        'Ignore retention',
      ],
      correctIndex: 0,
      tags: ['devops', 'reliability'],
      explanation: 'Restore tests validate backup integrity.',
    },
    {
      prompt: 'Infrastructure as Code should be:',
      options: [
        'Version controlled and reviewed',
        'Edited manually in production',
        'Stored in chat',
        'Binary only',
      ],
      correctIndex: 0,
      tags: ['devops', 'iac'],
      explanation: 'Version control provides auditability and rollback.',
    },
    {
      prompt: 'CI pipelines should:',
      options: [
        'Fail fast on errors',
        'Ignore failing tests',
        'Run without logs',
        'Skip linting always',
      ],
      correctIndex: 0,
      tags: ['devops', 'ci'],
      explanation: 'Failing fast saves time and cost.',
    },
    {
      prompt: 'A sudden cost spike is detected. Best action?',
      options: [
        'Review resource usage and scale policies',
        'Ignore it',
        'Turn off monitoring',
        'Add more instances',
      ],
      correctIndex: 0,
      tags: ['devops', 'cost'],
      explanation: 'Cost review identifies waste and misconfiguration.',
    },
  ],
  multi: [
    {
      prompt: 'Golden signals for monitoring include: (Select all)',
      options: ['Latency', 'Error rate', 'Saturation', 'Number of meetings'],
      correctIndexes: [0, 1, 2],
      tags: ['devops', 'observability'],
      explanation: 'Golden signals cover user impact and system health.',
    },
    {
      prompt: 'Incident communication should include: (Select all)',
      options: ['Status updates', 'Internal coordination channel', 'Timeline summary', 'Silence'],
      correctIndexes: [0, 1, 2],
      tags: ['devops', 'incident'],
      explanation: 'Clear communication reduces confusion during incidents.',
    },
    {
      prompt: 'Secure CI/CD practices include: (Select all)',
      options: [
        'Least privilege tokens',
        'Signed artifacts',
        'Secret scanning',
        'Credentials in logs',
      ],
      correctIndexes: [0, 1, 2],
      tags: ['devops', 'security'],
      explanation: 'Secure pipelines protect the supply chain.',
    },
  ],
  ordering: {
    prompt: 'Order the steps of incident response.',
    options: [
      'Detect and triage',
      'Mitigate impact',
      'Communicate status',
      'Postmortem and follow-up',
    ],
    correctOrder: [0, 1, 2, 3],
    tags: ['devops', 'incident'],
    explanation: 'Respond, stabilize, communicate, then learn.',
  },
  case: {
    prompt: 'A deployment causes a spike in errors. Best decision?',
    options: [
      'Rollback and investigate',
      'Ignore alerts',
      'Disable monitoring',
      'Scale without changes',
    ],
    correctIndex: 0,
    tags: ['devops', 'release'],
    explanation: 'Rollback restores stability while root cause is found.',
  },
};

const DEVOPS_SECTION = buildSection('q_ops_', DEVOPS_TOPICS);

const DATA_ENGINEER_TOPICS: SectionTopics = {
  single: [
    {
      prompt: 'Choose streaming vs batch when you need near real-time analytics:',
      options: ['Streaming', 'Batch once per week', 'Manual exports', 'No pipeline'],
      correctIndex: 0,
      tags: ['data-engineer', 'streaming'],
      explanation: 'Streaming supports near real-time use cases.',
    },
    {
      prompt: 'Schema evolution should prefer:',
      options: [
        'Backward-compatible changes',
        'Breaking changes without notice',
        'Dropping columns immediately',
        'Random renames',
      ],
      correctIndex: 0,
      tags: ['data-engineer', 'schema'],
      explanation: 'Backward compatibility reduces pipeline failures.',
    },
    {
      prompt: 'Best first data quality check:',
      options: [
        'Null and range checks',
        'Random sampling only',
        'No checks',
        'Manual Excel review',
      ],
      correctIndex: 0,
      tags: ['data-engineer', 'data-quality'],
      explanation: 'Basic constraints catch common issues.',
    },
    {
      prompt: 'For large tables, best partitioning key is often:',
      options: ['Date or time', 'Random id', 'User name', 'Free text'],
      correctIndex: 0,
      tags: ['data-engineer', 'storage'],
      explanation: 'Time-based partitioning supports efficient scans.',
    },
    {
      prompt: 'Idempotent ETL jobs should:',
      options: [
        'Use checkpoints or upserts',
        'Append blindly',
        'Delete everything',
        'Run only once',
      ],
      correctIndex: 0,
      tags: ['data-engineer', 'etl'],
      explanation: 'Idempotency prevents duplicate data.',
    },
    {
      prompt: 'Best way to handle historical backfill:',
      options: [
        'Run in controlled windows',
        'Run all at once without limits',
        'Skip validation',
        'Disable monitoring',
      ],
      correctIndex: 0,
      tags: ['data-engineer', 'etl'],
      explanation: 'Controlled backfill reduces load and risk.',
    },
    {
      prompt: 'Data lineage helps you:',
      options: [
        'Trace data sources and transformations',
        'Hide dependencies',
        'Skip documentation',
        'Avoid audits',
      ],
      correctIndex: 0,
      tags: ['data-engineer', 'governance'],
      explanation: 'Lineage supports debugging and compliance.',
    },
    {
      prompt: 'Best storage format for analytics:',
      options: [
        'Columnar format like Parquet',
        'Plain text only',
        'Random binary blobs',
        'CSV only',
      ],
      correctIndex: 0,
      tags: ['data-engineer', 'storage'],
      explanation: 'Columnar formats improve query performance.',
    },
    {
      prompt: 'A pipeline failed mid-run. Best recovery?',
      options: [
        'Replay from last checkpoint',
        'Start from scratch without checks',
        'Ignore the failure',
        'Delete data',
      ],
      correctIndex: 0,
      tags: ['data-engineer', 'reliability'],
      explanation: 'Checkpointing avoids data loss and duplication.',
    },
    {
      prompt: 'A large join is slow. Best optimization?',
      options: [
        'Partition and pre-aggregate',
        'Add more columns',
        'Disable indexes',
        'Run on a single node',
      ],
      correctIndex: 0,
      tags: ['data-engineer', 'performance'],
      explanation: 'Partitioning and pre-aggregation reduce compute cost.',
    },
  ],
  multi: [
    {
      prompt: 'Data quality dimensions include: (Select all)',
      options: ['Completeness', 'Accuracy', 'Timeliness', 'Popularity'],
      correctIndexes: [0, 1, 2],
      tags: ['data-engineer', 'data-quality'],
      explanation: 'Core dimensions cover missing, wrong, and late data.',
    },
    {
      prompt: 'Pipeline reliability practices include: (Select all)',
      options: ['Retries with backoff', 'Idempotency', 'Monitoring', 'Silent failures'],
      correctIndexes: [0, 1, 2],
      tags: ['data-engineer', 'reliability'],
      explanation: 'Retries, idempotency, and monitoring keep pipelines stable.',
    },
    {
      prompt: 'Streaming safety techniques include: (Select all)',
      options: ['Watermarking', 'Late data handling', 'Deduplication', 'Ignoring ordering'],
      correctIndexes: [0, 1, 2],
      tags: ['data-engineer', 'streaming'],
      explanation: 'Watermarks and deduplication improve stream correctness.',
    },
  ],
  ordering: {
    prompt: 'Order the steps to onboard a new dataset.',
    options: [
      'Define schema and ownership',
      'Ingest raw data',
      'Validate quality',
      'Publish to consumers',
    ],
    correctOrder: [0, 1, 2, 3],
    tags: ['data-engineer', 'workflow'],
    explanation: 'Clear schema and validation come before publishing.',
  },
  case: {
    prompt: 'Upstream schema change broke the job. Best decision?',
    options: [
      'Add compatibility handling and backfill',
      'Ignore the change',
      'Delete historical data',
      'Stop the pipeline permanently',
    ],
    correctIndex: 0,
    tags: ['data-engineer', 'schema'],
    explanation: 'Compatibility and backfill restore correctness.',
  },
};

const DATA_ENGINEER_SECTION = buildSection('q_de_', DATA_ENGINEER_TOPICS);

const DATA_SCIENCE_TOPICS: SectionTopics = {
  single: [
    {
      prompt: 'A model uses future data in features. This is:',
      options: ['Data leakage', 'Regularization', 'Data augmentation', 'Feature scaling'],
      correctIndex: 0,
      tags: ['ml', 'data-quality'],
      explanation: 'Leakage causes overly optimistic results.',
    },
    {
      prompt: 'Time-series prediction should use:',
      options: [
        'Time-based train/test split',
        'Random shuffle split',
        'No split',
        'Only test data',
      ],
      correctIndex: 0,
      tags: ['ml', 'validation'],
      explanation: 'Time-based splits prevent leakage from the future.',
    },
    {
      prompt: 'Metric choice should:',
      options: [
        'Align with business outcome',
        'Be random',
        'Always be accuracy',
        'Ignore class imbalance',
      ],
      correctIndex: 0,
      tags: ['ml', 'evaluation'],
      explanation: 'Metrics must reflect real-world success.',
    },
    {
      prompt: 'Class imbalance is best handled by:',
      options: [
        'Reweighting or resampling',
        'Ignoring minority class',
        'Removing positives',
        'Only accuracy',
      ],
      correctIndex: 0,
      tags: ['ml', 'training'],
      explanation: 'Reweighting improves learning from rare classes.',
    },
    {
      prompt: 'A feature store is used to:',
      options: [
        'Reuse consistent features across models',
        'Store raw CSV only',
        'Replace the database',
        'Avoid monitoring',
      ],
      correctIndex: 0,
      tags: ['ml', 'feature-store'],
      explanation: 'Feature stores reduce training-serving skew.',
    },
    {
      prompt: 'Offline/online skew is reduced by:',
      options: [
        'Sharing the same preprocessing code',
        'Manual copy-paste',
        'Different pipelines',
        'Random features',
      ],
      correctIndex: 0,
      tags: ['ml', 'deployment'],
      explanation: 'Consistent preprocessing reduces skew.',
    },
    {
      prompt: 'Model drift is best detected by:',
      options: [
        'Monitoring data and performance metrics',
        'Waiting for user reports',
        'Removing logging',
        'Random sampling only',
      ],
      correctIndex: 0,
      tags: ['ml', 'monitoring'],
      explanation: 'Drift detection requires monitoring over time.',
    },
    {
      prompt: 'Hyperparameter tuning should use:',
      options: ['Validation set', 'Training set only', 'Test set only', 'No evaluation'],
      correctIndex: 0,
      tags: ['ml', 'training'],
      explanation: 'Validation prevents overfitting to the test set.',
    },
    {
      prompt: 'Explainability for tree models can use:',
      options: ['SHAP values', 'Random numbers', 'Only accuracy', 'No analysis'],
      correctIndex: 0,
      tags: ['ml', 'explainability'],
      explanation: 'SHAP provides feature contribution insights.',
    },
    {
      prompt: 'A new model is ready for production. Best rollout?',
      options: [
        'Shadow or A/B test',
        'Replace immediately',
        'Disable monitoring',
        'Skip validation',
      ],
      correctIndex: 0,
      tags: ['ml', 'deployment'],
      explanation: 'Shadow or A/B testing reduces risk.',
    },
  ],
  multi: [
    {
      prompt: 'Signals of data leakage: (Select all)',
      options: [
        'Unrealistically high accuracy',
        'Features derived from target',
        'Perfect training score',
        'Slow training',
      ],
      correctIndexes: [0, 1, 2],
      tags: ['ml', 'data-quality'],
      explanation: 'Leakage often yields unrealistically strong results.',
    },
    {
      prompt: 'Good experiment tracking includes: (Select all)',
      options: ['Dataset version', 'Hyperparameters', 'Metrics', 'Only final model name'],
      correctIndexes: [0, 1, 2],
      tags: ['ml', 'experiments'],
      explanation: 'Tracking data, params, and metrics enables reproducibility.',
    },
    {
      prompt: 'Model monitoring should watch: (Select all)',
      options: ['Data drift', 'Performance drop', 'Latency', 'Team mood'],
      correctIndexes: [0, 1, 2],
      tags: ['ml', 'monitoring'],
      explanation: 'Drift and performance degrade real-world outcomes.',
    },
  ],
  ordering: {
    prompt: 'Order the steps to productionize a model.',
    options: ['Train model', 'Validate metrics', 'Package and deploy', 'Monitor in production'],
    correctOrder: [0, 1, 2, 3],
    tags: ['ml', 'deployment'],
    explanation: 'Validation precedes deployment; monitoring follows.',
  },
  case: {
    prompt: 'New model is slightly better offline but much slower. Best decision?',
    options: [
      'Run an A/B test or optimize latency first',
      'Deploy immediately',
      'Reject without analysis',
      'Disable monitoring',
    ],
    correctIndex: 0,
    tags: ['ml', 'performance'],
    explanation: 'Latency impact must be validated before rollout.',
  },
};

const DATA_SCIENCE_SECTION = buildSection('q_ml_', DATA_SCIENCE_TOPICS);

const SECURITY_TOPICS: SectionTopics = {
  single: [
    {
      prompt: 'Best defense against SQL injection:',
      options: [
        'Parameterized queries',
        'String concatenation',
        'Client validation only',
        'Disable logs',
      ],
      correctIndex: 0,
      tags: ['security', 'owasp'],
      explanation: 'Parameterized queries prevent injection.',
    },
    {
      prompt: 'Session security should include:',
      options: ['Token rotation', 'Never expiring tokens', 'Tokens in URL', 'Shared accounts'],
      correctIndex: 0,
      tags: ['security', 'auth'],
      explanation: 'Rotation reduces risk from stolen sessions.',
    },
    {
      prompt: 'Secrets should be stored in:',
      options: ['Secret manager', 'Source code', 'Public wiki', 'Client storage'],
      correctIndex: 0,
      tags: ['security', 'secrets'],
      explanation: 'Secret managers provide access control and rotation.',
    },
    {
      prompt: 'Least privilege means:',
      options: [
        'Grant only required permissions',
        'Give admin to all',
        'Share root access',
        'Disable audits',
      ],
      correctIndex: 0,
      tags: ['security', 'iam'],
      explanation: 'Restricting access reduces blast radius.',
    },
    {
      prompt: 'Threat modeling starts by:',
      options: [
        'Identifying assets and threats',
        'Picking a firewall vendor',
        'Writing code first',
        'Disabling logging',
      ],
      correctIndex: 0,
      tags: ['security', 'threat-modeling'],
      explanation: 'Assets and threats define the model scope.',
    },
    {
      prompt: 'Dependency vulnerabilities should be handled by:',
      options: [
        'Patching and upgrading',
        'Ignoring',
        'Hiding alerts',
        'Pinning old versions forever',
      ],
      correctIndex: 0,
      tags: ['security', 'dependencies'],
      explanation: 'Patching reduces exposure.',
    },
    {
      prompt: 'Strong authentication should include:',
      options: [
        'Multi-factor authentication',
        'Password reuse',
        'Shared credentials',
        'No logging',
      ],
      correctIndex: 0,
      tags: ['security', 'auth'],
      explanation: 'MFA reduces account takeover risk.',
    },
    {
      prompt: 'Logs should avoid:',
      options: ['Sensitive data like passwords', 'Request ids', 'Error codes', 'Timing'],
      correctIndex: 0,
      tags: ['security', 'logging'],
      explanation: 'Sensitive data in logs increases breach impact.',
    },
    {
      prompt: 'SSRF risk can be reduced by:',
      options: [
        'Blocking internal metadata endpoints',
        'Allowing any URL',
        'Disabling TLS',
        'Using GET only',
      ],
      correctIndex: 0,
      tags: ['security', 'ssrf'],
      explanation: 'Blocking internal endpoints reduces SSRF impact.',
    },
    {
      prompt: 'Password storage should use:',
      options: [
        'Strong hashing like bcrypt',
        'Plain text',
        'Reversible encryption',
        'Client-side storage only',
      ],
      correctIndex: 0,
      tags: ['security', 'auth'],
      explanation: 'Strong hashing protects stored passwords.',
    },
  ],
  multi: [
    {
      prompt: 'Secure code review checks include: (Select all)',
      options: ['Input validation', 'Auth checks', 'Sensitive logging', 'Hardcoded secrets'],
      correctIndexes: [0, 1],
      tags: ['security', 'review'],
      explanation: 'Validation and auth checks prevent common vulnerabilities.',
    },
    {
      prompt: 'Incident response actions include: (Select all)',
      options: [
        'Revoke credentials',
        'Patch vulnerability',
        'Notify stakeholders',
        'Ignore evidence',
      ],
      correctIndexes: [0, 1, 2],
      tags: ['security', 'incident'],
      explanation: 'Containment, remediation, and communication are essential.',
    },
    {
      prompt: 'Secure API design includes: (Select all)',
      options: [
        'Rate limiting',
        'Authentication',
        'Schema validation',
        'Allowing public admin endpoints',
      ],
      correctIndexes: [0, 1, 2],
      tags: ['security', 'api'],
      explanation: 'These controls reduce abuse and injection risks.',
    },
  ],
  ordering: {
    prompt: 'Order the steps when a vulnerability is found.',
    options: ['Triage severity', 'Patch and test', 'Deploy fix', 'Post-incident review'],
    correctOrder: [0, 1, 2, 3],
    tags: ['security', 'incident'],
    explanation: 'Assess, fix, deploy, and then improve.',
  },
  case: {
    prompt: 'A third-party API key was leaked. Best decision?',
    options: [
      'Rotate keys and audit access',
      'Keep using the same key',
      'Hide the logs only',
      'Disable monitoring',
    ],
    correctIndex: 0,
    tags: ['security', 'secrets'],
    explanation: 'Key rotation and audit reduce ongoing risk.',
  },
};

const SECURITY_SECTION = buildSection('q_sec_', SECURITY_TOPICS);

const GAMEDEV_TOPICS: SectionTopics = {
  single: [
    {
      prompt: 'Fixed timestep is used to:',
      options: [
        'Keep physics consistent',
        'Increase input lag',
        'Lower frame rate',
        'Skip updates',
      ],
      correctIndex: 0,
      tags: ['gamedev', 'engine'],
      explanation: 'Fixed timestep makes simulation deterministic.',
    },
    {
      prompt: 'Best way to reduce input latency:',
      options: [
        'Read input early and keep frame time low',
        'Add more post-processing',
        'Increase VSync delay',
        'Skip input',
      ],
      correctIndex: 0,
      tags: ['gamedev', 'performance'],
      explanation: 'Lower frame time reduces perceived lag.',
    },
    {
      prompt: 'Frame drops are high. Best first action?',
      options: [
        'Profile CPU/GPU and find bottlenecks',
        'Add more particles',
        'Increase resolution',
        'Ignore',
      ],
      correctIndex: 0,
      tags: ['gamedev', 'performance'],
      explanation: 'Profiling identifies the real bottleneck.',
    },
    {
      prompt: 'Retention is low. Best improvement?',
      options: [
        'Add progression and goals',
        'Remove rewards',
        'Add longer tutorials',
        'Disable analytics',
      ],
      correctIndex: 0,
      tags: ['gamedev', 'design'],
      explanation: 'Progression systems drive retention.',
    },
    {
      prompt: 'Game economy is too grindy. Best fix?',
      options: [
        'Adjust rewards using telemetry',
        'Reset all progress',
        'Add more paywalls',
        'Ignore feedback',
      ],
      correctIndex: 0,
      tags: ['gamedev', 'balance'],
      explanation: 'Telemetry-guided tuning improves balance.',
    },
    {
      prompt: 'The game loop should generally:',
      options: ['Update then render', 'Render then update', 'Skip updates', 'Run only on input'],
      correctIndex: 0,
      tags: ['gamedev', 'engine'],
      explanation: 'Update-then-render keeps game state consistent.',
    },
    {
      prompt: 'Networking for action games should favor:',
      options: [
        'Client prediction with reconciliation',
        'Server-only rendering',
        'No interpolation',
        'Blocking input',
      ],
      correctIndex: 0,
      tags: ['gamedev', 'network'],
      explanation: 'Prediction reduces perceived latency.',
    },
    {
      prompt: 'To reduce GC spikes, you should:',
      options: [
        'Use object pooling',
        'Create objects every frame',
        'Disable caching',
        'Use random allocation',
      ],
      correctIndex: 0,
      tags: ['gamedev', 'performance'],
      explanation: 'Pooling reduces garbage collection pressure.',
    },
    {
      prompt: 'UI stutters during gameplay. Best fix?',
      options: [
        'Avoid heavy UI updates per frame',
        'Add more animations',
        'Increase resolution',
        'Block input',
      ],
      correctIndex: 0,
      tags: ['gamedev', 'ui'],
      explanation: 'Reducing UI work stabilizes frame time.',
    },
    {
      prompt: 'Analytics for funnels should track:',
      options: ['Key progression steps', 'Only crashes', 'Only FPS', 'Nothing'],
      correctIndex: 0,
      tags: ['gamedev', 'analytics'],
      explanation: 'Funnel metrics show where players drop off.',
    },
  ],
  multi: [
    {
      prompt: 'Ways to reduce input lag: (Select all)',
      options: [
        'Lower frame time',
        'Input buffering',
        'Reduce render latency',
        'Increase post-processing',
      ],
      correctIndexes: [0, 1, 2],
      tags: ['gamedev', 'performance'],
      explanation: 'Lower latency and buffering improve responsiveness.',
    },
    {
      prompt: 'Retention drivers include: (Select all)',
      options: ['Daily quests', 'Progression rewards', 'Social features', 'Removing goals'],
      correctIndexes: [0, 1, 2],
      tags: ['gamedev', 'design'],
      explanation: 'Progress and social features keep players engaged.',
    },
    {
      prompt: 'Performance profiling should check: (Select all)',
      options: ['CPU time', 'GPU time', 'Draw calls', 'Only textures'],
      correctIndexes: [0, 1, 2],
      tags: ['gamedev', 'performance'],
      explanation: 'CPU/GPU and draw calls reveal rendering bottlenecks.',
    },
  ],
  ordering: {
    prompt: 'Order the steps to fix a performance regression.',
    options: [
      'Profile to locate bottleneck',
      'Apply optimization',
      'Verify improvement',
      'Add a regression test',
    ],
    correctOrder: [0, 1, 2, 3],
    tags: ['gamedev', 'performance'],
    explanation: 'Measure first, fix, validate, then prevent recurrence.',
  },
  case: {
    prompt: 'Players complain the grind is too slow. Best decision?',
    options: [
      'Tune rewards and add catch-up mechanics',
      'Ignore feedback',
      'Remove progression entirely',
      'Increase prices only',
    ],
    correctIndex: 0,
    tags: ['gamedev', 'balance'],
    explanation: 'Tuning progression addresses pain without breaking the economy.',
  },
};

const GAMEDEV_SECTION = buildSection('q_gd_', GAMEDEV_TOPICS);

const SECTIONS: ExamQuestion[] = [
  ...FRONTEND_SECTION,
  ...BACKEND_SECTION,
  ...FULLSTACK_SECTION,
  ...MOBILE_SECTION,
  ...QA_SECTION,
  ...DEVOPS_SECTION,
  ...DATA_ENGINEER_SECTION,
  ...DATA_SCIENCE_SECTION,
  ...SECURITY_SECTION,
  ...GAMEDEV_SECTION,
];

export const EXAM_QUESTIONS: ExamQuestion[] = [...GENERAL_QUESTIONS, ...SECTIONS];

export const EXAM_QUESTIONS_BY_ID: Record<string, ExamQuestion> = EXAM_QUESTIONS.reduce(
  (acc, question) => {
    acc[question.id] = question;
    return acc;
  },
  {} as Record<string, ExamQuestion>,
);

const validateExamQuestions = (questions: ExamQuestion[]): void => {
  const ids = new Set<string>();
  for (const question of questions) {
    if (ids.has(question.id)) {
      console.error(`[exam] Duplicate id: ${question.id}`);
    }
    ids.add(question.id);

    if (!question.explanation || question.explanation.trim().length === 0) {
      console.error(`[exam] Missing explanation: ${question.id}`);
    }

    if (!question.tags || question.tags.length === 0) {
      console.error(`[exam] Missing tags: ${question.id}`);
    }

    const optionIds = question.options.map((option) => option.id);
    const uniqueOptionIds = new Set(optionIds);
    if (uniqueOptionIds.size !== optionIds.length) {
      console.error(`[exam] Duplicate option ids: ${question.id}`);
    }

    if (question.type === 'singleChoice' || question.type === 'caseDecision') {
      if (!optionIds.includes(question.correctOptionId)) {
        console.error(`[exam] Invalid correctOptionId: ${question.id}`);
      }
    }

    if (question.type === 'multiChoice') {
      const uniqueCorrect = new Set(question.correctOptionIds);
      if (uniqueCorrect.size !== question.correctOptionIds.length) {
        console.error(`[exam] Duplicate correctOptionIds: ${question.id}`);
      }
      if (question.correctOptionIds.length === 0) {
        console.error(`[exam] Empty correctOptionIds: ${question.id}`);
      }
      for (const correctId of question.correctOptionIds) {
        if (!optionIds.includes(correctId)) {
          console.error(`[exam] Invalid correctOptionIds: ${question.id}`);
          break;
        }
      }
    }

    if (question.type === 'ordering') {
      const order = question.correctOrderOptionIds;
      const uniqueOrder = new Set(order);
      if (uniqueOrder.size !== order.length) {
        console.error(`[exam] Duplicate correctOrderOptionIds: ${question.id}`);
      }
      if (order.length !== optionIds.length) {
        console.error(`[exam] Ordering length mismatch: ${question.id}`);
      }
      for (const id of order) {
        if (!optionIds.includes(id)) {
          console.error(`[exam] Invalid correctOrderOptionIds: ${question.id}`);
          break;
        }
      }
    }
  }
};

declare const ngDevMode: boolean | undefined;
const isDev = typeof ngDevMode !== 'undefined' && ngDevMode;
if (isDev) {
  validateExamQuestions(EXAM_QUESTIONS);
}
