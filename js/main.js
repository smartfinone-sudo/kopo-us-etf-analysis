/**
 * 메인 애플리케이션 로직
 */

let selectedFile = null;
let parsedData = null;

/**
 * 페이지 초기화
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('ETF 저비중 종목 분석 시스템 초기화');
    
    // 초기 페이지 표시
    showPage('upload');
    
    // 드래그 앤 드롭 이벤트
    setupDragAndDrop();
});

/**
 * 페이지 전환
 */
function showPage(pageName) {
    // 모든 페이지 숨기기
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.add('hidden');
    });

    // 네비게이션 활성화 상태 변경
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('nav-active', 'text-white', 'bg-blue-600');
        btn.classList.add('text-gray-700');
    });

    // 선택된 페이지 표시
    document.getElementById('page-' + pageName).classList.remove('hidden');
    document.getElementById('nav-' + pageName).classList.add('nav-active');

    // 페이지별 로드 함수 호출
    if (pageName === 'dashboard') {
        loadDashboard();
    } else if (pageName === 'history') {
        loadHistory();
    }
}

/**
 * 드래그 앤 드롭 설정
 */
function setupDragAndDrop() {
    const dropArea = document.querySelector('label[for="csv-file"]');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.add('border-blue-500', 'bg-blue-50');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.remove('border-blue-500', 'bg-blue-50');
        }, false);
    });

    dropArea.addEventListener('drop', handleDrop, false);
}

/**
 * 드롭 이벤트 처리
 */
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
        const file = files[0];
        if (file.name.endsWith('.csv')) {
            document.getElementById('csv-file').files = files;
            handleFileSelect({ target: { files: files } });
        } else {
            alert('CSV 파일만 업로드 가능합니다.');
        }
    }
}

/**
 * 파일 선택 처리
 */
async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 이전 에러 메시지 초기화
    clearErrorMessages();

    selectedFile = file;
    
    // 파일 정보 표시
    const fileInfo = document.getElementById('file-info');
    fileInfo.innerHTML = `
        <i class="fas fa-file-csv text-green-600 mr-2"></i>
        <span class="font-semibold">${file.name}</span>
        <span class="text-gray-500 ml-2">(${(file.size / 1024).toFixed(2)} KB)</span>
    `;

    // 파일 읽기 및 미리보기
    try {
        const text = await file.text();
        parsedData = csvParser.parseCSV(text);
        
        // 미리보기 표시
        showPreview(parsedData);
        
        // 업로드 버튼 활성화
        checkUploadReady();
    } catch (error) {
        console.error('CSV 파싱 오류:', error);
        showAlert('error', 'CSV 파싱 실패: ' + error.message);
        parsedData = null;
        document.getElementById('preview-section').classList.add('hidden');
    }
}

/**
 * 데이터 미리보기 표시
 */
