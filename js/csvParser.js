/**
 * CSV 파서 - 다양한 ETF CSV 양식을 자동으로 감지하고 파싱
 * 지원: SCHD, VOO, VTI, IVV 등 주요 ETF
 */

class CSVParser {
    constructor() {
        // 컬럼 매핑 - 다양한 헤더명을 표준화
        this.columnMappings = {
            ticker: ['ticker', 'symbol', 'stock symbol', 'ticker symbol', 'holdings ticker'],
            company_name: ['name', 'holding', 'holdings', 'company name', 'holdings name', 'description', 'security name'],
            weight: ['weight', 'weight (%)', 'portfolio weight', '% of net assets', 'net assets', 'allocation', '% of funds', 'percent of assets'],
            shares: ['shares', 'number of shares', 'shares held', 'quantity'],
            market_value: ['market value', 'market val', 'value', 'holdings value', 'notional value'],
            sector: ['sector', 'asset class', 'industry', 'sub-industry']
        };
    }

    /**
     * CSV 텍스트를 파싱
     */
    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            throw new Error('CSV 파일이 비어있거나 형식이 올바르지 않습니다.');
        }

        // 헤더 찾기 (여러 줄에 헤더가 있을 수 있음)
        let headerIndex = this.findHeaderRow(lines);
        if (headerIndex === -1) {
            throw new Error('CSV 헤더를 찾을 수 없습니다. Ticker, Symbol, Name 등의 컬럼이 있는지 확인하세요.');
        }

        const headers = this.parseCSVLine(lines[headerIndex]);
        const columnIndices = this.mapColumns(headers);

        // 필수 필드 확인
        if (columnIndices.ticker === -1 || columnIndices.weight === -1) {
            throw new Error('필수 컬럼(Ticker/Symbol과 Weight)을 찾을 수 없습니다.\n헤더: ' + headers.join(', '));
        }

        // 데이터 파싱
        const data = [];
        for (let i = headerIndex + 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            
            if (values.length < 2) continue; // 빈 줄 스킵
            
            const ticker = this.cleanValue(values[columnIndices.ticker]);
            const weight = this.parseWeight(values[columnIndices.weight]);

            // 유효성 검증
            if (!ticker || ticker.length < 1 || weight === null || weight === 0) {
                continue; // 잘못된 데이터 스킵
            }

            // Total, Cash 등 특수 항목 제외
            if (this.isSpecialRow(ticker)) {
                continue;
            }

            const row = {
                ticker: ticker.toUpperCase(),
                company_name: columnIndices.company_name !== -1 ? 
                    this.cleanValue(values[columnIndices.company_name]) : ticker,
                weight: weight,
                shares: columnIndices.shares !== -1 ? 
                    this.parseNumber(values[columnIndices.shares]) : null,
                market_value: columnIndices.market_value !== -1 ? 
                    this.parseNumber(values[columnIndices.market_value]) : null,
                sector: columnIndices.sector !== -1 ? 
                    this.cleanValue(values[columnIndices.sector]) : null
            };

            data.push(row);
        }

        if (data.length === 0) {
            throw new Error('유효한 데이터를 찾을 수 없습니다.');
        }

        // 검증
        this.validateData(data);

        return data;
    }

    /**
     * CSV 라인을 파싱 (쉼표로 구분, 따옴표 처리)
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    /**
     * 헤더 행 찾기
     */
    findHeaderRow(lines) {
        const headerKeywords = ['ticker', 'symbol', 'name', 'holding', 'holdings', 'weight', 'percent', '% of'];
        
        for (let i = 0; i < Math.min(15, lines.length); i++) {
            const lineLower = lines[i].toLowerCase();
            
            // 특정 패턴 무시 (메타 정보)
            if (lineLower.includes('as of') || 
                lineLower.includes('inception date') ||
                lineLower.includes('fund holdings') ||
                lineLower.includes('holdings details') ||
                lineLower.includes('equity,as of')) {
                continue;
            }
            
            let matchCount = 0;
            
            for (const keyword of headerKeywords) {
                if (lineLower.includes(keyword)) {
                    matchCount++;
                }
            }
            
            if (matchCount >= 2) {
                return i;
            }
        }
        
        return -1;
    }

    /**
     * 헤더를 표준 컬럼으로 매핑
     */
    mapColumns(headers) {
        const indices = {
            ticker: -1,
            company_name: -1,
            weight: -1,
            shares: -1,
            market_value: -1,
            sector: -1
        };

        for (let i = 0; i < headers.length; i++) {
            const header = headers[i].toLowerCase().trim().replace(/[*\s]+/g, ' ').trim();
            
            // 빈 헤더 스킵
            if (!header || header === '') continue;
            
            for (const [field, patterns] of Object.entries(this.columnMappings)) {
                for (const pattern of patterns) {
                    const patternClean = pattern.toLowerCase().trim();
                    
                    // 정확한 매칭 우선
                    if (header === patternClean) {
                        if (indices[field] === -1) {
                            indices[field] = i;
                            break;
                        }
                    }
                    // 부분 매칭
                    else if (header.includes(patternClean) || patternClean.includes(header)) {
                        if (indices[field] === -1) {
                            indices[field] = i;
                            break;
                        }
                    }
                }
            }
        }

        return indices;
    }

    /**
     * 값 정제
     */
    cleanValue(value) {
        if (!value) return '';
        return value.replace(/"/g, '').trim();
    }

    /**
     * 비중(%) 파싱
     */
    parseWeight(value) {
        if (!value) return null;
        
        // % 기호, 쉼표, 달러 기호 제거
        const cleaned = value.toString().replace(/[%,$,\s]/g, '');
        const number = parseFloat(cleaned);
        
        if (isNaN(number)) return null;
        
        // 값이 매우 크면 무시 (market value를 잘못 파싱한 경우)
        if (number > 1000) return null;
        
        // 이미 백분율 형식이면 그대로 사용
        return number;
    }

    /**
     * 숫자 파싱 (쉼표, $ 등 제거)
     */
    parseNumber(value) {
        if (!value) return null;
        
        const cleaned = value.toString().replace(/[$,\s]/g, '');
        const number = parseFloat(cleaned);
        
        return isNaN(number) ? null : number;
    }

    /**
     * 특수 행 판별 (Total, Cash 등)
     */
    isSpecialRow(ticker) {
        const special = ['total', 'cash', 'sum', 'other', 'n/a', '-', ''];
        return special.includes(ticker.toLowerCase());
    }

    /**
     * 데이터 검증
     */
    validateData(data) {
        // 비중 합계 확인 (95% ~ 105% 허용)
        const totalWeight = data.reduce((sum, row) => sum + row.weight, 0);
        
        if (totalWeight < 95 || totalWeight > 105) {
            console.warn(`⚠️ 비중 합계가 ${totalWeight.toFixed(2)}%로 100%와 차이가 있습니다. 데이터를 확인하세요.`);
        }

        // 중복 티커 확인
        const tickers = data.map(row => row.ticker);
        const duplicates = tickers.filter((ticker, index) => tickers.indexOf(ticker) !== index);
        
        if (duplicates.length > 0) {
            console.warn('⚠️ 중복된 티커:', [...new Set(duplicates)]);
        }

        // 이상 비중 확인
        const abnormal = data.filter(row => row.weight > 50 || row.weight < 0);
        if (abnormal.length > 0) {
            console.warn('⚠️ 이상 비중 데이터:', abnormal);
        }

        return {
            totalWeight: totalWeight,
            duplicateCount: duplicates.length,
            abnormalCount: abnormal.length,
            isValid: totalWeight >= 95 && totalWeight <= 105 && duplicates.length === 0
        };
    }

    /**
     * 데이터 통계 생성
     */
    getStats(data) {
        if (!data || data.length === 0) {
            return null;
        }

        const weights = data.map(row => row.weight);
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);

        return {
            totalHoldings: data.length,
            totalWeight: totalWeight.toFixed(2),
            avgWeight: (totalWeight / data.length).toFixed(4),
            maxWeight: Math.max(...weights).toFixed(2),
            minWeight: Math.min(...weights).toFixed(4),
            lowWeightCount: data.filter(row => row.weight <= 2).length
        };
    }
}

// 전역 인스턴스
window.csvParser = new CSVParser();
