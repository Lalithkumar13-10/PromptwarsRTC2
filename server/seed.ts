import crypto from 'crypto';
import { db } from './db.ts';
import { hashPassword } from './auth.ts';
import type { CareerRequiredSkill } from '../src/types.ts';

interface SeedRole {
  id: string;
  title: string;
  domain: string;
  description: string;
  avgSalaryRange: string;
  demandLevel: string;
  requiredSkills: CareerRequiredSkill[];
}

export const SEED_CAREER_ROLES: SeedRole[] = [
  {
    id: 'role-ai-engineer',
    title: 'AI Engineer',
    domain: 'Artificial Intelligence & ML',
    description:
      'Designs, trains, evaluates, and deploys production machine learning, deep learning, and LLM-powered systems.',
    avgSalaryRange: '$135,000 – $210,000',
    demandLevel: 'Very High',
    requiredSkills: [
      { name: 'Python', category: 'Technical', requiredLevel: 90, priority: 'Critical', description: 'Core language for ML pipelines, data processing, and backend inference.' },
      { name: 'Machine Learning', category: 'Technical', requiredLevel: 90, priority: 'Critical', description: 'Supervised/unsupervised modeling, feature engineering, and validation.' },
      { name: 'Deep Learning', category: 'Technical', requiredLevel: 80, priority: 'High', description: 'Neural networks, transformers, fine-tuning, and PyTorch workflows.' },
      { name: 'SQL', category: 'Technical', requiredLevel: 75, priority: 'High', description: 'Querying relational warehouses and analytical datasets.' },
      { name: 'Model Deployment', category: 'Technical', requiredLevel: 80, priority: 'High', description: 'Containerization, FastAPI serving, latency optimization, and monitoring.' },
      { name: 'Prompt & LLM Engineering', category: 'Technical', requiredLevel: 85, priority: 'High', description: 'Structured outputs, RAG pipelines, evaluation harnesses, and agent workflows.' },
      { name: 'Technical Communication', category: 'Soft', requiredLevel: 75, priority: 'Medium', description: 'Translating model behavior and trade-offs for product stakeholders.' },
    ],
  },
  {
    id: 'role-fullstack-engineer',
    title: 'Full-Stack Software Engineer',
    domain: 'Software Engineering',
    description:
      'Architects and builds end-to-end web applications spanning modern TypeScript frontends, APIs, and relational/document databases.',
    avgSalaryRange: '$115,000 – $175,000',
    demandLevel: 'High',
    requiredSkills: [
      { name: 'TypeScript', category: 'Technical', requiredLevel: 85, priority: 'Critical', description: 'Type-safe frontend and backend JavaScript engineering.' },
      { name: 'React', category: 'Technical', requiredLevel: 85, priority: 'Critical', description: 'Component architecture, state management, and performance tuning.' },
      { name: 'Node.js & REST APIs', category: 'Technical', requiredLevel: 85, priority: 'Critical', description: 'API design, authentication, validation, and middleware pipelines.' },
      { name: 'SQL & Database Design', category: 'Technical', requiredLevel: 80, priority: 'High', description: 'Schema modeling, indexing, transactions, and query optimization.' },
      { name: 'Automated Testing', category: 'Technical', requiredLevel: 75, priority: 'High', description: 'Unit, integration, and end-to-end verification suites.' },
      { name: 'System Design', category: 'Technical', requiredLevel: 75, priority: 'Medium', description: 'Caching, horizontal scaling, and fault tolerance.' },
      { name: 'Agile Collaboration', category: 'Soft', requiredLevel: 80, priority: 'Medium', description: 'Code reviews, sprint planning, and cross-functional delivery.' },
    ],
  },
  {
    id: 'role-data-scientist',
    title: 'Data Scientist',
    domain: 'Data & Analytics',
    description:
      'Extracts actionable insights from complex datasets using statistical inference, experimentation, and predictive modeling.',
    avgSalaryRange: '$120,000 – $180,000',
    demandLevel: 'High',
    requiredSkills: [
      { name: 'Python', category: 'Technical', requiredLevel: 85, priority: 'Critical', description: 'Pandas, NumPy, and reproducible analytical notebooks.' },
      { name: 'Statistics & Experimentation', category: 'Technical', requiredLevel: 90, priority: 'Critical', description: 'Hypothesis testing, A/B testing, Bayesian inference, and causal analysis.' },
      { name: 'SQL', category: 'Technical', requiredLevel: 85, priority: 'Critical', description: 'Complex aggregations, window functions, and cohort queries.' },
      { name: 'Machine Learning', category: 'Technical', requiredLevel: 80, priority: 'High', description: 'Regression, classification, tree ensembles, and model interpretability.' },
      { name: 'Data Visualization', category: 'Technical', requiredLevel: 80, priority: 'High', description: 'Executive storytelling through clear charts and dashboards.' },
      { name: 'Stakeholder Storytelling', category: 'Soft', requiredLevel: 85, priority: 'High', description: 'Framing analytical findings into measurable business decisions.' },
    ],
  },
  {
    id: 'role-devops-architect',
    title: 'Cloud & DevOps Architect',
    domain: 'Cloud Infrastructure',
    description:
      'Automates cloud infrastructure, CI/CD delivery pipelines, observability, and resilient Kubernetes workloads.',
    avgSalaryRange: '$130,000 – $195,000',
    demandLevel: 'Very High',
    requiredSkills: [
      { name: 'Linux & Networking', category: 'Technical', requiredLevel: 85, priority: 'Critical', description: 'DNS, TLS, VPC routing, and system internals.' },
      { name: 'Docker & Containers', category: 'Technical', requiredLevel: 90, priority: 'Critical', description: 'Multi-stage builds, security scanning, and runtime orchestration.' },
      { name: 'Kubernetes', category: 'Technical', requiredLevel: 85, priority: 'Critical', description: 'Cluster operations, Helm, ingress, and autoscaling.' },
      { name: 'Infrastructure as Code', category: 'Technical', requiredLevel: 85, priority: 'High', description: 'Terraform modules, state management, and drift detection.' },
      { name: 'CI/CD Automation', category: 'Technical', requiredLevel: 80, priority: 'High', description: 'Automated build, test, and progressive deployment pipelines.' },
      { name: 'Observability & SRE', category: 'Technical', requiredLevel: 75, priority: 'Medium', description: 'Metrics, tracing, SLOs, and incident response.' },
      { name: 'Incident Leadership', category: 'Soft', requiredLevel: 75, priority: 'Medium', description: 'Blameless postmortems and cross-team coordination under pressure.' },
    ],
  },
  {
    id: 'role-cybersecurity-analyst',
    title: 'Cybersecurity Analyst',
    domain: 'Security & Risk',
    description:
      'Protects cloud and enterprise environments through threat detection, vulnerability assessment, and incident response.',
    avgSalaryRange: '$105,000 – $165,000',
    demandLevel: 'Very High',
    requiredSkills: [
      { name: 'Network Security', category: 'Technical', requiredLevel: 85, priority: 'Critical', description: 'Firewalls, packet analysis, zero-trust architecture, and IDS/IPS.' },
      { name: 'Threat Detection & SIEM', category: 'Technical', requiredLevel: 85, priority: 'Critical', description: 'Log correlation, alert triage, and threat hunting.' },
      { name: 'Application Security', category: 'Technical', requiredLevel: 80, priority: 'High', description: 'OWASP Top 10, threat modeling, and secure code review.' },
      { name: 'Cloud Security', category: 'Technical', requiredLevel: 80, priority: 'High', description: 'IAM least privilege, key management, and posture compliance.' },
      { name: 'Python & Scripting', category: 'Technical', requiredLevel: 70, priority: 'Medium', description: 'Automating log enrichment and IOC checks.' },
      { name: 'Risk Communication', category: 'Soft', requiredLevel: 80, priority: 'High', description: 'Writing clear remediation advisories for engineering and leadership.' },
    ],
  },
  {
    id: 'role-mlops-engineer',
    title: 'MLOps Engineer',
    domain: 'AI Infrastructure',
    description:
      'Bridges data science and production reliability through automated training pipelines, feature stores, and model observability.',
    avgSalaryRange: '$135,000 – $200,000',
    demandLevel: 'Very High',
    requiredSkills: [
      { name: 'Python', category: 'Technical', requiredLevel: 85, priority: 'Critical', description: 'Production Python tooling, packaging, and async workers.' },
      { name: 'Model Deployment', category: 'Technical', requiredLevel: 90, priority: 'Critical', description: 'vLLM/Triton serving, quantization, batching, and API gateways.' },
      { name: 'Docker & Kubernetes', category: 'Technical', requiredLevel: 85, priority: 'Critical', description: 'GPU scheduling, container orchestration, and autoscaling.' },
      { name: 'ML Pipeline Orchestration', category: 'Technical', requiredLevel: 85, priority: 'High', description: 'Reproducible training DAGs, experiment tracking, and registries.' },
      { name: 'Data & Drift Monitoring', category: 'Technical', requiredLevel: 80, priority: 'High', description: 'Detecting distribution shift, latency spikes, and quality decay.' },
      { name: 'Cross-Team Ownership', category: 'Soft', requiredLevel: 75, priority: 'Medium', description: 'Aligning ML researchers with SRE reliability standards.' },
    ],
  },
  {
    id: 'role-product-manager',
    title: 'Technical Product Manager',
    domain: 'Product & Strategy',
    description:
      'Defines product vision, prioritizes engineering roadmaps, and measures customer outcomes across technical software products.',
    avgSalaryRange: '$125,000 – $190,000',
    demandLevel: 'High',
    requiredSkills: [
      { name: 'Product Strategy & Roadmapping', category: 'Soft', requiredLevel: 90, priority: 'Critical', description: 'Prioritization frameworks, market positioning, and outcome metrics.' },
      { name: 'SQL & Product Analytics', category: 'Technical', requiredLevel: 75, priority: 'High', description: 'Funnel analysis, retention cohorts, and A/B test evaluation.' },
      { name: 'System & API Literacy', category: 'Technical', requiredLevel: 75, priority: 'High', description: 'Understanding trade-offs in APIs, latency, data models, and AI.' },
      { name: 'User Research & Discovery', category: 'Soft', requiredLevel: 85, priority: 'Critical', description: 'Customer interviews, usability testing, and problem framing.' },
      { name: 'Executive Alignment', category: 'Soft', requiredLevel: 85, priority: 'High', description: 'Writing crisp PRDs and aligning engineering, design, and leadership.' },
    ],
  },
  {
    id: 'role-ux-engineer',
    title: 'Design & UX Engineer',
    domain: 'Frontend & Design Systems',
    description:
      'Unites visual craft with frontend architecture to build accessible design systems and responsive interactive interfaces.',
    avgSalaryRange: '$115,000 – $170,000',
    demandLevel: 'High',
    requiredSkills: [
      { name: 'React & TypeScript', category: 'Technical', requiredLevel: 85, priority: 'Critical', description: 'Composable UI primitives, hooks, and strict component contracts.' },
      { name: 'CSS & Design Systems', category: 'Technical', requiredLevel: 90, priority: 'Critical', description: 'Tokens, responsive grids, Tailwind architecture, and motion.' },
      { name: 'Web Accessibility (WCAG)', category: 'Technical', requiredLevel: 85, priority: 'Critical', description: 'Keyboard navigation, ARIA patterns, focus management, and contrast.' },
      { name: 'Prototyping & Interaction Design', category: 'Soft', requiredLevel: 85, priority: 'High', description: 'Rapidly validating flows and micro-interactions in code.' },
      { name: 'Design-Engineering Collaboration', category: 'Soft', requiredLevel: 80, priority: 'High', description: 'Bridging Figma specifications with production code quality.' },
    ],
  },
];

