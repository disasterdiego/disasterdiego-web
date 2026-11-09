// ============================================================
//  ÚNICO ARCHIVO QUE NECESITAS TOCAR PARA CAMBIAR CONTENIDO
// ============================================================

// >>> PON AQUÍ TUS ENLACES REALES <<<
export const SOCIALS = [
  { key: 'instagram', label: 'Instagram', short: 'IG', href: 'https://www.instagram.com/disasterdiego/' },
  { key: 'linkedin', label: 'LinkedIn', short: 'IN', href: 'https://es.linkedin.com/in/disasterdiego' },
  { key: 'mail', label: 'Mail', short: '@', href: 'mailto:diieglez@gmail.com' },
];

// HOME: HOME_IMAGE es la foto de arriba; HOME_UNDER, la que aparece con el trazo.
// >>> Cuando me pases tu foto nueva: HOME_IMAGE = 'assets/home/nueva.jpg' y HOME_SIMULATE = false <<<
export const HOME_UNDER = 'assets/home/under.webp';
export const HOME_IMAGE = 'assets/home/top.webp';
// Mientras falte la foto nueva, la capa de abajo se simula como fotocopia tatuada
export const HOME_SIMULATE = false;

export const WORLDS = [
  { id: 'advertising', label: 'Advertising' },
  { id: 'design', label: 'Design' },
  { id: 'content', label: 'Content' },
  { id: 'about', label: 'About' },
];

/* Bloques disponibles en cada proyecto:
   media(url, {ratio, width, label, sound, loop:[inicio,fin]})
     url: imagen, gif, .mp4, YouTube o 'EMBED:doritos' / 'EMBED:cheetos'
     sound: true -> vídeo con botón de sonido
     loop: [3,11] -> tramo en bucle silencioso, sin controles
   grid(columnas, ratio, [media...])
   heading('TEXTO')
   text('col 1', 'col 2')
   print('left'|'right', media, 'título', 'texto')
*/
const media = (url, o = {}) => ({ k: 'media', url, ...o });
const grid = (cols, ratio, items) => ({ k: 'grid', cols, ratio, items });
const heading = text => ({ k: 'heading', text });
const text = (a, b) => ({ k: 'text', a, b });
const print = (side, m, title, body) => ({ k: 'print', side, media: m, title, body });
const us = id => `https://images.unsplash.com/photo-${id}?q=80&w=1800`;
const CL = 'https://res.cloudinary.com/tb5oj7bf';
const MCD = 'https://upload.wikimedia.org/wikipedia/commons/3/36/McDonald%27s_Golden_Arches.svg';