function showPreview(data) {
    const section = document.getElementById('preview-section');
    const statsDiv = document.getElementById('preview-stats');
    const headerRow = document.getElementById('preview-header');
    const bodyTable = document.getElementById('preview-body');

    // 통계 정보
    const stats = csvParser.getStats(data);
    const validation = csvParser.validateData(data);

    statsDiv.innerHTML = `
        <div class="bg-blue-50 p-3 rounded">
            <p class="text-sm text-gray-600">총 종목 수</p>
            <p class="text-xl font-bold text-blue-600">${stats.totalHoldings}</p>
        </div>
        <div class="bg-green-50 p-3 rounded">
            <p class="text-sm text-gray-600">비중 합계</p>
            <p class="text-xl font-bold text-green-600">${stats.totalWeight}%</p>
        </div>
        <div class="bg-purple-50 p-3 rounded">
            <p class="text-sm text-gray-600">평균 비중</p>
            <p class="text-xl font-bold text-purple-600">${stats.avgWeight}%</p>
        </div>
        <div class="bg-orange-50 p-3 rounded">
            <p class="text-sm text-gray-600">저비중 종목 (≤2%)</p>
            <p class="text-xl font-bold text-orange-600">${stats.lowWeightCount}</p>
        </div>
    `;

    // 검증 경고
    if (!validation.isValid) {
        statsDiv.innerHTML += `
            <div class="col-span-4 bg-yellow-50 border-l-4 border-yellow-500 p-3">
                <p class="text-sm text-yellow-800">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    <strong>경고:</strong> 비중 합계가 ${stats.totalWeight}%입니다. 데이터를 확인하세요.
                </p>
            </div>
        `;
    }

    // 테이블 헤더
    headerRow.innerHTML = `
        <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">티커</th>
        <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">회사명</th>
        <th class="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase">비중 (%)</th>
        <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">섹터</th>
    `;

    // 테이블 본문 (상위 10개만 표시)
    const previewData = data.slice(0, 10);
    bodyTable.innerHTML = previewData.map(row => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-2 font-semibold text-blue-600">${row.ticker}</td>
            <td class="px-4 py-2 text-sm">${row.company_name}</td>
            <td class="px-4 py-2 text-right font-semibold">${row.weight.toFixed(4)}%</td>
            <td class="px-4 py-2 text-sm">${row.sector || '-'}</td>
        </tr>
    `).join('');

    if (data.length > 10) {
        bodyTable.innerHTML += `
            <tr>
                <td colspan="4" class="px-4 py-2 text-center text-sm text-gray-500">
                    ... 외 ${data.length - 10}개 종목
                </td>
            </tr>
        `;
    }

    section.classList.remove('hidden');
}

/**
 * 업로드 준비 확인
 */
function checkUploadReady() {
    const etfSelect = document.getElementById('etf-select');
    const uploadBtn = document.getElementById('upload-btn');

    const isReady = etfSelect.value && parsedData && parsedData.length > 0;
    uploadBtn.disabled = !isReady;
}

// ETF 선택 변경 시 체크
document.getElementById('etf-select')?.addEventListener('change', checkUploadReady);

/**
 * CSV 업로드 및 저장
 */
async function uploadCSV() {
    // 이전 에러 메시지 초기화
    clearErrorMessages();

    const etfSymbol = document.getElementById('etf-select').value;
    
    if (!etfSymbol) {
        alert('ETF를 선택하세요.');
        return;
    }

    if (!parsedData || parsedData.length === 0) {
        alert('파일을 선택하고 파싱이 완료될 때까지 기다려주세요.');
        return;
    }

    const uploadBtn = document.getElementById('upload-btn');
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>업로드 중...';

    // 진행 바 표시
    const progressDiv = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    progressDiv.classList.remove('hidden');

    // 진행 상태 콜백 설정
    window.onUploadProgress = function(percent, message) {
        progressBar.style.width = percent + '%';
        progressText.textContent = message;
    };

    try {
        // 데이터 저장
        const result = await dataManager.saveHoldings(etfSymbol, parsedData, selectedFile.name);

        // 성공 메시지
        showAlert('success', 
            `✅ 업로드 완료!\n\n` +
            `- ETF: ${etfSymbol}\n` +
            `- 저장된 종목 수: ${result.savedCount}\n` +
            `- 스냅샷 ID: ${result.snapshotId}`
        );

        // 초기화
        setTimeout(() => {
            resetUpload();
            showPage('dashboard');
        }, 2000);

    } catch (error) {
        console.error('업로드 실패:', error);
        showAlert('error', '업로드 실패: ' + error.message);
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>업로드 및 분석';
    } finally {
        progressDiv.classList.add('hidden');
        window.onUploadProgress = null;
    }
}

/**
 * 업로드 초기화
 */
function resetUpload() {
    selectedFile = null;
    parsedData = null;
    
    document.getElementById('etf-select').value = '';
    document.getElementById('csv-file').value = '';
    document.getElementById('file-info').innerHTML = '';
    document.getElementById('preview-section').classList.add('hidden');
    document.getElementById('upload-result').classList.add('hidden');
    document.getElementById('upload-progress').classList.add('hidden');
    
    const uploadBtn = document.getElementById('upload-btn');
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>업로드 및 분석';
}

/**
 * 에러 메시지 초기화
 */
function clearErrorMessages() {
    const resultDiv = document.getElementById('upload-result');
    resultDiv.classList.add('hidden');
    resultDiv.innerHTML = '';
}

/**
 * 알림 표시
 */
function showAlert(type, message) {
    const resultDiv = document.getElementById('upload-result');
    
    const colors = {
        success: 'green',
        error: 'red',
        warning: 'yellow',
        info: 'blue'
    };

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    const color = colors[type] || 'blue';
    const icon = icons[type] || 'fa-info-circle';

    resultDiv.innerHTML = `
        <div class="bg-${color}-50 border-l-4 border-${color}-500 p-4 rounded">
            <div class="flex items-start">
                <i class="fas ${icon} text-${color}-600 text-xl mr-3 mt-1"></i>
                <div class="flex-1">
                    <p class="text-${color}-800 whitespace-pre-line">${message}</p>
                </div>
            </div>
        </div>
    `;
    
    resultDiv.classList.remove('hidden');
}

/**
 * 히스토리 페이지 로드
 */
async function loadHistory() {
    try {
        const history = await dataManager.getUploadHistory();
        const tbody = document.getElementById('history-table');

        if (history.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                        <i class="fas fa-inbox text-4xl mb-2"></i>
                        <p>업로드 히스토리가 없습니다.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = history.map(h => {
            const statusColor = h.status === 'success' ? 'green' : 'red';
            const statusIcon = h.status === 'success' ? 'fa-check-circle' : 'fa-times-circle';

            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 text-sm">${dataManager.formatDate(h.upload_date)}</td>
                    <td class="px-4 py-3">
                        <span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            ${h.etf_symbol}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-right font-semibold">${h.total_holdings}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">${h.file_name}</td>
                    <td class="px-4 py-3">
                        <span class="flex items-center text-${statusColor}-600">
                            <i class="fas ${statusIcon} mr-1"></i>
                            ${h.status}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                        ${h.status === 'success' ? 
                            `<button onclick="compareWithPrevious('${h.etf_symbol}', '${h.snapshot_id}')" 
                                    class="text-blue-600 hover:text-blue-800 text-sm">
                                <i class="fas fa-exchange-alt mr-1"></i>비교
                            </button>` 
                            : '-'}
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('히스토리 로드 실패:', error);
    }
}

/**
 * 이전 스냅샷과 비교
 */
async function compareWithPrevious(etfSymbol, currentSnapshotId) {
    try {
        const history = await dataManager.getUploadHistory();
        const etfHistory = history
            .filter(h => h.etf_symbol === etfSymbol && h.status === 'success')
            .sort((a, b) => b.upload_date - a.upload_date);

        const currentIndex = etfHistory.findIndex(h => h.snapshot_id === currentSnapshotId);
        
        if (currentIndex === -1 || currentIndex === etfHistory.length - 1) {
            alert('비교할 이전 데이터가 없습니다.');
            return;
        }

        const previousSnapshot = etfHistory[currentIndex + 1];
        
        const changes = await dataManager.compareSnapshots(
            etfSymbol,
            previousSnapshot.snapshot_id,
            currentSnapshotId
        );

        // 변화 분석 표시
        displayChanges(changes);

    } catch (error) {
        console.error('비교 실패:', error);
        alert('비교 중 오류가 발생했습니다: ' + error.message);
    }
}

/**
 * 변화 분석 표시
 */
function displayChanges(changes) {
    const analysisDiv = document.getElementById('change-analysis');
    
    // 신규 편입
    const newDiv = document.getElementById('new-holdings');
    newDiv.innerHTML = changes.newHoldings.length > 0 ?
        changes.newHoldings.slice(0, 10).map(h => 
            `<div class="py-1"><strong>${h.ticker}</strong> - ${h.company_name} (${h.weight.toFixed(2)}%)</div>`
        ).join('') + (changes.newHoldings.length > 10 ? `<div class="text-xs mt-2">... 외 ${changes.newHoldings.length - 10}개</div>` : '')
        : '<p class="text-gray-500">없음</p>';

    // 제외된 종목
    const removedDiv = document.getElementById('removed-holdings');
    removedDiv.innerHTML = changes.removedHoldings.length > 0 ?
        changes.removedHoldings.slice(0, 10).map(h => 
            `<div class="py-1"><strong>${h.ticker}</strong> - ${h.company_name} (${h.weight.toFixed(2)}%)</div>`
        ).join('') + (changes.removedHoldings.length > 10 ? `<div class="text-xs mt-2">... 외 ${changes.removedHoldings.length - 10}개</div>` : '')
        : '<p class="text-gray-500">없음</p>';

    // 비중 증가
    const increasedDiv = document.getElementById('increased-holdings');
    const topIncreases = changes.weightChanges.filter(c => c.change > 0).slice(0, 10);
    increasedDiv.innerHTML = topIncreases.length > 0 ?
        topIncreases.map(h => 
            `<div class="py-1"><strong>${h.ticker}</strong> - ${h.company_name}<br>
            <span class="text-xs">${h.oldWeight.toFixed(2)}% → ${h.newWeight.toFixed(2)}% 
            (<span class="text-green-600">+${h.change.toFixed(2)}%</span>)</span></div>`
        ).join('')
        : '<p class="text-gray-500">없음</p>';

    analysisDiv.classList.remove('hidden');
    
    // 스크롤
    analysisDiv.scrollIntoView({ behavior: 'smooth' });
}

/* ===========================================================
 * (병합) Basic Auth: 쓰기 요청 자동 인증 헤더 주입
 * - 기존 코드 변경 없이 /tables 및 /api/upload의 POST/PUT/PATCH/DELETE에만 적용
 * - 인증정보는 메모리에만 보관(새로고침 시 초기화)
 * =========================================================== */
(function () {
  let __uploaderCreds = null; // { user, pass }

  function __setCreds(user, pass) { __uploaderCreds = { user, pass }; }
  async function __ensureCreds() {
    if (__uploaderCreds?.user && __uploaderCreds?.pass) return;
    const uEl = document.getElementById('upload-user');
    const pEl = document.getElementById('upload-pass');
    if (uEl?.value && pEl?.value) { __setCreds(uEl.value.trim(), pEl.value); return; }
    const u = window.prompt('업로드 아이디를 입력하세요:'); if (!u) throw new Error('업로더 아이디가 필요합니다.');
    const p = window.prompt('비밀번호를 입력하세요:'); if (!p) throw new Error('업로더 비밀번호가 필요합니다.');
    __setCreds(u.trim(), p);
  }

  function __basicHeader() {
    const { user, pass } = __uploaderCreds || {};
    if (!user || !pass) return null;
    return 'Basic ' + btoa(`${user}:${pass}`);
  }

  function __isWrite(method) {
    const m = (method || 'GET').toUpperCase();
    return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
  }

  function __isProtected(url) {
    try {
      const u = new URL(url, window.location.origin);
      if (u.origin !== window.location.origin) return false; // 동일 출처만
      return u.pathname.startsWith('/tables') || u.pathname.startsWith('/api/upload');
    } catch {
      return false;
    }
  }

  const __origFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const method = (init && init.method) || (typeof input !== 'string' ? input.method : 'GET');

    if (__isWrite(method) && __isProtected(url)) {
      await __ensureCreds();
      const auth = __basicHeader();
      if (!auth) throw new Error('업로더 인증 정보가 없습니다.');

      const headers = new Headers((init && init.headers) || (typeof input !== 'string' ? input.headers : undefined) || {});
      if (!headers.has('Authorization')) headers.set('Authorization', auth);

      const newInit = Object.assign({}, init, { headers });
      return __origFetch.call(this, input, newInit);
    }

    return __origFetch.call(this, input, init);
  };

  // 선택: 외부에서 수동 설정을 원할 때 사용
  window.setUploaderCreds = (u, p) => __setCreds(u, p);
})();
