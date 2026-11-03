// Piezas interactivas de Doritos y Cheetos. Solo se inyectan al entrar en pantalla.
const font = '<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">';

export const EMBEDS = {
  doritos: `<!doctype html><html><head>${font}<style>
    body{margin:0;background:#08080a;color:#fff;font-family:'Space Mono',monospace;display:flex;flex-direction:column;align-items:center;justify-content:space-between;height:100vh;padding:24px;box-sizing:border-box;overflow:hidden}
    .top{width:100%;display:flex;justify-content:space-between;gap:12px;font-size:10px;color:#ff3e00;letter-spacing:1px}
    .gauge{width:180px;height:180px;border:2px solid #222;border-top:3px solid #ff3e00;border-radius:50%;animation:spin 3s infinite linear}
    @keyframes spin{to{transform:rotate(360deg)}}
    .wrap{position:relative;width:180px;height:180px}
    .speed-wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
    .speed{font-size:36px;font-weight:700}.unit{font-size:10px;color:#888}
    .btn{background:#ff3e00;color:#000;border:0;padding:12px 18px;font:700 11px 'Space Mono',monospace;cursor:pointer;border-radius:2px;text-transform:uppercase;width:100%}
    .btn:hover{background:#fff}
    </style></head><body>
    <div class="top"><span>DORITOS F1 TELEMETRY</span><span>LIVE // 360º</span></div>
    <div class="wrap"><div class="gauge"></div><div class="speed-wrap"><div class="speed" id="spd">312</div><div class="unit">KM/H CRUNCH</div></div></div>
    <button class="btn" onclick="document.getElementById('spd').innerText=Math.floor(290+Math.random()*55)">BOOST APEX CRUNCH</button>
    </body></html>`,
  cheetos: `<!doctype html><html><head>${font}<style>
    body{margin:0;background:radial-gradient(circle at center,#2a0f00 0%,#050505 100%);color:#fff;font-family:'Space Mono',monospace;display:flex;flex-direction:column;align-items:center;justify-content:space-between;height:100vh;padding:30px;box-sizing:border-box;overflow:hidden}
    .hdr{width:100%;display:flex;justify-content:space-between;gap:12px;font-size:11px;color:#ff6a00}
    .orb{width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,#ff8800,#ff2200,transparent);box-shadow:0 0 50px #ff5500;transition:transform .3s,box-shadow .3s;cursor:pointer;display:flex;align-items:center;justify-content:center;text-align:center;font-size:11px;font-weight:700}
    .orb:hover{transform:scale(1.15);box-shadow:0 0 80px #ffaa00}
    .ftr{font-size:11px;color:#aaa;text-align:center}
    </style></head><body>
    <div class="hdr"><span>STARK x CHESTER LABS</span><span>AR FILTER v2.4</span></div>
    <div class="orb" onclick="this.style.transform='scale(1.35)';setTimeout(()=>this.style.transform='',250)">TAP TO UNLEASH<br>CHEETLE POWER</div>
    <div class="ftr">INTERACTIVE AR PROTOTYPE // AVENGERS CAMPUS</div>
    </body></html>`,
};
