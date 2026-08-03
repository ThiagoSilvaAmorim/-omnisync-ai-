const siteConfig = {
  brand: "RICCO DECOR & PAISAGISMO",
  slogan: "Sofisticação em cada detalhe. ✨ Projetos de paisagismo, decoração de eventos e experiências exclusivas para quem valoriza beleza, elegância e personalidade. 🌿",
  whatsappNumber: "5511954774007",
  email: "riccodecorepaisagismo@gmail.com",
  phone: "+55 (11) 95477-4007",
  location: "Rua Antônia Soreval, 140 · Aricanduva · São Paulo - SP",
  addressLink: "https://maps.google.com/?q=Rua+Ant%C3%B4nia+Soreval,+140,+Aricanduva,+S%C3%A3o+Paulo+-+SP,+03407-100",
  instagram: "https://www.instagram.com/riccodecorepaisagismo",
  instagramHandle: "@riccodecorepaisagismo",
  formEndpoint: "https://formsubmit.co/ajax/riccodecorepaisagismo@gmail.com",
  defaultMessage: "Olá, RICCO DECOR & PAISAGISMO! Gostaria de solicitar um orçamento de paisagismo ou decoração de evento.",
  visitMessage: "Olá, RICCO DECOR & PAISAGISMO! Gostaria de agendar uma visita técnica para meu evento."
};

const timeline = [
  { year: "01", title: "Escuta e intenção", text: "Entendimento do evento, estilo, local, logística e atmosfera desejada." },
  { year: "02", title: "Curadoria botânica", text: "Seleção de espécies, volumes, texturas e paleta natural para cada ambiente." },
  { year: "03", title: "Execução premium", text: "Montagem cuidadosa, acompanhamento e entrega com acabamento impecável." }
];

const services = [
  { icon: "flower-2", title: "Decoração de eventos", text: "Ambientação sofisticada para casamentos, festas sociais e ocasiões inesquecíveis." },
  { icon: "leaf", title: "Paisagismo premium", text: "Projetos de paisagismo com presença natural, texturas e composição autoral." },
  { icon: "sparkles", title: "Buquês e design floral", text: "Buquês premium e arranjos com proporção, textura e acabamento sofisticado." },
  { icon: "building-2", title: "Eventos corporativos", text: "Ambientação natural para lançamentos, convenções e encontros executivos." },
  { icon: "layout-panel-top", title: "Instalações aéreas", text: "Estruturas botânicas suspensas que criam presença e surpresa no ambiente." },
  { icon: "gem", title: "Experiências exclusivas", text: "Projetos sob medida para quem valoriza beleza, elegância e personalidade." }
];

const portfolio = [
  {
    title: "Casamento Boho Chic",
    category: "Casamento",
    description: "Ambientação autêntica com folhagens, flores do campo e uma atmosfera leve, romântica e cheia de personalidade.",
    image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=82",
    client: "Case real",
    local: "São Paulo - SP",
    year: "2026"
  },
  {
    title: "Uma Noite nas Arábias",
    category: "Evento social",
    description: "Tema inspirado no oriente: iluminação dourada, tecidos, elementos botânicos e uma experiência sensorial marcante.",
    image: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1400&q=82",
    client: "Case real",
    local: "São Paulo - SP",
    year: "2026"
  },
  {
    title: "Clube Carvão Eventos",
    category: "Design floral ao ar livre",
    description: "Buquês premium e design floral ao ar livre para uma celebração com luz natural, elegância e frescor.",
    image: "https://images.unsplash.com/photo-1455659817273-f96807779a8a?auto=format&fit=crop&w=1400&q=82",
    client: "Case real",
    local: "São Paulo - SP",
    year: "2026"
  },
  {
    title: "Instalações Aéreas",
    category: "Ambientes fechados",
    description: "Estruturas botânicas suspensas e ambientes fechados transformados em cenários imersivos e elegantes.",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=82",
    client: "Case real",
    local: "São Paulo - SP",
    year: "2025"
  }
];

