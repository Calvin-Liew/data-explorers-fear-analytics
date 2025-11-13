// Scroll-based narrative animations
(function() {
    'use strict';

    // Smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';

    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                // Trigger any child animations
                const children = entry.target.querySelectorAll('.fade-in-child');
                children.forEach((child, index) => {
                    setTimeout(() => {
                        child.classList.add('is-visible');
                    }, index * 100);
                });
            }
        });
    }, observerOptions);

    // Observe all sections
    document.addEventListener('DOMContentLoaded', () => {
        // Observe viz sections
        document.querySelectorAll('.viz-section, .snapshot-section').forEach(section => {
            section.classList.add('fade-in-section');
            observer.observe(section);
        });

        // Observe section headers
        document.querySelectorAll('.section-header').forEach(header => {
            header.classList.add('fade-in-child');
            observer.observe(header);
        });

        // Observe insight panels
        document.querySelectorAll('.insight-panel, .scene5-insight-full, .scene5-drip-insight-full').forEach(panel => {
            panel.classList.add('fade-in-child');
            observer.observe(panel);
        });

        // Observe footer
        const footer = document.querySelector('footer .footer-content');
        if (footer) {
            footer.classList.add('fade-in-section');
            observer.observe(footer);
        }

        // Observe snapshot cards with staggered animation
        document.querySelectorAll('.snapshot-card').forEach((card, index) => {
            card.classList.add('fade-in-child');
            observer.observe(card);
        });
    });

    // Parallax effect for intro
    let ticking = false;
    function updateParallax() {
        const scrolled = window.pageYOffset;
        const intro = document.getElementById('intro');
        if (intro) {
            const parallax = scrolled * 0.5;
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
    });

    // Progress indicator
    function updateProgressBar() {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        const progressBar = document.getElementById('scroll-progress');
        if (progressBar) {
            progressBar.style.width = scrolled + '%';
        }
    }

    window.addEventListener('scroll', updateProgressBar);
})();

