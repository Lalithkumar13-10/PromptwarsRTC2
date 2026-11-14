import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'skillpath.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'employee', 'organization')),
      organization_id TEXT,
      onboarding_completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learner_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      education TEXT NOT NULL DEFAULT '',
      experience TEXT NOT NULL DEFAULT '',
      current_skill_level TEXT NOT NULL DEFAULT 'Beginner',
      target_career TEXT NOT NULL DEFAULT '',
      learning_style TEXT NOT NULL DEFAULT 'Mixed Structured',
      weekly_hours INTEGER NOT NULL DEFAULT 8,
      certifications_json TEXT NOT NULL DEFAULT '[]',
      projects_json TEXT NOT NULL DEFAULT '[]',
      interests_json TEXT NOT NULL DEFAULT '[]',
      career_readiness_score INTEGER NOT NULL DEFAULT 0,
      last_analyzed_at TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Technical',
      proficiency INTEGER NOT NULL DEFAULT 0,
      level TEXT NOT NULL DEFAULT 'Beginner',
      source TEXT NOT NULL DEFAULT 'profile',
      is_strength INTEGER NOT NULL DEFAULT 0,
      is_weakness INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS career_roles (
      id TEXT PRIMARY KEY,
      title TEXT UNIQUE NOT NULL,
      domain TEXT NOT NULL,
      description TEXT NOT NULL,
      required_skills_json TEXT NOT NULL,
      avg_salary_range TEXT NOT NULL,
      demand_level TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS skill_assessments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      questions_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assessment_results (
      id TEXT PRIMARY KEY,
      assessment_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      score INTEGER NOT NULL,
      correct_count INTEGER NOT NULL,
      total_count INTEGER NOT NULL,
      answers_json TEXT NOT NULL,
      feedback_json TEXT NOT NULL,
      weak_topics_json TEXT NOT NULL,
      strong_topics_json TEXT NOT NULL,
      ai_evaluation_summary TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learning_paths (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target_career TEXT NOT NULL,
      readiness_score INTEGER NOT NULL DEFAULT 0,
      strategy_summary TEXT NOT NULL,
      agent_notes_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learning_resources (
      id TEXT PRIMARY KEY,
      learning_path_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      phase TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      skill_name TEXT NOT NULL,
      title TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      url TEXT NOT NULL,
      provider TEXT NOT NULL,
      learning_objectives_json TEXT NOT NULL,
      practical_exercise TEXT NOT NULL,
      expected_outcome TEXT NOT NULL,
      estimated_hours REAL NOT NULL,
      difficulty TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'not_started',
      is_remedial INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      FOREIGN KEY (learning_path_id) REFERENCES learning_paths(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS progress_tracking (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      hours_logged REAL NOT NULL DEFAULT 0,
      modules_completed INTEGER NOT NULL DEFAULT 0,
      assessments_taken INTEGER NOT NULL DEFAULT 0,
      readiness_snapshot INTEGER NOT NULL DEFAULT 0,
      event_type TEXT NOT NULL,
      event_description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mentor_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      context_snapshot_json TEXT NOT NULL DEFAULT '{}',
      suggested_actions_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      action_tab TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('University', 'Enterprise')),
      industry TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organization_members (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      department TEXT NOT NULL,
      job_title TEXT NOT NULL,
      joined_at TEXT NOT NULL,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS agent_orchestration_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      trigger_event TEXT NOT NULL,
      agents_invoked_json TEXT NOT NULL,
      resolution_summary TEXT NOT NULL,
      before_readiness INTEGER NOT NULL DEFAULT 0,
      after_readiness INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}