const gallery = [
  { title: "Mesa orgânica", image: "https://images.unsplash.com/photo-1523438097201-d4a25c1db3c4?auto=format&fit=crop&w=1400&q=82", alt: "Mesa posta com folhagens e arranjos sofisticados" },
  { title: "Luz e folhagem", image: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1400&q=82", alt: "Detalhe de folhagens em evento com luz suave" },
  { title: "Cerimônia natural", image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=82", alt: "Cerimônia de casamento ao ar livre" },
  { title: "Texturas verdes", image: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1400&q=82", alt: "Composição de plantas e texturas naturais" },
  { title: "Entrada premium", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=82", alt: "Ambiente de evento com iluminação elegante" },
  { title: "Arranjo autoral", image: "https://images.unsplash.com/photo-1455659817273-f96807779a8a?auto=format&fit=crop&w=1400&q=82", alt: "Arranjo floral sofisticado" }
];

const processSteps = [
  { title: "Contato", text: "Você compartilha data, local, convidados e intenção estética." },
  { title: "Visita", text: "Análise do espaço, circulação, luz, montagem e pontos de impacto." },
  { title: "Projeto", text: "Conceito visual, seleção botânica e proposta personalizada." },
  { title: "Execução", text: "Produção, logística, montagem e acompanhamento técnico." },
  { title: "Entrega", text: "Finalização refinada e desmontagem no fluxo combinado." }
];

const testimonials = [
  { name: "Marina A.", role: "Noiva", text: "O paisagismo mudou completamente a energia do casamento. Tudo parecia natural, sofisticado e muito nosso.", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80" },
  { name: "Clara M.", role: "Cerimonialista", text: "Equipe organizada, sensível ao briefing e extremamente cuidadosa com montagem e acabamento.", image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=160&q=80" },
  { name: "Rafael P.", role: "Marketing corporativo", text: "A ambientação trouxe elegância ao nosso jantar de relacionamento sem competir com a identidade da marca.", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80" }
];

const faq = [
  { q: "Com quanto tempo de antecedência devo solicitar orçamento?", a: "Para eventos grandes, o ideal é iniciar a conversa com 60 a 120 dias de antecedência. Para produções menores, avaliamos a disponibilidade caso a caso." },
  { q: "Vocês atendem apenas São Paulo?", a: "A base fica em São Paulo, Aricanduva, mas projetos em outras regiões podem ser avaliados conforme escopo, logística e agenda." },
  { q: "O projeto é personalizado?", a: "Sim. Cada proposta considera local, arquitetura, luz, perfil dos convidados, estilo do evento e operação de montagem." },
  { q: "O formulário envia a mensagem automaticamente?", a: "O formulário valida os dados, prepara um atendimento personalizado e abre o WhatsApp com a mensagem pronta. Para envio por e-mail, usamos o FormSubmit — a primeira mensagem exige confirmar o e-mail uma única vez." },
  { q: "Vocês fazem buquês e design floral?", a: "Sim. Trabalhamos com buquês premium, arranjos e design floral para casamentos, eventos ao ar livre e ambientes fechados." }
];

const instagramPosts = [
  { image: gallery[0].image, text: "Camadas naturais para mesas de recepção." },
  { image: gallery[1].image, text: "Folhagens, luz e ritmo visual." },
  { image: gallery[2].image, text: "Cerimônias com atmosfera orgânica." },
  { image: gallery[5].image, text: "Arranjos com assinatura e proporção." }
];

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

function qsa(selector, scope = document) {
  return [...scope.querySelectorAll(selector)];
}

function buildWhatsappUrl(message) {
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function icon(name) {
  return `<i data-lucide="${name}" aria-hidden="true"></i>`;
}

function initLoader() {
  const loader = qs("#loader");
  if (!loader) return;

  const closeLoader = () => {
    if (window.gsap && !prefersReducedMotion) {
      gsap.to(loader, { opacity: 0, duration: 0.7, ease: "power3.out", onComplete: () => loader.remove() });
      gsap.from(".hero .reveal-item", { y: 34, opacity: 0, duration: 0.9, stagger: 0.12, ease: "power3.out", delay: 0.2 });
    } else {
      loader.remove();
    }
  };

  window.setTimeout(closeLoader, 850);
}

function renderTimeline() {
  const target = qs("#aboutTimeline");
  if (!target) return;
  target.innerHTML = timeline.map(item => `
    <article class="timeline-item reveal-item">
      <span class="timeline-item__year">${item.year}</span>
      <div><h3>${item.title}</h3><p>${item.text}</p></div>
    </article>
  `).join("");
}

function renderServices() {
  const target = qs("#servicesGrid");
  if (!target) return;
  target.innerHTML = services.map(service => `
    <article class="service-card reveal-item">
      <div class="card-icon">${icon(service.icon)}</div>
      <h3>${service.title}</h3>
      <p>${service.text}</p>
      <a class="card-link" href="https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(`Olá, RICCO! Gostaria de saber mais sobre o serviço de ${service.title.toLowerCase()}.`)}" target="_blank" rel="noopener">Saiba mais ${icon("arrow-up-right")}</a>
    </article>
  `).join("");
}

function renderPortfolio() {
  const target = qs("#portfolioWrapper");
  if (!target) return;
  target.innerHTML = portfolio.map((project, index) => `
    <article class="swiper-slide">
      <div class="portfolio-card">
        <img src="${project.image}" alt="${project.title}" loading="lazy" decoding="async">
        <div class="portfolio-card__content">
          <p class="eyebrow">${project.category}</p>
          <h3>${project.title}</h3>
          <p>${project.description}</p>
          <button class="portfolio-card__button" type="button" data-project-index="${index}">Ver projeto ${icon("arrow-up-right")}</button>
        </div>
      </div>
    </article>
  `).join("");
}

function renderGallery() {
  const target = qs("#galleryWrapper");
  if (!target) return;
  target.innerHTML = gallery.map(item => `
    <div class="swiper-slide">
      <a class="gallery-card glightbox" href="${item.image}" data-gallery="ricco-gallery" data-title="${item.title}" aria-label="Abrir imagem: ${item.title}">
        <img src="${item.image}" alt="${item.alt}" loading="lazy" decoding="async">
        <span class="gallery-card__caption">${item.title}</span>
      </a>
    </div>
  `).join("");
}

function renderProcess() {
  const target = qs("#processLine");
  if (!target) return;
  target.innerHTML = processSteps.map((step, index) => `
    <article class="process-card reveal-item">
      <span class="process-card__number">${String(index + 1).padStart(2, "0")}</span>
      <h3>${step.title}</h3>
      <p>${step.text}</p>
    </article>
  `).join("");
}

function renderTestimonials() {
  const target = qs("#testimonialWrapper");
  if (!target) return;
  target.innerHTML = testimonials.map(item => `
    <article class="swiper-slide">
      <div class="testimonial-card">
        <div class="stars" aria-label="5 estrelas">${"★".repeat(5)}</div>
        <p>“${item.text}”</p>
        <div class="testimonial-author">
          <img src="${item.image}" alt="${item.name}" loading="lazy" decoding="async">
          <div><strong>${item.name}</strong><br><span>${item.role}</span></div>
        </div>
      </div>
    </article>
  `).join("");
}

function renderFAQ() {
  const target = qs("#faqAccordion");
  if (!target) return;
  target.innerHTML = faq.map((item, index) => {
    const panelId = `faq-panel-${index}`;
    return `
      <article class="accordion-item reveal-item">
        <button class="accordion-trigger" type="button" aria-expanded="false" aria-controls="${panelId}">
          <span>${item.q}</span>${icon("plus")}
        </button>
        <div class="accordion-panel" id="${panelId}">
          <div><p>${item.a}</p></div>
        </div>
      </article>
    `;
  }).join("");
}

function renderInstagram() {
  const target = qs("#instagramGrid");
  if (!target) return;
  target.innerHTML = instagramPosts.map(post => `
    <article class="instagram-card reveal-item">
      <img src="${post.image}" alt="${post.text}" loading="lazy" decoding="async">
      <p>${post.text}</p>
    </article>
  `).join("");
}

function renderContact() {
  const contact = qs("#contactList");
  const footer = qs("#footerContact");
  const socials = qs("#socialLinks");
  const year = qs("#currentYear");
  const whatsapp = qs("#whatsappFloat");
  const instagram = qs("#instagramLink");

  if (contact) {
    contact.innerHTML = `
      <a href="https://wa.me/${siteConfig.whatsappNumber}" target="_blank" rel="noopener">${icon("message-circle")} ${siteConfig.phone} (WhatsApp)</a>
      <a href="mailto:${siteConfig.email}">${icon("mail")} ${siteConfig.email}</a>
      <a href="${siteConfig.addressLink}" target="_blank" rel="noopener">${icon("map-pin")} ${siteConfig.location}</a>
      <a href="${siteConfig.instagram}" target="_blank" rel="noopener">${icon("instagram")} ${siteConfig.instagramHandle}</a>
    `;
  }

  if (footer) {
    footer.innerHTML = `
      <li><a href="https://wa.me/${siteConfig.whatsappNumber}" target="_blank" rel="noopener">${siteConfig.phone}</a></li>
      <li><a href="mailto:${siteConfig.email}">${siteConfig.email}</a></li>
      <li><a href="${siteConfig.addressLink}" target="_blank" rel="noopener">Aricanduva, São Paulo - SP</a></li>
    `;
  }

  if (socials) {
    socials.innerHTML = `
      <a href="${siteConfig.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${icon("instagram")}</a>
      <a href="https://wa.me/${siteConfig.whatsappNumber}" target="_blank" rel="noopener" aria-label="WhatsApp">${icon("message-circle")}</a>
      <a href="mailto:${siteConfig.email}" aria-label="E-mail">${icon("mail")}</a>
    `;
  }

  if (year) year.textContent = new Date().getFullYear();
  if (whatsapp) whatsapp.href = buildWhatsappUrl(siteConfig.defaultMessage);
  if (instagram) instagram.href = siteConfig.instagram;
}

function initLucideIcons() {
  if (window.lucide) lucide.createIcons();
}

function initNavbar() {
  const header = qs("#siteHeader");
  const progress = qs("#scrollProgress");
  const update = () => {
    const scrolled = window.scrollY > 24;
    if (header) header.classList.toggle("is-scrolled", scrolled);
    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = max > 0 ? `${(window.scrollY / max) * 100}%` : "0%";
    }
  };

  update();
  window.addEventListener("scroll", throttle(update, 80), { passive: true });
}

function initMobileMenu() {
  const toggle = qs("#navToggle");
  const menu = qs("#primaryMenu");
  if (!toggle || !menu) return;

  const close = () => {
    toggle.classList.remove("is-active");
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  };

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.classList.toggle("is-active", !isOpen);
    menu.classList.toggle("is-open", !isOpen);
    toggle.setAttribute("aria-expanded", String(!isOpen));
    document.body.classList.toggle("menu-open", !isOpen);
  });

  qsa("a", menu).forEach(link => link.addEventListener("click", close));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") close();
  });
}

function initScrollspy() {
  const links = qsa(".nav-menu a[href^='#']");
  if (!links.length) return;

  const map = {};
  links.forEach(link => {
    const target = qs(link.getAttribute("href"));
    if (target) map[target.id] = link;
  });

  const sections = Object.keys(map).map(id => qs(`#${id}`)).filter(Boolean);
  if (!sections.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(link => link.classList.remove("is-active"));
        const link = map[entry.target.id];
        if (link) link.classList.add("is-active");
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });

  sections.forEach(section => observer.observe(section));
}

function initBackToTop() {
  const button = qs("#backToTop");
  if (!button) return;

  const toggle = () => button.classList.toggle("is-visible", window.scrollY > 600);
  window.addEventListener("scroll", throttle(toggle, 120), { passive: true });
  toggle();

  button.addEventListener("click", () => {
    const lenis = window.__lenis;
    if (lenis) {
      lenis.scrollTo(0);
    } else {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    }
  });
}

function initSmoothScroll() {
  const lenis = window.Lenis && !prefersReducedMotion ? new Lenis({ duration: 1.08, smoothWheel: true }) : null;
  window.__lenis = lenis;

  if (lenis) {
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  qsa('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", event => {
      const target = qs(anchor.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -10 });
      else target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  });
}

function initSliders() {
  if (!window.Swiper) return;

  const autoplayConfig = {
    delay: 3800,
    disableOnInteraction: false,
    pauseOnMouseEnter: true
  };

  const gallerySwiper = new Swiper(".gallery-swiper", {
    slidesPerView: 1,
    spaceBetween: 16,
    centeredSlides: true,
    loop: true,
    speed: 900,
    grabCursor: true,
    autoplay: prefersReducedMotion ? false : autoplayConfig,
    pagination: { el: '[data-slider-pagination="gallery"]', clickable: true },
    navigation: { nextEl: '[data-slider-next="gallery"]', prevEl: '[data-slider-prev="gallery"]' },
    breakpoints: {
      768: { slidesPerView: 1.6, spaceBetween: 22 },
      1180: { slidesPerView: 2.2, spaceBetween: 28 }
    }
  });

  const portfolioSwiper = new Swiper(".portfolio-swiper", {
    slidesPerView: 1,
    spaceBetween: 16,
    centeredSlides: true,
    loop: true,
    speed: 900,
    grabCursor: true,
    autoplay: prefersReducedMotion ? false : autoplayConfig,
    pagination: { el: '[data-slider-pagination="portfolio"]', clickable: true },
    navigation: { nextEl: '[data-slider-next="portfolio"]', prevEl: '[data-slider-prev="portfolio"]' },
    breakpoints: {
      768: { slidesPerView: 1.5, spaceBetween: 22 },
      1180: { slidesPerView: 2, spaceBetween: 28 }
    }
  });

  new Swiper(".testimonial-swiper", {
    slidesPerView: 1,
    spaceBetween: 18,
    loop: true,
    speed: 800,
    autoplay: prefersReducedMotion ? false : autoplayConfig,
    pagination: { el: ".testimonial-pagination", clickable: true },
    breakpoints: { 860: { slidesPerView: 2 }, 1180: { slidesPerView: 3 } }
  });

  const pairs = [
    { key: "portfolio", swiper: portfolioSwiper },
    { key: "gallery", swiper: gallerySwiper }
  ];

  pairs.forEach(({ key, swiper }) => {
    const toggleButton = qs(`[data-slider-toggle="${key}"]`);
    if (!toggleButton) return;

    const syncIcon = () => {
      const running = !swiper.autoplay?.running;
      toggleButton.innerHTML = icon(running ? "pause" : "play");
      toggleButton.setAttribute("aria-label", running ? "Pausar carrossel" : "Reproduzir carrossel");
      toggleButton.classList.toggle("is-paused", !running);
    };

    toggleButton.addEventListener("click", () => {
      if (swiper.autoplay?.running) {
        swiper.autoplay.stop();
      } else {
        swiper.autoplay.start();
      }
      syncIcon();
    });
  });
}

function initLightbox() {
  if (window.GLightbox) {
    GLightbox({
      selector: ".glightbox",
      touchNavigation: true,
      loop: true,
      zoomable: true,
      keyboardNavigation: true,
      descPosition: "bottom"
    });
  }
}

function initFAQ() {
  qsa(".accordion-trigger").forEach(button => {
    button.addEventListener("click", () => {
      const panel = qs(`#${button.getAttribute("aria-controls")}`);
      const isOpen = button.getAttribute("aria-expanded") === "true";
      qsa(".accordion-trigger").forEach(other => {
        other.setAttribute("aria-expanded", "false");
        const otherPanel = qs(`#${other.getAttribute("aria-controls")}`);
        if (otherPanel) otherPanel.classList.remove("is-open");
      });
      button.setAttribute("aria-expanded", String(!isOpen));
      if (panel) panel.classList.toggle("is-open", !isOpen);
    });
  });
}

function initProjectModal() {
  const modal = qs("#projectModal");
  if (!modal) return;

  const focusableSelector = "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
  let lastFocus = null;

  const open = index => {
    const project = portfolio[index];
    if (!project) return;
    lastFocus = document.activeElement;
    qs("#projectModalImage").src = project.image;
    qs("#projectModalImage").alt = project.title;
    qs("#projectModalCategory").textContent = project.category;
    qs("#projectModalTitle").textContent = project.title;
    qs("#projectModalDescription").textContent = project.description;
    qs("#projectModalMeta").innerHTML = [
      ["Cliente", project.client],
      ["Local", project.local],
      ["Ano", project.year]
    ].map(([term, value]) => `<div><dt>${term}</dt><dd>${value}</dd></div>`).join("");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    qs(".modal-close", modal)?.focus();
  };

  const close = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (lastFocus) lastFocus.focus();
  };

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-project-index]");
    if (button) open(Number(button.dataset.projectIndex));
    if (event.target.closest("[data-close-modal]")) close();
  });

  document.addEventListener("keydown", event => {
    if (!modal.classList.contains("is-open")) return;
    if (event.key === "Escape") close();
    if (event.key === "Tab") {
      const focusable = qsa(focusableSelector, modal);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
}

function initPhoneMask() {
  const input = qs("input[name='phone']");
  if (!input) return;
  input.addEventListener("input", () => {
    const digits = input.value.replace(/\D/g, "").slice(0, 11);
    const ddd = digits.slice(0, 2);
    const first = digits.length > 10 ? digits.slice(2, 7) : digits.slice(2, 6);
    const second = digits.length > 10 ? digits.slice(7, 11) : digits.slice(6, 10);
    input.value = digits.length > 6
      ? `(${ddd}) ${first}-${second}`
      : digits.length > 2
        ? `(${ddd}) ${first}`
        : digits ? `(${ddd}` : "";
  });
}

function initContactForm() {
  const form = qs("#contactForm");
  const status = qs("#formStatus");
  const whatsappLink = qs("#formWhatsapp");
  if (!form) return;

  const setError = (name, message) => {
    const field = form.elements[name];
    const error = qs(`[data-error-for='${name}']`, form);
    if (field) field.classList.toggle("is-invalid", Boolean(message));
    if (error) error.textContent = message;
  };

  const validate = () => {
    const data = Object.fromEntries(new FormData(form).entries());
    let valid = true;
    const rules = {
      name: data.name.trim().length >= 3 ? "" : "Informe seu nome completo.",
      phone: data.phone.replace(/\D/g, "").length >= 10 ? "" : "Informe um telefone válido.",
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ? "" : "Informe um e-mail válido.",
      eventType: data.eventType ? "" : "Selecione o tipo de evento.",
      message: data.message.trim().length >= 12 ? "" : "Conte um pouco mais sobre o evento."
    };

    Object.entries(rules).forEach(([name, message]) => {
      setError(name, message);
      if (message) valid = false;
    });

    return { valid, data };
  };

  const updateWhatsapp = data => {
    const message = `Olá, RICCO DECOR & PAISAGISMO! Meu nome é ${data.name || ""}. Gostaria de falar sobre ${data.eventType || "um evento"}${data.eventDate ? ` em ${data.eventDate}` : ""}. Telefone: ${data.phone || ""}. E-mail: ${data.email || ""}. Mensagem: ${data.message || ""}`;
    if (whatsappLink) whatsappLink.href = buildWhatsappUrl(message);
    const floatButton = qs("#whatsappFloat");
    if (floatButton) floatButton.href = buildWhatsappUrl(message);
  };

  const submitViaFormSubmit = async data => {
    const body = new FormData();
    Object.entries({ ...data, _subject: `Novo contato pelo site - ${siteConfig.brand}` }).forEach(([key, value]) => body.append(key, value));
    try {
      await fetch(siteConfig.formEndpoint, { method: "POST", body, headers: { Accept: "application/json" } });
      return true;
    } catch (error) {
      return false;
    }
  };

  form.addEventListener("input", debounce(() => {
    const data = Object.fromEntries(new FormData(form).entries());
    updateWhatsapp(data);
  }, 200));

  form.addEventListener("submit", event => {
    event.preventDefault();
    const result = validate();
    updateWhatsapp(result.data);
    if (!result.valid) {
      if (status) status.textContent = "Revise os campos destacados antes de continuar.";
      const firstInvalid = qs(".is-invalid", form);
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    submitViaFormSubmit(result.data);
    if (status) {
      status.textContent = "Perfeito! Seu atendimento foi preparado. Envie pelo WhatsApp com um clique ou aguarde o retorno por e-mail.";
    }
    form.reset();
  });

  if (whatsappLink) whatsappLink.href = buildWhatsappUrl(siteConfig.defaultMessage);
}

function initCounters() {
  const counters = qsa("[data-counter]");
  if (!counters.length) return;

  const animate = counter => {
    const target = Number(counter.dataset.counter);
    const duration = prefersReducedMotion ? 1 : 1200;
    const start = performance.now();
    const step = now => {
      const progress = Math.min((now - start) / duration, 1);
      counter.textContent = Math.floor(progress * target);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animate(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  counters.forEach(counter => observer.observe(counter));
}

function initAnimations() {
  if (!window.gsap || prefersReducedMotion) return;
  gsap.registerPlugin(ScrollTrigger);

  if (window.SplitType) {
    const split = new SplitType(".split-text", { types: "words, chars" });
    gsap.from(split.chars, { yPercent: 115, opacity: 0, duration: 0.8, stagger: 0.014, ease: "power3.out", delay: 0.8 });
  }

  qsa(".reveal-item").forEach(item => {
    gsap.from(item, {
      y: 42,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out",
      scrollTrigger: { trigger: item, start: "top 86%" }
    });
  });

  gsap.to(".hero__media img", {
    yPercent: 12,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
  });
}

function initCursor() {
  const cursor = qs("#customCursor");
  if (!cursor || prefersReducedMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  document.addEventListener("pointermove", event => {
    cursor.style.opacity = "1";
    cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;
  });

  qsa("a, button, .magnetic").forEach(el => {
    el.addEventListener("mouseenter", () => cursor.classList.add("is-active"));
    el.addEventListener("mouseleave", () => cursor.classList.remove("is-active"));
  });
}

function initMagneticButtons() {
  if (prefersReducedMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  qsa(".magnetic").forEach(el => {
    el.addEventListener("mousemove", event => {
      const rect = el.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) * 0.16;
      const y = (event.clientY - rect.top - rect.height / 2) * 0.16;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "translate(0, 0)";
    });
  });
}

function debounce(fn, wait = 200) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

function throttle(fn, wait = 100) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn(...args);
    }
  };
}

function boot() {
  renderTimeline();
  renderServices();
  renderPortfolio();
  renderGallery();
  renderProcess();
  renderTestimonials();
  renderFAQ();
  renderInstagram();
  renderContact();
  initLucideIcons();
  initLoader();
  initNavbar();
  initMobileMenu();
  initSmoothScroll();
  initScrollspy();
  initSliders();
  initLightbox();
  initFAQ();
  initProjectModal();
  initPhoneMask();
  initContactForm();
  initCounters();
  initAnimations();
  initCursor();
  initBackToTop();
  initMagneticButtons();
}

document.addEventListener("DOMContentLoaded", boot);
