# CSV 파서 테스트 가이드

## 📋 개요

v1.2.0에서 업데이트된 CSV 파서를 실제 ETF 파일로 테스트하는 가이드입니다.

---

## 🧪 테스트 파일

### 제공된 실제 CSV 샘플
```
sample_data/
├── SCHD_holdings_real.csv  (13 KB, 104 종목)
├── VOO_holdings_real.csv   (52 KB, 503 종목)
└── IVV_holdings_real.csv   (96 KB, 505 종목)
```

### 사용자 업로드 파일
- `SCHD_holdings.csv` (13 KB)
- `VOO_holdings.csv` (52 KB)
- `IVV_holdings.csv` (96 KB)
- `VTI_holdings.csv` (1 MB, 대용량)

---

## 🔍 각 ETF별 CSV 양식

### 1. SCHD (Schwab)

#### 헤더 구조:
```csv
As-Of-Date,Symbol,Quantity,Percent of Assets,Name,BBG FIGI,Country,Currency,Exchange,Exchange (fx) Rate,Market Currency,Sector
```

#### 매핑:
- **Ticker**: `Symbol` (2번 컬럼)
- **Company Name**: `Name` (5번 컬럼)
- **Weight**: `Percent of Assets` (4번 컬럼)
- **Sector**: `Sector` (12번 컬럼)

#### 특징:
- ✅ 헤더가 첫 줄에 있음
- ✅ 비중이 소수점 형식 (4.4145720413)
- ✅ 메타 정보 없음

#### 예상 결과:
- 총 종목: 104개
- 비중 합계: ~100%
- 최대 비중: ~4.4% (ABBV)

---

### 2. VOO (Vanguard S&P 500)

#### 헤더 구조:
```csv
Holdings details

S&P 500 ETF (VOO)


Equity,as of 09/30/2025

,SEDOL,HOLDINGS,TICKER,% OF FUNDS*,SUB-INDUSTRY,COUNTRY,SECURITYDEPOSITORYRECEIPTTYPE,MARKET VALUE*,SHARES
```

#### 매핑:
- **Ticker**: `TICKER` (4번 컬럼)
- **Company Name**: `HOLDINGS` (3번 컬럼)
- **Weight**: `% OF FUNDS*` (5번 컬럼)
- **Sector**: `SUB-INDUSTRY` (6번 컬럼)

#### 특징:
- ⚠️ 상단에 메타 정보 6줄 (자동 스킵)
- ✅ 비중이 퍼센트 형식 (7.94%)
- ✅ 첫 번째 컬럼 비어있음 (자동 처리)

#### 예상 결과:
- 총 종목: 503개
- 비중 합계: ~100%
- 최대 비중: ~7.94% (NVDA)

---

### 3. IVV (BlackRock iShares)

#### 헤더 구조:
```csv
iShares Core S&P 500 ETF
Fund Holdings as of,"Oct 16, 2025"
Inception Date,"May 15, 2000"
Shares Outstanding,"1,048,850,000.00"
Stock,"-"
Bond,"-"
Cash,"-"
Other,"-"
 
Ticker,Name,Sector,Asset Class,Market Value,Weight (%),Notional Value,Quantity,Price,Location,Exchange,Currency,FX Rate,Market Currency,Accrual Date
```

#### 매핑:
- **Ticker**: `Ticker` (1번 컬럼)
- **Company Name**: `Name` (2번 컬럼)
- **Weight**: `Weight (%)` (6번 컬럼)
- **Sector**: `Sector` (3번 컬럼)

#### 특징:
- ⚠️ 상단에 메타 정보 9줄 (자동 스킵)
- ✅ 비중이 숫자 형식 (7.83)
- ✅ 따옴표로 감싸진 값 (자동 처리)

#### 예상 결과:
- 총 종목: 505개
- 비중 합계: ~100%
- 최대 비중: ~7.83% (NVDA)

---

### 4. VTI (Vanguard Total Stock Market)

#### 헤더 구조:
```csv
Holdings details

Total World Stock ETF (VT)


Equity,as of 09/30/2025

,SEDOL,HOLDINGS,TICKER,% OF FUNDS*,SUB-INDUSTRY,COUNTRY,SECURITYDEPOSITORYRECEIPTTYPE,MARKET VALUE*,SHARES
```

#### 매핑:
- VOO와 동일한 구조

#### 특징:
- ⚠️ 대용량 파일 (1 MB, 약 3000개 종목)
- ✅ VOO와 동일한 파싱 로직 적용

#### 예상 결과:
- 총 종목: ~3000개
- 비중 합계: ~100%
- 최대 비중: ~4.26% (NVDA)

---

## ✅ 테스트 체크리스트

### 1. SCHD 테스트

**단계**:
1. 브라우저에서 `index.html` 열기
2. "데이터 업로드" 탭 선택
3. ETF 선택: **SCHD**
4. 파일 선택: `sample_data/SCHD_holdings_real.csv`
5. 미리보기 확인

**확인 항목**:
- [ ] 총 종목 수: 104개
- [ ] 비중 합계: 95~105% 범위
- [ ] 저비중 종목 (≤2%): 약 20~30개
- [ ] 티커 정상 표시: ABBV, AMGN, PEP 등
- [ ] 비중 정상 표시: 4.41%, 4.30%, 4.23% 등
- [ ] 섹터 정상 표시: Health Care, Consumer Staples 등

