/* ============================================
   AI Native Schools — Shared UI Utilities
   ============================================ */

import { getTheme, saveTheme } from './storage.js';

// --- Toast is now in toast.js — use: import { showToast } from './toast.js'; ---

// --- Password Visibility Toggle ---
const EYE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

export function setupPasswordToggle(inputEl, toggleEl) {
    if (!inputEl || !toggleEl) return;
    toggleEl.innerHTML = EYE_SVG;

    toggleEl.addEventListener('click', () => {
        const isPassword = inputEl.type === 'password';
        inputEl.type = isPassword ? 'text' : 'password';
        toggleEl.innerHTML = isPassword ? EYE_OFF_SVG : EYE_SVG;
    });
}

// --- Ripple Effect ---
export function createRipple(e) {
    const btn = e.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(btn.clientWidth, btn.clientHeight);
    const radius = diameter / 2;
    const rect = btn.getBoundingClientRect();

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - radius}px`;
    circle.style.top = `${e.clientY - rect.top - radius}px`;
    circle.classList.add('ripple-effect');

    const existing = btn.querySelector('.ripple-effect');
    if (existing) existing.remove();
    btn.appendChild(circle);
}

export function initRipples() {
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', createRipple);
    });
}

// --- Validation Feedback ---
export function showValidation(inputEl, isValid, message) {
    const group = inputEl.closest('.form-group');
    if (!group) return;

    clearValidation(inputEl);

    const msg = document.createElement('div');
    msg.className = `validation-message ${isValid ? 'valid' : 'invalid'}`;
    msg.textContent = message;
    group.classList.add(isValid ? 'success' : 'error');
    group.appendChild(msg);
}

export function clearValidation(inputEl) {
    const group = inputEl.closest('.form-group');
    if (!group) return;
    group.classList.remove('success', 'error');
    const existing = group.querySelector('.validation-message');
    if (existing) existing.remove();
}

// --- Theme Toggle ---
export function initThemeToggle() {
    const saved = getTheme();
    document.documentElement.setAttribute('data-theme', saved);

    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
        updateThemeIcon(toggleBtn, saved);
        toggleBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'light';
            const next = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            saveTheme(next);
            updateThemeIcon(toggleBtn, next);
        });
    }
}

function updateThemeIcon(btn, theme) {
    btn.innerHTML = theme === 'dark'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}

export function applyTheme() {
    const saved = getTheme();
    document.documentElement.setAttribute('data-theme', saved);
}
