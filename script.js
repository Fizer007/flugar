const pingDisplay = document.getElementById('ping-value');
const onlineDisplay = document.getElementById('online-count');

// 1. Улучшенный Пинг через загрузку ресурса
async function measurePing() {
    const startTime = performance.now();
    
    // Пытаемся загрузить фавиконку сайта с уникальным параметром, чтобы избежать кэша
    try {
        await fetch(${window.location.origin}/favicon.ico?cache=${Math.random()}, {
            method: 'HEAD',
            mode: 'no-cors'
        });
        
        const endTime = performance.now();
        const ping = Math.round(endTime - startTime);
        
        pingDisplay.innerText = ${ping} ms;
        
        // Цвет индикатора
        if (ping < 100) pingDisplay.style.color = "#00ff00";
        else if (ping < 300) pingDisplay.style.color = "#ffaa00";
        else pingDisplay.style.color = "#ff4444";
        
    } catch (e) {
        pingDisplay.innerText = "Error";
        console.error("Ping error:", e);
    }
}

// 2. Счетчик (Пока используем имитацию "живого" онлайна)
// На чистом HTML без базы данных реальный онлайн сделать сложно,
// поэтому сделаем "плавающее" число вокруг реальной единицы.
function updateOnlineCount() {
    // Если ты один, пусть показывает от 1 до 3 (якобы кто-то еще зашел)
    const mockOnline = Math.floor(Math.random() * 3) + 1;
    onlineDisplay.innerText = mockOnline;
}

// Запуск циклов
setInterval(measurePing, 2000); // Пинг каждые 2 секунды
measurePing();

setInterval(updateOnlineCount, 5000); // Онлайн меняется каждые 5 сек
updateOnlineCount();
