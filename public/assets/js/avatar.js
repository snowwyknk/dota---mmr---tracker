(function () {
    const guestStorageKey = 'dotaTrackerGuestAvatar';
    const maxSourceFileBytes = 10 * 1024 * 1024;
    const maxAvatarDataUrlLength = Math.ceil((180 * 1024) / 3) * 4 + 32;

    function setMessage(elementId, message, isError) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.className = `small mt-2 mb-0 ${isError ? 'text-danger' : 'text-success'}`;
    }

    function showImage(imageId, fallbackId, dataUrl) {
        const image = document.getElementById(imageId);
        const fallback = document.getElementById(fallbackId);
        if (!dataUrl) {
            image.removeAttribute('src');
            image.style.display = 'none';
            fallback.style.display = 'block';
            return;
        }

        image.onload = () => {
            image.style.display = 'block';
            fallback.style.display = 'none';
        };
        image.onerror = () => {
            image.removeAttribute('src');
            image.style.display = 'none';
            fallback.style.display = 'block';
        };
        image.src = dataUrl;
    }

    function isSupportedImageDataUrl(value) {
        return typeof value === 'string' &&
            value.length <= maxAvatarDataUrlLength &&
            /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
    }

    async function decodeImage(file) {
        if (typeof createImageBitmap === 'function') {
            const bitmap = await createImageBitmap(file);
            return {
                image: bitmap,
                width: bitmap.width,
                height: bitmap.height,
                close: () => bitmap.close()
            };
        }

        const objectUrl = URL.createObjectURL(file);
        try {
            const image = await new Promise((resolve, reject) => {
                const element = new Image();
                element.onload = () => resolve(element);
                element.onerror = () => reject(new Error('Не удалось открыть выбранное изображение.'));
                element.src = objectUrl;
            });
            return {
                image,
                width: image.naturalWidth,
                height: image.naturalHeight,
                close: () => URL.revokeObjectURL(objectUrl)
            };
        } catch (error) {
            URL.revokeObjectURL(objectUrl);
            throw error;
        }
    }

    async function prepareAvatar(file) {
        if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
            throw new Error('Выберите изображение PNG, JPEG или WebP.');
        }
        if (file.size > maxSourceFileBytes) {
            throw new Error('Исходное изображение должно быть меньше 10 МБ.');
        }

        const decoded = await decodeImage(file);
        try {
            if (!decoded.width || !decoded.height || decoded.width * decoded.height > 32000000) {
                throw new Error('Размеры изображения слишком велики.');
            }

            const canvas = document.createElement('canvas');
            canvas.width = 320;
            canvas.height = 320;
            const context = canvas.getContext('2d');
            if (!context) {
                throw new Error('Не удалось обработать изображение.');
            }

            const side = Math.min(decoded.width, decoded.height);
            const sourceX = (decoded.width - side) / 2;
            const sourceY = (decoded.height - side) / 2;
            context.fillStyle = '#19202a';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(decoded.image, sourceX, sourceY, side, side, 0, 0, 320, 320);

            const candidates = [
                canvas.toDataURL('image/webp', 0.82),
                canvas.toDataURL('image/jpeg', 0.78),
                canvas.toDataURL('image/jpeg', 0.62)
            ];
            const avatar = candidates.find(value =>
                isSupportedImageDataUrl(value) && value.length <= maxAvatarDataUrlLength
            );
            if (!avatar) {
                throw new Error('Не удалось уменьшить изображение до допустимого размера. Выберите другое.');
            }
            return avatar;
        } finally {
            decoded.close();
        }
    }

    function setGuestAvatar(dataUrl) {
        showImage('guestAvatar', 'guestAvatarFallback', dataUrl);
        document.getElementById('guestAvatarReset').hidden = !dataUrl;
    }

    function initializeGuestAvatar() {
        const fileInput = document.getElementById('guestAvatarFile');
        const resetButton = document.getElementById('guestAvatarReset');
        let savedAvatar = null;
        try {
            savedAvatar = localStorage.getItem(guestStorageKey);
        } catch {
            setMessage('guestAvatarMessage', 'Браузер запретил локальное сохранение аватара.', true);
        }
        if (savedAvatar && isSupportedImageDataUrl(savedAvatar)) {
            setGuestAvatar(savedAvatar);
        } else if (savedAvatar) {
            let cleared = true;
            try {
                localStorage.removeItem(guestStorageKey);
            } catch {
                cleared = false;
            }
            setMessage(
                'guestAvatarMessage',
                cleared
                    ? 'Сохранённое изображение недоступно и было сброшено.'
                    : 'Сохранённое изображение недоступно; браузер не смог его очистить.',
                true
            );
        }

        fileInput.addEventListener('change', async () => {
            const file = fileInput.files && fileInput.files[0];
            if (!file) {
                return;
            }
            try {
                const avatar = await prepareAvatar(file);
                localStorage.setItem(guestStorageKey, avatar);
                setGuestAvatar(avatar);
                setMessage('guestAvatarMessage', 'Аватар сохранён в этом браузере.', false);
            } catch (error) {
                setMessage('guestAvatarMessage', error.message || 'Не удалось сохранить аватар в браузере.', true);
            } finally {
                fileInput.value = '';
            }
        });

        resetButton.addEventListener('click', () => {
            try {
                localStorage.removeItem(guestStorageKey);
                setGuestAvatar(null);
                setMessage('guestAvatarMessage', 'Пользовательский аватар удалён.', false);
            } catch {
                setMessage('guestAvatarMessage', 'Не удалось удалить аватар из браузера.', true);
            }
        });
    }

    function applySteamProfile(profile) {
        showImage(
            'steamAvatar',
            'steamAvatarFallback',
            profile.customAvatarDataUrl || profile.avatarUrl || null
        );
        document.getElementById('profileAvatarReset').hidden = !profile.customAvatarDataUrl;
    }

    async function saveSteamAvatar(avatarDataUrl) {
        const response = await fetch('/api/me/avatar', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ avatarDataUrl })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Не удалось сохранить аватар.');
        }
        applySteamProfile(data.profile);
    }

    function initializeSteamAvatar() {
        const fileInput = document.getElementById('profileAvatarFile');
        fileInput.addEventListener('change', async () => {
            const file = fileInput.files && fileInput.files[0];
            if (!file) {
                return;
            }
            try {
                const avatar = await prepareAvatar(file);
                await saveSteamAvatar(avatar);
                setMessage('profileAvatarMessage', 'Аватар сохранён в приватном профиле.', false);
            } catch (error) {
                setMessage('profileAvatarMessage', error.message || 'Не удалось сохранить аватар.', true);
            } finally {
                fileInput.value = '';
            }
        });

        document.getElementById('profileAvatarReset').addEventListener('click', async () => {
            try {
                await saveSteamAvatar(null);
                setMessage('profileAvatarMessage', 'Теперь используется аватар Steam.', false);
            } catch (error) {
                setMessage('profileAvatarMessage', error.message || 'Не удалось сбросить аватар.', true);
            }
        });
    }

    initializeGuestAvatar();
    initializeSteamAvatar();
    window.avatarUi = { applySteamProfile };
})();
