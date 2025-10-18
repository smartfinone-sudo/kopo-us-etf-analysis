/**
 * Database connection and query utilities (Cloud Run + Cloud SQL Postgres)
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Cloud Run에서는 .env가 적용되지 않음. (로컬 개발용으로만 쓰세요)
// require('dotenv').config();

const {
  DB_USER = 'postgres',
  DB_PASSWORD,                    // 🔸 Cloud Run 환경변수명 일관: DB_PASSWORD 권장
  DB_NAME = 'etf_analysis',
  CLOUD_SQL_CONNECTION_NAME,      // ex) etf-analysis-prod:asia-northeast3:etf-analysis-db
  DB_HOST,                        // 선택: 프라이빗 IP TCP 접속 시
  DB_PORT = 5432,
  NODE_ENV,
} = process.env;

// 🔒 pg가 자동으로 읽는 변수로 인해 127.0.0.1로 덮이는 것을 방지
delete process.env.PGHOST;
delete process.env.PGPORT;
delete process.env.DATABASE_URL;

// 🔧 연결 방식 결정: 기본은 유닉스 소켓(/cloudsql/<conn>), DB_HOST가 있으면 TCP
const useTcp = !!DB_HOST;
const socketDir = '/cloudsql'; // Cloud Run에서 Cloud SQL 연결 추가 시 자동 마운트
const resolvedHost = useTcp
  ? DB_HOST
  : (CLOUD_SQL_CONNECTION_NAME
      ? path.posix.join(socketDir, CLOUD_SQL_CONNECTION_NAME)
      : null);

if (!useTcp && !resolvedHost) {
  // Cloud Run에서 소켓을 쓸 건데 커넥션명이 없으면 곧바로 명확한 에러를 던짐
  console.error('[DB] CLOUD_SQL_CONNECTION_NAME 미설정: 유닉스 소켓 연결 불가');
  throw new Error('CLOUD_SQL_CONNECTION_NAME is required for Unix socket connection');
}

const poolConfig = useTcp
  ? {
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      host: resolvedHost, // DB_HOST
      port: Number(DB_PORT) || 5432,
      ssl: false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  : {
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      host: resolvedHost, // /cloudsql/<project:region:instance>
      // 소켓 사용 시 port/ssl 설정 불필요
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

const pool = new Pool(poolConfig);

// 가시성 높은 부팅 로그
(() => {
  const mode = useTcp ? 'TCP' : 'UNIX_SOCKET';
  const socketExists = !useTcp && fs.existsSync(socketDir);
  console.log('[DB] mode:', mode);
  console.log('[DB] host:', poolConfig.host);
  console.log('[DB] db/user:', DB_NAME, '/', DB_USER);
  if (!useTcp) console.log('[DB] /cloudsql mounted:', socketExists);
})();

// 에러 처리
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Cloud Run에서는 즉시 종료보다 로그 관찰이 유용한 경우가 많음 (필요시 process.exit 사용)
});

// 공용 쿼리 함수
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error', { text, error: error.message });
    throw error;
  }
}

// 트랜잭션/배치용 클라이언트 대여
async function getClient() {
  const client = await pool.connect();
  const q = client.query;
  const release = client.release;

  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);

  client.release = () => {
    clearTimeout(timeout);
    client.query = q;
    client.release = release;
    return release.apply(client);
  };

  return client;
}

// 스키마 초기화 (배포 후 별도 엔드포인트/잡에서 실행 권장)
async function initDatabase() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await query(schema);
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// 연결 테스트 (개발용)
async function testConnection() {
  try {
    const result = await query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

module.exports = { query, getClient, pool, initDatabase, testConnection };
