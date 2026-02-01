const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nicknameInput = document.getElementById('nickname');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let blocks = [];
let selectedColor = '#4CAF50';
const gridSize = 40;

// Выбор цвета
document.querySelectorAll('.block-opt').forEach(opt => {
    opt.addEventListener('click', (e) => {
        document.querySelector('.selected').classList.remove('selected');
        e.target.classList.add('selected');
        selectedColor = e.target.getAttribute('data-color');
    });
});

// Клик для постройки
canvas.addEventListener('mousedown', (e) => {
    const x = Math.floor(e.clientX / gridSize) * gridSize;
    const y = Math.floor(e.clientY / gridSize) * gridSize;
    const nick = nicknameInput.value || 'Аноним';

    // Добавляем блок
    blocks.push({ x, y, color: selectedColor, owner: nick });
    draw();
});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем сетку
    ctx.strokeStyle = '#333';
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Рисуем блоки
    blocks.forEach(block => {
        ctx.fillStyle = block.color;
        ctx.fillRect(block.x, block.y, gridSize, gridSize);
        ctx.strokeStyle = 'white';
        ctx.strokeRect(block.x, block.y, gridSize, gridSize);
        
        // Ник над блоком
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.fillText(block.owner, block.x + 2, block.y + 12);
    });
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
});

draw();
