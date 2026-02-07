process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./test.db";
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET ?? "test-secret-32-characters-minimum";
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "debug";
