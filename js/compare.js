/**
 * 포트폴리오 비교 로직
 */

let compareData = null;
let compareCurrentPage = 1;

/**
 * 비교 페이지 로드
 */
async function loadComparePage() {
    console.log('비교 페이지 로드');
    
    // 초기화
    document.getElementById('compare-base-etf').value = '';
    document.getElementById('compare-target-etf').value = '';
    document.getElementById('compare-base-snapshot').innerHTML = '<option value="">ETF를 먼저 선택하세요</option>';
    document.getElementById('compare-target-snapshot').innerHTML = '<option value="">ETF를 먼저 선택하세요</option>';
    document.getElementById('compare-results').classList.add('hidden');
    document.getElementById('compare-base-info').innerHTML = '선택된 데이터 정보가 여기에 표시됩니다.';
    document.getElementById('compare-target-info').innerHTML = '선택된 데이터 정보가 여기에 표시됩니다.';
}

/**
 * ETF 선택 시 스냅샷 목록 로드
 */
async function loadCompareSnapshots(type) {
    const etfSelect = document.getElementById(`compare-${type}-etf`);
    const snapshotSelect = document.getElementById(`compare-${type}-snapshot`);
    const infoDiv = document.getElementById(`compare-${type}-info`);
    
    const etfSymbol = etfSelect.value;
    
    if (!etfSymbol) {
        snapshotSelect.innerHTML = '<option value="">ETF를 먼저 선택하세요</option>';
        infoDiv.innerHTML = '선택된 데이터 정보가 여기에 표시됩니다.';
        return;
    }

    // 스냅샷 목록 조회
    try {
        const snapshots = await dataManager.getSnapshotsByETF(etfSymbol);
        
        if (snapshots.length === 0) {
            snapshotSelect.innerHTML = '<option value="">업로드된 데이터가 없습니다</option>';
            infoDiv.innerHTML = '<span class="text-red-600">업로드된 데이터가 없습니다.</span>';
            return;
        }

        // 스냅샷 옵션 생성
        snapshotSelect.innerHTML = snapshots.map((snap, index) => {
            const label = index === 0 ? ' (최신)' : '';
            return `<option value="${snap.snapshot_id}">
                ${dataManager.formatDate(snap.upload_date)} - ${snap.count}개 종목${label}
            </option>`;
        }).join('');

        // 기준 데이터(base)는 자동으로 최신 선택
        if (type === 'base') {
            snapshotSelect.value = snapshots[0].snapshot_id;
            updateSnapshotInfo(type, snapshots[0]);
        } else {
            // 비교 대상은 사용자가 선택하도록
            updateSnapshotInfo(type, snapshots[0]);
        }

        // 스냅샷 변경 시 정보 업데이트
        snapshotSelect.onchange = function() {
            const selectedSnap = snapshots.find(s => s.snapshot_id === this.value);
            if (selectedSnap) {
                updateSnapshotInfo(type, selectedSnap);
            }
        };

    } catch (error) {
        console.error('스냅샷 목록 로드 실패:', error);
        snapshotSelect.innerHTML = '<option value="">로드 실패</option>';
        infoDiv.innerHTML = '<span class="text-red-600">데이터 로드 실패</span>';
    }
}

/**
 * 스냅샷 정보 업데이트
 */
function updateSnapshotInfo(type, snapshot) {
    const infoDiv = document.getElementById(`compare-${type}-info`);
    infoDiv.innerHTML = `
        <div class="space-y-1">
            <div><strong>ETF:</strong> ${snapshot.etf_symbol}</div>
            <div><strong>업로드 일시:</strong> ${dataManager.formatDate(snapshot.upload_date)}</div>
            <div><strong>종목 수:</strong> ${snapshot.count}개</div>
            <div><strong>스냅샷 ID:</strong> <span class="text-xs text-gray-500">${snapshot.snapshot_id.substring(0, 20)}...</span></div>
        </div>
    `;
}

/**
 * 비교 실행
 */
async function executeCompare() {
    const baseSnapshotId = document.getElementById('compare-base-snapshot').value;
    const targetSnapshotId = document.getElementById('compare-target-snapshot').value;

    if (!baseSnapshotId || !targetSnapshotId) {
        alert('비교할 두 개의 스냅샷을 모두 선택해주세요.');
        return;
    }

    if (baseSnapshotId === targetSnapshotId) {
        alert('동일한 스냅샷은 비교할 수 없습니다. 다른 스냅샷을 선택해주세요.');
        return;
    }

    const compareBtn = document.getElementById('compare-btn');
    compareBtn.disabled = true;
    compareBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>비교 중...';

    try {
        // 비교 실행
        compareData = await dataManager.compareSnapshotsById(baseSnapshotId, targetSnapshotId);
        
        // 결과 렌더링
        renderCompareResults(compareData);
        
        // 결과 섹션 표시
        document.getElementById('compare-results').classList.remove('hidden');
        
        // 결과 섹션으로 스크롤
        document.getElementById('compare-results').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('비교 실패:', error);
        alert('비교 중 오류가 발생했습니다: ' + error.message);
    } finally {
        compareBtn.disabled = false;
        compareBtn.innerHTML = '<i class="fas fa-balance-scale mr-2"></i>비교 실행';
    }
}