const advertising = [
  {
    id: 'monidero', title: 'MONIDERO', headerTitle: 'MONIDERO<br>MONOPOLY X MCD', cat: 'Art Direction', date: 'AUG 2026',
    cover: `${CL}/image/upload/f_auto,q_auto/1`, logo: MCD,
    desc1: 'Drop exclusivo de street-fashion nacido de la alianza entre Monopoly y McDonald’s. Una pieza icónica diseñada para guardar las etiquetas del juego.',
    desc2: 'Dirección de arte cinematográfica, texturas táctiles inspiradas en el icónico packaging y una campaña digital bajo el concepto "It’s Lava".',
    info1: 'El reto consistía en transformar una promoción clásica de fast-food en un objeto de deseo dentro de la cultura hypebeast. Así nació MONIDERO: el primer bolso térmico y porta-etiquetas diseñado exclusivamente para coleccionistas de Monopoly.',
    info2: 'Toda la producción visual se rodó buscando un look de estudio contundente, resaltando el relieve del tejido amarillo y el contraste con el morado corporativo de la casilla más codiciada del tablero.',
    role: 'ART DIRECTION & CGI', client: "MCDONALD'S ESPAÑA",
    hero: media(`${CL}/video/upload/v1789131546/completo_monidero.mp4`, { ratio: '16/9', sound: true }),
    blocks: [
      grid(2, '16/9', [
        media(`${CL}/image/upload/f_auto,q_auto/1`),
        media(`${CL}/image/upload/v1792022029/2.png`),
        media(`${CL}/image/upload/v1792022231/3gif-ezgif.com-optimize.gif`),
        media(`${CL}/image/upload/v1792022043/4.png`),
      ]),
      media(`${CL}/image/upload/v1792370090/WEB_DESIGN-12.png`, { ratio: '16/9' }),
      heading('CAMIÓN MONIDERO'),
      media(`${CL}/image/upload/v1792370085/WEB_DESIGN-12.png`, { ratio: '16/9' }),
      media(`${CL}/video/upload/v1792336698/SaveClip.App_AQM_UeVfJINF46vnrUVUN8_FoSJTZKVxuwMQfpks2bKpNvdIZwqm7Vkk36tubfNhxRF4FY_DsXP1zDmt2nJddCSGMW05P1fX5GMDaUY.mp4`, { width: '30%', ratio: '9/16' }),
      media(`${CL}/image/upload/v1792370082/WEB_DESIGN-09.png`, { ratio: '1800/1000' }),
      grid(2, '1/1.02', [
        media(`${CL}/image/upload/v1792370085/WEB_DESIGN-11.png`),
        media(`${CL}/image/upload/v1792370087/WEB_DESIGN-08.png`),
      ]),
      heading('MONOPOLY CAMPAIGN'),
      text('La segunda fase de la campaña trasladó el universo táctil del Monidero a una serie de spots audiovisuales de alto impacto para televisión conectada, redes sociales y pantallas digitales en restaurantes.',
        'Cada pieza explora la tensión por conseguir las propiedades ganadoras antes de que se agoten, utilizando planos macro, diseño sonoro ASMR y transiciones dinámicas.'),
      media('https://www.youtube.com/watch?v=fjTZhvZfXgY', { ratio: '16/9', label: 'Spot principal // Monopoly Moni' }),
      grid(3, '16/9', [
        media('https://www.youtube.com/watch?v=fjTZhvZfXgY', { loop: [3, 11] }),
        media('https://www.youtube.com/watch?v=fjTZhvZfXgY', { loop: [14, 17] }),
        media('https://www.youtube.com/watch?v=fjTZhvZfXgY', { loop: [23, 29] }),
      ]),
    ],
    foot1: 'Campaña producida con estética cinematográfica 16:9, integrando dirección de arte física y postproducción digital.',
    foot2: 'Reconocida por su impacto en audiencia Gen-Z y agotamiento de existencias del merchandising en las primeras 48 horas.',
  },
  {
    id: 'doritos-f1', title: 'DORITOS X F1', headerTitle: 'DORITOS<br>X F1', cat: 'Integrated Campaign', date: 'MAY 2026',
    cover: us('1568605117036-5fe5e7bab0b7'), logo: 'https://upload.wikimedia.org/wikipedia/commons/3/33/F1.svg',
    desc1: 'El snack más crujiente del mundo entra en el paddock de la Fórmula 1. Una campaña global que conecta la telemetría del sonido con la adrenalina del asfalto.',
    desc2: 'Activación 360º en circuitos internacionales, experiencia web interactiva y coleccionables exclusivos a escala.',
    info1: '¿Qué suena más fuerte: un motor V6 híbrido a 15.000 RPM o el crujido de un Doritos en mitad de la clasificación? Bajo esta premisa creamos "Apex Crunch", llevando la marca al corazón de cada Gran Premio.',
    info2: 'Desarrollamos desde el diseño de libreas personalizadas para el show-car oficial hasta un sistema de participación en tiempo real durante las carreras en 12 países.',
    role: 'CREATIVE DIRECTION', client: 'PEPSICO // DORITOS',
    hero: media(us('1568605117036-5fe5e7bab0b7'), { ratio: '16/9', label: 'Foto + concepto' }),
    blocks: [
      media('https://www.w3schools.com/html/mov_bbb.mp4', { ratio: '16/9', label: 'Case study video' }),
      grid(3, '3/4.2', [
        media(us('1541447271487-09612b3f49f7'), { label: 'Poster 01 // Monaco' }),
        media(us('1517524008697-84bbe3c3fd98'), { label: 'Poster 02 // Silverstone' }),
        media(us('1503376780353-7e6692767b70'), { label: 'Poster 03 // Las Vegas' }),
      ]),
      grid(2, '1/1', [
        media(us('1552519507-da3b142c6e3d'), { label: 'Foto real' }),
        media(us('1511632765486-a01980e01a18'), { label: 'Gente prom' }),
      ]),
      media(us('1451187580459-43490279c0fa'), { ratio: '21/7', label: 'Países // Global tour' }),
      media(us('1492684223066-81342ee5ff30'), { ratio: '16/9', label: 'Fan zone' }),
      grid(2, '1/1', [
        media(us('1617788138017-80ad40651399'), { label: '360 coche' }),
        media(us('1621447504864-d8686e12698c'), { label: '360 dorito' }),
      ]),
      media(us('1540039155733-5bb30b53aa14'), { ratio: '16/9', label: 'Paddock' }),
      grid(4, '1/1', [
        media(us('1578269174936-2709b6aeb913'), { label: 'Premio 01' }),
        media(us('1567427017947-545c5f8d16ad'), { label: 'Premio 02' }),
        media(us('1513151233558-d860c5398176'), { label: 'Premio 03' }),
        media(us('1531685250784-7569952593d2'), { label: 'Premio 04' }),
      ]),
      media('EMBED:doritos', { ratio: '9/16', width: '32%', label: 'Interactivo' }),
      media(us('1504868584819-f8e8b4b6d7e3'), { ratio: '16/9', label: 'Board // Overview' }),
    ],
    foot1: 'Integración en directo con datos oficiales de carrera para activar descuentos según adelantamientos en pista.',
    foot2: 'Más de 2.4 millones de interacciones registradas en el microsite durante el primer fin de semana de Gran Premio.',
  },
  {
    id: 'mcd-3am', title: "MCDONALD'S 3.AM", headerTitle: "MCDONALD'S<br>3.AM", cat: 'Film & Print', date: 'NOV 2025',
    cover: us('1509198397868-475647b2a1e5'), logo: MCD,
    desc1: 'A las 3 de la mañana la ciudad cambia sus reglas, pero hay un faro dorado que permanece encendido. Una campaña visual sobre la vida nocturna y los antojos de madrugada.',
    desc2: 'Fotografía en clave baja con ópticas anamórficas Arri, gráfica exterior minimalista y piezas audiovisuales con atmósfera neo-noir.',
    info1: 'A partir de las 3:00 AM no hacen falta titulares explicativos: solo el brillo cálido de un McAuto reflejado sobre el asfalto húmedo. La campaña captura ese instante exacto de regreso a casa.',
    info2: 'Compuesta por un film central, tres cortes documentales de personajes nocturnos (Takes) y una serie de gráficas de exterior donde la luz de las bolsas de papel ilumina la escena.',
    role: 'PHOTOGRAPHY & DIRECTION', client: "MCDONALD'S NIGHTS",
    hero: media(us('1509198397868-475647b2a1e5'), { ratio: '16/9', label: 'Concepto // 3.AM atmosphere' }),
    blocks: [
      media('https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', { ratio: '16/9', label: 'Main film 3.AM' }),
      grid(3, '16/9', [
        media(us('1514525253161-7a46d19cd819'), { label: 'Take 01 // After party' }),
        media(us('1470225620780-dba8ba36b745'), { label: 'Take 02 // Night shift' }),
        media(us('1517248135467-4c7edcad34c4'), { label: 'Take 03 // Drive-thru' }),
      ]),
      print('right', media(us('1550547660-d9450f859349'), { ratio: '16/10', label: 'Print 01 // Golden glow' }), 'BOARD 01 // LUZ CÁLIDA', 'Fotografía disparada sin iluminación artificial externa salvo el propio interior de la bolsa iluminada a 2700K en plena madrugada.'),
      print('left', media(us('1568901346375-23c9450c58cd'), { ratio: '16/10', label: 'Print 02 // Late bite' }), 'BOARD 02 // HALACIÓN', 'Uso de filtros de difusión negros (Black Pro-Mist) sobre lentes Arri para recrear el halo nostálgico de las farolas urbanas a las 3:00 AM.'),
      print('right', media(us('1586190848861-99aa4a171e90'), { ratio: '16/10', label: 'Print 03 // Drive home' }), 'BOARD 03 // SILENCIO', 'Composición limpia sin logotipos invasivos: la silueta del producto y la hora exacta bastan para activar el reconocimiento inmediato.'),
      media(us('1519501025264-65ba15a82390'), { ratio: '16/9', label: 'MKP // Billboard nocturno' }),
      grid(2, '4/3', [
        media(us('1477959858617-67f85cf4f1df'), { label: 'MKP // Mupi urbano 01' }),
        media(us('1480714378408-67cf0d13bc1b'), { label: 'MKP // Mupi urbano 02' }),
      ]),
    ],
    foot1: 'Despliegue en soportes digitales DOOH programados para encenderse únicamente entre las 00:00 y las 05:00 de la madrugada.',
    foot2: 'Incremento del 28% en pedidos nocturnos de McAuto y McDelivery en las zonas metropolitanas activadas.',
  },
  {
    id: 'cheetos-avengers', title: 'CHEETOS X AVENGERS', headerTitle: 'CHEETOS X<br>AVENGERS', cat: 'Brand Activation', date: 'JAN 2026',
    cover: us('1635805737707-575885ab0820'), logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Marvel_Logo.svg',
    desc1: 'El polvo naranja más famoso del mundo ("Cheetle") se convierte en una fuente de energía cósmica dentro del universo de los Vengadores.',
    desc2: 'Ediciones limitadas coleccionables, pósters cinematográficos, spot de lanzamiento y filtro interactivo de realidad aumentada.',
    info1: 'Cualquier fan de Cheetos sabe que es imposible comerlos sin que tus dedos queden cubiertos de polvo naranja. En lugar de ocultarlo, lo convertimos en el superpoder definitivo junto a Marvel Studios.',
    info2: 'Creamos una línea de 8 bolsas de edición coleccionista inspiradas en las Gemas y armaduras de los Avengers, acompañadas de una campaña audiovisual épica.',
    role: 'ART DIRECTION & AR', client: 'CHEETOS x MARVEL',
    hero: media(us('1635805737707-575885ab0820'), { ratio: '16/9', label: 'Hero visual' }),
    blocks: [
      grid(3, '3/4.2', [
        media(us('1608889175123-8ee362201f81'), { label: 'Poster 01 // Iron crunch' }),
        media(us('1608889476561-6242cfdbf622'), { label: 'Poster 02 // Thunder flamin' }),
        media(us('1612036782180-6f0b6cd846fe'), { label: 'Poster 03 // Gamma cheese' }),
      ]),
      media('https://www.w3schools.com/html/mov_bbb.mp4', { ratio: '16/9', label: 'Avengers spot' }),
      grid(4, '1/1.05', ['1563089145-599997674d42', '1550684848-fac1c5b4e853', '1579783902614-a3fb3927b675', '1541701494587-cb58502866ab', '1618005182384-a83a8bd57fbe', '1604871000636-074fa5117945', '1558591710-4b4a1ae0f04d', '1508739773434-c26b3d09e071'].map((id, i) => media(us(id), { label: `Pack 0${i + 1}` }))),
      media(us('1518709268805-4e9042af9f23'), { ratio: '16/9', label: 'Layout // Ecosistema digital' }),
      media('EMBED:cheetos', { ratio: '9/15', width: '52%', label: 'AR experience' }),
    ],
    foot1: 'Escaneando cada bolsa con el móvil, los usuarios desbloqueaban efectos de energía naranja en tiempo real mediante WebAR.',
    foot2: 'Edición especial distribuida en más de 15.000 puntos de venta con expositores iluminados a medida.',
  },
  {
    id: 'luz-neon', title: 'LUZ NEÓN', cat: 'Photography', date: 'AUG 2025',
    cover: us('1492691527719-9d1e07e534b4'),
    desc1: 'Exploración lumínica sobre contraste cromático y reflejos nocturnos en entornos urbanos.',
    desc2: 'Rodado íntegramente con ópticas de cine formato 16:9 buscando texturas orgánicas.',
    hero: media(us('1542051841857-5f90071e7989'), { ratio: '16/9' }),
    blocks: [
      grid(2, '4/5', [media(us('1605810230434-7631ac76ec81')), media(us('1518131672697-613becd4fab5'))]),
      media(us('1485846234645-a62644f84728'), { ratio: '21/9' }),
    ],
  },
  {
    id: 'higgsfield', title: 'HIGGSFIELD', cat: 'Visual Identity', date: 'OCT 2025',
    cover: us('1542051841857-5f90071e7989'),
    desc1: 'Estética de estudio cinematográfico con iluminación dramática y narrativa visual minimalista.',
    desc2: 'Equilibrio entre dirección de arte clásica e innovación digital.',
    hero: media(us('1536440136628-849c177e76a1'), { ratio: '16/9' }),
    blocks: [
      grid(2, '4/5', [media(us('1440404653325-ab127d49abc1')), media(us('1605810230434-7631ac76ec81'))]),
      grid(2, '1/1', [media(us('1485846234645-a62644f84728')), media(us('1535016120720-40c746a51d47'))]),
    ],
  },
  {
    id: 'arri-studio', title: 'ARRI STUDIO', cat: 'CGI & Film', date: 'DEC 2025',
    cover: us('1518131672697-613becd4fab5'),
    desc1: 'Producción técnica enfocada en la fidelidad del color, grano cinematográfico y profundidad de campo.',
    desc2: 'Dirección creativa para campañas de moda y cultura contemporánea.',
    hero: media(us('1485846234645-a62644f84728'), { ratio: '16/9' }),
    blocks: [
      grid(4, '3/4', [media(us('1585647347384-2593bc35786b')), media(us('1536440136628-849c177e76a1')), media(us('1542051841857-5f90071e7989')), media(us('1605810230434-7631ac76ec81'))]),
      media(us('1440404653325-ab127d49abc1'), { ratio: '21/9' }),
    ],
  },
];

