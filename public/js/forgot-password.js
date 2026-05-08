import { auth } from './firebase-config.js';
import { fetchSignInMethodsForEmail, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const alertContainer = document.getElementById('alertContainer');

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('resetEmail').value.trim();
            const btn = forgotPasswordForm.querySelector('button[type="submit"]');
            const originalText = btn.textContent;

            if (!email) {
                showAlert('Please enter an email address.', 'error');
                return;
            }

            try {
                btn.textContent = 'Checking...';
                btn.disabled = true;

                // Directly send reset link
                btn.textContent = 'Sending Link...';
                await sendPasswordResetEmail(auth, email);
                
                showAlert('A password reset link has been sent to your email. Please check your inbox (and spam folder) to set a new password.', 'success');
                forgotPasswordForm.reset();

            } catch (error) {
                console.error("Error regarding Password Reset:", error);
                
                let errorMessage = 'An error occurred. Please try again later.';
                if (error.code === 'auth/invalid-email') {
                    errorMessage = 'The email address is improperly formatted.';
                } else if (error.code === 'auth/user-not-found') {
                    errorMessage = 'This email is not registered with our system.';
                } else if (error.code === 'auth/too-many-requests') {
                    errorMessage = 'Too many requests. Please try again later.';
                }
                
                showAlert(errorMessage, 'error');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
    }

    function showAlert(message, type) {
        if (!alertContainer) return;
        
        const bgColor = type === 'error' ? 'rgba(231, 76, 60, 0.1)' : 'rgba(46, 204, 113, 0.1)';
        const textColor = type === 'error' ? '#e74c3c' : '#2ecc71';
        const border = type === 'error' ? '1px solid #e74c3c' : '1px solid #2ecc71';

        alertContainer.innerHTML = `
            <div style="background-color: ${bgColor}; color: ${textColor}; border: ${border}; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 0.95rem; text-align: center; animation: fadeIn 0.3s ease;">
                ${message}
            </div>
        `;
    }
});
