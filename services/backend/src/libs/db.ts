import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE
});

// ensure chunks table exists
pool.query(`
  CREATE TABLE IF NOT EXISTS chunks(
    meetingId TEXT,
    seq INT,
    text TEXT,
    path TEXT,
    processing_status TEXT,
    concat_status TEXT,
    PRIMARY KEY (meetingId, seq)
  );
`).catch(console.error);

export default pool; 