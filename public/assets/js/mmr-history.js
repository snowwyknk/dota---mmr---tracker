(() => {
    const section = document.getElementById('mmrHistory');
    const period = document.getElementById('mmrHistoryDays');
    const status = document.getElementById('mmrHistoryStatus');
    const retry = document.getElementById('mmrHistoryRetry');
    const graph = document.getElementById('mmrHistoryGraph');
    const summary = document.getElementById('mmrHistorySummary');
    const axisMax = document.getElementById('mmrHistoryMax');
    const axisMin = document.getElementById('mmrHistoryMin');
    const axisStart = document.getElementById('mmrHistoryStart');
    const axisEnd = document.getElementById('mmrHistoryEnd');
    const line = document.getElementById('mmrHistoryLine');
    const rows = document.getElementById('mmrHistoryRows');
    const numberFormat = new Intl.NumberFormat('ru-RU');
    const changeFormat = new Intl.NumberFormat('ru-RU', { signDisplay: 'exceptZero' });
    const shortDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
    const fullDate = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
    let activeRequest;

    function renderHistory({ start, end, points }) {
        if (points.length === 0) {
            status.textContent = 'Сохраните текущий MMR в профиле, чтобы начать историю.';
            return;
        }

        const first = points[0];
        const last = points.at(-1);
        const change = changeFormat.format(last.mmr - first.mmr);
        if (first.baseline) {
            summary.textContent = `За выбранный период: ${change} MMR`;
        } else if (points.length === 1) {
            summary.textContent = `Первая запись: ${numberFormat.format(first.mmr)} MMR`;
        } else {
            summary.textContent = `С первой записи за период: ${change} MMR`;
        }

        const startTime = Date.parse(start);
        const endTime = Date.parse(end);
        const ratings = points.map(point => point.mmr);
        const min = Math.min(...ratings);
        const max = Math.max(...ratings);
        const y = mmr => max === min ? 72 : 138 - (mmr - min) * 132 / (max - min);
        const x = timestamp => (Math.max(startTime, Date.parse(timestamp)) - startTime) * 600 / (endTime - startTime);
        const steps = points.slice(1).map(point => `H ${x(point.recordedAt)} V ${y(point.mmr)}`);
        line.setAttribute('d', [`M ${x(first.recordedAt)} ${y(first.mmr)}`, ...steps, 'H 600'].join(' '));

        axisMax.textContent = max === min ? '' : numberFormat.format(max);
        axisMin.textContent = max === min ? '' : numberFormat.format(min);
        axisStart.textContent = shortDate.format(startTime);
        axisEnd.textContent = shortDate.format(endTime);

        rows.replaceChildren(...points.map(point => {
            const row = document.createElement('tr');
            row.insertCell().textContent = point.baseline ? 'На начало периода' : fullDate.format(new Date(point.recordedAt));
            row.insertCell().textContent = numberFormat.format(point.mmr);
            return row;
        }));
        status.textContent = '';
        graph.hidden = false;
    }

    async function load() {
        activeRequest?.abort();
        const request = new AbortController();
        activeRequest = request;
        graph.hidden = true;
        retry.hidden = true;
        status.textContent = 'Загружаем историю MMR…';

        try {
            const response = await fetch(`/api/me/mmr/history?days=${period.value}`, { signal: request.signal });
            if (!response.ok) throw new Error('History request failed');
            const history = await response.json();
            if (!request.signal.aborted) renderHistory(history);
        } catch {
            if (request.signal.aborted) return;
            status.textContent = 'Не удалось загрузить историю MMR.';
            retry.hidden = false;
        }
    }

    period.addEventListener('change', load);
    retry.addEventListener('click', load);
    window.mmrHistoryUi = {
        show() {
            section.hidden = false;
            return load();
        },
        load
    };
})();
