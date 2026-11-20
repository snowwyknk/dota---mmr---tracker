(() => {
    const feedbackAddress = 'pudgepro22@gmail.com';
    const form = document.getElementById('feedbackForm');
    const status = document.getElementById('feedbackStatus');

    form.addEventListener('submit', event => {
        event.preventDefault();
        const name = document.getElementById('feedbackName').value.trim();
        const message = document.getElementById('feedbackMessage').value.trim();
        if (!message) {
            status.textContent = 'Напиши сообщение перед отправкой.';
            return;
        }

        const body = name ? `От: ${name}\n\n${message}` : message;
        const mailto = new URL(`mailto:${feedbackAddress}`);
        mailto.searchParams.set('subject', 'Отзыв о Dota 2 Tracker');
        mailto.searchParams.set('body', body);
        status.textContent = 'Открываю почтовое приложение…';
        window.location.href = mailto.href;
    });
})();
