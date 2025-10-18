// db.js
const { Pool } = require('pg');

// 환경변수 로드
const {
  DB_USER,
  DB_PASS,
  DB_NAME,
  CLOUD_SQL_CONNECTION_NAME, // ex: "etf-analysis-prod:asia-northeast3:etf-analysis-db"
  DB_HOST, // (옵션: 프라이빗 IP로 연결 시만 사용)
  NODE_ENV,
} = process.env;

// ✅ Cloud Run에서 Cloud SQL 연결을 위해 host를 자동 결정
// 1) 유닉스 소켓 연결 (권장: Serverless VPC Access 불필요)
// 2) DB_HOST가 설정되어 있으면 TCP 방식으로 연결(프라이빗 IP)
const dbConfig = DB_HOST
  ? {
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
      host: DB_HOST,
      port: 5432,
      ssl: false,
    }
  : {
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
      host: `/cloudsql/${CLOUD_SQL_CONNECTION_NAME}`,
    };

// 풀 생성
const pool = new Pool(dbConfig);

// 커넥션 테스트용 함수 (선택)
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log(
      `[DB CONNECTED] ${result.rows[0].current_time} (${CLOUD_SQL_CONNECTION_NAME})`
    );
  } catch (err) {
    console.error('[DB CONNECTION ERROR]', err);
  }
}

// 개발환경에서만 테스트 자동 실행
if (NODE_ENV !== 'production') {
  testConnection();
}

module.exports = pool;
