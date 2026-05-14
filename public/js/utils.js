document.addEventListener('DOMContentLoaded', () => {
    // Copy to clipboard functionality
    const copyBtns = document.querySelectorAll('.copy-btn');
    copyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.getAttribute('data-copy');
            navigator.clipboard.writeText(text).then(() => {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                `;
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                }, 2000);
            });
        });
    });

    // Toggle visibility functionality
    const toggleBtns = document.querySelectorAll('.toggle-visibility');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const container = btn.closest('.flex') || btn.parentElement;
            const field = container.querySelector('.password-field');
            const eyeIcon = btn.querySelector('svg');
            
            if (field.textContent === '••••••••' || field.textContent === '••••••••••••') {
                field.textContent = field.getAttribute('data-password');
                field.classList.remove('text-slate-500');
                field.classList.add('text-blue-600', 'font-bold');
                eyeIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 1.24-2.13M9.9 4.24A10.07 10.07 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
            } else {
                field.textContent = field.getAttribute('data-password').length > 8 ? '••••••••••••' : '••••••••';
                field.classList.remove('text-blue-600', 'font-bold');
                field.classList.add('text-slate-500');
                eyeIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
            }
        });
    });
});
