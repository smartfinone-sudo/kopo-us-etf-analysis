/**
 * 데이터 관리자 - RESTful API를 통한 데이터 CRUD
 */

class DataManager {
    constructor() {
        this.baseUrl = 'tables/';
    }

    /**
     * ETF 포트폴리오 데이터 저장
     */
    async saveHoldings(etfSymbol, parsedData, fileName) {
        try {
            const snapshotId = this.generateSnapshotId();
            const uploadDate = new Date().getTime();

            // 각 종목을 데이터베이스에 저장
            const holdings = parsedData.map(row => ({
                etf_symbol: etfSymbol,
                upload_date: uploadDate,
                ticker: row.ticker,
                company_name: row.company_name,
                weight: row.weight,
                shares: row.shares,
                market_value: row.market_value,
                sector: row.sector,
                snapshot_id: snapshotId
            }));

            // 배치 저장
            const savedCount = await this.batchCreate('etf_holdings', holdings);

            // 업로드 히스토리 저장
            await this.createRecord('upload_history', {
                etf_symbol: etfSymbol,
                upload_date: uploadDate,
                snapshot_id: snapshotId,
                total_holdings: parsedData.length,
                file_name: fileName,
                status: 'success',
                notes: `Successfully uploaded ${parsedData.length} holdings`
            });

            return {
                success: true,
                snapshotId: snapshotId,
                savedCount: savedCount
            };
        } catch (error) {
            console.error('데이터 저장 실패:', error);
            
            // 에러 히스토리 저장
            try {
                await this.createRecord('upload_history', {
                    etf_symbol: etfSymbol,
                    upload_date: new Date().getTime(),
                    snapshot_id: '',
                    total_holdings: 0,
                    file_name: fileName,
                    status: 'error',
                    notes: error.message
                });
            } catch (e) {
                console.error('에러 히스토리 저장 실패:', e);
            }

            throw error;
        }
    }

    /**
     * 배치 생성 (여러 레코드 한번에)
     */
    async batchCreate(tableName, records) {
        let savedCount = 0;
        const batchSize = 50; // 한번에 50개씩

        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            
            // 동시 저장
            const promises = batch.map(record => this.createRecord(tableName, record));
            const results = await Promise.allSettled(promises);
            
            savedCount += results.filter(r => r.status === 'fulfilled').length;
            
            // 진행 상태 업데이트
            const progress = Math.round(((i + batch.length) / records.length) * 100);
            this.updateProgress(progress, `저장 중... (${i + batch.length}/${records.length})`);
        }