function nowMinusDays(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

export function seedDatabase() {
  const roleStmt = db.prepare(`
    INSERT OR IGNORE INTO career_roles (id, title, domain, description, required_skills_json, avg_salary_range, demand_level)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const r of SEED_CAREER_ROLES) {
    roleStmt.run(
      r.id,
      r.title,
      r.domain,
      r.description,
      JSON.stringify(r.requiredSkills),
      r.avgSalaryRange,
      r.demandLevel
    );
  }

  const userCountRow = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (userCountRow.cnt > 0) {
    return;
  }

  const demoPasswordHash = hashPassword('DemoPass123!');

  // 1. Organization & Admin Demo User
  const orgId = 'org-apex-academy';
  const orgAdminId = 'user-elena-org';

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, organization_id, onboarding_completed, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orgAdminId,
    'elena.org@skillpath.ai',
    demoPasswordHash,
    'Elena Vance',
    'organization',
    orgId,
    1,
    nowMinusDays(30)
  );

  db.prepare(`
    INSERT INTO organizations (id, name, type, industry, owner_user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(orgId, 'Apex Tech Academy & Engineering', 'Enterprise', 'Software & AI Systems', orgAdminId, nowMinusDays(30));

  db.prepare(`
    INSERT INTO learner_profiles (
      id, user_id, education, experience, current_skill_level, target_career, learning_style,
      weekly_hours, certifications_json, projects_json, interests_json, career_readiness_score, last_analyzed_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'prof-elena',
    orgAdminId,
    'M.S. Engineering Management, Stanford',
    '8 years leading engineering and technical L&D cohorts',
    'Advanced',
    'Technical Product Manager',
    'Reading & Docs',
    5,
    JSON.stringify(['AWS Certified Solutions Architect', 'Scrum Product Owner']),
    JSON.stringify([{ title: 'Enterprise Upskilling Matrix', description: 'Rolled out competency tracking for 120 engineers.', technologies: ['Analytics', 'Roadmapping'] }]),
    JSON.stringify(['Workforce Readiness', 'AI Systems', 'Developer Productivity']),
    86,
    nowMinusDays(2),
    nowMinusDays(1)
  );

  // 2. Primary Student Demo User (Alex Rivera -> AI Engineer)
  const alexId = 'user-alex-student';
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, organization_id, onboarding_completed, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(alexId, 'alex.student@skillpath.ai', demoPasswordHash, 'Alex Rivera', 'student', orgId, 1, nowMinusDays(21));

  db.prepare(`
    INSERT INTO organization_members (id, organization_id, user_id, department, job_title, joined_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('mem-alex', orgId, alexId, 'AI & Data Fellowship', 'Graduate Fellow', nowMinusDays(21));

  db.prepare(`
    INSERT INTO learner_profiles (
      id, user_id, education, experience, current_skill_level, target_career, learning_style,
      weekly_hours, certifications_json, projects_json, interests_json, career_readiness_score, last_analyzed_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'prof-alex',
    alexId,
    'B.S. Computer Science (Senior Year)',
    '1 summer backend internship with Python & PostgreSQL',
    'Intermediate',
    'AI Engineer',
    'Hands-on Projects',
    12,
    JSON.stringify(['Google Data Analytics Certificate', 'Python for Everybody']),
    JSON.stringify([
      {
        title: 'Customer Churn Classifier',
        description: 'Built a scikit-learn logistic regression baseline on telecom CSV data.',
        technologies: ['Python', 'Pandas', 'Scikit-Learn'],
      },
      {
        title: 'FastAPI Inventory Microservice',
        description: 'REST API backed by PostgreSQL with automated pytest checks.',
        technologies: ['Python', 'FastAPI', 'SQL'],
      },
    ]),
    JSON.stringify(['Large Language Models', 'Neural Networks', 'MLOps']),
    56,
    nowMinusDays(1),
    nowMinusDays(0)
  );

  const alexSkills: [string, 'Technical' | 'Soft', number, 'Beginner' | 'Intermediate' | 'Advanced', string, number, number][] = [
    ['Python', 'Technical', 80, 'Advanced', 'assessment', 1, 0],
    ['SQL', 'Technical', 70, 'Intermediate', 'profile', 1, 0],
    ['Machine Learning', 'Technical', 42, 'Beginner', 'assessment', 0, 1],
    ['Deep Learning', 'Technical', 22, 'Beginner', 'profile', 0, 1],
    ['Model Deployment', 'Technical', 25, 'Beginner', 'profile', 0, 1],
    ['Prompt & LLM Engineering', 'Technical', 48, 'Intermediate', 'module', 0, 1],
    ['Technical Communication', 'Soft', 75, 'Intermediate', 'profile', 1, 0],
  ];

  const skillInsert = db.prepare(`
    INSERT INTO skills (id, user_id, name, category, proficiency, level, source, is_strength, is_weakness, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const s of alexSkills) {
    skillInsert.run(crypto.randomUUID(), alexId, s[0], s[1], s[2], s[3], s[4], s[5], s[6], nowMinusDays(1));
  }

  // Learning Path & Modules for Alex
  const alexPathId = 'path-alex-ai-eng';
  db.prepare(`
    INSERT INTO learning_paths (id, user_id, target_career, readiness_score, strategy_summary, agent_notes_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    alexPathId,
    alexId,
    'AI Engineer',
    56,
    'Prioritizes bridging foundational Machine Learning and Deep Learning gaps first, building on your strong Python (80%) and SQL (70%) foundation, before advancing to PyTorch and production Model Deployment.',
    JSON.stringify({
      assessmentAgent: 'Verified strong Python fluency (80/100) and solid relational SQL querying (70/100). Identified core mathematical & architectural gaps in Machine Learning (42/100) and Deep Learning (22/100).',
      careerAgent: 'AI Engineer requires 90% in Python & Machine Learning, 80% in Deep Learning & Model Deployment. Current Career Readiness stands at 56% with 3 high-priority technical gaps.',
      roadmapAgent: 'Sequenced 6 hands-on modules aligned to a 12 hr/week cadence: starting with Kaggle ML & Scikit-Learn optimization, advancing through PyTorch neural networks, and culminating in containerized FastAPI model serving.',
      orchestratorNote: 'Strategy calibrated on initial assessment evidence. Python beginner content skipped automatically due to 80% proficiency.',
    }),
    nowMinusDays(14),
    nowMinusDays(1)
  );

  const alexModules = [
    {
      id: 'mod-alex-1',
      phase: 'Beginner',
      order: 1,
      skill: 'Python',
      title: 'Python Scientific Computing & Vectorization',
      type: 'Documentation',
      url: 'https://numpy.org/doc/stable/user/absolute_beginners.html',
      provider: 'NumPy Official Docs',
      objectives: ['Master array broadcasting without Python loops', 'Benchmark vectorized matrix operations'],
      exercise: 'Rewrite a nested-loop cosine similarity matrix computation using pure NumPy broadcasting.',
      outcome: 'Write memory-efficient numerical code ready for ML pipelines.',
      hours: 4,
      diff: 'Beginner',
      status: 'completed',
      remedial: 0,
      completedAt: nowMinusDays(10),
    },
    {
      id: 'mod-alex-2',
      phase: 'Beginner',
      order: 2,
      skill: 'Machine Learning',
      title: 'Intro to Machine Learning & Cross-Validation',
      type: 'Course',
      url: 'https://www.kaggle.com/learn/intro-to-machine-learning',
      provider: 'Kaggle Learn',
      objectives: ['Prevent data leakage using scikit-learn Pipelines', 'Compare MAE/RMSE across tree ensembles'],
      exercise: 'Build a leak-free K-Fold cross-validation pipeline with GradientBoostingRegressor on tabular housing data.',
      outcome: 'Confidently evaluate tabular ML models without overfitting.',
      hours: 6,
      diff: 'Beginner',
      status: 'completed',
      remedial: 0,
      completedAt: nowMinusDays(5),
    },
    {
      id: 'mod-alex-3',
      phase: 'Intermediate',
      order: 3,
      skill: 'Machine Learning',
      title: 'Feature Engineering & Model Evaluation',
      type: 'Tutorial',
      url: 'https://scikit-learn.org/stable/modules/model_evaluation.html',
      provider: 'Scikit-Learn Docs',
      objectives: ['Interpret Precision-Recall vs ROC curves', 'Handle severe class imbalance with weighted loss'],
      exercise: 'Optimize F1-score on an imbalanced fraud dataset using ColumnTransformer and threshold tuning.',
      outcome: 'Diagnose and fix biased classifiers in real-world datasets.',
      hours: 8,
      diff: 'Intermediate',
      status: 'in_progress',
      remedial: 0,
      completedAt: null,
    },
    {
      id: 'mod-alex-4',
      phase: 'Intermediate',
      order: 4,
      skill: 'Deep Learning',
      title: 'Deep Learning Foundations with PyTorch Tensors & Autograd',
      type: 'Tutorial',
      url: 'https://pytorch.org/tutorials/beginner/basics/intro.html',
      provider: 'PyTorch Official Tutorials',
      objectives: ['Trace automatic differentiation graphs', 'Implement custom nn.Module training loops'],
      exercise: 'Train a 3-layer MLP with BatchNorm and AdamW from scratch in PyTorch and plot validation loss.',
      outcome: 'Transition from high-level libraries to custom neural network architectures.',
      hours: 10,
      diff: 'Intermediate',
      status: 'not_started',
      remedial: 0,
      completedAt: null,
    },
    {
      id: 'mod-alex-5',
      phase: 'Intermediate',
      order: 5,
      skill: 'Prompt & LLM Engineering',
      title: 'Structured Outputs, RAG & Evaluation Patterns',
      type: 'Documentation',
      url: 'https://ai.google.dev/gemini-api/docs/structured-output',
      provider: 'Google AI for Developers',
      objectives: ['Enforce JSON schemas for deterministic agent outputs', 'Build grounded retrieval evaluation sets'],
      exercise: 'Create an evaluation script testing 20 edge-case prompts against a strict JSON response schema.',
      outcome: 'Engineer reliable, schema-compliant LLM features.',
      hours: 7,
      diff: 'Intermediate',
      status: 'not_started',
      remedial: 0,
      completedAt: null,
    },
    {
      id: 'mod-alex-6',
      phase: 'Advanced',
      order: 6,
      skill: 'Model Deployment',
      title: 'Production Model Serving with FastAPI & Docker',
      type: 'Project',
      url: 'https://fastapi.tiangolo.com/deployment/docker/',
      provider: 'FastAPI Official Guide',
      objectives: ['Containerize inference endpoints with multi-stage Dockerfiles', 'Benchmark p95 latency under load'],
      exercise: 'Package a trained classifier into a Dockerized FastAPI service with health checks and Pydantic schemas.',
      outcome: 'Ship production-grade ML inference services.',
      hours: 10,
      diff: 'Advanced',
      status: 'locked',
      remedial: 0,
      completedAt: null,
    },
  ];

  const modStmt = db.prepare(`
    INSERT INTO learning_resources (
      id, learning_path_id, user_id, phase, order_index, skill_name, title, resource_type, url, provider,
      learning_objectives_json, practical_exercise, expected_outcome, estimated_hours, difficulty, status, is_remedial, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const m of alexModules) {
    modStmt.run(
      m.id,
      alexPathId,
      alexId,
      m.phase,
      m.order,
      m.skill,
      m.title,
      m.type,
      m.url,
      m.provider,
      JSON.stringify(m.objectives),
      m.exercise,
      m.outcome,
      m.hours,
      m.diff,
      m.status,
      m.remedial,
      m.completedAt
    );
  }

  // Assessment Results for Alex
  db.prepare(`
    INSERT INTO skill_assessments (id, user_id, skill_name, difficulty, questions_json, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('assess-alex-py', alexId, 'Python', 'Intermediate', '[]', 'completed', nowMinusDays(9));

  db.prepare(`
    INSERT INTO assessment_results (
      id, assessment_id, user_id, skill_name, difficulty, score, correct_count, total_count,
      answers_json, feedback_json, weak_topics_json, strong_topics_json, ai_evaluation_summary, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'res-alex-py',
    'assess-alex-py',
    alexId,
    'Python',
    'Intermediate',
    84,
    4,
    5,
    '{}',
    JSON.stringify([
      { questionId: 'q1', topic: 'List Comprehensions & Generators', isCorrect: true, score: 100, feedback: 'Correctly identified generator memory advantage.', correctAnswerSummary: 'Generators yield lazily.' },
      { questionId: 'q2', topic: 'Asyncio Concurrency', isCorrect: true, score: 80, feedback: 'Good grasp of event loops and awaitable coroutines.', correctAnswerSummary: 'Use asyncio.gather for concurrent I/O.' },
    ]),
    JSON.stringify(['Decorators with functools.wraps']),
    JSON.stringify(['Generators', 'NumPy Vectorization', 'Asyncio']),
    'Strong command of Python data structures and idiomatic concurrency; minor review suggested for decorator metadata preservation.',
    nowMinusDays(9)
  );

  db.prepare(`
    INSERT INTO skill_assessments (id, user_id, skill_name, difficulty, questions_json, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('assess-alex-ml', alexId, 'Machine Learning', 'Beginner', '[]', 'completed', nowMinusDays(4));

  db.prepare(`
    INSERT INTO assessment_results (
      id, assessment_id, user_id, skill_name, difficulty, score, correct_count, total_count,
      answers_json, feedback_json, weak_topics_json, strong_topics_json, ai_evaluation_summary, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'res-alex-ml',
    'assess-alex-ml',
    alexId,
    'Machine Learning',
    'Beginner',
    62,
    3,
    5,
    '{}',
    JSON.stringify([
      { questionId: 'q1', topic: 'Bias-Variance Tradeoff', isCorrect: true, score: 100, feedback: 'Accurately explained regularization impact.', correctAnswerSummary: 'L2 regularization shrinks weights to reduce variance.' },
      { questionId: 'q2', topic: 'Precision-Recall Tradeoff', isCorrect: false, score: 25, feedback: 'Confused accuracy with F1 under imbalanced labels.', correctAnswerSummary: 'Use PR-AUC and F1 when positive class is rare.' },
    ]),
    JSON.stringify(['Imbalanced Classification Metrics', 'Cross-Validation Leakage']),
    JSON.stringify(['Regularization', 'Train/Test Splits']),
    'Solid conceptual grasp of overfitting, but needs targeted practice on imbalanced evaluation metrics before moving to Deep Learning.',
    nowMinusDays(4)
  );

  // Weekly Learning Activity entries for Alex
  const progressStmt = db.prepare(`
    INSERT INTO progress_tracking (id, user_id, date, hours_logged, modules_completed, assessments_taken, readiness_snapshot, event_type, event_description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const activityDays = [
    [13, 1.5, 0, 0, 44, 'study', 'Started Python Scientific Computing module'],
    [10, 2.5, 1, 0, 48, 'module_completed', 'Completed Python Scientific Computing & Vectorization'],
    [9, 1.0, 0, 1, 51, 'assessment', 'Scored 84% on Intermediate Python Assessment'],
    [6, 2.0, 0, 0, 51, 'study', 'Practiced Kaggle cross-validation exercise'],
    [5, 3.0, 1, 0, 54, 'module_completed', 'Completed Intro to Machine Learning & Cross-Validation'],
    [4, 1.5, 0, 1, 56, 'assessment', 'Scored 62% on Beginner Machine Learning Assessment'],
    [1, 2.0, 0, 0, 56, 'study', 'Started Feature Engineering & Model Evaluation'],
  ] as const;

  for (const a of activityDays) {
    const dt = nowMinusDays(a[0]);
    progressStmt.run(crypto.randomUUID(), alexId, dt.slice(0, 10), a[1], a[2], a[3], a[4], a[5], a[6], dt);
  }

  // Notifications for Alex
  const notifStmt = db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, is_read, action_tab, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  notifStmt.run(
    crypto.randomUUID(),
    alexId,
    'milestone',
    'Python Skill Upgraded to Advanced (80%)',
    'Your 84% assessment score boosted Python proficiency. Beginner Python modules were streamlined out of your roadmap.',
    0,
    'skills',
    nowMinusDays(9)
  );
  notifStmt.run(
    crypto.randomUUID(),
    alexId,
    'assessment',
    'Pending Check: Feature Engineering & Model Evaluation',
    'Complete a quick assessment on Imbalanced Classification Metrics to validate your active Machine Learning module.',
    0,
    'assessments',
    nowMinusDays(2)
  );
  notifStmt.run(
    crypto.randomUUID(),
    alexId,
    'roadmap',
    'Adaptive Roadmap Updated by Orchestrator',
    'Agent 3 prioritized Scikit-Learn evaluation tutorials ahead of PyTorch based on your 62% ML diagnostic.',
    1,
    'roadmap',
    nowMinusDays(4)
  );

  // Initial Mentor Conversation for Alex
  db.prepare(`
    INSERT INTO mentor_conversations (id, user_id, role, content, context_snapshot_json, suggested_actions_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    alexId,
    'assistant',
    'Welcome back, Alex. You are currently at 56% readiness for AI Engineer. Your Python (80%) and SQL (70%) foundations are strong—right now our highest-leverage focus is completing Feature Engineering & Model Evaluation before unlocking PyTorch Deep Learning.',
    '{}',
    JSON.stringify(['Explain Precision-Recall vs ROC-AUC', 'Generate a Machine Learning practice quiz', 'Review my Deep Learning gap']),
    nowMinusDays(1)
  );

  db.prepare(`
    INSERT INTO agent_orchestration_logs (id, user_id, trigger_event, agents_invoked_json, resolution_summary, before_readiness, after_readiness, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    alexId,
    'Assessment Completed: Python (84%)',
    JSON.stringify(['Progress Evaluation Agent', 'Learning Path Recommendation Agent', 'Agent Orchestrator']),
    'Strong performance detected (84%). Upgraded Python proficiency to 80% and bypassed redundant beginner Python syntax modules.',
    51,
    54,
    nowMinusDays(9)
  );

  // 3. Additional Organization Cohort Members for realistic Organization Dashboard Analytics
  const orgCohort = [
    {
      id: 'user-priya-emp',
      email: 'priya.nair@apextech.ai',
      name: 'Priya Nair',
      dept: 'AI & Data Fellowship',
      title: 'ML Associate',
      career: 'AI Engineer',
      readiness: 68,
      completedMods: 4,
      totalMods: 6,
      skills: [
        ['Python', 'Technical', 85],
        ['Machine Learning', 'Technical', 74],
        ['Deep Learning', 'Technical', 52],
        ['Model Deployment', 'Technical', 40],
        ['SQL', 'Technical', 78],
      ] as [string, 'Technical' | 'Soft', number][],
    },
    {
      id: 'user-marcus-emp',
      email: 'marcus.chen@apextech.ai',
      name: 'Marcus Chen',
      dept: 'Platform Engineering',
      title: 'Backend Developer',
      career: 'Cloud & DevOps Architect',
      readiness: 72,
      completedMods: 4,
      totalMods: 5,
      skills: [
        ['Linux & Networking', 'Technical', 82],
        ['Docker & Containers', 'Technical', 80],
        ['Kubernetes', 'Technical', 55],
        ['Infrastructure as Code', 'Technical', 48],
        ['CI/CD Automation', 'Technical', 76],
      ] as [string, 'Technical' | 'Soft', number][],
    },
    {
      id: 'user-sofia-emp',
      email: 'sofia.patel@apextech.ai',
      name: 'Sofia Patel',
      dept: 'Platform Engineering',
      title: 'Junior Software Engineer',
      career: 'Full-Stack Software Engineer',
      readiness: 61,
      completedMods: 3,
      totalMods: 6,
      skills: [
        ['TypeScript', 'Technical', 72],
        ['React', 'Technical', 68],
        ['Node.js & REST APIs', 'Technical', 54],
        ['SQL & Database Design', 'Technical', 45],
        ['Automated Testing', 'Technical', 38],
      ] as [string, 'Technical' | 'Soft', number][],
    },
    {
      id: 'user-david-emp',
      email: 'david.kim@apextech.ai',
      name: 'David Kim',
      dept: 'Security & Trust',
      title: 'Security Associate',
      career: 'Cybersecurity Analyst',
      readiness: 64,
      completedMods: 3,
      totalMods: 5,
      skills: [
        ['Network Security', 'Technical', 75],
        ['Threat Detection & SIEM', 'Technical', 62],
        ['Application Security', 'Technical', 48],
        ['Cloud Security', 'Technical', 42],
        ['Python & Scripting', 'Technical', 65],
      ] as [string, 'Technical' | 'Soft', number][],
    },
    {
      id: 'user-hana-emp',
      email: 'hana.okafor@apextech.ai',
      name: 'Hana Okafor',
      dept: 'AI & Data Fellowship',
      title: 'Data Analyst',
      career: 'Data Scientist',
      readiness: 74,
      completedMods: 5,
      totalMods: 6,
      skills: [
        ['Python', 'Technical', 78],
        ['Statistics & Experimentation', 'Technical', 72],
        ['SQL', 'Technical', 88],
        ['Machine Learning', 'Technical', 55],
        ['Data Visualization', 'Technical', 82],
      ] as [string, 'Technical' | 'Soft', number][],
    },
  ];

  for (const m of orgCohort) {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, organization_id, onboarding_completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(m.id, m.email, demoPasswordHash, m.name, 'employee', orgId, 1, nowMinusDays(25));

    db.prepare(`
      INSERT INTO organization_members (id, organization_id, user_id, department, job_title, joined_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(`mem-${m.id}`, orgId, m.id, m.dept, m.title, nowMinusDays(25));

    db.prepare(`
      INSERT INTO learner_profiles (
        id, user_id, education, experience, current_skill_level, target_career, learning_style,
        weekly_hours, certifications_json, projects_json, interests_json, career_readiness_score, last_analyzed_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `prof-${m.id}`,
      m.id,
      'B.S. Computer Engineering',
      '2 years industry experience',
      'Intermediate',
      m.career,
      'Mixed Structured',
      8,
      '[]',
      '[]',
      '[]',
      m.readiness,
      nowMinusDays(2),
      nowMinusDays(1)
    );

    for (const sk of m.skills) {
      const lvl = sk[2] >= 75 ? 'Advanced' : sk[2] >= 45 ? 'Intermediate' : 'Beginner';
      skillInsert.run(crypto.randomUUID(), m.id, sk[0], sk[1], sk[2], lvl, 'assessment', sk[2] >= 70 ? 1 : 0, sk[2] < 55 ? 1 : 0, nowMinusDays(2));
    }

    const pId = `path-${m.id}`;
    db.prepare(`
      INSERT INTO learning_paths (id, user_id, target_career, readiness_score, strategy_summary, agent_notes_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(pId, m.id, m.career, m.readiness, `Targeted upskilling plan for ${m.career}.`, '{}', nowMinusDays(20), nowMinusDays(2));

    for (let idx = 0; idx < m.totalMods; idx++) {
      const isDone = idx < m.completedMods;
      const sk = m.skills[idx % m.skills.length];
      modStmt.run(
        crypto.randomUUID(),
        pId,
        m.id,
        idx < 2 ? 'Beginner' : idx < 4 ? 'Intermediate' : 'Advanced',
        idx + 1,
        sk[0],
        `${sk[0]} Applied Mastery Module ${idx + 1}`,
        'Course',
        'https://roadmap.sh',
        'Curated Docs',
        JSON.stringify([`Strengthen ${sk[0]} proficiency`]),
        `Complete applied lab for ${sk[0]}`,
        `Target readiness milestone for ${m.career}`,
        6,
        idx < 2 ? 'Beginner' : 'Intermediate',
        isDone ? 'completed' : 'not_started',
        0,
        isDone ? nowMinusDays(3) : null
      );
    }
  }
}
