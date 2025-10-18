/**
 * 대시보드 렌더링 및 시각화
 */

let currentPage = 1;
let currentData = [];
let stockDetailsCache = {}; // 재무정보 캐시

/**
 * 대시보드 로드
 */
async function loadDashboard() {
    try {
        showLoading('대시보드 데이터를 불러오는 중...');

        const maxWeight = parseFloat(document.getElementById('filter-weight').value) || 0;
        const etfSymbol = document.getElementById('filter-etf').value || null;
        const snapshotId = document.getElementById('filter-snapshot').value || null;

        // 저비중 종목 조회
        const holdings = await dataManager.getLowWeightHoldings(maxWeight, etfSymbol, snapshotId);
        currentData = holdings;

        // 스냅샷 목록 업데이트
        await updateSnapshotList();

        // 통계 카드 렌더링
        renderStatsCards(holdings);

        // 테이블 렌더링 (재무정보 포함)
        await renderHoldingsTable(holdings, 1);

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
        (holdings.reduce((sum, h) => sum + h.weight, 0) / holdings.length).toFixed(4) : 0;
    const minWeight = holdings.length > 0 ? 
        Math.min(...holdings.map(h => h.weight)).toFixed(4) : 0;
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
 * 종목 테이블 렌더링 (최적화된 버전)
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
                <td colspan="10" class="px-4 py-8 text-center text-gray-500">
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

    // 1단계: 기본 테이블 즉시 렌더링 (재무정보 없이)
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
            <td class="px-4 py-3 text-right font-semibold">${holding.weight.toFixed(4)}%</td>
            <td class="px-4 py-3 text-sm">${holding.sector || '-'}</td>
            <td class="px-4 py-3 text-right text-sm text-gray-400">
                <i class="fas fa-spinner fa-spin text-xs"></i>
            </td>
            <td class="px-4 py-3 text-right text-sm text-gray-400">
                <i class="fas fa-spinner fa-spin text-xs"></i>
            </td>
            <td class="px-4 py-3 text-right text-sm text-gray-400">
                <i class="fas fa-spinner fa-spin text-xs"></i>
            </td>
            <td class="px-4 py-3 text-right text-sm text-gray-400">
                <i class="fas fa-spinner fa-spin text-xs"></i>
            </td>
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
    loadingBar.style.width = '30%';
    loadingProgress.textContent = '30%';

    // 페이지네이션 먼저 렌더링
    renderPagination(holdings.length, page, perPage);

    // 2단계: 재무정보 백그라운드 로딩 (캐시 활용)
    loadingMessage.textContent = '재무정보 로딩 중...';
    
    // 배치 처리 (10개씩 동시 조회)
    const batchSize = 10;
    let completed = 0;
    
    for (let i = 0; i < pageData.length; i += batchSize) {
        const batch = pageData.slice(i, i + batchSize);
        
        // 병렬로 조회
        await Promise.all(batch.map(async (holding) => {
            try {
                const details = await dataManager.getStockDetails(holding.ticker);
                
                // DOM 업데이트 (해당 행만)
                const row = tbody.querySelector(`tr[data-ticker="${holding.ticker}"]`);
                if (row) {
                    const cells = row.querySelectorAll('td');
                    cells[5].innerHTML = `<span class="text-sm">${details?.roe || '-'}</span>`;
                    cells[6].innerHTML = `<span class="text-sm">${details?.eps || '-'}</span>`;
                    cells[7].innerHTML = `<span class="text-sm">${details?.pbr || '-'}</span>`;
                    cells[8].innerHTML = `<span class="text-sm">${details?.bps || '-'}</span>`;
                }
            } catch (error) {
                // 실패 시 - 표시
                const row = tbody.querySelector(`tr[data-ticker="${holding.ticker}"]`);
                if (row) {
                    const cells = row.querySelectorAll('td');
                    for (let j = 5; j <= 8; j++) {
                        cells[j].innerHTML = '<span class="text-sm">-</span>';
                    }
                }
            }
        }));
        
        // 진행률 업데이트
        completed += batch.length;
        const progress = 30 + Math.round((completed / pageData.length) * 70);
        loadingBar.style.width = progress + '%';
        loadingProgress.textContent = progress + '%';
    }

    // 로딩 완료
    loadingMessage.textContent = '완료!';
    setTimeout(() => {
        loadingEl.classList.add('hidden');
    }, 500);
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
    loadDashboard();
}

/**
 * 종목 상세 정보 표시
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
        loadingBar.style.width = '50%';
        loadingProgress.textContent = '50%';
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
