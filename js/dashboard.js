/**
 * 대시보드 렌더링 및 시각화
 */

let currentPage = 1;
let currentData = [];
let allHoldingsData = []; // 전체 데이터 저장 (필터링 전)
let sortColumn = null;
let sortDirection = 'asc';

/**
 * 대시보드 로드
 */
async function loadDashboard() {
    try {
        showLoading('대시보드 데이터를 불러오는 중...');

        const etfFilter = document.getElementById('filter-etf');
        const snapshotFilter = document.getElementById('filter-snapshot');
        
        const etfSymbol = etfFilter ? (etfFilter.value || null) : null;
        const snapshotId = snapshotFilter ? (snapshotFilter.value || null) : null;

        // 전체 종목 조회 (필터는 클라이언트에서 적용)
        const holdings = await dataManager.getLowWeightHoldings(0, etfSymbol, snapshotId);
        allHoldingsData = holdings;

        // 스냅샷 목록 업데이트
        await updateSnapshotList();

        // 필터 적용
        filterDashboard();

        hideLoading();
    } catch (error) {
        console.error('대시보드 로드 실패:', error);
        hideLoading();
        showError('대시보드를 불러오는 중 오류가 발생했습니다: ' + error.message);
    }
}

/**
 * 스냅샷 목록 업데이트
 */
async function updateSnapshotList() {
    try {
        const history = await dataManager.getUploadHistory();
        const select = document.getElementById('filter-snapshot');
        
        // 기존 옵션 제거 (첫 번째 제외)
        while (select.options.length > 1) {
            select.remove(1);
        }

        // 스냅샷 추가
        const snapshots = {};
        history.forEach(h => {
            if (h.status === 'success' && h.snapshot_id) {
                const key = `${h.etf_symbol}_${h.snapshot_id}`;
                if (!snapshots[key]) {
                    snapshots[key] = {
                        etf: h.etf_symbol,
                        id: h.snapshot_id,
                        date: h.upload_date,
                        count: h.total_holdings
                    };
                }
            }
        });

        Object.values(snapshots)
            .sort((a, b) => b.date - a.date)
            .forEach(snap => {
                const option = document.createElement('option');
                option.value = snap.id;
                option.textContent = `${snap.etf} - ${dataManager.formatDate(snap.date)} (${snap.count}종목)`;
                select.appendChild(option);
            });
    } catch (error) {
        console.error('스냅샷 목록 업데이트 실패:', error);
    }
}

/**
 * 통계 카드 렌더링
 */
