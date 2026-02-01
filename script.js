async function measurePing() {
    const startTime = performance.now(); // Используем более точный таймер
    try {
        await fetch(window.location.origin, { 
            method: 'HEAD', 
            cache: 'no-cache',
            mode: 'no-cors' 
        });
        const endTime = performance.now();
        const ping = Math.round(endTime - startTime);
        
        const pingElement = document.getElementById('ping-value');
        pingElement.innerText = `${ping} ms`;
        
        // Визуальная индикация
        if (ping < 50) pingElement.style.color = "#00ff00"; // Отлично
        else if (ping < 150) pingElement.style.color = "#ffff00"; // Терпимо
        else pingElement.style.color = "#ff4444"; // Плохо
    } catch (e) {
        console.log("Ping error:", e);
    }
}
