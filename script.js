@ -0,0 +1,13 @@
window.onload = () => {
    console.log("GIF проигрыватель готов!");
    
    const gif = document.getElementById('gif-player');
    
    // Если нужно перезагрузить гифку программно (хак для сброса анимации)
    gif.onclick = () => {
        const currentSrc = gif.src;
        gif.src = "";
        gif.src = currentSrc;
        console.log("Анимация перезапущена");
    };
};
