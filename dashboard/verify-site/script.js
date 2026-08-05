// Проверяем, авторизован ли пользователь
async function checkAuth() {
    try {
        const res = await fetch('/api/me');
        const data = await res.json();
        
        if (data.user) {
            document.querySelector('.footer').innerHTML = `
                <p style="color: #8888aa;">👤 <strong>${data.user.username}</strong></p>
                <button id="verifyBtn" disabled style="width:100%;background:#7c5cfc;color:#fff;border:none;padding:14px;border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer;opacity:0.4;">✅ Подтвердить</button>
            `;
            // Пересоздаём обработчики
            initVerify();
        }
    } catch (e) {
        console.log('Не авторизован');
    }
}

function initVerify() {
    const checkbox = document.getElementById('agree');
    const btn = document.getElementById('verifyBtn');
    const status = document.getElementById('status');

    if (!checkbox || !btn) return;

    checkbox.addEventListener('change', () => {
        btn.disabled = !checkbox.checked;
    });

    btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = '⏳ Отправка...';
        status.className = 'loading';
        status.textContent = '⏳ Подтверждение...';

        try {
            const res = await fetch('/api/verify-agree', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await res.json();

            if (data.success) {
                status.className = 'success';
                status.textContent = '✅ ' + data.message;
                btn.textContent = '✅ Готово!';
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 2000);
            } else {
                status.className = 'error';
                status.textContent = '❌ ' + data.error;
                btn.disabled = false;
                btn.textContent = '✅ Подтвердить';
            }
        } catch (error) {
            status.className = 'error';
            status.textContent = '❌ Ошибка соединения';
            btn.disabled = false;
            btn.textContent = '✅ Подтвердить';
        }
    });
}

// Запускаем
checkAuth();
initVerify();