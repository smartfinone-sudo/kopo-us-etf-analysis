# Google Cloud Run 배포 가이드

이 가이드는 ETF Analysis System을 Google Cloud Run에 배포하는 전체 과정을 설명합니다.

## 목차
1. [사전 요구사항](#사전-요구사항)
2. [데이터베이스 설정](#데이터베이스-설정)
3. [환경 변수 설정](#환경-변수-설정)
4. [로컬 테스트](#로컬-테스트)
5. [Cloud Run 배포](#cloud-run-배포)
6. [문제 해결](#문제-해결)

---

## 사전 요구사항

### 1. Google Cloud CLI 설치
```bash
# macOS
brew install google-cloud-sdk

# Ubuntu/Debian
sudo apt-get install google-cloud-sdk

# Windows
# https://cloud.google.com/sdk/docs/install 에서 설치 파일 다운로드
```

### 2. Google Cloud 프로젝트 설정
```bash
# 로그인
gcloud auth login

# 프로젝트 생성 (선택사항)
gcloud projects create etf-analysis-prod --name="ETF Analysis System"

# 프로젝트 설정
gcloud config set project etf-analysis-prod

# 필요한 API 활성화
gcloud services enable \
    run.googleapis.com \
    sqladmin.googleapis.com \
    cloudbuild.googleapis.com \
    containerregistry.googleapis.com
```

### 3. Cloud SQL (PostgreSQL) 인스턴스 생성
```bash
# PostgreSQL 인스턴스 생성
gcloud sql instances create etf-analysis-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=asia-northeast3 \
    --root-password=YOUR_STRONG_PASSWORD

# 데이터베이스 생성
gcloud sql databases create etf_analysis \
    --instance=etf-analysis-db

# 사용자 생성 (선택사항)
gcloud sql users create etf_user \
    --instance=etf-analysis-db \
    --password=YOUR_USER_PASSWORD
```

**중요**: 
- `db-f1-micro`는 무료 티어입니다 (제한사항 있음)
- 프로덕션 환경에서는 `db-g1-small` 이상 권장
- `asia-northeast3`는 서울 리전입니다

---

## 데이터베이스 설정

### 1. Cloud SQL Proxy를 통한 로컬 연결 (개발용)
```bash
# Cloud SQL Proxy 다운로드
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy

# Proxy 실행
./cloud-sql-proxy etf-analysis-prod:asia-northeast3:etf-analysis-db
```

### 2. 데이터베이스 초기화
```bash
# .env 파일 생성
cp .env.example .env

# .env 파일 수정
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=etf_analysis
DB_USER=postgres
DB_PASSWORD=YOUR_STRONG_PASSWORD

# 데이터베이스 테이블 생성
npm install
npm run init-db
```

성공 메시지:
```
✅ Database connection successful
✅ Database initialization completed successfully!
```

---

## 환경 변수 설정

### Cloud Run 환경 변수
배포 시 필요한 환경 변수들입니다:

```bash
PORT=8080
NODE_ENV=production
DB_NAME=etf_analysis
DB_USER=postgres
DB_PASSWORD=YOUR_STRONG_PASSWORD
CLOUD_SQL_CONNECTION_NAME=etf-analysis-prod:asia-northeast3:etf-analysis-db
DB_SOCKET_PATH=/cloudsql
CORS_ORIGIN=*
PROJECT_ID=etf-analysis-prod
```

---

## 로컬 테스트

### 1. 로컬 서버 실행
```bash
# 의존성 설치
npm install

# 개발 모드 실행
npm run dev

# 또는 프로덕션 모드
npm start
```

### 2. 서버 확인
```bash
# Health check
curl http://localhost:8080/health

# 예상 응답:
{
  "status": "healthy",
  "timestamp": "2024-01-18T10:00:00.000Z",
  "database": "connected",
  "uptime": 123.456
}
```

### 3. 프론트엔드 테스트
브라우저에서 `http://localhost:8080` 접속하여 CSV 업로드 테스트

---

## Cloud Run 배포

### 방법 1: gcloud 명령어로 직접 배포 (권장)

```bash
# 프로젝트 루트에서 실행
gcloud run deploy etf-analysis \
    --source . \
    --platform managed \
    --region asia-northeast3 \
    --allow-unauthenticated \
    --set-env-vars "NODE_ENV=production,DB_NAME=etf_analysis,DB_USER=postgres,CLOUD_SQL_CONNECTION_NAME=etf-analysis-prod:asia-northeast3:etf-analysis-db,DB_SOCKET_PATH=/cloudsql,CORS_ORIGIN=*,PROJECT_ID=etf-analysis-prod" \
    --set-secrets "DB_PASSWORD=etf-db-password:latest" \
    --add-cloudsql-instances etf-analysis-prod:asia-northeast3:etf-analysis-db \
    --memory 512Mi \
    --cpu 1 \
    --timeout 300 \
    --max-instances 10 \
    --min-instances 0
```

**참고**: 
- `--set-secrets`를 사용하려면 먼저 Secret Manager에 비밀번호를 저장해야 합니다
- 또는 `--set-env-vars`에 `DB_PASSWORD=YOUR_PASSWORD`를 추가 (보안상 권장하지 않음)

### 방법 2: Dockerfile을 사용한 수동 배포

```bash
# 1. Docker 이미지 빌드 및 푸시
gcloud builds submit --tag gcr.io/etf-analysis-prod/etf-analysis

# 2. Cloud Run 서비스 생성
gcloud run deploy etf-analysis \
    --image gcr.io/etf-analysis-prod/etf-analysis \
    --platform managed \
    --region asia-northeast3 \
    --allow-unauthenticated \
    --set-env-vars "NODE_ENV=production,DB_NAME=etf_analysis,DB_USER=postgres,DB_PASSWORD=YOUR_PASSWORD,CLOUD_SQL_CONNECTION_NAME=etf-analysis-prod:asia-northeast3:etf-analysis-db,DB_SOCKET_PATH=/cloudsql,CORS_ORIGIN=*" \
    --add-cloudsql-instances etf-analysis-prod:asia-northeast3:etf-analysis-db
```

### Secret Manager를 사용한 비밀번호 관리 (권장)

```bash
# Secret 생성
echo -n "YOUR_STRONG_PASSWORD" | gcloud secrets create etf-db-password --data-file=-

# Secret Manager API 활성화
gcloud services enable secretmanager.googleapis.com

# Cloud Run 서비스 계정에 Secret 접근 권한 부여
PROJECT_NUMBER=$(gcloud projects describe etf-analysis-prod --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding etf-db-password \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### 배포 완료 확인

배포가 완료되면 다음과 같은 메시지가 표시됩니다:

```
Service [etf-analysis] revision [etf-analysis-00001-xxx] has been deployed and is serving 100 percent of traffic.
Service URL: https://etf-analysis-xxxxx-an.a.run.app
```

### 배포된 서비스 테스트

```bash
# Health check
curl https://etf-analysis-xxxxx-an.a.run.app/health

# 브라우저에서 접속
open https://etf-analysis-xxxxx-an.a.run.app
```

---

## 데이터베이스 마이그레이션

### 프로덕션 데이터베이스 초기화

배포 후 최초 1회 실행:

```bash
# 1. Cloud SQL Proxy를 통해 프로덕션 DB 연결
./cloud-sql-proxy etf-analysis-prod:asia-northeast3:etf-analysis-db

# 2. .env 파일을 프로덕션 DB로 설정
DB_HOST=127.0.0.1
DB_NAME=etf_analysis
DB_USER=postgres
DB_PASSWORD=YOUR_STRONG_PASSWORD

# 3. 데이터베이스 초기화
npm run init-db
```

또는 Cloud Shell에서 직접 실행:

```bash
# Cloud Shell에서 psql 연결
gcloud sql connect etf-analysis-db --user=postgres --database=etf_analysis

# schema.sql 실행
\i backend/database/schema.sql
\q
```

---

## 비용 최적화

### 무료 티어 활용
- Cloud Run: 월 2백만 요청 무료
- Cloud SQL: `db-f1-micro` 인스턴스 (제한적)
- Container Registry: 0.5GB 저장소 무료

### 비용 절감 팁
```bash
# 최소 인스턴스 0으로 설정 (트래픽 없을 때 자동 종료)
--min-instances 0

# 메모리 최소화
--memory 512Mi

# CPU 제한
--cpu 1

# 타임아웃 설정
--timeout 300
```

### 모니터링
```bash
# 로그 확인
gcloud run services logs read etf-analysis --limit 50

# 실시간 로그 스트리밍
gcloud run services logs tail etf-analysis
```

---

## 문제 해결

### 1. 데이터베이스 연결 실패

**증상**: "Database connection failed"

**해결**:
```bash
# Cloud SQL 인스턴스 상태 확인
gcloud sql instances describe etf-analysis-db

# Cloud SQL 연결 설정 확인
gcloud run services describe etf-analysis --region asia-northeast3 | grep cloudsql

# 올바른 연결 이름 확인
gcloud sql instances describe etf-analysis-db --format="value(connectionName)"
```

### 2. 권한 오류

**증상**: "Permission denied" 또는 "Forbidden"

**해결**:
```bash
# Cloud Run 서비스 계정 확인
gcloud run services describe etf-analysis --region asia-northeast3 --format="value(spec.template.spec.serviceAccountName)"

# Cloud SQL 클라이언트 권한 부여
gcloud projects add-iam-policy-binding etf-analysis-prod \
    --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
    --role="roles/cloudsql.client"
```

### 3. 메모리 부족 오류

**증상**: Container instance exceeded memory limit

**해결**:
```bash
# 메모리 증가
gcloud run services update etf-analysis \
    --region asia-northeast3 \
    --memory 1Gi
```

### 4. 타임아웃 오류

**증상**: Request timeout

**해결**:
```bash
# 타임아웃 증가
gcloud run services update etf-analysis \
    --region asia-northeast3 \
    --timeout 600
```

### 5. 로그 확인

```bash
# 최근 로그 확인
gcloud run services logs read etf-analysis --limit 100

# 에러 로그만 필터링
gcloud run services logs read etf-analysis --limit 100 | grep ERROR

# 실시간 로그
gcloud run services logs tail etf-analysis
```

---

## 업데이트 배포

코드 수정 후 재배포:

```bash
# 간단한 재배포
gcloud run deploy etf-analysis \
    --source . \
    --region asia-northeast3

# 또는 이미지 빌드 후 배포
gcloud builds submit --tag gcr.io/etf-analysis-prod/etf-analysis
gcloud run services update etf-analysis \
    --image gcr.io/etf-analysis-prod/etf-analysis \
    --region asia-northeast3
```

---

## 서비스 삭제

더 이상 사용하지 않을 경우:

```bash
# Cloud Run 서비스 삭제
gcloud run services delete etf-analysis --region asia-northeast3

# Cloud SQL 인스턴스 삭제
gcloud sql instances delete etf-analysis-db

# Container 이미지 삭제
gcloud container images delete gcr.io/etf-analysis-prod/etf-analysis
```

---

## 참고 자료

- [Cloud Run 문서](https://cloud.google.com/run/docs)
- [Cloud SQL 문서](https://cloud.google.com/sql/docs)
- [Node.js on Cloud Run](https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service)
- [Cloud SQL Proxy](https://cloud.google.com/sql/docs/postgres/connect-run)

---

## 프로덕션 체크리스트

배포 전 확인사항:

- [ ] Cloud SQL 인스턴스 생성 및 데이터베이스 초기화
- [ ] Secret Manager에 비밀번호 저장
- [ ] 환경 변수 모두 설정
- [ ] CORS 설정 확인 (프로덕션 도메인)
- [ ] 로컬에서 테스트 완료
- [ ] Health check 엔드포인트 동작 확인
- [ ] 데이터베이스 마이그레이션 완료
- [ ] 모니터링/알림 설정

배포 후 확인사항:

- [ ] 서비스 URL 접속 확인
- [ ] CSV 업로드 테스트
- [ ] 대시보드 렌더링 확인
- [ ] API 엔드포인트 동작 확인
- [ ] 로그 확인 (에러 없음)
- [ ] 성능 모니터링 설정