function renderStatsCards(holdings) {
    const container = document.getElementById('stats-cards');
    
    const totalCount = holdings.length;
    const avgWeight = holdings.length > 0 ? 
        (holdings.reduce((sum, h) => sum + Number(h.weight || 0), 0) / holdings.length).toFixed(4) : 0;
    const minWeight = holdings.length > 0 ? 
        Math.min(...holdings.map(h => Number(h.weight || 0))).toFixed(4) : 0;
    const etfCount = new Set(holdings.map(h => h.etf_symbol)).size;

    const cards = [
        {
            title: '총 저비중 종목',
            value: totalCount,
            icon: 'fa-list',
            color: 'blue'
        },
        {
            title: '평균 비중',
            value: avgWeight + '%',
            icon: 'fa-percent',
            color: 'green'
        },
        {
            title: '최소 비중',
            value: minWeight + '%',
            icon: 'fa-arrow-down',
            color: 'purple'
        },
        {
            title: '분석 ETF 수',
            value: etfCount,
            icon: 'fa-chart-pie',
            color: 'orange'
        }
    ];

    container.innerHTML = cards.map(card => `
        <div class="bg-white p-6 rounded-lg shadow border-l-4 border-${card.color}-500">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm text-gray-600 mb-1">${card.title}</p>
                    <p class="text-2xl font-bold text-gray-800">${card.value}</p>
                </div>
                <div class="text-3xl text-${card.color}-500">
                    <i class="fas ${card.icon}"></i>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * 종목 테이블 렌더링 (재무정보 컬럼 제거 + 안전한 숫자 변환)
 */
async function renderHoldingsTable(holdings, page = 1) {
    const tbody = document.getElementById('holdings-table');
    const loadingEl = document.getElementById('table-loading');
    const loadingBar = document.getElementById('loading-bar');
    const loadingProgress = document.getElementById('loading-progress');
    const loadingMessage = document.getElementById('loading-message');
    
    const perPage = 50;
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const pageData = holdings.slice(start, end);

    if (pageData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2"></i>
                    <p>조회된 데이터가 없습니다.</p>
                </td>
            </tr>
        `;
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    // 로딩 표시
    loadingEl.classList.remove('hidden');
    loadingMessage.textContent = '테이블 렌더링 중...';
    loadingBar.style.width = '0%';
    loadingProgress.textContent = '0%';

    // 1단계: 기본 테이블 즉시 렌더링 (재무정보 컬럼 없음)
    const basicRows = pageData.map(holding => `
        <tr class="hover:bg-gray-50" data-ticker="${holding.ticker}">
            <td class="px-4 py-3">
                <span class="font-semibold text-blue-600">${holding.ticker}</span>
            </td>
            <td class="px-4 py-3 text-sm">${holding.company_name || '-'}</td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    ${holding.etf_symbol}
                </span>
            </td>
            <td class="px-4 py-3 text-right font-semibold">
                ${!isNaN(parseFloat(holding.weight)) ? Number(holding.weight).toFixed(4) : '0.0000'}%
            </td>
            <td class="px-4 py-3 text-sm">${holding.sector || '-'}</td>
            <td class="px-4 py-3 text-center">
                <div class="flex justify-center space-x-2">
                    <a href="https://finance.yahoo.com/quote/${holding.ticker}" 
                       target="_blank" 
                       class="text-purple-600 hover:text-purple-800 text-xs px-2 py-1 border border-purple-300 rounded hover:bg-purple-50"
                       title="Yahoo Finance">
                        Yahoo
                    </a>
                    <a href="https://www.google.com/finance/quote/${holding.ticker}:NASDAQ" 
                       target="_blank" 
                       class="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 border border-blue-300 rounded hover:bg-blue-50"
                       title="Google Finance">
                        Google
                    </a>
                </div>
            </td>
        </tr>
    `).join('');

    tbody.innerHTML = basicRows;

    // 진행률 및 페이지네이션 갱신
    loadingBar.style.width = '100%';
    loadingProgress.textContent = '100%';
    loadingMessage.textContent = '완료!';
    renderPagination(holdings.length, page, perPage);

    // 로딩 완료
    setTimeout(() => {
        loadingEl.classList.add('hidden');
    }, 300);
}

/**
 * 페이지네이션 렌더링
 */
function renderPagination(total, current, perPage) {
    const totalPages = Math.ceil(total / perPage);
    const container = document.getElementById('pagination');

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let pages = [];
    
    // 이전 버튼
    if (current > 1) {
        pages.push(`<button onclick="goToPage(${current - 1})" class="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50">이전</button>`);
    }

    // 페이지 번호
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= current - 2 && i <= current + 2)) {
            const active = i === current ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50';
            pages.push(`<button onclick="goToPage(${i})" class="px-3 py-2 border border-gray-300 rounded-md ${active}">${i}</button>`);
        } else if (i === current - 3 || i === current + 3) {
            pages.push(`<span class="px-3 py-2">...</span>`);
        }
    }

    // 다음 버튼
    if (current < totalPages) {
        pages.push(`<button onclick="goToPage(${current + 1})" class="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50">다음</button>`);
    }

    container.innerHTML = `<div class="flex space-x-2">${pages.join('')}</div>`;
}

/**
 * 페이지 이동
 */
