document.addEventListener('DOMContentLoaded', () => {
    // Intercept form submissions to display responsive loading and processing states
    const authForms = document.querySelectorAll('form');
    authForms.forEach(form => {
        form.addEventListener('submit', (e) => {
            // Find the submit button inside the current form
            const btn = form.querySelector('button[type="submit"]');
            if (!btn) return;
            
            // Generate contextual feedback text based on the form's target action
            const action = form.getAttribute('action') || '';
            const btnText = btn.textContent.trim().toLowerCase();
            let loadingText = 'Processing...';
            
            if (action === '/login') {
                loadingText = 'Signing in securely...';
            } else if (action === '/register') {
                loadingText = 'Securing your vault...';
            } else if (action === '/2fa/verify-login') {
                loadingText = 'Verifying security token...';
            } else if (action === '/2fa/verify') {
                loadingText = 'Activating MFA shield...';
            } else if (action.includes('delete')) {
                loadingText = 'Purging credential...';
            } else if (action.includes('update')) {
                loadingText = 'Synchronizing credentials...';
            } else if (btnText.includes('save') || btnText.includes('add') || action === '/passwords') {
                loadingText = 'Encrypting & storing...';
            }

            // Block additional interactions via pointer events classes safely
            btn.classList.add('opacity-90', 'cursor-not-allowed', 'pointer-events-none');
            btn.style.transform = 'scale(0.98)';
            btn.innerHTML = `
                <span class="flex items-center justify-center gap-2.5">
                    <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    ${loadingText}
                </span>
            `;

            // Defer the disabling of inputs and the submit button to the next event loop tick so the native submit POST executes
            setTimeout(() => {
                const formInputs = form.querySelectorAll('input, select, textarea');
                formInputs.forEach(input => {
                    input.setAttribute('readonly', 'true');
                    input.classList.add('opacity-70', 'pointer-events-none');
                });
                btn.setAttribute('disabled', 'true');
            }, 0);
        });
    });

    // Copy to clipboard functionality
    const copyBtns = document.querySelectorAll('.copy-btn');
    copyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.getAttribute('data-copy');
            if (!text) return;
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
                field.classList.add('text-blue-600', 'font-semibold');
                eyeIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 1.24-2.13M9.9 4.24A10.07 10.07 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
            } else {
                field.textContent = field.getAttribute('data-password').length > 8 ? '••••••••••••' : '••••••••';
                field.classList.remove('text-blue-600', 'font-semibold');
                field.classList.add('text-slate-500');
                eyeIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
            }
        });
    });

    // Table Filtering and Search Mechanics
    const vaultSearch = document.getElementById('vaultSearch');
    const categoryTabs = document.querySelectorAll('.category-tab');
    const passwordRows = document.querySelectorAll('.password-row');
    const noResultsRow = document.getElementById('noResultsRow');

    let currentCategory = 'ALL';
    let searchQuery = '';

    function filterTable() {
        let visibleCount = 0;

        passwordRows.forEach(row => {
            const category = row.getAttribute('data-category');
            const source = row.getAttribute('data-source') || '';
            const username = row.getAttribute('data-username') || '';

            const matchesCategory = (currentCategory === 'ALL' || category === currentCategory);
            const matchesSearch = (searchQuery === '' || source.includes(searchQuery) || username.includes(searchQuery));

            if (matchesCategory && matchesSearch) {
                row.classList.remove('hidden');
                visibleCount++;
            } else {
                row.classList.add('hidden');
            }
        });

        if (noResultsRow) {
            if (visibleCount === 0 && passwordRows.length > 0) {
                noResultsRow.classList.remove('hidden');
            } else {
                noResultsRow.classList.add('hidden');
            }
        }
    }

    if (vaultSearch) {
        vaultSearch.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            filterTable();
        });
    }

    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Unset active style from former tab
            categoryTabs.forEach(t => {
                t.className = 'category-tab px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/60 hover:bg-white text-slate-600 transition-all shadow-sm active:scale-95 border border-slate-100';
            });

            // Set active style for selected tab
            tab.className = 'category-tab px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-blue-600 text-white transition-all shadow-sm active:scale-95 border border-transparent';

            currentCategory = tab.getAttribute('data-category');
            filterTable();
        });
    });
});

