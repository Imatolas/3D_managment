const links = document.querySelectorAll('.menu__item');

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