async function goToPage(page) {
    currentPage = page;
    await renderHoldingsTable(currentData, page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 필터 적용
 */
function filterDashboard() {
    // allHoldingsData가 비어있으면 빈 배열로 처리
    if (!allHoldingsData || allHoldingsData.length === 0) {
        currentData = [];
        renderStatsCards([]);
        renderHoldingsTable([], 1);
        displayActiveFilters();
        return;
    }

    // 필터 값 가져오기
    const tickerFilter = document.getElementById('filter-ticker')?.value?.trim().toUpperCase() || '';
    const companyFilter = document.getElementById('filter-company')?.value?.trim().toLowerCase() || '';
    const sectorFilter = document.getElementById('filter-sector')?.value?.trim().toLowerCase() || '';
    const weightCondition = document.getElementById('filter-weight-condition')?.value || 'all';
    const weightValue1 = parseFloat(document.getElementById('filter-weight-value1')?.value) || null;
    const weightValue2 = parseFloat(document.getElementById('filter-weight-value2')?.value) || null;

    // 데이터 필터링
    let filteredData = allHoldingsData.filter(holding => {
        // 티커 필터
        if (tickerFilter && !holding.ticker.toUpperCase().includes(tickerFilter)) {
            return false;
        }

        // 회사명 필터
        if (companyFilter && !(holding.company_name || '').toLowerCase().includes(companyFilter)) {
            return false;
        }

        // 섹터 필터
        if (sectorFilter && !(holding.sector || '').toLowerCase().includes(sectorFilter)) {
            return false;
        }

        // 비중 필터
        const weight = parseFloat(holding.weight) || 0;
        if (weightCondition !== 'all' && weightValue1 !== null) {
            switch (weightCondition) {
                case 'gte': // 이상
                    if (weight < weightValue1) return false;
                    break;
                case 'lte': // 이하
                    if (weight > weightValue1) return false;
                    break;
                case 'between': // 범위 포함
                    if (weightValue2 !== null) {
                        const min = Math.min(weightValue1, weightValue2);
                        const max = Math.max(weightValue1, weightValue2);
                        if (weight < min || weight > max) return false;
                    } else {
                        if (weight < weightValue1) return false;
                    }
                    break;
                case 'outside': // 범위 제외
                    if (weightValue2 !== null) {
                        const min = Math.min(weightValue1, weightValue2);
                        const max = Math.max(weightValue1, weightValue2);
                        if (weight >= min && weight <= max) return false;
                    }
                    break;
            }
        }

        return true;
    });

    // 정렬 적용
    if (sortColumn) {
        filteredData = applySorting(filteredData, sortColumn, sortDirection);
    }

    currentData = filteredData;
    currentPage = 1;

    // 통계 카드 렌더링
    renderStatsCards(filteredData);

    // 테이블 렌더링
    renderHoldingsTable(filteredData, 1);

    // 활성 필터 표시
    displayActiveFilters();
}

/**
 * 정렬 적용
 */
function applySorting(data, column, direction) {
    const sorted = [...data].sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];

        // 비중은 숫자로 비교
        if (column === 'weight') {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
        } else {
            // 문자열은 대소문자 구분 없이 비교
            aVal = (aVal || '').toString().toLowerCase();
            bVal = (bVal || '').toString().toLowerCase();
        }

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    return sorted;
}

/**
 * 테이블 정렬
 */
function sortTable(column) {
    // 같은 컬럼을 다시 클릭하면 방향 전환
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }

    // 정렬 아이콘 업데이트
    updateSortIcons(column, sortDirection);

    // 필터 재적용 (정렬 포함)
    filterDashboard();
}

/**
 * 정렬 아이콘 업데이트
 */
function updateSortIcons(activeColumn, direction) {
    // 모든 아이콘 초기화
    const icons = ['ticker', 'company_name', 'etf_symbol', 'weight', 'sector'];
    icons.forEach(col => {
        const icon = document.getElementById(`sort-icon-${col}`);
        if (icon) {
            icon.className = 'fas fa-sort text-gray-400 ml-1';
        }
    });

    // 활성 컬럼 아이콘 업데이트
    const activeIcon = document.getElementById(`sort-icon-${activeColumn}`);
    if (activeIcon) {
        activeIcon.className = `fas fa-sort-${direction === 'asc' ? 'up' : 'down'} text-blue-600 ml-1`;
    }
}

/**
 * 필터 초기화
 */
function resetFilters() {
    // 필터 입력 초기화 (요소가 존재하는 경우만)
    const tickerEl = document.getElementById('filter-ticker');
    const companyEl = document.getElementById('filter-company');
    const sectorEl = document.getElementById('filter-sector');
    const conditionEl = document.getElementById('filter-weight-condition');
    const value1El = document.getElementById('filter-weight-value1');
    const value2El = document.getElementById('filter-weight-value2');
    
    if (tickerEl) tickerEl.value = '';
    if (companyEl) companyEl.value = '';
    if (sectorEl) sectorEl.value = '';
    if (conditionEl) conditionEl.value = 'all';
    if (value1El) value1El.value = '';
    if (value2El) value2El.value = '';

    // 정렬 초기화
    sortColumn = null;
    sortDirection = 'asc';
    updateSortIcons('', 'asc');

    // 필터 재적용
    filterDashboard();
}

/**
 * 활성 필터 표시
 */
