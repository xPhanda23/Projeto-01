// Define o nome do cache e os arquivos que queremos salvar
const CACHE_NAME = 'lista-compras-v1';
const URLS_TO_CACHE = [
  '.',
  'lista.html',
  'manifest.json',
  'icon-192x192.png',
  'icon-512x512.png'
];

// Evento 'install': é acionado quando o service worker é instalado pela primeira vez.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(URLS_TO_CACHE); // Adiciona todos os nossos arquivos ao cache
      })
  );
});

// Evento 'fetch': é acionado toda vez que o app faz uma requisição (ex: carregar a página, uma imagem).
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Se encontrarmos a requisição no cache, retornamos a versão salva.
        // Se não, fazemos a requisição à rede normalmente.
        return response || fetch(event.request);
      })
  );
});