// --- 1. ЛОГИКА КАЛЬКУЛЯТОРА ---
        function calculateMMR() {
            const currentInput = document.getElementById('currentMmr');
            const mmrPerGameInput = document.getElementById('mmrPerGame');
            const current = Number(currentInput.value);
            const target = Number(document.getElementById('targetRank').value);
            const mmrPerGame = Number(mmrPerGameInput.value);
            const resultsDiv = document.getElementById('results');
            const errorEl = document.getElementById('calculationError');
            const mmrNeededEl = document.getElementById('mmrNeeded');
            const winsNeededEl = document.getElementById('winsNeeded');
            const lossesNeededEl = document.getElementById('lossesNeeded');

            if (currentInput.value.trim() === "" || !Number.isInteger(current) || current < 0 ||
                mmrPerGameInput.value.trim() === "" || !Number.isInteger(mmrPerGame) || mmrPerGame < 1) {
                errorEl.innerText = "Укажи текущий MMR от 0 и целое число MMR за игру (не меньше 1).";
                errorEl.style.display = "block";
                resultsDiv.style.display = "none";
                return;
            }

            errorEl.style.display = "none";
            const rankOptions = Array.from(document.getElementById('targetRank').options)
                .map(option => Number(option.value));
            const mmrDiff = Math.max(0, target - current);

            if (mmrDiff > 0) {
                mmrNeededEl.innerText = `+${mmrDiff} MMR`;
                mmrNeededEl.style.color = "#00ff00";
                winsNeededEl.innerText = Math.ceil(mmrDiff / mmrPerGame) + " игр";
            } else {
                mmrNeededEl.innerText = "Ранг уже достигнут";
                mmrNeededEl.style.color = "#ff9900";
                winsNeededEl.innerText = "0 игр";
            }

            const currentRankMmr = rankOptions.filter(rankMmr => rankMmr <= current).pop();
            if (currentRankMmr === 0) {
                lossesNeededEl.innerText = "Нет ранга ниже";
            } else {
                const lossesToDrop = Math.ceil((current - currentRankMmr + 1) / mmrPerGame);
                lossesNeededEl.innerText = lossesToDrop + " игр";
            }

            resultsDiv.style.display = "block";
        }

        function updateRankPreview() {
            const rankSelect = document.getElementById('targetRank');
            const selectedRank = rankSelect.options[rankSelect.selectedIndex];
            const rankName = selectedRank.textContent.split(" (")[0];
            const medal = document.getElementById('rankMedal');

            medal.className = "rank-medal rank-" + selectedRank.dataset.medal;
            medal.setAttribute("aria-label", "Медаль: " + rankName);
            document.getElementById('rankName').innerText = rankName;
        }

        function updateCurrentRankPreview() {
            const currentInput = document.getElementById('currentMmr');
            const mmrValue = Number(currentInput.value);
            const medal = document.getElementById('currentRankMedal');
            const rankName = document.getElementById('currentRankName');
            const rankMmrValue = document.getElementById('currentRankMmrValue');
            const progressBar = document.getElementById('rankProgressBar');
            const progress = progressBar.parentElement;
            const progressLabel = document.getElementById('rankProgressLabel');

            if (currentInput.value.trim() === '' || !Number.isInteger(mmrValue) || mmrValue < 0) {
                rankName.textContent = '—';
                rankMmrValue.textContent = 'Введите корректный MMR';
                progressBar.style.width = '0%';
                progress.setAttribute('aria-valuenow', '0');
                progressLabel.textContent = 'MMR должен быть целым числом от 0.';
                return;
            }

            const rankOptions = Array.from(document.getElementById('targetRank').options);
            let currentRankIndex = 0;
            rankOptions.forEach((option, index) => {
                if (Number(option.value) <= mmrValue) {
                    currentRankIndex = index;
                }
            });

            const currentRank = rankOptions[currentRankIndex];
            const currentRankName = currentRank.textContent.split(' (')[0];
            const rankFloor = Number(currentRank.value);
            medal.className = `rank-medal rank-${currentRank.dataset.medal}`;
            medal.setAttribute('aria-label', `Текущая медаль: ${currentRankName}`);
            rankName.textContent = currentRankName;
            rankMmrValue.textContent = `${mmrValue.toLocaleString('ru-RU')} MMR`;

            const nextRank = rankOptions[currentRankIndex + 1];
            if (!nextRank) {
                progressBar.style.width = '100%';
                progress.setAttribute('aria-valuenow', '100');
                progressLabel.textContent = 'Титан — высшая медаль; MMR продолжает расти.';
                return;
            }

            const nextRankMmr = Number(nextRank.value);
            const percent = Math.max(0, Math.min(100,
                ((mmrValue - rankFloor) / (nextRankMmr - rankFloor)) * 100
            ));
            const remainingMmr = nextRankMmr - mmrValue;
            const nextRankName = nextRank.textContent.split(' (')[0];
            progressBar.style.width = `${percent}%`;
            progress.setAttribute('aria-valuenow', String(Math.round(percent)));
            progressLabel.textContent =
                `До медали «${nextRankName}» осталось ${remainingMmr.toLocaleString('ru-RU')} MMR.`;
        }

        document.getElementById('targetRank').addEventListener('change', updateRankPreview);
        document.getElementById('currentMmr').addEventListener('input', updateCurrentRankPreview);
        updateRankPreview();
        updateCurrentRankPreview();
        document.getElementById('calculateButton').addEventListener('click', calculateMMR);

        function initializeHeroProgression() {
            const progression = window.heroProgression;
            const currentLevelSelect = document.getElementById('heroCurrentLevel');
            const currentProgressInput = document.getElementById('heroCurrentProgress');
            const targetLevelSelect = document.getElementById('heroTargetLevel');
            const progressHint = document.getElementById('heroProgressHint');
            const errorElement = document.getElementById('heroCalculationError');
            const resultsElement = document.getElementById('heroResults');

            for (let level = 1; level <= progression.maxLevel; level++) {
                const tier = progression.getTier(level);
                const option = document.createElement('option');
                option.value = String(level);
                option.textContent = `Уровень ${level} — ${tier.name}`;
                currentLevelSelect.appendChild(option);
            }

            function updateTierPreview(level, imageId, nameId) {
                const tier = progression.getTier(level);
                const image = document.getElementById(imageId);
                image.src = `assets/images/dota-plus/${tier.image}`;
                image.alt = `Медаль «${tier.name}»`;
                document.getElementById(nameId).textContent =
                    level === 0 ? `Новый герой · ${tier.name}` : `${tier.name} · уровень ${level}`;
            }

            function updateTargetOptions() {
                const currentLevel = Number(currentLevelSelect.value);
                const previousTarget = Number(targetLevelSelect.value) || progression.maxLevel;
                const firstTarget = Math.max(1, currentLevel);
                targetLevelSelect.replaceChildren();

                for (let level = firstTarget; level <= progression.maxLevel; level++) {
                    const tier = progression.getTier(level);
                    const option = document.createElement('option');
                    option.value = String(level);
                    option.textContent = `Уровень ${level} — ${tier.name}`;
                    targetLevelSelect.appendChild(option);
                }

                targetLevelSelect.value = String(Math.max(firstTarget, previousTarget));
            }

            function updateProgressInput() {
                const currentLevel = Number(currentLevelSelect.value);
                const nextLevelCost = progression.getNextLevelPointCost(currentLevel);
                const maxProgress = progression.getMaxProgress(currentLevel);
                currentProgressInput.max = String(maxProgress);
                currentProgressInput.disabled = currentLevel === progression.maxLevel;
                if (Number(currentProgressInput.value) > maxProgress) {
                    currentProgressInput.value = '0';
                }
                progressHint.textContent = currentLevel === progression.maxLevel
                    ? 'Максимальный уровень уже достигнут.'
                    : `От 0 до ${maxProgress} XP; для следующего уровня нужно ${nextLevelCost} XP.`;
            }

            function calculateHeroProgress() {
                const currentLevel = Number(currentLevelSelect.value);
                const targetLevel = Number(targetLevelSelect.value);
                const progressValue = currentProgressInput.value.trim();
                const currentProgress = Number(progressValue);

                if (!Number.isInteger(currentLevel) || !Number.isInteger(targetLevel) ||
                    progressValue === '' || !Number.isInteger(currentProgress) ||
                    currentProgress < 0 || currentProgress > progression.getMaxProgress(currentLevel)) {
                    errorElement.textContent = 'Проверьте уровень и уже набранный опыт.';
                    errorElement.style.display = 'block';
                    resultsElement.style.display = 'none';
                    return;
                }

                errorElement.style.display = 'none';
                resultsElement.style.display = 'flex';
                const pointsNeeded = progression.calculatePointsNeeded(
                    currentLevel,
                    targetLevel,
                    currentProgress
                );
                document.getElementById('heroXpNeeded').textContent =
                    `${pointsNeeded.toLocaleString('ru-RU')} XP`;
                document.getElementById('heroLevelsNeeded').textContent =
                    String(targetLevel - currentLevel);
            }

            function updateHeroInputs() {
                const currentLevel = Number(currentLevelSelect.value);
                updateTargetOptions();
                updateProgressInput();
                updateTierPreview(
                    currentLevel,
                    'heroCurrentTierImage',
                    'heroCurrentTierName'
                );
                updateTierPreview(
                    Number(targetLevelSelect.value),
                    'heroTargetTierImage',
                    'heroTargetTierName'
                );
                calculateHeroProgress();
            }

            currentLevelSelect.addEventListener('change', () => {
                currentProgressInput.value = '0';
                updateHeroInputs();
            });
            currentProgressInput.addEventListener('input', calculateHeroProgress);
            targetLevelSelect.addEventListener('change', () => {
                updateTierPreview(
                    Number(targetLevelSelect.value),
                    'heroTargetTierImage',
                    'heroTargetTierName'
                );
                calculateHeroProgress();
            });
            document.getElementById('heroCalculateButton')
                .addEventListener('click', calculateHeroProgress);

            updateHeroInputs();
        }

        initializeHeroProgression();

        async function loadProfile() {
            const loginError = document.getElementById('loginError');
            const profileLoadError = document.getElementById('profileLoadError');
            const query = new URLSearchParams(window.location.search);
            const loginStatus = query.get('login');
            if (loginStatus === 'failed' || loginStatus === 'cancelled') {
                if (loginStatus === 'cancelled') {
                    loginError.className = 'text-warning';
                    loginError.textContent = 'Вход через Steam отменён. Попробуйте ещё раз, когда будете готовы.';
                }
                loginError.style.display = "block";
                window.history.replaceState(null, "", window.location.pathname);
            }

            try {
                const response = await fetch('/api/me', {
                    headers: { Accept: 'application/json' }
                });
                if (response.status === 401) {
                    return;
                }
                if (!response.ok) {
                    throw new Error('Profile request failed');
                }

                const data = await response.json();
                const profile = data.profile;
                document.getElementById('profileLoggedOut').style.display = "none";
                document.getElementById('profileLoggedIn').style.display = "block";

                document.getElementById('steamPersonaName').textContent =
                    profile.personaName || 'Игрок Steam';
                const steamLink = document.getElementById('steamProfileLink');
                steamLink.href = profile.steamProfileUrl;
                steamLink.textContent = profile.steamId;

                const avatar = document.getElementById('steamAvatar');
                const avatarFallback = document.getElementById('steamAvatarFallback');
                if (profile.avatarUrl) {
                    avatar.onload = () => {
                        avatar.style.display = 'block';
                        avatarFallback.style.display = 'none';
                    };
                    avatar.onerror = () => {
                        avatar.style.display = 'none';
                        avatarFallback.style.display = 'block';
                    };
                    avatar.src = profile.avatarUrl;
                }

                if (profile.currentMmr !== null) {
                    document.getElementById('profileMmr').value = profile.currentMmr;
                    document.getElementById('currentMmr').value = profile.currentMmr;
                    updateCurrentRankPreview();
                }
                await window.heroProfileUi.load();
            } catch (error) {
                profileLoadError.style.display = "block";
                console.error('Unable to load Steam profile:', error);
            }
        }

        document.getElementById('profileForm').addEventListener('submit', async event => {
            event.preventDefault();
            const mmrInput = document.getElementById('profileMmr');
            const message = document.getElementById('profileMessage');
            const mmr = Number(mmrInput.value);
            if (mmrInput.value.trim() === "" || !Number.isInteger(mmr) || mmr < 0 || mmr > 100000) {
                message.className = "small mt-2 mb-0 text-danger";
                message.innerText = "Введите целое число от 0 до 100000.";
                return;
            }

            try {
                const response = await fetch('/api/me/mmr', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({ mmr })
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Не удалось сохранить MMR.');
                }

                document.getElementById('currentMmr').value = data.profile.currentMmr;
                updateCurrentRankPreview();
                message.className = "small mt-2 mb-0 text-success";
                message.innerText = "MMR сохранён в вашем приватном профиле.";
            } catch (error) {
                message.className = "small mt-2 mb-0 text-danger";
                message.innerText = error.message || "Не удалось сохранить MMR.";
            }
        });

        document.getElementById('logoutButton').addEventListener('click', async () => {
            try {
                const response = await fetch('/auth/logout', { method: 'POST' });
                if (!response.ok) {
                    throw new Error('Logout failed');
                }
                window.location.reload();
            } catch (error) {
                document.getElementById('profileMessage').innerText = "Не удалось выйти. Попробуйте ещё раз.";
                console.error('Unable to log out:', error);
            }
        });

        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
            loadProfile();
        }

        // --- 2. АНИМАЦИЯ НА CANVAS (Фон с частицами) ---
        const canvas = document.getElementById('canvas-bg');
        const ctx = canvas.getContext('2d');

        let width, height;
        let particles = [];

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        window.addEventListener('resize', resize);
        resize();

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 2 + 1;
                this.speedX = Math.random() * 1 - 0.5;
                this.speedY = Math.random() * -1 - 0.5; // Летят вверх
                this.color = Math.random() > 0.5 ? '#c23b22' : '#f0a500'; // Красный и золотой
                this.alpha = Math.random() * 0.5 + 0.1;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (this.y < 0) {
                    this.y = height;
                    this.x = Math.random() * width;
                }
                if (this.x < 0 || this.x > width) {
                    this.x = Math.random() * width;
                }
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.globalAlpha = this.alpha;
                ctx.fill();
            }
        }

        function initParticles() {
            particles = [];
            const particleCount = Math.min(120, Math.ceil((width * height) / 15000));
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
        }

        function animate() {
            ctx.clearRect(0, 0, width, height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animate);
        }

        initParticles();
        animate();

        // Пересоздаем частицы при ресайзе
        window.addEventListener('resize', initParticles);
