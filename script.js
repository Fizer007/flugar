// --- НАСТРОЙКИ SUPABASE ---
const SUPABASE_URL = 'https://your-project.supabase.co'; // ТВОЙ URL
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // ТВОЙ KEY
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nickInput = document.getElementById('nickname');
const gridSize = 40;
let blocks = [];
let selectedColor = '#4CAF50';

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Выбор цвета
document.querySelectorAll('.block-opt').forEach(opt => {
    opt.addEventListener('click', (e) => {
        document.querySelector('.selected').classList.remove('selected');
        e.target.classList.add('selected');
        selectedColor = e.target.getAttribute('data-color');
    });
});

// Загрузка всех блоков при старте
async function init() {
    const { data } = await supabaseClient.from('blocks').select('*');
    if (data) blocks = data;
    draw();
}

// Слушаем онлайн изменения
supabaseClient
    .channel('public:blocks')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'blocks' }, () => {
        // Просто перезагружаем всё для простоты синхронизации
        init();
    })
    .subscribe();

// Рисование
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Сетка
    ctx.strokeStyle = '#222';
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Блоки
    blocks.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, gridSize, gridSize);
        // Тень ника
        ctx.fillStyle = 'white';
        ctx.font = '10px sans-serif';
        ctx.fillText(b.owner || '?', b.x + 2, b.y + 12);
    });
}

// Ставим блок (ЛКМ)
canvas.addEventListener('mousedown', async (e) => {
    const x = Math.floor(e.clientX / gridSize) * gridSize;
    const y = Math.floor(e.clientY / gridSize) * gridSize;
    const nick = nickInput.value || 'Player';

    if (e.button === 0) { // Левая кнопка
        await supabaseClient.from('blocks').insert([{ x, y, color: selectedColor, owner: nick }]);
    } else if (e.button === 2) { // Правая кнопка (удалить)
        await supabaseClient.from('blocks').delete().match({ x, y });
    }
});

// Отключаем меню правой кнопки мыши
canvas.oncontextmenu = (e) => e.preventDefault();

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
});

init();
