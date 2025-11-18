const links = document.querySelectorAll('.menu__item');

const modal = document.getElementById('modal');
const addPrintBtn = document.getElementById('add-print');
const closeTriggers = document.querySelectorAll('[data-close]');
const form = document.getElementById('print-form');


const setActive = (id) => {
  links.forEach((link) => {
    link.classList.toggle('active', link.dataset.target === id);
  });
};

links.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const targetId = link.dataset.target;
    const section = document.getElementById(targetId);

    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActive(targetId);
    }
  });
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        setActive(entry.target.id);
      }
    });
  },
  { threshold: 0.35 }
);

const sections = document.querySelectorAll('section.panel');
sections.forEach((section) => observer.observe(section));


const openModal = () => {
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
};

const closeModal = () => {
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
};

addPrintBtn?.addEventListener('click', openModal);
closeTriggers.forEach((trigger) => trigger.addEventListener('click', closeModal));

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const title = data.get('title');
  const date = data.get('date');
  const time = data.get('time');
  const duration = data.get('duration');
  const priority = data.get('priority');

  const column = document.querySelector(`.kanban__column[data-day="${date}"] .kanban__hours`);
  if (column) {
    const slot = document.createElement('div');
    slot.className = 'kanban__slot';
    slot.dataset.hour = time;

    slot.innerHTML = `
      <p class="kanban__hour">${time}</p>
      <div class="kanban__card">
        <p class="kanban__title">${title}</p>
        <p class="kanban__meta">Duração: ${duration} | Prioridade: ${priority}</p>
      </div>
    `;

    column.appendChild(slot);
    form.reset();
    closeModal();
  } else {
    alert('Selecione uma data que esteja visível na linha do tempo.');
  }
});