        return savedCount;
    }

    /**
     * 단일 레코드 생성
     */
    async createRecord(tableName, data) {
        const response = await fetch(`${this.baseUrl}${tableName}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to create record: ${error}`);
        }

        return await response.json();
    }

    /**
     * 레코드 조회 (페이징)
     */
    async getRecords(tableName, page = 1, limit = 100, search = '', sort = '') {
        let url = `${this.baseUrl}${tableName}?page=${page}&limit=${limit}`;
        
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (sort) url += `&sort=${sort}`;

        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch records: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * 단일 레코드 조회
     */
    async getRecord(tableName, recordId) {
        const response = await fetch(`${this.baseUrl}${tableName}/${recordId}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch record: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * 레코드 업데이트
     */
    async updateRecord(tableName, recordId, data) {
        const response = await fetch(`${this.baseUrl}${tableName}/${recordId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Failed to update record: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * 레코드 삭제
     */
    async deleteRecord(tableName, recordId) {
        const response = await fetch(`${this.baseUrl}${tableName}/${recordId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Failed to delete record: ${response.statusText}`);
        }

        return true;
    }

    /**
     * 저비중 종목 조회
     */
    async getLowWeightHoldings(maxWeight = 2, etfSymbol = null, snapshotId = null) {
        try {
            // 모든 데이터 가져오기 (페이징 처리)
            let allHoldings = [];
            let page = 1;
            let hasMore = true;

            while (hasMore) {
                const response = await this.getRecords('etf_holdings', page, 1000);
                allHoldings = allHoldings.concat(response.data);
                
                hasMore = response.data.length === 1000;
                page++;
            }

            // 필터링 (0이면 전체, 아니면 maxWeight 이하만)
            let filtered = maxWeight === 0 ? allHoldings : allHoldings.filter(h => h.weight <= maxWeight);

            if (etfSymbol) {
                filtered = filtered.filter(h => h.etf_symbol === etfSymbol);
            }

            if (snapshotId) {
                filtered = filtered.filter(h => h.snapshot_id === snapshotId);
            }

            // 최신 스냅샷만 (snapshotId가 지정되지 않은 경우)
            if (!snapshotId) {
                const latestSnapshots = this.getLatestSnapshots(filtered);
                filtered = filtered.filter(h => latestSnapshots.includes(h.snapshot_id));
            }

            // 정렬 (비중 오름차순)
            filtered.sort((a, b) => a.weight - b.weight);

            return filtered;
        } catch (error) {
            console.error('저비중 종목 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 최신 스냅샷 ID 목록 가져오기
     */
    getLatestSnapshots(holdings) {
        const snapshotsByETF = {};

        holdings.forEach(h => {
            if (!snapshotsByETF[h.etf_symbol]) {
                snapshotsByETF[h.etf_symbol] = [];
            }
            if (!snapshotsByETF[h.etf_symbol].includes(h.snapshot_id)) {
                snapshotsByETF[h.etf_symbol].push({
                    id: h.snapshot_id,
                    date: h.upload_date
                });
            }
        });

        // 각 ETF의 최신 스냅샷만 선택
        const latest = [];
        for (const etf in snapshotsByETF) {
            const sorted = snapshotsByETF[etf].sort((a, b) => b.date - a.date);
            if (sorted.length > 0) {
                latest.push(sorted[0].id);
            }
        }

        return latest;
    }

    /**
     * 업로드 히스토리 조회
     */
    async getUploadHistory() {
        try {
            const response = await this.getRecords('upload_history', 1, 1000, '', '-upload_date');
            return response.data;
        } catch (error) {
            console.error('히스토리 조회 실패:', error);
            return [];
        }
    }

    /**
     * 스냅샷 비교 (변화 분석)
     */
    async compareSnapshots(etfSymbol, oldSnapshotId, newSnapshotId) {
        try {
            const oldData = await this.getHoldingsBySnapshot(etfSymbol, oldSnapshotId);
            const newData = await this.getHoldingsBySnapshot(etfSymbol, newSnapshotId);

            const oldTickers = new Set(oldData.map(h => h.ticker));
            const newTickers = new Set(newData.map(h => h.ticker));

            // 신규 편입
            const newHoldings = newData.filter(h => !oldTickers.has(h.ticker));

            // 제외된 종목
            const removedHoldings = oldData.filter(h => !newTickers.has(h.ticker));

            // 비중 변화
            const weightChanges = [];
            newData.forEach(newH => {
                const oldH = oldData.find(old => old.ticker === newH.ticker);
                if (oldH && Math.abs(newH.weight - oldH.weight) > 0.01) {
                    weightChanges.push({
                        ticker: newH.ticker,
                        company_name: newH.company_name,
                        oldWeight: oldH.weight,
                        newWeight: newH.weight,
                        change: newH.weight - oldH.weight
                    });
                }
            });

            // 비중 증가순 정렬
            weightChanges.sort((a, b) => b.change - a.change);

            return {
                newHoldings: newHoldings,
                removedHoldings: removedHoldings,
                weightChanges: weightChanges
            };
        } catch (error) {
            console.error('스냅샷 비교 실패:', error);
            throw error;
        }
    }

    /**
     * 특정 스냅샷의 종목 가져오기
     */
    async getHoldingsBySnapshot(etfSymbol, snapshotId) {
        const response = await this.getRecords('etf_holdings', 1, 10000);
        return response.data.filter(h => 
            h.etf_symbol === etfSymbol && h.snapshot_id === snapshotId
        );
    }

    /**
     * 종목 상세 정보 조회 (캐싱 적용)
     */
    async getStockDetails(ticker) {
        // 캐시 확인
        if (window.stockDetailsCache && window.stockDetailsCache[ticker]) {
            return window.stockDetailsCache[ticker];
        }

        try {
            const response = await this.getRecords('stock_details', 1, 10, ticker);
            const result = response.data.length > 0 ? response.data[0] : null;
            
            // 캐시 저장
            if (!window.stockDetailsCache) {
                window.stockDetailsCache = {};
            }
            window.stockDetailsCache[ticker] = result;
            
            return result;
        } catch (error) {
            console.error('종목 상세 정보 조회 실패:', error);
            return null;
        }
    }

    /**
     * 종목 상세 정보 저장/업데이트
     */
    async saveStockDetails(ticker, details) {
        try {
            const existing = await this.getStockDetails(ticker);
            
            const data = {
                ticker: ticker,
                company_name: details.company_name || '',
                sector: details.sector || '',
                industry: details.industry || '',
                market_cap: details.market_cap || '',
                pe_ratio: details.pe_ratio || '',
                dividend_yield: details.dividend_yield || '',
                description: details.description || '',
                last_updated: new Date().getTime()
            };

            if (existing) {
                return await this.updateRecord('stock_details', existing.id, data);
            } else {
                return await this.createRecord('stock_details', data);
            }
        } catch (error) {
            console.error('종목 상세 정보 저장 실패:', error);
            throw error;
        }
    }

    /**
     * 스냅샷 ID 생성
     */
    generateSnapshotId() {
        return 'snap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 진행 상태 업데이트 (콜백)
     */
    updateProgress(percent, message) {
        if (window.onUploadProgress) {
            window.onUploadProgress(percent, message);
        }
    }

    /**
     * 날짜 포맷팅
     */
    formatDate(timestamp) {
        // timestamp를 숫자로 변환
        const numericTimestamp = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
        
        // 유효하지 않은 timestamp 처리
        if (isNaN(numericTimestamp) || numericTimestamp === null || numericTimestamp === undefined) {
            return 'Invalid Date';
        }
        
        const date = new Date(numericTimestamp);
        
        // Invalid Date 체크
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }
        
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * 특정 ETF의 모든 스냅샷 목록 조회 (upload_date 기준 정렬)
     */
    async getSnapshotsByETF(etfSymbol) {
        try {
            const response = await this.getRecords('etf_holdings', 1, 10000);
            const holdings = response.data.filter(h => h.etf_symbol === etfSymbol);
            
            // snapshot_id별로 그룹화하고 upload_date 기준으로 정렬
            const snapshotMap = {};
            holdings.forEach(h => {
                if (!snapshotMap[h.snapshot_id]) {
                    // upload_date를 숫자로 변환
                    const uploadDate = typeof h.upload_date === 'string' ? parseInt(h.upload_date) : h.upload_date;
                    
                    snapshotMap[h.snapshot_id] = {
                        snapshot_id: h.snapshot_id,
                        upload_date: uploadDate,
                        etf_symbol: h.etf_symbol,
                        count: 0
                    };
                }
                snapshotMap[h.snapshot_id].count++;
            });

            // 배열로 변환하고 upload_date 내림차순 정렬 (최신순)
            const snapshots = Object.values(snapshotMap).sort((a, b) => b.upload_date - a.upload_date);
            return snapshots;
        } catch (error) {
            console.error('스냅샷 목록 조회 실패:', error);
            return [];
        }
    }

    /**
     * 특정 스냅샷의 모든 종목 조회
     */
    async getHoldingsBySnapshotId(snapshotId) {
        try {
            const response = await this.getRecords('etf_holdings', 1, 10000);
            let holdings = response.data.filter(h => h.snapshot_id === snapshotId);
            
            // weight를 숫자로 변환
            holdings = holdings.map(h => ({
                ...h,
                weight: typeof h.weight === 'string' ? parseFloat(h.weight) : h.weight,
                shares: typeof h.shares === 'string' ? parseFloat(h.shares) : h.shares,
                market_value: typeof h.market_value === 'string' ? parseFloat(h.market_value) : h.market_value
            }));
            
            return holdings.sort((a, b) => b.weight - a.weight); // 비중 내림차순
        } catch (error) {
            console.error('스냅샷 종목 조회 실패:', error);
            return [];
        }
    }

    /**
     * 두 스냅샷 비교 (서로 다른 ETF도 가능)
     */
    async compareSnapshotsById(baseSnapshotId, targetSnapshotId) {
        try {
            const baseData = await this.getHoldingsBySnapshotId(baseSnapshotId);
            const targetData = await this.getHoldingsBySnapshotId(targetSnapshotId);

            // 티커별 맵 생성
            const baseMap = new Map(baseData.map(h => [h.ticker, h]));
            const targetMap = new Map(targetData.map(h => [h.ticker, h]));

            // 신규 편입: target에는 있지만 base에는 없는 종목
            const newHoldings = targetData.filter(h => !baseMap.has(h.ticker));

            // 제외된 종목: base에는 있지만 target에는 없는 종목
            const removedHoldings = baseData.filter(h => !targetMap.has(h.ticker));

            // 비중 변화: 양쪽 모두 있는 종목
            const weightChanges = [];
            targetData.forEach(targetH => {
                const baseH = baseMap.get(targetH.ticker);
                if (baseH && Math.abs(targetH.weight - baseH.weight) > 0.0001) {
                    weightChanges.push({
                        ticker: targetH.ticker,
                        company_name: targetH.company_name,
                        base_etf: baseH.etf_symbol,
                        base_weight: baseH.weight,
                        target_etf: targetH.etf_symbol,
                        target_weight: targetH.weight,
                        change: targetH.weight - baseH.weight,
                        change_percent: baseH.weight > 0 ? ((targetH.weight - baseH.weight) / baseH.weight * 100) : 0
                    });
                }
            });

            // 비중 변화량 절대값 기준 정렬
            weightChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

            return {
                baseData: baseData,
                targetData: targetData,
                newHoldings: newHoldings,
                removedHoldings: removedHoldings,
                weightChanges: weightChanges,
                summary: {
                    base_count: baseData.length,
                    target_count: targetData.length,
                    new_count: newHoldings.length,
                    removed_count: removedHoldings.length,
                    changed_count: weightChanges.length
                }
            };
        } catch (error) {
            console.error('스냅샷 비교 실패:', error);
            throw error;
        }
    }
}

// 전역 인스턴스
window.dataManager = new DataManager();
