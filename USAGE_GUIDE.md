# ETF 저비중 종목 분석 시스템 - 상세 사용 가이드

## 📖 목차
1. [시작하기](#시작하기)
2. [CSV 다운로드 상세 가이드](#csv-다운로드-상세-가이드)
3. [CSV 양식 문제 해결](#csv-양식-문제-해결)
4. [실전 사용 예시](#실전-사용-예시)
5. [FAQ](#faq)

---

## 시작하기

### 1단계: 프로젝트 접속
브라우저에서 `index.html` 파일을 엽니다.

### 2단계: 샘플 데이터로 테스트
처음 사용하는 경우, `sample_data/` 폴더의 샘플 CSV로 테스트할 수 있습니다:
- `SCHD_sample.csv`: Schwab 고배당 ETF 샘플
- `VOO_sample.csv`: Vanguard S&P 500 ETF 샘플

---

## CSV 다운로드 상세 가이드

### SCHD (Schwab U.S. Dividend Equity ETF)

#### 방법 1: 웹사이트 직접 다운로드
1. https://www.schwabassetmanagement.com/products/schd 접속
2. 페이지 중간의 **"Holdings"** 탭 클릭
3. 테이블 상단 또는 하단의 **"Export"** 버튼 클릭
4. 파일이 자동으로 다운로드됩니다 (보통 `SCHD_holdings.csv`)

#### 예상 파일 형식:
```csv
Ticker,Name,Weight,Shares,Market Value
AAPL,Apple Inc.,4.52%,1250000,$215,000,000
```

#### 주의사항:
- Weight 컬럼이 `%` 기호를 포함할 수 있음
- Market Value가 `$` 및 쉼표 포함 → 자동 처리됨
- 파일 상단에 설명 텍스트가 있을 수 있음 → 자동 스킵

---

### VOO / VTI (Vanguard ETFs)

#### 방법 1: 웹사이트 직접 다운로드
1. **VOO**: https://investor.vanguard.com/investment-products/etfs/profile/voo
   **VTI**: https://investor.vanguard.com/investment-products/etfs/profile/vti
2. **"Portfolio & Management"** 탭 클릭
3. **"View all holdings"** 링크 클릭
4. 페이지 상단의 **"Download"** 버튼 클릭
5. CSV 형식 선택

#### 예상 파일 형식:
```csv
Holding,Ticker,SEDOL,Weight,Shares,Market Value
Apple Inc.,AAPL,2046251,7.1%,165000000,$28,500,000,000
```

#### 주의사항:
- 첫 번째 컬럼이 "Holding" (회사명)
- Ticker가 두 번째 컬럼
- SEDOL 등 추가 식별자 포함 → 무시됨
- 매우 많은 종목 (VTI는 3000개 이상)

---

### IVV (iShares Core S&P 500 ETF)

#### 방법 1: 웹사이트 직접 다운로드
1. https://www.ishares.com/us/products/239726/ishares-core-sp-500-etf 접속
2. **"Holdings"** 탭 클릭
3. **"Download"** 버튼 클릭
4. **"Full Holdings (CSV)"** 선택

#### 방법 2: 직접 다운로드 링크
```
https://www.ishares.com/us/products/239726/ishares-core-sp-500-etf/1467271812596.ajax?fileType=csv&fileName=IVV_holdings&dataType=fund
```

#### 예상 파일 형식:
```csv
Ticker,Name,Sector,Asset Class,Market Value,Weight (%),Notional Value,Shares,ISIN
AAPL,APPLE INC,Information Technology,Equity,12345678,7.25,12345678,65432100,US0378331005
```

#### 주의사항:
- 컬럼이 많음 (10개 이상)
- "Weight (%)" 형식 → 자동 파싱
- 섹터 정보 포함 (활용 가능)
- 파일 상단에 메타 정보 여러 줄 → 자동 스킵

---

## CSV 양식 문제 해결

### 문제 1: "CSV 헤더를 찾을 수 없습니다"

**증상**: 파일 업로드 시 오류 메시지 표시

**원인**:
- CSV 파일이 비표준 형식
- 헤더가 첫 10줄 이내에 없음
- Ticker/Symbol/Weight 컬럼이 없음

**해결 방법**:

#### A. CSV 파일 수동 확인
1. CSV를 Excel 또는 텍스트 에디터로 열기
2. 첫 줄이 헤더인지 확인
3. 다음 컬럼들이 있는지 확인:
   - Ticker, Symbol, Stock Symbol 중 하나
   - Weight, Weight (%), Portfolio Weight 중 하나

#### B. 헤더가 없는 경우
```csv
# 잘못된 예시 (헤더 없음)
AAPL,Apple Inc.,4.52%
MSFT,Microsoft Corp.,4.21%

# 올바른 예시 (헤더 추가)
Ticker,Name,Weight
AAPL,Apple Inc.,4.52%
MSFT,Microsoft Corp.,4.21%
```

#### C. 상단에 불필요한 정보가 있는 경우
```csv
# 잘못된 예시
Fund Name: SCHD
As of Date: 2025-01-17
Total Holdings: 45

Ticker,Name,Weight
AAPL,Apple Inc.,4.52%

# 올바른 예시 (상단 줄 삭제)
Ticker,Name,Weight
AAPL,Apple Inc.,4.52%
```

시스템은 상위 10줄까지 자동으로 헤더를 찾지만, 그 이상인 경우 수동 편집 필요.

---

### 문제 2: "비중 합계가 100%와 차이가 있습니다"

**증상**: 미리보기에서 경고 메시지 표시 (예: 비중 합계 98.5%)

**원인**:
- Cash, Other, Unassigned 등 특수 항목 제외됨
- 데이터 수집 시점의 일시적 차이
- 소수점 반올림 오차

**해결 방법**:

#### A. 95~105% 범위면 정상
- 이 범위 내라면 사용 가능
- 시스템이 자동으로 경고만 표시

#### B. 80% 미만이거나 120% 초과인 경우
1. CSV 파일의 Weight 컬럼 확인
2. 다음 형식인지 체크:
   - `4.52%` ✅
   - `4.52` ✅
   - `0.0452` (소수점 형식) ✅
   - `452` (잘못된 값) ❌

#### C. 수동 검증
```python
# Python으로 검증 (선택 사항)
import pandas as pd

df = pd.read_csv('your_file.csv')
total_weight = df['Weight'].str.replace('%', '').astype(float).sum()
print(f"Total Weight: {total_weight}%")
```

---

### 문제 3: "유효한 데이터를 찾을 수 없습니다"

**증상**: 파싱 후 데이터가 0건

**원인**:
- 모든 행이 필터링됨
- Ticker가 비어있음
- Weight가 0 또는 null

**해결 방법**:

#### A. 데이터 확인
```csv
# 잘못된 예시 (Ticker 없음)
,Apple Inc.,4.52%
,Microsoft Corp.,4.21%

# 올바른 예시
AAPL,Apple Inc.,4.52%
MSFT,Microsoft Corp.,4.21%
```

#### B. 특수 문자 제거
- Ticker에 공백, 특수문자가 있는지 확인
- 예: `"AAPL "` → `AAPL`로 수정 (자동 처리됨)

---

### 문제 4: 중복 티커 경고

**증상**: 콘솔에 "중복된 티커" 경고

**원인**:
- 동일 종목이 여러 클래스로 나뉨 (예: GOOG, GOOGL)
- 데이터 수집 오류

**해결 방법**:

#### A. 실제 중복인 경우
- CSV에서 중복 행 제거
- 더 큰 비중의 행만 유지

#### B. 다른 클래스인 경우
- 그대로 유지 (예: BRK.A, BRK.B는 다른 종목)
- 시스템이 자동으로 구분

---

## 실전 사용 예시

### 예시 1: SCHD 저비중 종목 발굴

**목표**: SCHD ETF에서 1% 미만 비중 종목 찾기

**단계**:
1. SCHD CSV 다운로드
2. 시스템에 업로드
3. 대시보드 → 필터 설정:
   - ETF: SCHD
   - 최대 비중: 1%
4. 결과 분석:
   ```
   예상 결과:
   - PPL Corporation (1.15%)
   - NiSource Inc. (1.08%)
   - Pinnacle West Capital (0.98%)
   - ... 등 10~15개 종목
   ```
5. 각 종목 클릭하여 상세 정보 확인

---

### 예시 2: 여러 ETF 교차 분석

**목표**: SCHD, VOO, IVV에 공통으로 포함된 저비중 종목 찾기

**단계**:
1. 3개 ETF의 CSV 모두 업로드 (시간차를 두고)
2. 대시보드 → 필터:
   - ETF: 전체
   - 최대 비중: 2%
3. 테이블에서 정렬:
   - 티커 기준 정렬하여 같은 종목 찾기
4. 수동으로 교차 종목 식별

**개선 팁**:
- 향후 업데이트에서 자동 교차 분석 기능 추가 예정
- 현재는 Excel로 내보내서 분석 가능

---

### 예시 3: 월간 포트폴리오 변화 추적

**목표**: 매월 SCHD 포트폴리오 변화 모니터링

**단계**:
1. **초기 설정** (1월 1일):
   - SCHD CSV 다운로드 및 업로드
   - 파일명: `SCHD_20250101.csv`

2. **정기 업데이트** (2월 1일):
   - 새 SCHD CSV 다운로드
   - 업로드 (기존 데이터 유지됨)

3. **변화 분석**:
   - 히스토리 탭 이동
   - 2월 1일 업로드 옆의 "비교" 버튼 클릭
   - 결과 확인:
     ```
     신규 편입: XYZ Corp. (0.85%)
     제외: ABC Inc. (제외됨)
     비중 증가: DEF Ltd. (0.54% → 0.78%)
     ```

4. **인사이트 도출**:
   - 신규 편입 종목의 최근 주가 흐름 확인
   - 제외된 종목의 이유 분석
   - 비중 증가 종목에 대한 추가 리서치

---

### 예시 4: 섹터별 저비중 분석

**목표**: Utilities 섹터의 저비중 종목 집중 분석

**단계**:
1. SCHD CSV 업로드 (Utilities 섹터 종목 많음)
2. 대시보드에서 저비중 종목 테이블 확인
3. 섹터 컬럼으로 필터링 (수동):
   - 브라우저 검색 기능 (Ctrl+F) 사용
   - "Utilities" 검색
4. 해당 종목들의 비중 확인:
   ```
   예시 결과:
   - AEP: 2.15%
   - WEC: 1.98%
   - D: 1.87%
   - ... 등
   ```
5. 업종 트렌드 분석:
   - 왜 Utilities가 저비중인가?
   - 성장 가능성 평가

---

## FAQ

### Q1: CSV 파일을 어디서 다운로드하나요?
**A**: 각 ETF 발행사 공식 웹사이트에서 다운로드합니다:
- SCHD: schwabassetmanagement.com
- VOO/VTI: investor.vanguard.com
- IVV: ishares.com

자세한 방법은 [CSV 다운로드 가이드](#csv-다운로드-상세-가이드) 참조.

---

### Q2: 무료로 사용할 수 있나요?
**A**: 네, 완전 무료입니다. 모든 데이터는 브라우저 로컬에 저장됩니다.

---

### Q3: 데이터를 얼마나 자주 업데이트해야 하나요?
**A**: 
- **일반 투자자**: 월 1회 추천
- **적극적 투자자**: 주 1회
- **데이터 변화 빈도**: ETF 포트폴리오는 일별 업데이트되지만, 큰 변화는 분기별로 발생

---

### Q4: 한 번에 여러 CSV를 업로드할 수 있나요?
**A**: 현재는 한 번에 하나씩 업로드해야 합니다. 각 ETF를 순차적으로 업로드하세요.

---

### Q5: 업로드한 데이터를 삭제하려면?
**A**: 
- **개별 삭제**: 현재 UI에서는 지원하지 않음
- **전체 삭제**: 브라우저 캐시 및 IndexedDB 삭제
- **향후 업데이트**: 데이터 관리 기능 추가 예정

---

### Q6: 종목 상세 정보는 어떻게 입력하나요?
**A**: 
- **현재 버전**: 수동 입력 필요 (API 직접 호출)
- **향후 업데이트**: 
  - CSV 일괄 업로드
  - Yahoo Finance API 자동 연동

**임시 방법**:
```javascript
// 브라우저 콘솔에서 실행
dataManager.saveStockDetails('AAPL', {
  company_name: 'Apple Inc.',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  market_cap: '$3.2T',
  pe_ratio: '32.5',
  dividend_yield: '0.5%',
  description: 'Apple Inc. designs, manufactures...'
});
```

---

### Q7: 모바일에서 사용할 수 있나요?
**A**: 
- **현재**: 반응형 디자인으로 모바일 브라우저에서 사용 가능
- **최적화**: 태블릿 이상 권장
- **향후**: 모바일 전용 레이아웃 개선 예정

---

### Q8: 데이터를 Excel로 내보낼 수 있나요?
**A**: 
- **현재**: 직접 지원하지 않음
- **임시 방법**: 
  1. 테이블 데이터 복사 (Ctrl+C)
  2. Excel에 붙여넣기
- **향후**: CSV/Excel 내보내기 기능 추가 예정

---

### Q9: 비중이 2%가 넘는 종목도 보려면?
**A**: 대시보드 필터에서 "최대 비중"을 원하는 값으로 조정 (예: 5%, 10%)

---

### Q10: 에러가 발생하면 어떻게 하나요?
**A**: 
1. **브라우저 콘솔 확인** (F12 → Console 탭)
2. **에러 메시지 복사**
3. **문제 해결**:
   - CSV 형식 확인
   - 브라우저 새로고침
   - 캐시 삭제 후 재시도
4. **GitHub Issues**에 보고 (향후 지원)

---

## 고급 팁

### 팁 1: 브라우저 개발자 도구 활용
```javascript
// 콘솔에서 모든 데이터 조회
dataManager.getRecords('etf_holdings', 1, 1000).then(data => {
  console.log(data);
});

// 특정 ETF 필터링
dataManager.getLowWeightHoldings(2, 'SCHD').then(holdings => {
  console.log(`SCHD 저비중 종목: ${holdings.length}개`);
});
```

### 팁 2: CSV 전처리 (Python)
```python
import pandas as pd

# CSV 로드
df = pd.read_csv('SCHD_holdings.csv')

# 불필요한 컬럼 제거
df = df[['Ticker', 'Name', 'Weight']]

# 비중 정규화
df['Weight'] = df['Weight'].str.replace('%', '').astype(float)

# 저장
df.to_csv('SCHD_clean.csv', index=False)
```

### 팁 3: 정기 알림 설정
Google Calendar 또는 Outlook에 월간 반복 일정 설정:
- **제목**: ETF 포트폴리오 업데이트
- **내용**: SCHD, VOO, VTI, IVV CSV 다운로드 및 분석
- **빈도**: 매월 1일

---

**문서 버전**: 1.0.0  
**마지막 업데이트**: 2025-01-18  
**작성자**: ETF Analysis System Team