function displayActiveFilters() {
    const container = document.getElementById('active-filters');
    const list = document.getElementById('active-filters-list');
    const filters = [];

    // 티커 필터
    const ticker = document.getElementById('filter-ticker')?.value?.trim();
    if (ticker) {
        filters.push({ label: '티커', value: ticker, id: 'ticker' });
    }

    // 회사명 필터
    const company = document.getElementById('filter-company')?.value?.trim();
    if (company) {
        filters.push({ label: '회사명', value: company, id: 'company' });
    }

    // 섹터 필터
    const sector = document.getElementById('filter-sector')?.value?.trim();
    if (sector) {
        filters.push({ label: '섹터', value: sector, id: 'sector' });
    }

    // 비중 필터
    const weightCondition = document.getElementById('filter-weight-condition')?.value;
    const weightValue1 = document.getElementById('filter-weight-value1')?.value;
    const weightValue2 = document.getElementById('filter-weight-value2')?.value;
    
    if (weightCondition && weightCondition !== 'all' && weightValue1) {
        let weightText = '';
        switch (weightCondition) {
            case 'gte':
                weightText = `≥ ${weightValue1}%`;
                break;
            case 'lte':
                weightText = `≤ ${weightValue1}%`;
                break;
            case 'between':
                weightText = weightValue2 ? `${weightValue1}% ~ ${weightValue2}%` : `≥ ${weightValue1}%`;
                break;
            case 'outside':
                weightText = weightValue2 ? `${weightValue1}% ~ ${weightValue2}% 제외` : `< ${weightValue1}%`;
                break;
        }
        filters.push({ label: '비중', value: weightText, id: 'weight' });
    }

    // 필터 표시
    if (filters.length > 0) {
        list.innerHTML = filters.map(f => `
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                <strong class="mr-1">${f.label}:</strong> ${f.value}
                <button onclick="clearSingleFilter('${f.id}')" class="ml-2 text-blue-600 hover:text-blue-800">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `).join('');
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

/**
 * 개별 필터 제거
 */
function clearSingleFilter(filterId) {
    switch (filterId) {
        case 'ticker':
            document.getElementById('filter-ticker').value = '';
            break;
        case 'company':
            document.getElementById('filter-company').value = '';
            break;
        case 'sector':
            document.getElementById('filter-sector').value = '';
            break;
        case 'weight':
            document.getElementById('filter-weight-condition').value = 'all';
            document.getElementById('filter-weight-value1').value = '';
            document.getElementById('filter-weight-value2').value = '';
            break;
    }
    filterDashboard();
}

/**
 * 종목 상세 정보 표시
 * (재무지표 컬럼을 테이블에서 제거했지만, 상세 모달은 유지)
 */
async function showStockDetails(ticker, companyName) {
    const modal = document.getElementById('stock-modal');
    const title = document.getElementById('modal-title');
    const content = document.getElementById('modal-content');

    title.textContent = `${ticker} - ${companyName}`;
    content.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-3xl text-blue-600"></i></div>';
    modal.classList.remove('hidden');

    try {
        // 데이터베이스에서 상세 정보 조회
        let details = await dataManager.getStockDetails(ticker);

        if (!details) {
            // 데이터가 없으면 기본 템플릿 표시
            details = {
                ticker: ticker,
                company_name: companyName,
                sector: '데이터 없음',
                industry: '데이터 없음',
                market_cap: '데이터 없음',
                pe_ratio: '데이터 없음',
                dividend_yield: '데이터 없음',
                description: '이 종목에 대한 상세 정보가 아직 등록되지 않았습니다. 수동으로 정보를 추가할 수 있습니다.'
            };
        }

        content.innerHTML = `
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-gray-600">섹터</p>
                        <p class="font-semibold">${details.sector || '-'}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">산업</p>
                        <p class="font-semibold">${details.industry || '-'}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">시가총액</p>
                        <p class="font-semibold">${details.market_cap || '-'}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">P/E Ratio</p>
                        <p class="font-semibold">${details.pe_ratio || '-'}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">배당수익률</p>
                        <p class="font-semibold">${details.dividend_yield || '-'}</p>
                    </div>
                </div>
                <div>
                    <p class="text-sm text-gray-600 mb-2">기업 개요</p>
                    <p class="text-sm text-gray-800">${details.description || '정보 없음'}</p>
                </div>
                <div class="pt-4 border-t">
                    <p class="text-xs text-gray-500">
                        <i class="fas fa-info-circle mr-1"></i>
                        상세 정보는 수동으로 입력하거나 외부 API를 통해 업데이트할 수 있습니다.
                    </p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('종목 상세 정보 로드 실패:', error);
        content.innerHTML = `
            <div class="text-center py-8 text-red-600">
                <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                <p>정보를 불러오는 중 오류가 발생했습니다.</p>
            </div>
        `;
    }
}

/**
 * 모달 닫기
 */
function closeModal() {
    document.getElementById('stock-modal').classList.add('hidden');
}

/**
 * 로딩 표시
 */
function showLoading(message) {
    const loadingEl = document.getElementById('table-loading');
    const loadingMessage = document.getElementById('loading-message');
    const loadingBar = document.getElementById('loading-bar');
    const loadingProgress = document.getElementById('loading-progress');
    
    if (loadingEl) {
        loadingEl.classList.remove('hidden');
        loadingMessage.textContent = message || '데이터를 불러오는 중...';
        loadingBar.style.width = '10%';
        loadingProgress.textContent = '10%';
    }
}

/**
 * 로딩 숨기기
 */
function hideLoading() {
    const loadingEl = document.getElementById('table-loading');
    if (loadingEl) {
        setTimeout(() => {
            loadingEl.classList.add('hidden');
        }, 300);
    }
}

/**
 * 에러 표시
 */
function showError(message) {
    const loadingEl = document.getElementById('table-loading');
    if (loadingEl) {
        loadingEl.classList.add('hidden');
    }
    alert(message);
}
