(() => {
    const progression = window.heroProgression;
    const levelSelect = document.getElementById('savedHeroLevel');
    const xpInput = document.getElementById('savedHeroXp');
    const xpHint = document.getElementById('savedHeroXpHint');
    const form = document.getElementById('heroProgressForm');
    const list = document.getElementById('savedHeroList');
    const message = document.getElementById('savedHeroMessage');

    for (let level = 0; level <= progression.maxLevel; level++) {
        const option = document.createElement('option');
        option.value = String(level);
        option.textContent = level === 0
            ? 'Новый герой — уровень 0'
            : `Уровень ${level} — ${progression.getTier(level).name}`;
        levelSelect.appendChild(option);
    }

    function updateXpHint() {
        const level = Number(levelSelect.value);
        const maxProgress = progression.getMaxProgress(level);
        const nextLevelCost = progression.getNextLevelPointCost(level);
        xpInput.max = String(maxProgress);
        xpInput.disabled = level === progression.maxLevel;

        if (Number(xpInput.value) > maxProgress) {
            xpInput.value = '0';
        }
        xpHint.textContent = level === progression.maxLevel
            ? 'Максимальный уровень уже достигнут.'
            : `От 0 до ${maxProgress} XP; следующий уровень требует ${nextLevelCost} XP.`;
    }

    function setMessage(text, isError = false) {
        message.textContent = text;
        message.className = isError
            ? 'small mt-2 mb-0 text-danger'
            : 'small mt-2 mb-0 text-success';
    }

    async function readError(response, fallback) {
        try {
            const data = await response.json();
            return data.error || fallback;
        } catch {
            return fallback;
        }
    }

    function createHeroItem(hero) {
        const level = Number(hero.hero_level);
        const currentXp = Number(hero.current_xp);
        const tier = progression.getTier(level);
        const nextLevelCost = progression.getNextLevelPointCost(level);
        const percentage = level === progression.maxLevel
            ? 100
            : Math.round((currentXp / nextLevelCost) * 100);
        const pointsToGrandmaster = progression.calculatePointsNeeded(level, 30, currentXp);

        const item = document.createElement('li');
        item.className = 'saved-hero-item';

        const heading = document.createElement('div');
        heading.className = 'saved-hero-heading';

        const medal = document.createElement('img');
        medal.className = 'saved-hero-medal';
        medal.src = `assets/images/dota-plus/${tier.image}`;
        medal.alt = `Медаль «${tier.name}»`;

        const titleGroup = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = hero.hero_name;
        const levelLabel = document.createElement('div');
        levelLabel.className = 'small text-muted';
        levelLabel.textContent = `Уровень ${level} · ${tier.name}`;
        titleGroup.append(title, levelLabel);
        heading.append(medal, titleGroup);

        const progressDescription = document.createElement('small');
        progressDescription.className = 'text-muted d-block mb-1';
        progressDescription.textContent = level === progression.maxLevel
            ? 'Максимальный уровень'
            : `${currentXp.toLocaleString('ru-RU')} / ${nextLevelCost.toLocaleString('ru-RU')} XP до следующего уровня`;

        const progress = document.createElement('div');
        progress.className = 'progress rank-progress mb-2';
        progress.setAttribute('role', 'progressbar');
        progress.setAttribute('aria-label', `Прогресс ${hero.hero_name} к следующему уровню`);
        progress.setAttribute('aria-valuemin', '0');
        progress.setAttribute('aria-valuemax', '100');
        progress.setAttribute('aria-valuenow', String(percentage));

        const bar = document.createElement('div');
        bar.className = 'progress-bar';
        bar.style.width = `${percentage}%`;
        progress.appendChild(bar);

        const target = document.createElement('small');
        target.className = 'text-muted d-block mb-2';
        target.textContent = level === progression.maxLevel
            ? 'Грандмастер достигнут.'
            : `До 30-го уровня: ${pointsToGrandmaster.toLocaleString('ru-RU')} XP`;

        const actions = document.createElement('div');
        actions.className = 'd-flex flex-wrap gap-2';

        const useButton = document.createElement('button');
        useButton.type = 'button';
        useButton.className = 'btn btn-sm btn-outline-warning';
        useButton.textContent = 'Открыть в калькуляторе';
        useButton.addEventListener('click', () => {
            const currentLevel = document.getElementById('heroCurrentLevel');
            const currentProgress = document.getElementById('heroCurrentProgress');
            currentLevel.value = String(level);
            currentLevel.dispatchEvent(new Event('change', { bubbles: true }));
            currentProgress.value = String(currentXp);
            currentProgress.dispatchEvent(new Event('input', { bubbles: true }));
            document.getElementById('heroCalculatorTitle')
                .scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'btn btn-sm btn-outline-light';
        deleteButton.textContent = 'Удалить';
        deleteButton.addEventListener('click', async () => {
            deleteButton.disabled = true;
            try {
                const response = await fetch(`/api/me/heroes/${encodeURIComponent(hero.id)}`, {
                    method: 'DELETE',
                    headers: { Accept: 'application/json' }
                });
                if (!response.ok) {
                    throw new Error(await readError(response, 'Не удалось удалить героя.'));
                }
                await load();
                setMessage('Прогресс героя удалён.');
            } catch (error) {
                setMessage(error.message || 'Не удалось удалить героя.', true);
                deleteButton.disabled = false;
            }
        });

        actions.append(useButton, deleteButton);
        item.append(heading, progressDescription, progress, target, actions);
        return item;
    }

    function renderHeroes(heroes) {
        list.replaceChildren();
        if (heroes.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'small text-muted';
            empty.textContent = 'Сохранённых героев пока нет.';
            list.appendChild(empty);
            return;
        }
        heroes.forEach(hero => list.appendChild(createHeroItem(hero)));
    }

    async function load() {
        try {
            const response = await fetch('/api/me/heroes', {
                headers: { Accept: 'application/json' }
            });
            if (!response.ok) {
                throw new Error(await readError(response, 'Не удалось загрузить список героев.'));
            }
            const data = await response.json();
            if (!Array.isArray(data.heroes)) {
                throw new Error('Сервер вернул некорректный список героев.');
            }
            renderHeroes(data.heroes);
            return true;
        } catch (error) {
            const failure = document.createElement('li');
            failure.className = 'small text-danger';
            failure.textContent = error.message || 'Не удалось загрузить список героев.';
            list.replaceChildren(failure);
            console.error('Unable to load saved hero progress:', error);
            return false;
        }
    }

    levelSelect.addEventListener('change', updateXpHint);
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const heroNameInput = document.getElementById('savedHeroName');
        const heroName = heroNameInput.value.trim();
        const level = Number(levelSelect.value);
        const currentXp = Number(xpInput.value);
        if (!heroName || !Number.isInteger(level) || !Number.isInteger(currentXp) ||
            currentXp < 0 || currentXp > progression.getMaxProgress(level)) {
            setMessage('Проверьте имя героя, уровень и набранный опыт.', true);
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        try {
            const response = await fetch('/api/me/heroes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify({ heroName, level, currentXp })
            });
            if (!response.ok) {
                throw new Error(await readError(response, 'Не удалось сохранить героя.'));
            }
            await load();
            heroNameInput.value = '';
            xpInput.value = '0';
            updateXpHint();
            setMessage('Прогресс героя сохранён в приватном профиле.');
        } catch (error) {
            setMessage(error.message || 'Не удалось сохранить героя.', true);
        } finally {
            submitButton.disabled = false;
        }
    });

    updateXpHint();
    window.heroProfileUi = { load };
})();
