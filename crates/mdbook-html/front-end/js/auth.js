'use strict';

/**
 * mdBook Password Protection System
 *
 * Handles client-side authentication for statically deployed mdBook sites.
 * Uses bcrypt for password verification and sessionStorage for session management.
 */

(function authModule() {
    // Session storage key
    const SESSION_KEY = 'mdbook_auth_session';
    const SESSION_EXPIRY_KEY = 'mdbook_auth_expiry';

    // Default session expiry: 24 hours
    const DEFAULT_SESSION_HOURS = 24;

    /**
     * Check if user has a valid session
     */
    function checkSession() {
        try {
            const session = sessionStorage.getItem(SESSION_KEY);
            const expiry = sessionStorage.getItem(SESSION_EXPIRY_KEY);

            if (!session || !expiry) {
                return false;
            }

            if (Date.now() > parseInt(expiry, 10)) {
                clearSession();
                return false;
            }

            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Clear the authentication session
     */
    function clearSession() {
        try {
            sessionStorage.removeItem(SESSION_KEY);
            sessionStorage.removeItem(SESSION_EXPIRY_KEY);
        } catch (e) { }
    }

    /**
     * Create a session for the user
     */
    function createSession(username) {
        try {
            const expiry = Date.now() + (DEFAULT_SESSION_HOURS * 60 * 60 * 1000);
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username }));
            sessionStorage.setItem(SESSION_EXPIRY_KEY, expiry.toString());
        } catch (e) { }
    }

    /**
     * Get bcrypt implementation for password verification
     * Uses the bundled bcrypt.min.js
     */
    function getBcrypt() {
        if (typeof bcrypt !== 'undefined') {
            return Promise.resolve(bcrypt);
        }
        if (typeof dcodeIO !== 'undefined' && typeof dcodeIO.bcrypt !== 'undefined') {
            return Promise.resolve(dcodeIO.bcrypt);
        }
        return Promise.reject(new Error('bcrypt.js not loaded'));
    }

    /**
     * Attempt to authenticate with username and password
     */
    async function authenticate(username, password, users) {
        const bcrypt = await getBcrypt();

        for (const user of users) {
            if (user.username === username) {
                try {
                    const result = await bcrypt.compare(password, user.hash);
                    if (result) {
                        createSession(username);
                        return { success: true };
                    }
                } catch (e) {
                    console.error('Password verification error:', e);
                }
                return { success: false, error: 'Invalid password' };
            }
        }

        return { success: false, error: 'User not found' };
    }

    /**
     * Create and show the login overlay
     */
    function createLoginOverlay(users) {
        // Remove existing overlay if present
        const existing = document.getElementById('mdbook-auth-overlay');
        if (existing) {
            existing.remove();
        }

        const overlay = document.createElement('div');
        overlay.id = 'mdbook-auth-overlay';
        overlay.innerHTML = `
            <style>
                #mdbook-auth-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: var(--bg, #ffffff);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: var(--body-font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif);
                }
                #mdbook-auth-overlay.hidden {
                    display: none;
                }
                #mdbook-auth-container {
                    background: var(--bg, #ffffff);
                    border: 1px solid var(--table-border-color, #e1e1e1);
                    border-radius: 8px;
                    padding: 2rem;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.15);
                }
                #mdbook-auth-container h2 {
                    margin: 0 0 1.5rem 0;
                    color: var(--fg, #333);
                    text-align: center;
                }
                .mdbook-auth-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .mdbook-auth-form label {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    color: var(--fg, #333);
                    font-size: 0.9rem;
                }
                .mdbook-auth-form input {
                    padding: 0.75rem;
                    border: 1px solid var(--table-border-color, #e1e1e1);
                    border-radius: 4px;
                    font-size: 1rem;
                    background: var(--bg, #ffffff);
                    color: var(--fg, #333);
                }
                .mdbook-auth-form input:focus {
                    outline: none;
                    border-color: var(--links, #3498db);
                }
                .mdbook-auth-submit {
                    margin-top: 0.5rem;
                    padding: 0.75rem;
                    background: var(--links, #3498db);
                    color: #ffffff;
                    border: none;
                    border-radius: 4px;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .mdbook-auth-submit:hover {
                    background: var(--links-hover, #2980b9);
                }
                .mdbook-auth-submit:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .mdbook-auth-error {
                    color: #e74c3c;
                    font-size: 0.875rem;
                    text-align: center;
                    min-height: 1.25rem;
                }
                .mdbook-auth-info {
                    color: var(--fg, #666);
                    font-size: 0.8rem;
                    text-align: center;
                    margin-top: 1rem;
                }
            </style>
            <div id="mdbook-auth-container">
                <h2>Protected Content</h2>
                <form class="mdbook-auth-form" id="mdbook-auth-form">
                    <label>
                        Username
                        <input type="text" name="username" id="mdbook-auth-username" autocomplete="username" required>
                    </label>
                    <label>
                        Password
                        <input type="password" name="password" id="mdbook-auth-password" autocomplete="current-password" required>
                    </label>
                    <div class="mdbook-auth-error" id="mdbook-auth-error"></div>
                    <button type="submit" class="mdbook-auth-submit" id="mdbook-auth-submit">
                        Login
                    </button>
                </form>
                <div class="mdbook-auth-info">
                    Enter your credentials to access this book
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Add form submit handler
        const form = document.getElementById('mdbook-auth-form');
        const submitBtn = document.getElementById('mdbook-auth-submit');
        const errorDiv = document.getElementById('mdbook-auth-error');

        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const username = document.getElementById('mdbook-auth-username').value;
            const password = document.getElementById('mdbook-auth-password').value;

            submitBtn.disabled = true;
            submitBtn.textContent = 'Verifying...';
            errorDiv.textContent = '';

            try {
                const result = await authenticate(username, password, users);

                if (result.success) {
                    hideOverlay();
                } else {
                    errorDiv.textContent = result.error || 'Login failed';
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Login';
                }
            } catch (e) {
                errorDiv.textContent = 'An error occurred. Please try again.';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
            }
        });

        return overlay;
    }

    /**
     * Hide the login overlay
     */
    function hideOverlay() {
        const overlay = document.getElementById('mdbook-auth-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            // Remove after animation
            setTimeout(function() { overlay.remove(); }, 300);
        }
    }

    /**
     * Show the login overlay
     */
    function showOverlay(users) {
        createLoginOverlay(users);
    }

    /**
     * Initialize the auth system
     */
    function init() {
        // Check if auth is configured
        if (typeof window.MDBOOK_AUTH_USERS === 'undefined' ||
            !Array.isArray(window.MDBOOK_AUTH_USERS) ||
            window.MDBOOK_AUTH_USERS.length === 0) {
            return; // Auth not configured, allow access
        }

        // Check for existing valid session
        if (checkSession()) {
            return; // Already authenticated
        }

        // Show login overlay (blocks content until authenticated)
        showOverlay(window.MDBOOK_AUTH_USERS);
    }

    /**
     * Logout function - clears session and shows login again
     */
    window.mdbookLogout = function() {
        clearSession();
        if (typeof window.MDBOOK_AUTH_USERS !== 'undefined') {
            showOverlay(window.MDBOOK_AUTH_USERS);
        }
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