const IMG = {
  a: '1618005182384-a83a8bd57fbe', b: '1605810230434-7631ac76ec81', c: '1536440136628-849c177e76a1',
  d: '1492691527719-9d1e07e534b4', e: '1549497538-303791108f94', f: '1440404653325-ab127d49abc1',
  g: '1512486130939-2c4f79935e4f', h: '1481627834876-b7833e8f5570', i: '1502602898657-3e91760cbb34',
  j: '1611162617474-5b21e879e113', k: '1614741118867-65814231498b', l: '1542314831-068cd1dbfeeb',
};
const ph = ids => ids.split('').map(c => us(IMG[c]));
const MONI_H = `${CL}/video/upload/v1789131546/completo_monidero.mp4`;
const MONI_V = `${CL}/video/upload/v1792336698/SaveClip.App_AQM_UeVfJINF46vnrUVUN8_FoSJTZKVxuwMQfpks2bKpNvdIZwqm7Vkk36tubfNhxRF4FY_DsXP1zDmt2nJddCSGMW05P1fX5GMDaUY.mp4`;

// DESIGN: un carrusel por post. slides = fotos y/o .mp4, en orden, formato 4:5.
// desc: una línea que se lee bajo el nombre (en móvil y en el índice de desktop).
// >>> Sustituye los placeholders por tus posts reales <<<
export const DESIGN = [
  { title: 'disasterIDego', tag: 'Identidad', desc: 'Identidad personal: fotocopia, tribal y negativo. Un sistema hecho de errores.', slides: ['disc', 'detail', 'inverted', 'tunnel', 'mask', 'tribal', 'manifesto'].map(n => `assets/id/${n}.webp`) },
  { title: 'Monidero', tag: 'Social', desc: 'Carrusel del drop Monopoly × McDonald’s: producto, textura y campaña.', slides: [`${CL}/image/upload/f_auto,q_auto/1`, `${CL}/image/upload/v1792022029/2.png`, MONI_V, `${CL}/image/upload/v1792022043/4.png`, `${CL}/image/upload/v1792370085/WEB_DESIGN-11.png`, `${CL}/image/upload/v1792370087/WEB_DESIGN-08.png`] },
  { title: 'Post placeholder 01', tag: 'Post', desc: '[Una línea sobre el proyecto: qué es y para quién]', slides: ph('abcdef') },
  { title: 'Post placeholder 02', tag: 'Post', desc: '[Una línea sobre el proyecto: qué es y para quién]', slides: ph('defgh') },
  { title: 'Post placeholder 03', tag: 'Post', desc: '[Una línea sobre el proyecto: qué es y para quién]', slides: ph('hgijkl') },
  { title: 'Post placeholder 04', tag: 'Post', desc: '[Una línea sobre el proyecto: qué es y para quién]', slides: ph('jklbc') },
  ];