**업로드 후 확인**:
- [ ] "업로드 완료" 메시지 표시
- [ ] 대시보드로 자동 이동
- [ ] 전체 종목 (0%) 기본 표시
- [ ] 2%로 조절 시 저비중 종목만 표시

---

### 2. VOO 테스트

**단계**:
1. ETF 선택: **VOO**
2. 파일 선택: `sample_data/VOO_holdings_real.csv`
3. 미리보기 확인

**확인 항목**:
- [ ] 총 종목 수: 503개
- [ ] 비중 합계: 95~105% 범위
- [ ] 저비중 종목 (≤2%): 약 300~400개
- [ ] 티커 정상 표시: NVDA, MSFT, AAPL 등
- [ ] 비중 정상 표시: 7.94%, 6.72%, 6.59% 등
- [ ] 섹터 정상 표시: Semiconductors, Systems Software 등
- [ ] 메타 정보 라인 무시 확인

**업로드 후 확인**:
- [ ] 대시보드에서 VOO 종목 표시
- [ ] SCHD + VOO 통합 표시 (ETF 필터 "전체")

---

### 3. IVV 테스트

**단계**:
1. ETF 선택: **IVV**
2. 파일 선택: `sample_data/IVV_holdings_real.csv`
3. 미리보기 확인

**확인 항목**:
- [ ] 총 종목 수: 505개
- [ ] 비중 합계: 95~105% 범위
- [ ] 저비중 종목 (≤2%): 약 300~400개
- [ ] 티커 정상 표시: NVDA, MSFT, AAPL 등
- [ ] 비중 정상 표시: 7.83, 6.71, 6.48 (숫자 형식)
- [ ] 섹터 정상 표시: Information Technology 등
- [ ] 따옴표 제거 확인

---

### 4. VTI 테스트 (선택)

**주의**: 대용량 파일 (1 MB, 3000개 종목)

**단계**:
1. ETF 선택: **VTI**
2. 파일 선택: `VTI_holdings.csv`
3. 로딩 시간 예상: 5~10초

**확인 항목**:
- [ ] 총 종목 수: ~3000개
- [ ] 메모리 오버플로우 없음
- [ ] 브라우저 응답 정상
- [ ] 페이지네이션 정상 동작

---

## 🐛 오류 대응

### 에러 1: "CSV 헤더를 찾을 수 없습니다"

**원인**:
- 메타 정보가 15줄 이상
- 헤더 키워드 불일치

**해결**:
1. CSV 파일을 텍스트 에디터로 열기
2. 상단 메타 정보 수동 삭제
3. 헤더 행이 첫 줄이 되도록 정리

---

### 에러 2: "비중 합계가 50% 미만입니다"

**원인**:
- Weight 컬럼을 Market Value로 잘못 파싱
- 비중 값이 소수점 0.07 (7%) 형식

**해결**:
1. CSV 헤더 확인
2. Weight 컬럼 위치 확인
3. `csvParser.js` 의 `columnMappings` 확인

---

### 에러 3: "유효한 데이터를 찾을 수 없습니다"

**원인**:
- 모든 행이 필터링됨
- Ticker 컬럼 비어있음

**해결**:
1. 브라우저 콘솔(F12) 열기
2. 에러 로그 확인
3. CSV 파일의 첫 데이터 행 확인

---

## 📊 성공 기준

### 전체 테스트 통과 조건:

- [ ] SCHD: 파싱 성공, 104개 종목
- [ ] VOO: 파싱 성공, 503개 종목
- [ ] IVV: 파싱 성공, 505개 종목
- [ ] VTI: 파싱 성공, ~3000개 종목 (선택)

### 대시보드 기능:

- [ ] 0% 필터: 전체 종목 표시
- [ ] 2% 필터: 저비중 종목만 표시
- [ ] ETF 필터: 개별 ETF 선택 가능
- [ ] 스냅샷: 여러 시점 데이터 비교 가능
- [ ] 재무정보: ROE, EPS 등 표시 (입력된 경우)
- [ ] 외부 링크: Yahoo/Google Finance 연결

---

## 🔍 디버깅 팁

### 1. 콘솔 로그 확인

```javascript
// 브라우저 콘솔(F12)에서 실행
console.log('파싱된 데이터:', parsedData);
console.log('컬럼 매핑:', csvParser.columnMappings);
```

### 2. 미리보기 통계 확인

파일 선택 후 미리보기 섹션에서:
- 총 종목 수
- 비중 합계
- 평균 비중
- 저비중 종목 수

### 3. 네트워크 탭 확인

업로드 후 Network 탭에서:
- POST 요청 성공 여부
- 응답 데이터 확인

---

## 📚 추가 리소스

- **README.md**: 프로젝트 개요 및 사용 가이드
- **USAGE_GUIDE.md**: 상세 사용법 및 FAQ
- **CHANGELOG.md**: 버전별 변경 이력

---

**테스트 완료 후**: 
- [ ] 모든 ETF 정상 파싱 확인
- [ ] GitHub Issues에 결과 보고 (선택)
- [ ] 실제 투자 분석 시작! 🚀

---

**문서 버전**: v1.2.0  
**마지막 업데이트**: 2025-01-18
