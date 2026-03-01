// js/toast.js

/**
 * Creates and displays a centralized toast notification.
 * @param {string} type - 'success', 'error', 'warning', 'info'
 * @param {string} message - The message to display
 */
export function showToast(type, message) {
    let container = document.getElementById('toast-container');

    // Create container if it doesn't exist
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 24px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            flex-direction: column;
            gap: 12px;
            z-index: 9999;
            pointer-events: none;
            width: max-content;
            max-width: 90vw;
        `;
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Dynamic styling based on type
    const colors = {
        success: { bg: 'rgba(74, 206, 160, 0.1)', border: 'var(--C)', text: 'var(--text)' },
        error: { bg: 'rgba(232, 92, 122, 0.1)', border: 'rgba(232, 92, 122, 1)', text: 'var(--text)' },
        warning: { bg: 'rgba(232, 146, 74, 0.1)', border: 'var(--O)', text: 'var(--text)' },
        info: { bg: 'rgba(123, 156, 245, 0.1)', border: 'var(--A)', text: 'var(--text)' }
    };

    const c = colors[type] || colors.info;

    toast.style.cssText = `
        background: var(--surface);
        border: 1px solid var(--border);
        border-left: 4px solid ${c.border};
        border-radius: 8px;
        padding: 12px 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        gap: 12px;
        pointer-events: auto;
        animation: slideDownFade 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        opacity: 0;
        transform: translateY(-20px);
    `;

    // Add keyframes if missing
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.innerHTML = `
            @keyframes slideDownFade {
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes slideUpFadeOut {
                to { opacity: 0; transform: translateY(-20px); }
            }
        `;
        document.head.appendChild(style);
    }

    // Icons
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    toast.innerHTML = `
        <div style="
            display: flex; 
            align-items: center; 
            justify-content: center; 
            width: 24px; 
            height: 24px; 
            border-radius: 50%; 
            background: ${c.border}; 
            color: white; 
            font-weight: 700; 
            font-size: 14px;
        ">${icons[type] || icons.info}</div>
        <div style="color: ${c.text}; font-size: 14px; font-weight: 500; font-family: 'Outfit', sans-serif;">${message}</div>
        <button class="toast-close" style="
            background: none; 
            border: none; 
            color: var(--muted); 
            cursor: pointer; 
            font-size: 18px; 
            padding: 0 4px; 
            margin-left: 8px;
            transition: color 0.2s;
        ">×</button>
    `;

    container.appendChild(toast);

    // Hover effect for close
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('mouseenter', () => closeBtn.style.color = 'var(--text)');
    closeBtn.addEventListener('mouseleave', () => closeBtn.style.color = 'var(--muted)');

    // Dismissal Logic
    const dismiss = () => {
        toast.style.animation = 'slideUpFadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    };

    closeBtn.addEventListener('click', dismiss);
    setTimeout(dismiss, 4000); // 4 second auto-dismiss
}