// CONTENT: tus vídeos. ratio '9/16' vertical, '16/9' horizontal (o el que sea).
// >>> Sustituye los placeholders por tus vídeos (.mp4 de Cloudinary) <<<
export const CONTENT = [
  { src: MONI_V, ratio: '9/16', title: 'Monidero reel' },
  { src: MONI_H, ratio: '16/9', title: 'Monidero film' },
  { src: us(IMG.b), ratio: '9/16', title: 'Clip 02 (placeholder)' },
  { src: us(IMG.c), ratio: '16/9', title: 'Clip 03 (placeholder)' },
  { src: us(IMG.d), ratio: '16/9', title: 'Clip 04 (placeholder)' },
  { src: us(IMG.e), ratio: '9/16', title: 'Clip 05 (placeholder)' },
  { src: us(IMG.f), ratio: '16/9', title: 'Clip 06 (placeholder)' },
  { src: us(IMG.h), ratio: '9/16', title: 'Clip 07 (placeholder)' },
];

// ABOUT: las marcas salen de tu portfolio; bio, recorrido y premios están POR RELLENAR.
export const ABOUT = {
  bio: 'Disasterdiego es esa persona que me gustaría ser más veces. Un desastre muy mío: la única constante es el fallo.',
  brands: ["McDonald's", 'Monopoly', 'Doritos', 'PepsiCo', 'Formula 1', 'Cheetos', 'Marvel', 'ARRI', 'Higgsfield'],
  // Logos en monocromo; las marcas sin archivo salen como palabra
  logos: {
    "McDonald's": MCD,
    'Formula 1': 'https://upload.wikimedia.org/wikipedia/commons/3/33/F1.svg',
    Marvel: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Marvel_Logo.svg',
  },
  short: 'Director de arte. Publicidad, diseño y contenido para marcas que no se conforman con lo correcto.',
  now: { what: '[Puesto actual]', where: '[Dónde trabajas ahora]' },
  career: [
    { when: '[Año — año]', what: '[Puesto]', where: '[Empresa]' },
    { when: '[Año — año]', what: '[Puesto]', where: '[Empresa]' },
    { when: '[Año — año]', what: '[Puesto]', where: '[Empresa]' },
  ],
  awards: [
    { when: '[Año]', what: '[Premio]', where: '[Organización]' },
    { when: '[Año]', what: '[Premio]', where: '[Organización]' },
  ],
};

advertising.forEach(p => { p.world = 'advertising'; });

export const PROJECTS = { advertising };
export const findProject = id => advertising.find(p => p.id === id);