/**
 * 비교 결과 렌더링
 */
function renderCompareResults(data) {
    // 통계 카드
    renderCompareStats(data.summary);
    
    // 변화 분석
    renderNewHoldings(data.newHoldings);
    renderRemovedHoldings(data.removedHoldings);
    renderChangedHoldings(data.weightChanges);
    
    // 상세 비교 테이블
    renderCompareTable(data, 1);
}

/**
 * 통계 카드 렌더링
 */
function renderCompareStats(summary) {
    const container = document.getElementById('compare-stats');
    
    const cards = [
        {
            title: '기준 데이터 종목',
            value: summary.base_count,
            icon: 'fa-database',
            color: 'green'
        },
        {
            title: '비교 데이터 종목',
            value: summary.target_count,
            icon: 'fa-database',
            color: 'orange'
        },
        {
            title: '신규 편입',
            value: summary.new_count,
            icon: 'fa-plus-circle',
            color: 'blue'
        },
        {
            title: '제외된 종목',
            value: summary.removed_count,
            icon: 'fa-minus-circle',
            color: 'red'
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
 * 신규 편입 종목 렌더링
 */
function renderNewHoldings(holdings) {
    const container = document.getElementById('new-holdings-compare');
    const countSpan = document.getElementById('new-count');
    
    countSpan.textContent = holdings.length;
    
    if (holdings.length === 0) {
        container.innerHTML = '<p class="text-gray-500 italic">신규 편입 종목이 없습니다.</p>';
        return;
    }

    container.innerHTML = holdings.slice(0, 20).map(h => `
        <div class="py-1 border-b border-green-100 last:border-0">
            <div class="font-semibold">${h.ticker}</div>
            <div class="text-xs text-gray-600">${h.company_name || '-'}</div>
            <div class="text-xs">
                <span class="font-medium">${h.etf_symbol}</span> - 
                <span class="text-green-700 font-semibold">${h.weight.toFixed(4)}%</span>
            </div>
        </div>
    `).join('') + (holdings.length > 20 ? `<div class="text-xs mt-2 text-gray-500">... 외 ${holdings.length - 20}개</div>` : '');
}

/**
 * 제외된 종목 렌더링
 */
function renderRemovedHoldings(holdings) {
    const container = document.getElementById('removed-holdings-compare');
    const countSpan = document.getElementById('removed-count');
    
    countSpan.textContent = holdings.length;
    
    if (holdings.length === 0) {
        container.innerHTML = '<p class="text-gray-500 italic">제외된 종목이 없습니다.</p>';
        return;
    }

    container.innerHTML = holdings.slice(0, 20).map(h => `
        <div class="py-1 border-b border-red-100 last:border-0">
            <div class="font-semibold">${h.ticker}</div>
            <div class="text-xs text-gray-600">${h.company_name || '-'}</div>
            <div class="text-xs">
                <span class="font-medium">${h.etf_symbol}</span> - 
                <span class="text-red-700 font-semibold">${h.weight.toFixed(4)}%</span>
            </div>
        </div>
    `).join('') + (holdings.length > 20 ? `<div class="text-xs mt-2 text-gray-500">... 외 ${holdings.length - 20}개</div>` : '');
}

/**
 * 비중 변화 종목 렌더링
 */
function renderChangedHoldings(changes) {
    const container = document.getElementById('changed-holdings-compare');
    const countSpan = document.getElementById('changed-count');
    
    countSpan.textContent = changes.length;
    
    if (changes.length === 0) {
        container.innerHTML = '<p class="text-gray-500 italic">비중 변화가 있는 종목이 없습니다.</p>';
        return;
    }

    container.innerHTML = changes.slice(0, 20).map(c => {
        const changeColor = c.change > 0 ? 'text-blue-700' : 'text-orange-700';
        const changeIcon = c.change > 0 ? '↑' : '↓';
        
        return `
            <div class="py-1 border-b border-blue-100 last:border-0">
                <div class="font-semibold">${c.ticker}</div>
                <div class="text-xs text-gray-600">${c.company_name || '-'}</div>
                <div class="text-xs">
                    <span class="font-medium">${c.base_etf}</span>
                    ${c.base_weight.toFixed(4)}% → 
                    <span class="font-medium">${c.target_etf}</span>
                    ${c.target_weight.toFixed(4)}%
                </div>
                <div class="text-xs ${changeColor} font-semibold">
                    ${changeIcon} ${Math.abs(c.change).toFixed(4)}% 
                    (${c.change > 0 ? '+' : ''}${c.change_percent.toFixed(2)}%)
                </div>
            </div>
        `;
    }).join('') + (changes.length > 20 ? `<div class="text-xs mt-2 text-gray-500">... 외 ${changes.length - 20}개</div>` : '');
}

/**
 * 상세 비교 테이블 렌더링
 */
function renderCompareTable(data, page = 1) {
    const tbody = document.getElementById('compare-table');
    const perPage = 50;
    
    // 모든 항목을 하나의 배열로 합치기
    const allItems = [];
    
    // 신규 편입
    data.newHoldings.forEach(h => {
        allItems.push({
            status: 'new',
            ticker: h.ticker,
            company_name: h.company_name,
            base_etf: '-',
            base_weight: null,
            target_etf: h.etf_symbol,
            target_weight: h.weight,
            change: null
        });
    });
    
    // 제외된 종목
    data.removedHoldings.forEach(h => {
        allItems.push({
            status: 'removed',
            ticker: h.ticker,
            company_name: h.company_name,
            base_etf: h.etf_symbol,
            base_weight: h.weight,
            target_etf: '-',
            target_weight: null,
            change: null
        });
    });
    
    // 비중 변화
    data.weightChanges.forEach(c => {
        allItems.push({
            status: 'changed',
            ticker: c.ticker,
            company_name: c.company_name,
            base_etf: c.base_etf,
            base_weight: c.base_weight,
            target_etf: c.target_etf,
            target_weight: c.target_weight,
            change: c.change
        });
    });

    const start = (page - 1) * perPage;
    const end = start + perPage;
    const pageData = allItems.slice(start, end);

    if (pageData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="px-4 py-8 text-center text-gray-500">
                    비교 데이터가 없습니다.
                </td>
            </tr>
        `;
        document.getElementById('compare-pagination').innerHTML = '';
        return;
    }

    tbody.innerHTML = pageData.map(item => {
        let statusBadge = '';
        let rowClass = '';
        
        if (item.status === 'new') {
            statusBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">신규</span>';
            rowClass = 'bg-green-50';
        } else if (item.status === 'removed') {
            statusBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">제외</span>';
            rowClass = 'bg-red-50';
        } else if (item.status === 'changed') {
            const changeColor = item.change > 0 ? 'blue' : 'orange';
            statusBadge = `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-${changeColor}-100 text-${changeColor}-800">변경</span>`;
            rowClass = `bg-${changeColor}-50`;
        }

        const baseWeightDisplay = item.base_weight !== null ? item.base_weight.toFixed(4) + '%' : '-';
        const targetWeightDisplay = item.target_weight !== null ? item.target_weight.toFixed(4) + '%' : '-';
        
        let changeDisplay = '-';
        if (item.change !== null) {
            const changeColor = item.change > 0 ? 'text-blue-600' : 'text-orange-600';
            const changeIcon = item.change > 0 ? '↑' : '↓';
            changeDisplay = `<span class="${changeColor} font-semibold">${changeIcon} ${Math.abs(item.change).toFixed(4)}%</span>`;
        }

        return `
            <tr class="hover:bg-gray-100 ${rowClass}">
                <td class="px-4 py-3">${statusBadge}</td>
                <td class="px-4 py-3 font-semibold text-blue-600">${item.ticker}</td>
                <td class="px-4 py-3 text-sm">${item.company_name || '-'}</td>
                <td class="px-4 py-3">
                    ${item.base_etf !== '-' ? `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">${item.base_etf}</span>` : '-'}
                </td>
                <td class="px-4 py-3 text-right font-semibold">${baseWeightDisplay}</td>
                <td class="px-4 py-3">
                    ${item.target_etf !== '-' ? `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">${item.target_etf}</span>` : '-'}
                </td>
                <td class="px-4 py-3 text-right font-semibold">${targetWeightDisplay}</td>
                <td class="px-4 py-3 text-right">${changeDisplay}</td>
            </tr>
        `;
    }).join('');

    // 페이지네이션
    renderComparePagination(allItems.length, page, perPage);
}

/**
 * 비교 페이지네이션 렌더링
 */
function renderComparePagination(total, current, perPage) {
    const totalPages = Math.ceil(total / perPage);
    const container = document.getElementById('compare-pagination');

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let pages = [];
    
    // 이전 버튼
    if (current > 1) {
        pages.push(`<button onclick="goToComparePage(${current - 1})" class="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50">이전</button>`);
    }

    // 페이지 번호
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= current - 2 && i <= current + 2)) {
            const active = i === current ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50';
            pages.push(`<button onclick="goToComparePage(${i})" class="px-3 py-2 border border-gray-300 rounded-md ${active}">${i}</button>`);
        } else if (i === current - 3 || i === current + 3) {
            pages.push(`<span class="px-3 py-2">...</span>`);
        }
    }

    // 다음 버튼
    if (current < totalPages) {
        pages.push(`<button onclick="goToComparePage(${current + 1})" class="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50">다음</button>`);
    }

    container.innerHTML = `<div class="flex space-x-2">${pages.join('')}</div>`;
}

/**
 * 비교 페이지 이동
 */
function goToComparePage(page) {
    compareCurrentPage = page;
    renderCompareTable(compareData, page);
    document.getElementById('compare-results').scrollIntoView({ behavior: 'smooth' });
}
