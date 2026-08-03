# RICCO DECOR & PAISAGISMO — Site Institucional Premium

Site estático premium para **RICCO DECOR & PAISAGISMO**, especializado em paisagismo, decoração de eventos, buquês premium e experiências exclusivas em São Paulo.

> Sofisticação em cada detalhe. ✨

## Identidade visual

- Fundo escuro sofisticado: verde pinheiro `#173d29` e grafite suave `#141414`.
- Detalhes e destaques: dourado fosco / champagne `#c5a059`.
- Textos: off-white `#f4f4f0`.
- Tipografia: Cormorant Garamond (títulos) + Inter (texto).

## Tecnologias

- HTML5
- CSS3
- Tailwind CSS via CDN
- JavaScript ES6+
- GSAP + ScrollTrigger
- Lenis
- Swiper (carrosséis com autoplay)
- GLightbox
- SplitType
- Lucide Icons
- Google Fonts

Não utiliza React, Vue ou Angular.

## Estrutura

```text
RiccoAjisafe/
├── assets/
│   ├── fonts/
│   ├── icons/
│   └── images/
├── css/
├── data/
├── js/
├── index.html
├── styles.css
├── script.js
├── README.md
├── robots.txt
├── sitemap.xml
└── PROMPT.md.txt
```

## Como abrir localmente

1. Abra a pasta do projeto.
2. Dê dois cliques em `index.html`.
3. O site abrirá no navegador.

Como bibliotecas e imagens estão via CDN, é necessário estar conectado à internet para ver todos os recursos visuais.

## Como editar dados principais

Abra `script.js` e edite o objeto `siteConfig`:

```js
const siteConfig = {
  brand: "RICCO DECOR & PAISAGISMO",
  slogan: "Sofisticação em cada detalhe. ✨ ...",
  whatsappNumber: "5511954774007",
  email: "riccodecorepaisagismo@gmail.com",
  phone: "+55 (11) 95477-4007",
  location: "Rua Antônia Soreval, 140 · Aricanduva · São Paulo - SP",
  instagram: "https://www.instagram.com/riccodecorepaisagismo",
  formEndpoint: "https://formsubmit.co/ajax/riccodecorepaisagismo@gmail.com"
};
```

O número de WhatsApp deve ficar apenas com código do país, DDD e número:

```text
5511954774007
```

Todos os botões de WhatsApp do site usam esse número com mensagem personalizada.

## Portfólio e cases reais

No `script.js`, o array `portfolio` contém os cases:

- Casamento Boho Chic
- Uma Noite nas Arábias
- Clube Carvão Eventos (buquês premium e design floral ao ar livre)
- Instalações Aéreas / Ambientes Fechados

Para adicionar um novo case:

```js
const portfolio = [
  {
    title: "Nome do projeto",
    category: "Categoria",
    description: "Descrição do projeto",
    image: "caminho-da-imagem.jpg",
    client: "Cliente",
    local: "Local",
    year: "2026"
  }
];
```

## Galeria e portfólio em carrossel automático

As seções de portfólio e galeria usam **Swiper com autoplay** (avançam sozinhas em loop).

O usuário pode:

- Arrastar os slides
- Usar as setas de navegação
- Pausar/retomar o autoplay pelo botão central
- Abrir cada imagem da galeria no lightbox

## Como trocar imagens

O projeto usa imagens demonstrativas do Unsplash.

Para usar fotos reais:

1. Coloque as imagens em `assets/images/`.
2. Otimize antes de publicar, preferencialmente em `.webp`.
3. No `script.js`, troque o campo `image` dos arrays `portfolio`, `gallery`, `instagramPosts` e `testimonials`.

Também atualize no `index.html`:

- imagem do hero
- imagem da seção Sobre
- imagem Open Graph
- JSON-LD, se necessário

## Como adicionar serviços, depoimentos e FAQ

No `script.js`:

- `services` — lista de serviços (ícones usam nomes da Lucide Icons: https://lucide.dev/icons/)
- `testimonials` — depoimentos com foto, nome e papel
- `faq` — perguntas e respostas do accordion

Todos são renderizados automaticamente ao adicionar novos objetos.

## Como alterar cores

Abra `styles.css` e edite as variáveis:

```css
:root {
  --forest-deep: #173d29;
  --gold: #c5a059;
  --gold-soft: #e0c27f;
  --off-white: #f4f4f0;
  --graphite: #141414;
}
```

## Como alterar tipografia

No `index.html`, troque o link do Google Fonts.

No `styles.css`, altere:

```css
--font-title: "Cormorant Garamond", Georgia, serif;
--font-body: "Inter", system-ui, sans-serif;
```

## Formulário e contato

O formulário possui:

- máscara de telefone brasileiro
- validação local
- mensagens de erro acessíveis
- preparação automática de mensagem para WhatsApp

Ao enviar, os dados são encaminhados para o e-mail cadastrado via **FormSubmit**.

Observação: na primeira vez, o FormSubmit envia um e-mail de confirmação para ativar o recebimento. Depois disso, os formulários chegam normalmente.

## Melhorias aplicadas

- **Favicon premium**: monograma dourado com folha e anel, alinhado à identidade.
- **CTA "Agendar visita técnica"**: botão no hero e na seção de contato, abrindo o WhatsApp com mensagem pronta.
- **Mapa no rodapé**: mapa da localização (Rua Antônia Soreval, 140) carregado com lazy loading.
- **Scrollspy**: o menu destaca a seção ativa enquanto o visitante rola a página.
- **Voltar ao topo**: botão flutuante que aparece após rolar e leva ao topo suavemente.
- **WhatsApp com pulso**: animação sutil de pulso no botão flutuante para chamar atenção.

## SEO antes de publicar

Antes de colocar no ar, atualize:

- `canonical` em `index.html`
- Open Graph URL e imagem
- Twitter Card
- JSON-LD
- `robots.txt`
- `sitemap.xml`
- telefone, WhatsApp, e-mail e Instagram reais
- imagens reais otimizadas

## Publicação

Qualquer hospedagem estática serve:

- Netlify
- Vercel
- GitHub Pages
- Hostinger
- hospedagem tradicional via FTP

Basta enviar todos os arquivos da pasta.

## Checklist de qualidade

- [ ] Trocar placeholders por dados reais.
- [ ] Trocar imagens demonstrativas por fotos reais otimizadas em WebP.
- [ ] Atualizar telefone e WhatsApp.
- [ ] Atualizar e-mail.
- [ ] Atualizar Instagram.
- [ ] Confirmar ativação do FormSubmit.
- [ ] Atualizar canonical.
- [ ] Atualizar sitemap.
- [ ] Atualizar JSON-LD.
- [ ] Testar formulário.
- [ ] Testar WhatsApp.
- [ ] Testar menu mobile.
- [ ] Testar carrosséis com autoplay.
- [ ] Testar galeria e lightbox.
- [ ] Testar navegação por teclado.
- [ ] Rodar Lighthouse no Chrome DevTools.

## Metas recomendadas no Lighthouse

- Performance acima de 90
- SEO acima de 95
- Accessibility acima de 95
- Best Practices acima de 95
