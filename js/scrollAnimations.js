
(function() {
    'use strict';

    
    document.documentElement.style.scrollBehavior = 'smooth';

    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                
                const children = entry.target.querySelectorAll('.fade-in-child');
                children.forEach((child, index) => {
                    setTimeout(() => {
                        child.classList.add('is-visible');
                    }, index * 100);
                });
            }
        });
    }, observerOptions);

    
    document.addEventListener('DOMContentLoaded', () => {
        
        document.querySelectorAll('.viz-section, .snapshot-section').forEach(section => {
            section.classList.add('fade-in-section');
            observer.observe(section);
        });

        
        document.querySelectorAll('.section-header').forEach(header => {
            header.classList.add('fade-in-child');
            observer.observe(header);
        });

        
        document.querySelectorAll('.insight-panel, .scene5-insight-full, .scene5-drip-insight-full').forEach(panel => {
            panel.classList.add('fade-in-child');
            observer.observe(panel);
        });

        
        const footer = document.querySelector('footer .footer-content');
        if (footer) {
            footer.classList.add('fade-in-section');
            observer.observe(footer);
        }

        
        document.querySelectorAll('.snapshot-card').forEach((card, index) => {
            card.classList.add('fade-in-child');
            observer.observe(card);
        });
    });

    
    let ticking = false;
    let lastScrollY = 0;
    function updateParallax() {
        const scrolled = window.pageYOffset;
        if (Math.abs(scrolled - lastScrollY) < 5) {
            ticking = false;
            return;
        }
        lastScrollY = scrolled;
        const intro = document.getElementById('intro');
        if (intro && scrolled < 1000) {
            const parallax = scrolled * 0.3;
            intro.style.transform = `translateY(${parallax}px)`;
            intro.style.opacity = Math.max(0, 1 - scrolled / 600);
        }
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }, { passive: true });

    
    function updateProgressBar() {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        const progressBar = document.getElementById('scroll-progress');
        if (progressBar) {
            progressBar.style.width = scrolled + '%';
        }
    }

    let progressTicking = false;
    function throttledProgressBar() {
        if (!progressTicking) {
            requestAnimationFrame(() => {
                updateProgressBar();
                progressTicking = false;
            });
            progressTicking = true;
        }
    }
    window.addEventListener('scroll', throttledProgressBar, { passive: true });
})();

