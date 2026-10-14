// Authentication Module
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from './firebase-config.js';
import { db, doc, setDoc } from './firebase-config.js';
import { isAdminUser, registerUserInAdminIndex } from './firestore-service.js';

let currentUser = null;

// ─── ADMIN CONFIG ─────────────────────────────────────────────────────────────
// Must match ADMIN_EMAIL in firestore-service.js
const ADMIN_EMAIL = 'anton.sarah.gregory@gmail.com';

// ─── AUTH STATE ───────────────────────────────────────────────────────────────

export function initAuth() {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;

        if (user) {
            console.log('User signed in:', user.email);

            // Save profile under the user's own path (readable by admin via security rules)
            saveUserProfile(user).catch(err => console.warn('Could not save profile:', err));

            // Register this user's UID in the shared admin index document
            // so the admin can discover all users without listing the top-level collection
            registerUserInAdminIndex(user).catch(err => console.warn('Could not update admin index:', err));

            showMainApp(user);
        } else {
            console.log('User signed out');
            showAuthScreen();
        }
    });
}

export function getCurrentUser() {
    return currentUser;
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────

async function saveUserProfile(user) {
    const profileRef = doc(db, 'users', user.uid, 'metadata', 'profile');
    await setDoc(profileRef, { email: user.email, lastLogin: new Date().toISOString() }, { merge: true });
}

// ─── UI VISIBILITY ────────────────────────────────────────────────────────────

function showMainApp(user) {
    const authScreen = document.getElementById('authScreen');
    const mainApp    = document.getElementById('mainApp');
    const userEmail  = document.getElementById('userEmail');

    if (authScreen) authScreen.style.display = 'none';
    if (mainApp)    mainApp.style.display    = 'block';
    if (userEmail)  userEmail.textContent    = user.email;

    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) {
        adminPanel.style.display = (user.email === ADMIN_EMAIL) ? 'flex' : 'none';
    }

    const adminBadge = document.getElementById('adminBadge');
    if (adminBadge) {
        adminBadge.style.display = (user.email === ADMIN_EMAIL) ? 'inline-block' : 'none';
    }
}

function showAuthScreen() {
    const authScreen = document.getElementById('authScreen');
    const mainApp    = document.getElementById('mainApp');

    if (authScreen) authScreen.style.display = 'flex';
    if (mainApp)    mainApp.style.display    = 'none';
}

// ─── AUTH HANDLERS ────────────────────────────────────────────────────────────

window.handleLogin = async function(event) {
    event.preventDefault();

    const email    = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    try {
        if (errorDiv) errorDiv.textContent = '';
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error('Login error:', error);
        if (errorDiv) errorDiv.textContent = getErrorMessage(error.code);
    }
};

window.handleSignup = async function(event) {
    event.preventDefault();

    const email           = document.getElementById('signupEmail').value;
    const password        = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const errorDiv        = document.getElementById('signupError');

    try {
        if (errorDiv) errorDiv.textContent = '';

        if (password !== confirmPassword) {
            if (errorDiv) errorDiv.textContent = 'Passwords do not match';
            return;
        }
        if (password.length < 6) {
            if (errorDiv) errorDiv.textContent = 'Password must be at least 6 characters';
            return;
        }

        await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error('Signup error:', error);
        if (errorDiv) errorDiv.textContent = getErrorMessage(error.code);
    }
};

window.handleLogout = async function() {
    try {
        await signOut(auth);
        if (window.showToast) window.showToast('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        if (window.showToast) window.showToast('Error logging out', 'error');
    }
};

window.toggleAuthMode = function() {
    const loginForm   = document.getElementById('loginForm');
    const signupForm  = document.getElementById('signupForm');
    const loginError  = document.getElementById('loginError');
    const signupError = document.getElementById('signupError');

    if (loginForm && signupForm) {
        if (loginForm.style.display === 'none') {
            loginForm.style.display  = 'block';
            signupForm.style.display = 'none';
        } else {
            loginForm.style.display  = 'none';
            signupForm.style.display = 'block';
        }
        if (loginError)  loginError.textContent  = '';
        if (signupError) signupError.textContent = '';
    }
};

// ─── ERROR MESSAGES ───────────────────────────────────────────────────────────

function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/invalid-email':          'Invalid email address',
        'auth/user-disabled':          'This account has been disabled',
        'auth/user-not-found':         'No account found with this email',
        'auth/wrong-password':         'Incorrect password',
        'auth/email-already-in-use':   'An account already exists with this email',
        'auth/weak-password':          'Password is too weak',
        'auth/network-request-failed': 'Network error. Please check your connection',
        'auth/too-many-requests':      'Too many failed attempts. Please try again later',
        'auth/invalid-credential':     'Invalid email or password'
    };
    return errorMessages[errorCode] || 'An error occurred. Please try again.';
}