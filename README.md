# ETF 저비중 종목 분석 시스템

> 미국 주요 ETF(SCHD, VOO, VTI, IVV)의 포트폴리오를 분석하여 저비중 종목의 성장 가능성을 추적하는 웹 기반 분석 도구

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![PostgreSQL](https://img.shields.io/badge/postgresql-15-blue)

---

## 📋 목차

1. [프로젝트 개요](#-프로젝트-개요)
2. [주요 기능](#-주요-기능)
3. [아키텍처](#-아키텍처)
4. [로컬 개발 환경 설정](#-로컬-개발-환경-설정)
5. [CSV 다운로드 가이드](#-csv-다운로드-가이드)
6. [사용 방법](#-사용-방법)
7. [CSV 양식 처리](#-csv-양식-처리)
8. [배포](#-배포)
9. [데이터 구조](#-데이터-구조)
10. [기술 스택](#-기술-스택)
11. [문제 해결](#-문제-해결)
12. [향후 개발 계획](#-향후-개발-계획)

---

## 🎯 프로젝트 개요

### 핵심 아이디어
애널리스트들이 신중하게 편입한 종목 중 **비중이 작다는 것은 향후 크게 성장할 가능성**을 인정한 것으로 가정합니다. 이 시스템은 주요 ETF들의 저비중 종목을 지속적으로 모니터링하여 투자 인사이트를 제공합니다.

### 분석 대상 ETF

| ETF | 발행사 | 특징 | AUM |
|-----|--------|------|-----|
| **SCHD** | Charles Schwab | 고배당 우량주 | $60B+ |
| **VOO** | Vanguard | S&P 500 추종 | $1T+ |
| **VTI** | Vanguard | 전체 미국 주식시장 | $1.5T+ |
| **IVV** | BlackRock (iShares) | S&P 500 추종 | $400B+ |

---

## ✨ 주요 기능

### 1. 🔄 유연한 CSV 업로드
- **자동 양식 감지**: 각 ETF 발행사의 서로 다른 CSV 양식 자동 인식
- **스마트 컬럼 매핑**: Ticker, Name, Weight 등 다양한 헤더명 자동 매칭
- **데이터 검증**: 비중 합계, 중복 티커, 이상 데이터 자동 검증
- **실시간 미리보기**: 업로드 전 파싱 결과 확인

### 2. 📊 저비중 종목 대시보드
- **동적 필터링**: 비중 기준(기본 0% = 전체) 사용자 정의 가능
- **ETF별 분석**: 개별 또는 통합 분석 지원
- **재무정보 표시**: ROE, EPS, PBR, BPS 등 주요 재무지표 즉시 확인
- **외부 링크**: Yahoo Finance 및 Google Finance 원클릭 연결
- **빠른 로딩**: 차트 제거로 즉각적인 데이터 표시

### 3. 🔍 포트폴리오 변화 추적
- **신규 편입 종목**: 새로 추가된 저비중 종목 식별
- **제외 종목**: 포트폴리오에서 빠진 종목 추적
- **비중 변화**: 기간별 비중 증감 분석
- **히스토리 관리**: 모든 업로드 이력 보관

### 4. 💾 RESTful API 기반 데이터 관리
- 완전한 CRUD 작업 지원
- 페이징 및 검색 기능
- 스냅샷 기반 버전 관리
- PostgreSQL 데이터베이스 연동
- Cloud SQL 지원 (Google Cloud Run)

---

## 🏗️ 아키텍처

### 시스템 구조

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (SPA)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │  Upload  │  │Dashboard │  │     History Tab      │ │
│  │   Tab    │  │   Tab    │  │  (Change Tracking)   │ │
│  └──────────┘  └──────────┘  └──────────────────────┘ │
│              HTML5 + Vanilla JS + Tailwind CSS          │
└─────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────┐
│                 Backend (Express.js)                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │          RESTful API Routes                      │  │
│  │  • GET /tables/:table                           │  │
│  │  • POST /tables/:table                          │  │
│  │  • PUT/PATCH /tables/:table/:id                 │  │
│  │  • DELETE /tables/:table/:id                    │  │
│  └──────────────────────────────────────────────────┘  │
│                   Node.js v18+                          │
└─────────────────────────────────────────────────────────┘
                            ↕ pg (node-postgres)
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL Database (Cloud SQL)            │
│  ┌──────────────┐ ┌────────────────┐ ┌──────────────┐ │
│  │ etf_holdings │ │ stock_details  │ │upload_history│ │
│  └──────────────┘ └────────────────┘ └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 배포 옵션

#### 1. **Google Cloud Run** (권장 - 프로덕션)
- **장점**: Auto-scaling, 무료 티어, Cloud SQL 네이티브 연동
- **구성**: Cloud Run + Cloud SQL (PostgreSQL)
- **가이드**: [CLOUD_RUN_DEPLOYMENT.md](CLOUD_RUN_DEPLOYMENT.md)

#### 2. **로컬 개발 환경**
- **장점**: 빠른 개발 사이클, 완전한 제어
- **구성**: Node.js + PostgreSQL (로컬)
- **가이드**: 아래 "로컬 개발 환경 설정" 참조

---

## 🛠️ 로컬 개발 환경 설정

### 사전 요구사항

- **Node.js**: v18.0.0 이상
- **PostgreSQL**: v15 이상
- **npm**: v9.0.0 이상

### 설치 단계

#### 1. 저장소 클론
```bash
git clone https://github.com/yourusername/etf-analysis-system.git
cd etf-analysis-system
```

#### 2. 의존성 설치
```bash
npm install
```

#### 3. PostgreSQL 설정

**macOS (Homebrew)**:
```bash
brew install postgresql@15
brew services start postgresql@15

# 데이터베이스 생성
createdb etf_analysis
```

**Ubuntu/Debian**:
```bash
sudo apt-get update
sudo apt-get install postgresql-15
sudo systemctl start postgresql

# 데이터베이스 생성
sudo -u postgres psql
CREATE DATABASE etf_analysis;
\q
```

**Windows**:
- [PostgreSQL 공식 사이트](https://www.postgresql.org/download/windows/)에서 설치
- pgAdmin 또는 psql로 `etf_analysis` 데이터베이스 생성

#### 4. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일 편집:
```env
PORT=8080
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=etf_analysis
DB_USER=postgres
DB_PASSWORD=your_password

CORS_ORIGIN=*
```

#### 5. 데이터베이스 초기화

```bash
npm run init-db
```

성공 메시지:
```
✅ Database connection successful
✅ Database initialization completed successfully!
```

#### 6. 서버 실행

**개발 모드** (nodemon - 자동 재시작):
```bash
npm run dev
```

**프로덕션 모드**:
```bash
npm start
```

서버가 성공적으로 시작되면:
```
=================================
🚀 ETF Analysis System Server
📡 Server running on port 8080
🌍 Environment: development
🗄️  Database: Connected
=================================
Health check: http://localhost:8080/health
Application: http://localhost:8080
=================================
```

#### 7. 브라우저에서 접속

```
http://localhost:8080
```

### 개발 명령어

| 명령어 | 설명 |
|--------|------|
| `npm start` | 프로덕션 모드로 서버 실행 |
| `npm run dev` | 개발 모드로 서버 실행 (nodemon) |
| `npm run init-db` | 데이터베이스 테이블 생성 |

---

## 📥 CSV 다운로드 가이드

### ⚠️ 중요: 각 ETF별 공식 데이터 소스

| ETF | 다운로드 방법 | 업데이트 빈도 |
|-----|---------------|---------------|
| **SCHD** | 1. https://www.schwabassetmanagement.com/products/schd 접속<br>2. **Holdings** 탭 클릭<br>3. **Export** 또는 **Download Holdings** 버튼 클릭<br>4. CSV 파일 저장 | 매일 |
| **VOO** | 1. https://investor.vanguard.com/investment-products/etfs/profile/voo 접속<br>2. **Portfolio & Management** 탭 클릭<br>3. **View all holdings** 링크<br>4. **Download** 버튼 클릭 | 매일 |
| **VTI** | 1. https://investor.vanguard.com/investment-products/etfs/profile/vti 접속<br>2. **Portfolio & Management** 탭 클릭<br>3. **View all holdings** 링크<br>4. **Download** 버튼 클릭 | 매일 |
| **IVV** | 1. https://www.ishares.com/us/products/239726/ishares-core-sp-500-etf 접속<br>2. **Holdings** 탭 클릭<br>3. **Download to Excel** 또는 **Download to CSV** 클릭<br>4. CSV 형식 선택 저장 | 매일 |

### 📝 다운로드 팁
- **최신 데이터 확인**: 각 사이트에서 "As of [날짜]" 표시 확인
- **전체 포트폴리오 다운로드**: "Top 10" 등이 아닌 전체 목록 다운로드
- **파일명 규칙**: `[ETF]_holdings_YYYYMMDD.csv` 형식 권장 (예: `SCHD_holdings_20250118.csv`)

---

## 🚀 사용 방법

### Step 1: CSV 파일 준비
위의 [CSV 다운로드 가이드](#-csv-다운로드-가이드)를 참고하여 분석하려는 ETF의 최신 포트폴리오 CSV를 다운로드합니다.

### Step 2: 데이터 업로드
1. **ETF 선택**: 드롭다운에서 해당 ETF 선택 (SCHD, VOO, VTI, IVV)
2. **파일 업로드**: 
   - 파일 선택 버튼 클릭
   - 또는 드래그 앤 드롭
3. **미리보기 확인**: 
   - 총 종목 수
   - 비중 합계 (95~105% 정상 범위)
   - 저비중 종목 수
4. **업로드 실행**: "업로드 및 분석" 버튼 클릭

### Step 3: 대시보드 분석
1. **필터 설정**:
   - **최대 비중**: 기본 2% (0.1% ~ 10% 범위 조절 가능)
   - **ETF 필터**: 특정 ETF만 보기 또는 전체
   - **스냅샷 선택**: 과거 데이터 비교
2. **통계 확인**:
   - 총 저비중 종목 수
   - 평균 비중
   - 최소 비중
3. **차트 분석**:
   - ETF별 저비중 종목 분포
   - 비중별 종목 수 분포
4. **종목 상세 정보**: 티커 옆 정보 아이콘 클릭

### Step 4: 변화 추적
1. **히스토리 탭** 이동
2. **비교 버튼** 클릭하여 이전 스냅샷과 비교
3. **변화 분석**:
   - 🟢 신규 편입 종목
   - 🔴 제외된 종목
   - 🔵 비중 증가 종목

---

## 🔧 CSV 양식 처리

### 자동 감지 메커니즘

시스템은 다음과 같은 방식으로 서로 다른 CSV 양식을 자동으로 처리합니다:

#### 1. 헤더 자동 인식
```javascript
// 지원하는 헤더 패턴 (대소문자 무시)
Ticker: ['ticker', 'symbol', 'stock symbol', 'ticker symbol']
Name: ['name', 'holding', 'company name', 'holdings name', 'security name']
Weight: ['weight', 'weight (%)', 'portfolio weight', '% of net assets']
```

#### 2. 데이터 정제
- **퍼센트 처리**: `4.52%` → `4.52`
- **통화 처리**: `$215,000,000` → `215000000`
- **공백 제거**: `" AAPL "` → `AAPL`
- **대문자 변환**: `aapl` → `AAPL`

#### 3. 검증 규칙
- ✅ **필수 필드**: Ticker, Weight
- ✅ **비중 합계**: 95% ~ 105% (경고 표시)
- ✅ **중복 제거**: 동일 티커 자동 병합
- ✅ **특수 항목 제외**: Total, Cash, N/A 등

### 실제 양식 예시

**SCHD (Schwab)**
```csv
Ticker,Name,Weight,Shares,Market Value
AAPL,Apple Inc.,4.52%,1250000,$215000000
MSFT,Microsoft Corp.,4.21%,850000,$198500000
```

**VOO/VTI (Vanguard)**
```csv
Holding,Ticker,SEDOL,Weight,Shares,Market Value
Apple Inc.,AAPL,2046251,7.1%,165000000,$28500000000
Microsoft Corporation,MSFT,2588173,6.8%,75000000,$27200000000
```

**IVV (BlackRock)**
```csv
Ticker,Name,Sector,Asset Class,Market Value,Weight (%),Shares,ISIN
AAPL,APPLE INC,Information Technology,Equity,12345678,7.25,65432100,US0378331005
MSFT,MICROSOFT CORP,Information Technology,Equity,11234567,6.80,58765432,US5949181045
```

### ⚠️ 문제 해결: CSV 파싱 오류

#### "CSV 헤더를 찾을 수 없습니다"
- **원인**: 헤더가 첫 10줄 내에 없거나 표준 필드명이 없음
- **해결**: CSV 파일을 열어 Ticker/Symbol, Weight 컬럼이 있는지 확인

#### "비중 합계가 100%와 차이가 있습니다"
- **원인**: Cash, Other 등 특수 항목 포함 또는 데이터 불완전
- **해결**: 경고만 표시되며 업로드는 진행됨 (데이터 확인 권장)

#### "유효한 데이터를 찾을 수 없습니다"
- **원인**: 모든 행이 필터링됨 (빈 Ticker 또는 비중=0)
- **해결**: CSV 파일 내용 확인 및 올바른 형식인지 검증

---

## 🚀 배포

### Google Cloud Run 배포

프로덕션 환경에서 애플리케이션을 배포하려면 Google Cloud Run을 권장합니다.

**자세한 배포 가이드**: [CLOUD_RUN_DEPLOYMENT.md](CLOUD_RUN_DEPLOYMENT.md)

**주요 단계**:
1. Cloud SQL (PostgreSQL) 인스턴스 생성
2. 데이터베이스 초기화
3. Secret Manager에 비밀번호 저장
4. Cloud Run에 배포

```bash
# 간단한 배포 명령어
gcloud run deploy etf-analysis \
    --source . \
    --region asia-northeast3 \
    --allow-unauthenticated \
    --add-cloudsql-instances YOUR_CLOUD_SQL_INSTANCE
```

**배포 후 확인**:
- Health check: `https://your-service-url/health`
- 애플리케이션: `https://your-service-url`

### 로컬 Docker 테스트

```bash
# Docker 이미지 빌드
docker build -t etf-analysis .

# 컨테이너 실행
docker run -p 8080:8080 \
    -e DB_HOST=your_db_host \
    -e DB_PASSWORD=your_password \
    etf-analysis
```

---

## 💾 데이터 구조

### 테이블 스키마

#### 1. `etf_holdings` (ETF 포트폴리오 보유 종목)
| 필드 | 타입 | 설명 |
|------|------|------|
| id | text | 고유 ID (자동 생성) |
| etf_symbol | text | ETF 심볼 (SCHD, VOO, VTI, IVV) |
| upload_date | datetime | 업로드 날짜 (timestamp) |
| ticker | text | 종목 티커 |
| company_name | text | 회사명 |
| weight | number | 포트폴리오 비중 (%) |
| shares | number | 보유 주식 수 |
| market_value | number | 시장가치 ($) |
| sector | text | 섹터 |
| snapshot_id | text | 스냅샷 그룹 ID |

#### 2. `stock_details` (종목 상세 정보)
| 필드 | 타입 | 설명 |
|------|------|------|
| id | text | 고유 ID |
| ticker | text | 종목 티커 |
| company_name | text | 회사명 |
| sector | text | 섹터 |
| industry | text | 산업 |
| market_cap | text | 시가총액 |
| pe_ratio | text | P/E Ratio |
| dividend_yield | text | 배당수익률 |
| **roe** | **text** | **ROE (자기자본이익률)** |
| **eps** | **text** | **EPS (주당순이익)** |
| **pbr** | **text** | **PBR (주가순자산비율)** |
| **bps** | **text** | **BPS (주당순자산가치)** |
| description | rich_text | 기업 개요 |
| last_updated | datetime | 마지막 업데이트 |

#### 3. `upload_history` (업로드 히스토리)
| 필드 | 타입 | 설명 |
|------|------|------|
| id | text | 고유 ID |
| etf_symbol | text | ETF 심볼 |
| upload_date | datetime | 업로드 날짜 |
| snapshot_id | text | 스냅샷 ID |
| total_holdings | number | 총 보유 종목 수 |
| file_name | text | 업로드된 파일명 |
| status | text | 처리 상태 (success, error) |
| notes | text | 비고 |

### RESTful API 엔드포인트

```
GET    tables/{table}                    # 레코드 목록 조회
GET    tables/{table}/{record_id}        # 단일 레코드 조회
POST   tables/{table}                    # 레코드 생성
PUT    tables/{table}/{record_id}        # 레코드 전체 업데이트
PATCH  tables/{table}/{record_id}        # 레코드 부분 업데이트
DELETE tables/{table}/{record_id}        # 레코드 삭제
```

### 재무정보 입력 방법

재무정보는 브라우저 개발자 콘솔(F12)에서 JavaScript로 입력할 수 있습니다:

```javascript
// 단일 종목 재무정보 입력
await dataManager.saveStockDetails('AAPL', {
  company_name: 'Apple Inc.',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  market_cap: '$3.2T',
  pe_ratio: '32.5',
  dividend_yield: '0.5%',
  roe: '147%',
  eps: '$6.42',
  pbr: '47.8',
  bps: '$3.85',
  description: 'Apple Inc. designs, manufactures, and markets smartphones...'
});

// 여러 종목 일괄 입력 예시
const stocksData = [
  { ticker: 'MSFT', roe: '38%', eps: '$11.05', pbr: '13.2', bps: '$31.45' },
  { ticker: 'PFE', roe: '8%', eps: '$1.05', pbr: '2.1', bps: '$13.85' },
  // ... 더 추가
];

for (const stock of stocksData) {
  await dataManager.saveStockDetails(stock.ticker, stock);
  console.log(`${stock.ticker} 저장 완료`);
}
```

**샘플 데이터**: 현재 AAPL, MSFT, PFE, VZ, KO의 재무정보가 이미 입력되어 있습니다.

---

## 🛠️ 기술 스택

### Frontend
- **HTML5**: 시맨틱 마크업
- **Tailwind CSS**: 유틸리티 기반 스타일링 (CDN)
- **Vanilla JavaScript**: 순수 ES6+ (프레임워크 없음)
- **Font Awesome**: 아이콘
- **외부 링크 통합**: Yahoo Finance, Google Finance

### Backend
- **Node.js**: v18+ 런타임
- **Express.js**: 웹 서버 프레임워크
- **PostgreSQL**: 관계형 데이터베이스
- **node-postgres (pg)**: PostgreSQL 클라이언트
- **CORS**: Cross-Origin Resource Sharing 지원
- **dotenv**: 환경 변수 관리

### Infrastructure
- **Google Cloud Run**: 컨테이너 기반 서버리스 플랫폼
- **Cloud SQL**: 관리형 PostgreSQL 데이터베이스
- **Docker**: 컨테이너화
- **Cloud Build**: CI/CD 파이프라인

### 파일 구조
```
etf-analysis-system/
├── index.html                      # 메인 페이지 (SPA)
├── js/                             # 프론트엔드 JavaScript
│   ├── csvParser.js               # CSV 파싱 및 검증
│   ├── dataManager.js             # API 통신 관리
│   ├── dashboard.js               # 대시보드 렌더링
│   └── main.js                    # 메인 앱 로직
├── backend/                        # 백엔드 코드
│   ├── routes/
│   │   └── tables.js              # RESTful API 라우트
│   └── database/
│       ├── db.js                  # 데이터베이스 연결
│       ├── schema.sql             # 테이블 스키마
│       └── init-db.js             # DB 초기화 스크립트
├── server.js                       # Express.js 서버
├── package.json                    # npm 의존성
├── Dockerfile                      # Docker 이미지 정의
├── .env.example                    # 환경 변수 템플릿
├── .dockerignore                   # Docker 빌드 제외 파일
├── .gitignore                      # Git 추적 제외 파일
├── README.md                       # 프로젝트 문서
├── CLOUD_RUN_DEPLOYMENT.md        # Cloud Run 배포 가이드
└── sample_data/                    # 샘플 CSV 파일
    ├── SCHD_holdings_real.csv
    ├── VOO_holdings_real.csv
    └── IVV_holdings_real.csv
```

---

## ⚠️ 문제 해결

### Q1: CSV 업로드 후 "비중 합계가 100%와 차이가 있습니다" 경고
**A**: 정상입니다. Cash, Other 등 특수 항목이 포함되거나 데이터 수집 시점 차이로 발생할 수 있습니다. 95~105% 범위면 사용 가능합니다.

### Q2: 대시보드에서 데이터가 표시되지 않음
**A**: 
1. CSV를 정상적으로 업로드했는지 확인
2. 필터 설정 확인 (최대 비중이 너무 낮지 않은지)
3. 브라우저 콘솔(F12)에서 오류 메시지 확인

### Q3: 재무정보(ROE, EPS 등)가 표시되지 않음
**A**: 재무정보는 별도로 입력해야 합니다. 브라우저 콘솔(F12)에서 `dataManager.saveStockDetails()` 함수를 사용하여 입력할 수 있습니다. 자세한 방법은 위의 "재무정보 입력 방법" 섹션을 참조하세요.

### Q4: 오래된 스냅샷 데이터 삭제하려면?
**A**: 현재 버전에서는 UI를 통한 삭제 기능이 없습니다. 브라우저 개발자 도구에서 직접 API 호출이 필요합니다:
```javascript
// 콘솔에서 실행
dataManager.deleteRecord('etf_holdings', 'record_id_here');
```

### Q5: 여러 ETF를 한 번에 비교하려면?
**A**: 대시보드에서 "전체 ETF" 필터를 선택하면 모든 ETF의 저비중 종목을 통합하여 볼 수 있습니다.

---

## 🔮 향후 개발 계획

### 🚧 현재 미구현 기능

1. **종목 상세 정보 자동 수집**
   - ❌ Yahoo Finance API 통합
   - ❌ 기업 개요, 재무 정보 자동 업데이트
   - 💡 대안: 수동 입력 또는 CSV로 일괄 업로드

2. **알림 기능**
   - ❌ 신규 저비중 종목 알림
   - ❌ 비중 급증 알림
   - 💡 대안: 정기적으로 히스토리 탭에서 수동 확인

3. **고급 분석**
   - ❌ 저비중 종목의 주가 성과 추적
   - ❌ ETF 간 중복 종목 분석
   - ❌ 섹터별 저비중 종목 분포

4. **데이터 내보내기**
   - ❌ 분석 결과 PDF/Excel 다운로드
   - ❌ 커스텀 리포트 생성

### 📅 로드맵

#### v1.1 (다음 업데이트)
- [ ] 종목 상세 정보 CSV 일괄 업로드
- [ ] 저비중 종목 북마크 기능
- [ ] ETF 간 중복 종목 하이라이트
- [ ] 다크 모드 지원

#### v1.2 (향후 계획)
- [ ] 사용자 설정 저장 (LocalStorage)
- [ ] 차트 커스터마이징
- [ ] 모바일 반응형 최적화
- [ ] PWA (Progressive Web App) 변환

#### v2.0 (장기 계획)
- [ ] 백엔드 서버 구축 (Python/FastAPI)
- [ ] 자동 데이터 크롤링 (Scheduled Jobs)
- [ ] Yahoo Finance API 통합
- [ ] 사용자 계정 및 포트폴리오 관리
- [ ] 이메일 알림 시스템

---

## 📊 사용 예시

### 시나리오 1: 신규 투자 아이디어 발굴
1. 4개 ETF의 최신 포트폴리오 CSV 다운로드
2. 모두 업로드 후 대시보드에서 "전체 ETF" 필터 적용
3. 최대 비중 1%로 설정하여 극저비중 종목 조회
4. 여러 ETF에 공통으로 포함된 종목 식별
5. 해당 종목의 상세 정보 확인 및 추가 리서치

### 시나리오 2: 포트폴리오 변화 모니터링
1. 매주 또는 매월 정기적으로 ETF CSV 다운로드
2. 업로드 후 히스토리 탭에서 "비교" 버튼 클릭
3. 신규 편입된 저비중 종목 확인
4. 비중이 급증한 종목 분석
5. 제외된 종목의 이유 파악

### 시나리오 3: 섹터 트렌드 파악
1. 특정 ETF (예: SCHD)의 데이터 업로드
2. 대시보드에서 저비중 종목 테이블 확인
3. 섹터 컬럼을 기준으로 분류
4. 특정 섹터에 저비중 종목이 집중되어 있는지 분석
5. 해당 섹터의 성장 가능성 평가

---

## 📄 라이선스

MIT License

Copyright (c) 2025 ETF Analysis System

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.

---

## 👤 개발자

**프로젝트 작성자**: AI Assistant
**연락처**: [GitHub Issues](https://github.com/yourusername/etf-analysis/issues)

---

## 🙏 기여 방법

이 프로젝트에 기여하고 싶으시다면:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📚 추가 리소스

### ETF 공식 문서
- [SCHD Fact Sheet](https://www.schwabassetmanagement.com/products/schd)
- [VOO Prospectus](https://investor.vanguard.com/investment-products/etfs/profile/voo)
- [VTI Overview](https://investor.vanguard.com/investment-products/etfs/profile/vti)
- [IVV Information](https://www.ishares.com/us/products/239726)

### 투자 분석 도구
- [Yahoo Finance](https://finance.yahoo.com/)
- [Finviz](https://finviz.com/)
- [ETF.com](https://www.etf.com/)

---

**마지막 업데이트**: 2025-01-18
**버전**: 1.0.0
