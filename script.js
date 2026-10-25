let cursor = document.querySelector('.custom-cursor');
let mouseX = 0, mouseY = 0, cursorX = 0, cursorY = 0;
let lastMouseX = 0, lastMouseY = 0;
let velX = 0, velY = 0;
let eyeX = 0, eyeY = 0, eyeVelX = 0, eyeVelY = 0;
let scaleX = 1, scaleY = 1, scaleVelX = 0, scaleVelY = 0;
let targetScaleX = 1, targetScaleY = 1;
let magnetTarget = null;

let isMouseActive = false;
let hasStartedMoving = false;
let hasGreeted = sessionStorage.getItem('cursorGreeted') === 'true';
let activeMsgTarget = null;
let reactionTimeout = null;
let idleTimeout = null;
let moodTimeout = null;
let clickCount = 0;
let shakeScore = 0;
let lastMoveDirX = 0;
let countdownTimer = null;
let redirectPaused = false;

const FIREBASE_DB_URL = "https://sanju-portfolio-notes-default-rtdb.asia-southeast1.firebasedatabase.app/";

const clickReactions = [
    "hey, that tickles!",
    "press / to ask me anything",
    "leave a doodle on the Notes wall!",
    "boop! 100% organic pixels",
    "click Sanju's name to chat!"
];

const starterNotes = [];

const savedX = sessionStorage.getItem('cursorX');
const savedY = sessionStorage.getItem('cursorY');

if (savedX !== null && savedY !== null) {
    mouseX = parseFloat(savedX);
    mouseY = parseFloat(savedY);
    cursorX = mouseX;
    cursorY = mouseY;
    lastMouseX = mouseX;
    lastMouseY = mouseY;
    hasStartedMoving = true;
    isMouseActive = true;
    if (cursor) cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
}

function ensureCursorFace() {
    cursor = document.querySelector('.custom-cursor');
    if (!cursor) return;
    const shape = cursor.querySelector('.cursor-shape');
    if (shape && !shape.querySelector('.cursor-face')) {
        const face = document.createElement('div');
        face.className = 'cursor-face';
        face.innerHTML = '<div class="cursor-eyes-rig"><span class="cursor-eye left"></span><span class="cursor-eye right"></span></div>';
        shape.insertBefore(face, shape.firstChild);
    }
}
ensureCursorFace();

function setCursorMood(mood, duration = 0) {
    if (!cursor) return;
    clearTimeout(moodTimeout);
    cursor.classList.remove('mood-blink', 'mood-curious', 'mood-happy', 'mood-squint', 'mood-dizzy', 'mood-sleep', 'mood-thinking');
    if (mood) cursor.classList.add(`mood-${mood}`);
    if (duration > 0) {
        moodTimeout = setTimeout(() => {
            if (cursor) cursor.classList.remove(`mood-${mood}`);
        }, duration);
    }
}

function impulseCursorScale(sx, sy) {
    scaleVelX += (sx - scaleX) * 0.65;
    scaleVelY += (sy - scaleY) * 0.65;
}

function showCursorSpeech(msg, duration = 0, mood = 'happy') {
    ensureCursorFace();
    if (!cursor || !isMouseActive) return;
    const textSpan = cursor.querySelector('.cursor-text-content');
    const shape = cursor.querySelector('.cursor-shape');
    if (!textSpan || !shape) return;

    clearTimeout(reactionTimeout);
    if (mood === ';') setCursorMood('happy');
    else if (mood === ':') setCursorMood('curious');
    else if (mood) setCursorMood(mood);

    const prefix = (mood === 'happy' || mood === ';') ? ';' : ':';
    const formattedMsg = (msg.startsWith(':') || msg.startsWith(';')) ? msg : `${prefix} ${msg}`;
    textSpan.textContent = formattedMsg;

    cursor.classList.remove('cursor-text', 'cursor-link');
    cursor.classList.add('cursor-chat');
    impulseCursorScale(1.2, 0.84);

    const targetWidth = textSpan.offsetWidth + 50;
    shape.style.width = `${targetWidth}px`;
    shape.style.height = '34px';
    textSpan.style.opacity = '1';

    if (duration > 0) {
        reactionTimeout = setTimeout(() => {
            if (!activeMsgTarget) hideCursorSpeech();
        }, duration);
    }
}

function hideCursorSpeech() {
    if (!cursor) return;
    const textSpan = cursor.querySelector('.cursor-text-content');
    const shape = cursor.querySelector('.cursor-shape');
    setCursorMood(null);

    if (textSpan && shape) {
        textSpan.style.opacity = '0';
        cursor.classList.remove('cursor-chat');
        shape.style.width = '';
        shape.style.height = '';
    }
}

setInterval(() => {
    if (!cursor || !isMouseActive || cursor.classList.contains('cursor-click') || cursor.classList.contains('mood-sleep')) return;
    cursor.classList.add('mood-blink');
    setTimeout(() => {
        if (!cursor) return;
        cursor.classList.remove('mood-blink');
        if (Math.random() < 0.35) {
            setTimeout(() => {
                if (!cursor) return;
                cursor.classList.add('mood-blink');
                setTimeout(() => cursor && cursor.classList.remove('mood-blink'), 100);
            }, 110);
        }
    }, 110);
}, 3400);

setInterval(() => {
    if (!cursor || !isMouseActive || Math.hypot(velX, velY) > 0.5) return;
    if (Math.random() < 0.45) {
        eyeVelX += (Math.random() - 0.5) * 3.2;
        eyeVelY += (Math.random() - 0.5) * 2.0;
    }
}, 2200);

function getHomePosition() {
    const homeSquare = document.querySelector('.orange-square');
    if (homeSquare) {
        const rect = homeSquare.getBoundingClientRect();
        return { x: rect.left + (rect.width / 2), y: rect.top + (rect.height / 2) };
    }
    return { x: 0, y: 0 };
}

function updateNameColor(isDetached) {
    const nameText = document.querySelector('.name');
    if (nameText) {
        if (isDetached) nameText.classList.add('brand-active');
        else nameText.classList.remove('brand-active');
    }
}

function lockCursorToHome() {
    if (hasStartedMoving) return;
    const homePos = getHomePosition();
    cursorX = homePos.x;
    cursorY = homePos.y;
    if (cursor) cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
    updateNameColor(false);
}

if (!hasStartedMoving) {
    lockCursorToHome();
    setTimeout(lockCursorToHome, 100);
}

function resetIdleTimer() {
    clearTimeout(idleTimeout);
    if (cursor && cursor.classList.contains('mood-sleep')) {
        cursor.classList.remove('mood-sleep');
        impulseCursorScale(1.2, 0.85);
    }
    idleTimeout = setTimeout(() => {
        if (isMouseActive && !activeMsgTarget) {
            
            if (cursor) cursor.classList.add('mood-sleep');
        }
    }, 8500);
}

document.addEventListener('mousemove', (e) => {
    ensureCursorFace();
    const firstMove = !hasStartedMoving;
    hasStartedMoving = true;
    isMouseActive = true;

    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    const speed = Math.hypot(dx, dy);

    const dirX = Math.sign(dx);
    if (dirX !== 0 && dirX !== lastMoveDirX && Math.abs(dx) > 26) {
        shakeScore++;
        lastMoveDirX = dirX;
    } else {
        shakeScore = Math.max(0, shakeScore - 0.15);
    }

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    mouseX = e.clientX;
    mouseY = e.clientY;
    updateNameColor(true);

    sessionStorage.setItem('cursorX', mouseX);
    sessionStorage.setItem('cursorY', mouseY);

    if (firstMove && !hasGreeted) {
        hasGreeted = true;
        sessionStorage.setItem('cursorGreeted', 'true');
        setTimeout(() => {
            if (!activeMsgTarget) {
                const is404 = Boolean(document.getElementById('countdownNum'));
                showCursorSpeech(is404 ? "; oops, we wandered off the grid!" : "hi! i'm Sanju's AI companion", 2400, is404 ? 'dizzy' : 'happy');
            }
        }, 150);
    } else if (shakeScore > 6 && !activeMsgTarget) {
        shakeScore = 0;
        showCursorSpeech("woah okay i'm dizzy!!", 1800, 'dizzy');
    } else if (speed > 155 && !activeMsgTarget) {
        setCursorMood('squint', 350);
    }

    resetIdleTimer();
});

let lastScrollY = window.scrollY;
window.addEventListener('scroll', () => {
    if (!cursor || !isMouseActive) return;
    const scrollDelta = window.scrollY - lastScrollY;
    lastScrollY = window.scrollY;
    eyeVelY += Math.max(-3.5, Math.min(3.5, scrollDelta * 0.12));
}, { passive: true });

document.addEventListener('mouseleave', (e) => {
    if (e.clientY <= 0 || e.clientX <= 0 || (e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) {
        isMouseActive = false;
        updateNameColor(false);
    }
});

document.addEventListener('mouseenter', () => {
    isMouseActive = true;
    updateNameColor(true);
});

document.addEventListener('mousedown', (e) => {
    if (!cursor) return;
    cursor.classList.add('cursor-click');
    targetScaleX = 1.32;
    targetScaleY = 0.68;
    setCursorMood('squint');

    const isInteractive = e.target.closest('a, button, input, textarea, select, canvas, .frame-31, .orange-ai-wrapper, .project-card, .note-composer-box, .lost-card');
    if (!isInteractive && isMouseActive) {
        const msg = clickReactions[clickCount % clickReactions.length];
        clickCount++;
        showCursorSpeech(msg, 1500, 'happy');
    }
});

document.addEventListener('mouseup', () => {
    if (!cursor) return;
    cursor.classList.remove('cursor-click');
    targetScaleX = 1;
    targetScaleY = 1;
    impulseCursorScale(0.82, 1.24);
    if (!activeMsgTarget) setCursorMood(null);
});

document.addEventListener('mouseover', (e) => {
    const link = e.target.closest('a');
    if (link && link.hostname === window.location.hostname && !link.href.includes('#') && link.target !== '_blank') {
        prefetchPage(link.href);
        if (link.href.includes('notes')) fetchCloudNotesSilent();
    }

    if (!cursor || !isMouseActive) return;
    const target = e.target;
    magnetTarget = target.closest('.ai-chip, .ai-badge, .ai-close-btn, .composer-close');

    const msgTarget = target.closest('[data-message]');
    if (msgTarget) {
        if (msgTarget !== activeMsgTarget) {
            activeMsgTarget = msgTarget;
            const msg = msgTarget.getAttribute('data-message');
            const mood = msg.trim().startsWith(';') ? 'happy' : 'curious';
            showCursorSpeech(msg, 0, mood);
        }
        return;
    }

    const isHappyTarget = target.closest('#openComposerBtn, #submitNoteBtn, .ai-chip, .footer-link');
    const isLink = target.closest('a, button, .frame-31, .project-card');
    const isText = target.matches('h1, h2, p, input, textarea, .date, .cs-title');

    if (!cursor.classList.contains('cursor-chat')) {
        cursor.classList.remove('cursor-text', 'cursor-link', 'mood-happy', 'mood-curious');
        if (isHappyTarget) {
            cursor.classList.add('mood-happy');
            impulseCursorScale(1.15, 0.88);
        } else if (isLink) {
            cursor.classList.add('cursor-link');
            impulseCursorScale(1.12, 0.9);
        } else if (isText) {
            //stat square
        }
    }
});

document.addEventListener('mouseout', (e) => {
    if (magnetTarget && (!e.relatedTarget || !magnetTarget.contains(e.relatedTarget))) {
        magnetTarget = null;
    }
    if (activeMsgTarget) {
        if (!e.relatedTarget || !activeMsgTarget.contains(e.relatedTarget)) {
            activeMsgTarget = null;
            hideCursorSpeech();
        }
    }
});

function animate() {
    if (cursor) {
        ensureCursorFace();
        let targetX = mouseX;
        let targetY = mouseY;

        if (!hasStartedMoving || !isMouseActive) {
            const homePos = getHomePosition();
            targetX = homePos.x;
            targetY = homePos.y;
            cursor.classList.remove('cursor-text', 'cursor-link', 'cursor-chat', 'mood-happy', 'mood-curious');
        } else if (magnetTarget && magnetTarget.isConnected) {
            const rect = magnetTarget.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            targetX += (centerX - mouseX) * 0.18;
            targetY += (centerY - mouseY) * 0.18;
        }

        const stiffness = 0.42;
        const damping = 0.58;
        velX = (velX + (targetX - cursorX) * stiffness) * damping;
        velY = (velY + (targetY - cursorY) * stiffness) * damping;
        cursorX += velX;
        cursorY += velY;

        const targetEyeX = Math.max(-4.2, Math.min(4.2, velX * 0.34));
        const targetEyeY = Math.max(-3.5, Math.min(3.5, velY * 0.34));
        eyeVelX = (eyeVelX + (targetEyeX - eyeX) * 0.22) * 0.72;
        eyeVelY = (eyeVelY + (targetEyeY - eyeY) * 0.22) * 0.72;
        eyeX += eyeVelX;
        eyeY += eyeVelY;

        cursor.style.setProperty('--face-x', `${eyeX.toFixed(2)}px`);
        cursor.style.setProperty('--face-y', `${eyeY.toFixed(2)}px`);

        let velocityStretchX = 0;
        let velocityStretchY = 0;
        let tilt = 0;

        if (!cursor.classList.contains('cursor-click') && !cursor.classList.contains('cursor-text')) {
            velocityStretchX = Math.min(0.24, Math.abs(velX) * 0.012) - Math.min(0.12, Math.abs(velY) * 0.006);
            velocityStretchY = Math.min(0.24, Math.abs(velY) * 0.012) - Math.min(0.12, Math.abs(velX) * 0.006);
            tilt = Math.max(-15, Math.min(15, velX * 0.52));

            if (mouseX < 8 || mouseX > window.innerWidth - 8) {
                velocityStretchX = -0.25;
                velocityStretchY = 0.25;
            }
            if (mouseY < 8 || mouseY > window.innerHeight - 8) {
                velocityStretchY = -0.25;
                velocityStretchX = 0.25;
            }
        }

        scaleVelX = (scaleVelX + ((targetScaleX + velocityStretchX) - scaleX) * 0.28) * 0.65;
        scaleVelY = (scaleVelY + ((targetScaleY + velocityStretchY) - scaleY) * 0.28) * 0.65;
        scaleX += scaleVelX;
        scaleY += scaleVelY;

        cursor.style.setProperty('--scale-x', scaleX.toFixed(3));
        cursor.style.setProperty('--scale-y', scaleY.toFixed(3));
        cursor.style.setProperty('--rotate', `${tilt.toFixed(1)}deg`);

        cursor.style.transform = `translate3d(${cursorX.toFixed(2)}px, ${cursorY.toFixed(2)}px, 0)`;
    }
    requestAnimationFrame(animate);
}
animate();

let aiTypeInterval;

function typeAIMessage(text, outputEl) {
    clearInterval(aiTypeInterval);
    outputEl.textContent = '';
    let i = 0;
    setCursorMood('thinking');
    aiTypeInterval = setInterval(() => {
        if (i < text.length) {
            outputEl.textContent += text.charAt(i);
            if (i % 3 === 0) eyeVelX += (Math.random() - 0.5) * 2.2;
            i++;
        } else {
            clearInterval(aiTypeInterval);
            setCursorMood('happy', 900);
        }
    }, 18);
}

function getAIReply(rawQuery) {
    const raw = String(rawQuery || '').trim();
    const q = raw.toLowerCase();

    // 1. Math Solver
    const mathClean = q.replace(/what is|what's|whats|calculate|solve|equals|=|\?/g, '').trim();
    if (/^[0-9+\-*/().\s%^]+$/.test(mathClean) && /[0-9]/.test(mathClean) && /[+\-*/%^]/.test(mathClean)) {
        try {
            const safeExpr = mathClean.replace(/\^/g, '**');
            const result = Function(`"use strict"; return (${safeExpr})`)();
            if (typeof result === 'number' && isFinite(result)) {
                const formatted = Number.isInteger(result) ? result : Number(result.toFixed(4));
                return { text: `; ${mathClean} = ${formatted}. Quick math!`, nav: null };
            }
        } catch (e) {}
    }

    // 2. Identity Questions
    if (/\b(your name|who are you|what are you)\b/.test(q) || q === 'orange') {
        return { text: "; I'm Orange! I'm Sanju's interactive square AI companion.", nav: null };
    }

    // 3. Portfolio & Sanju-Specific Questions (Strict word boundaries so it never hijacks general questions)
    if (/\b(velo|mobility|scooter)\b/.test(q)) {
        return {
            text: ": Velo is Sanju's smart campus EV mobility app with <15s QR unlock, live dock radar, pause-ride mode, and Blender 3D branding.",
            nav: /\b(open|show|go|view)\b/.test(q) ? 'velo.html' : null
        };
    }
    if (/\b(workmate|multilingual|workforce)\b/.test(q)) {
        return {
            text: ": WorkMate is a multilingual workforce app with 1-tap regional language switching and visual checklists that cut supervisor calls by 80%.",
            nav: /\b(open|show|go|view)\b/.test(q) ? 'workmate.html' : null
        };
    }
    if (/\b(esummit|e-summit|iconnect)\b/.test(q)) {
        return {
            text: ": E-Summit '26 ('Ideas Beyond Boundaries') is the flagship entrepreneurship platform for iConnect with 10+ tracks and <30s registration.",
            nav: /\b(open|show|go|view)\b/.test(q) ? 'esummit.html' : null
        };
    }
    if (/\b(notes|note wall|doodle)\b/.test(q)) {
        return { text: "; Taking you to the Notes wall where you can leave a message or drawing!", nav: 'notes.html' };
    }
    if (/\b(side quest|sidequest|webgl|shader|akatsuki)\b/.test(q)) {
        return { text: "; Taking you to Side Quests—where the WebGL shaders and Three.js experiments live!", nav: 'sidequest.html' };
    }
    if (/\b(sanju|his stack|his skills|hire|internship|freelance|contact sanju)\b/.test(q)) {
        return { text: "; Sanju Singh is a UI/UX & Product Designer and CSE undergrad ('28) skilled in Figma, Framer, Blender, React, and Three.js. Reach him at isanjukatariya@gmail.com!" };
    }

    return null; // Return null for general questions so live AI handles them!
}
const pageCache = new Map();

async function prefetchPage(url) {
    try {
        const cleanUrl = new URL(url, window.location.origin).href;
        if (pageCache.has(cleanUrl) || cleanUrl === window.location.href) return;
        const res = await fetch(cleanUrl);
        if (res.ok) {
            const text = await res.text();
            pageCache.set(cleanUrl, text);
        }
    } catch (e) {}
}

window.addEventListener('load', () => {
    setTimeout(() => {
        ['index.html', 'sidequest.html', 'notes.html', 'about.html'].forEach(prefetchPage);
    }, 1000);
});

async function navigateToPage(destination, pushToHistory = true) {
    clearInterval(countdownTimer);
    sessionStorage.setItem('cursorX', mouseX);
    sessionStorage.setItem('cursorY', mouseY);
    const targetUrl = new URL(destination, window.location.origin).href;

    try {
        let htmlText = pageCache.get(targetUrl);
        if (!htmlText) {
            const response = await fetch(targetUrl);
            if (!response.ok) throw new Error('Fetch failed');
            htmlText = await response.text();
            pageCache.set(targetUrl, htmlText);
        }

        const parser = new DOMParser();
        const newDoc = parser.parseFromString(htmlText, 'text/html');

        const updateDOM = () => {
            document.title = newDoc.title;
            document.body.innerHTML = newDoc.body.innerHTML;
            if (pushToHistory) {
                window.history.pushState({}, '', destination);
            }
            window.scrollTo(0, 0);

            cursorX = mouseX;
            cursorY = mouseY;
            velX = 0;
            velY = 0;
            magnetTarget = null;
            activeMsgTarget = null;

            cursor = document.querySelector('.custom-cursor');
            ensureCursorFace();
            if (cursor) {
                cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
            }
            initOrangeAI();
            initNotesWall();
            init404Timer();
            initChoreographedReveals();
            initInteractivePolish();
            initMagneticElements();
            if (window.lenisInstance) window.lenisInstance.scrollTo(0, { immediate: true });
        };

        if (document.startViewTransition) document.startViewTransition(updateDOM);
        else updateDOM();
    } catch (err) {
        window.location.href = destination;
    }
}

window.addEventListener('popstate', () => {
    navigateToPage(window.location.href, false);
});

function pauseRedirect() {
    redirectPaused = true;
    const statusEl = document.getElementById('redirectStatus');
    if (statusEl) statusEl.textContent = "Auto-teleport paused while you explore.";
}

function init404Timer() {
    clearInterval(countdownTimer);
    const countEl = document.getElementById('countdownNum');
    if (!countEl) return;
    let countdownSeconds = 8;
    redirectPaused = false;
    countdownTimer = setInterval(() => {
        const currentCountEl = document.getElementById('countdownNum');
        if (!currentCountEl || redirectPaused) return;
        countdownSeconds--;
        if (countdownSeconds <= 0) {
            clearInterval(countdownTimer);
            navigateToPage('index.html');
        } else {
            currentCountEl.textContent = countdownSeconds;
        }
    }, 1000);
}

function decorateInteractiveTargets() {
    const navBar = document.querySelector('.nav-bar');
    if (navBar && !navBar.querySelector('a[href="notes.html"]')) {
        const notesLink = document.createElement('a');
        notesLink.href = 'notes.html';
        notesLink.className = 'nav-tab';
        notesLink.textContent = 'Notes';
        const aboutLink = navBar.querySelector('a[href="about.html"]');
        if (aboutLink) navBar.insertBefore(notesLink, aboutLink);
        else navBar.appendChild(notesLink);
    }

    const currentPath = window.location.pathname.toLowerCase();
    document.querySelectorAll('.nav-bar .nav-tab').forEach(tab => {
        const href = (tab.getAttribute('href') || '').toLowerCase();
        const pageName = href.replace('.html', '');
        tab.classList.remove('active');
        if (pageName === 'index' && (currentPath === '/' || currentPath.endsWith('/index') || currentPath.endsWith('/index.html'))) {
            tab.classList.add('active');
        } else if (pageName !== 'index' && pageName && currentPath.includes(pageName)) {
            tab.classList.add('active');
        }
    });

    const footer = document.querySelector('.footer');
    if (footer && !footer.querySelector('.resume-link')) {
        const resumeLink = document.createElement('a');
        resumeLink.href = 'https://drive.google.com/file/d/1BJoCYxxwaykLaQPHFt-SVwH2qJW_7W2Y/view?usp=drive_link';
        resumeLink.target = '_blank';
        resumeLink.rel = 'noopener';
        resumeLink.className = 'footer-link resume-link';
        resumeLink.textContent = 'Resume';
        resumeLink.setAttribute('data-message', '; grab my CV / resume!');
        footer.insertBefore(resumeLink, footer.children[1] || null);
    }

    const veloImg = document.querySelector('.velo-image');
    if (veloImg && !veloImg.hasAttribute('data-message')) veloImg.setAttribute('data-message', ': Campus EV rides & 3D branding');
    const navWork = document.querySelector('a[href="index.html"].nav-tab');
    if (navWork && !navWork.hasAttribute('data-message')) navWork.setAttribute('data-message', ': Selected case studies');
    const navSide = document.querySelector('a[href="sidequest.html"].nav-tab');
    if (navSide && !navSide.hasAttribute('data-message')) navSide.setAttribute('data-message', '; WebGL & 3D experiments');
    const navNotes = document.querySelector('a[href="notes.html"].nav-tab');
    if (navNotes && !navNotes.hasAttribute('data-message')) navNotes.setAttribute('data-message', '; Public visitor wall');
    const navAbout = document.querySelector('a[href="about.html"].nav-tab');
    if (navAbout && !navAbout.hasAttribute('data-message')) navAbout.setAttribute('data-message', ': Meet the human behind me');
}

function initOrangeAI() {
    decorateInteractiveTargets();
    const topBar = document.querySelector('.frame-3');
    const brandTrigger = document.querySelector('.frame-31');
    if (!topBar || !brandTrigger || document.querySelector('.orange-ai-wrapper')) return;

    brandTrigger.setAttribute('data-message', '; Click or press / to talk to me!');

    let badge = brandTrigger.querySelector('.ai-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'ai-badge';
        badge.textContent = ': talk [/]';
        brandTrigger.appendChild(badge);
    }

    const aiWrapper = document.createElement('div');
    aiWrapper.className = 'orange-ai-wrapper';
    aiWrapper.innerHTML = `
        <div class="orange-ai-box">
            <div class="ai-header-row">
                <span>: Orange.AI // Sanju's Companion</span>
                <button class="ai-close-btn" type="button">[ esc to close ]</button>
            </div>
            <div class="ai-output" aria-live="polite"></div>
            <div class="ai-input-row">
                <span class="ai-input-prefix">:</span>
                <input type="text" class="ai-input" placeholder="Ask anything about Sanju's work, stack, or experience..." />
            </div>
            <div class="ai-chips">
                <button type="button" class="ai-chip" data-q="Who is Sanju?">Who is Sanju?</button>
                <button type="button" class="ai-chip" data-q="Tell me about Velo">Velo App</button>
                <button type="button" class="ai-chip" data-q="What is your tech stack?">Design & Tech Stack</button>
                <button type="button" class="ai-chip" data-q="Are you open for internships?">Hire / Contact</button>
            </div>
        </div>
    `;

    topBar.insertAdjacentElement('afterend', aiWrapper);

    const outputEl = aiWrapper.querySelector('.ai-output');
    const inputEl = aiWrapper.querySelector('.ai-input');
    const closeBtn = aiWrapper.querySelector('.ai-close-btn');

    function toggleAI(forceOpen) {
        pauseRedirect();
        const isOpen = forceOpen !== undefined ? forceOpen : !aiWrapper.classList.contains('open');
        if (isOpen) {
            aiWrapper.classList.add('open');
            badge.classList.add('active');
            badge.textContent = '; listening';
            if (!outputEl.textContent) {
                typeAIMessage(": Hey! I'm Sanju's AI companion. Ask me anything about his work, stack, or click a prompt below!", outputEl);
            }
            setTimeout(() => inputEl.focus(), 200);
        } else {
            aiWrapper.classList.remove('open');
            badge.classList.remove('active');
            badge.textContent = ': talk [/]';
            inputEl.blur();
        }
    }

const chatHistory = []; // ohara 

    async function handleQuery(queryText) {
        pauseRedirect();
        const cleanQuery = queryText.trim();
        if (!cleanQuery) return;
        inputEl.value = '';
        showCursorSpeech('; thinking...', 1200, ';');
        typeAIMessage('; thinking...', outputEl);

        // 1. Try your primary Vercel Gemini API (/api/chat)
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: cleanQuery,
                    currentPage: window.location.pathname,
                    history: typeof chatHistory !== 'undefined' ? chatHistory : []
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.text && !data.text.includes('circuits blinked')) {
                    if (typeof chatHistory !== 'undefined') {
                        chatHistory.push({ role: 'user', text: cleanQuery });
                        chatHistory.push({ role: 'model', text: data.text });
                    }
                    typeAIMessage(data.text, outputEl);
                    if (data.nav) setTimeout(() => navigateToPage(data.nav), 1500);
                    return;
                }
            }
        } catch (err) {
            // /api/chat unavailable (e.g., running on VS Code Live Server)
        }

        // 2. Check instant local math or exact portfolio commands
        const localMatch = getAIReply(cleanQuery);
        if (localMatch) {
            typeAIMessage(localMatch.text, outputEl);
            if (localMatch.nav) setTimeout(() => navigateToPage(localMatch.nav), 1400);
            return;
        }

        // 3. Universal Live AI Fallback (Works on Live Server & answers ANY question fast)
        try {
            const aiRes = await fetch('https://text.pollinations.ai/openai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'openai',
                    messages: [
                        {
                            role: 'system',
                            content: "Your name is Orange, the witty AI square on UI/UX Designer & Frontend Dev Sanju Singh's portfolio. Answer ANY question the user asks (general knowledge, coding, science, UX, math, anime, or about Sanju) accurately, fast, and concisely in 1-2 sentences (max 320 chars). Start with '; ' or ': '. No markdown bolding (**)."
                        },
                        { role: 'user', content: cleanQuery }
                    ]
                })
            });
            const aiData = await aiRes.json();
            let reply = aiData?.choices?.[0]?.message?.content?.trim();
            if (reply) {
                reply = reply.replace(/\*\*/g, '').replace(/\s+/g, ' ');
                if (!reply.startsWith(':') && !reply.startsWith(';')) reply = `; ${reply}`;
                typeAIMessage(reply, outputEl);
                return;
            }
        } catch (fallbackErr) {}

        typeAIMessage("; My connection hiccupped—ask me that one more time!", outputEl);
    }

    brandTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAI();
    });
    const askBtn = document.getElementById('askOrange404Btn');
    if (askBtn) askBtn.addEventListener('click', () => toggleAI(true));
    closeBtn.addEventListener('click', () => toggleAI(false));
    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleQuery(inputEl.value);
        }
    });
    aiWrapper.querySelectorAll('.ai-chip').forEach(chip => {
        chip.addEventListener('click', () => handleQuery(chip.getAttribute('data-q')));
    });
}

let hasDrawnDoodle = false;
let doodleStrokeColor = '#A769F7';
let doodleHistory = [];
let memoryNotesCache = null;
let notesFetchPromise = null;

function escapeHTML(str) {
    return (str || '').replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
}

function fetchCloudNotesSilent() {
    if (!FIREBASE_DB_URL) return Promise.resolve(null);
    if (notesFetchPromise) return notesFetchPromise;

    notesFetchPromise = fetch(`${FIREBASE_DB_URL.replace(/\/$/, '')}/notes.json`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
            notesFetchPromise = null;
            if (data && typeof data === 'object' && !data.error) {
                const cloudNotes = Object.values(data)
                    .filter(item => item && typeof item === 'object')
                    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                const merged = [...cloudNotes, ...starterNotes];
                memoryNotesCache = merged;
                try {
                    localStorage.setItem('sanju_cloud_notes_v1', JSON.stringify(merged));
                } catch (e) {}
                return merged;
            }
            return null;
        })
        .catch(() => {
            notesFetchPromise = null;
            return null;
        });

    return notesFetchPromise;
}

fetchCloudNotesSilent();

async function loadAllNotes() {
    const notesContainer = document.getElementById('notesListContainer');
    if (!notesContainer) return;

    function renderNotesList(notesArray) {
        notesContainer.innerHTML = notesArray.map(n => `
            <article class="note-card">
                <div class="note-card-body">
                    ${n.text ? `<p class="note-card-text">${escapeHTML(n.text)}</p>` : ''}
                    ${n.doodle ? `<img src="${n.doodle}" alt="Visitor doodle" class="note-card-doodle" decoding="async" />` : ''}
                </div>
                <span class="note-card-author">${escapeHTML(n.author || 'Anonymous')}</span>
            </article>
        `).join('');
    }

    const persistedCloud = JSON.parse(localStorage.getItem('sanju_cloud_notes_v1') || 'null');
    const localSaved = JSON.parse(localStorage.getItem('sanju_visitor_notes') || '[]');
    const instantNotes = memoryNotesCache || persistedCloud || (localSaved.length ? [...localSaved, ...starterNotes] : null);

    if (instantNotes && instantNotes.length > 0) {
        renderNotesList(instantNotes);
    } else {
        notesContainer.innerHTML = `
            <article class="note-card note-skeleton"></article>
            <article class="note-card note-skeleton"></article>
        `;
    }

    const freshNotes = await fetchCloudNotesSilent();
    if (freshNotes) {
        renderNotesList(freshNotes);
    }
}

function initNotesWall() {
    const canvas = document.getElementById('doodleCanvas');
    if (!canvas) return;
    loadAllNotes();

    document.querySelectorAll('.color-swatch').forEach(swatch => {
        if (swatch.getAttribute('data-color') === '#DC5C2C') {
            swatch.setAttribute('data-color', '#A769F7');
            swatch.style.backgroundColor = '#A769F7';
        }
    });

    if (canvas.dataset.bound === 'true') return;
    canvas.dataset.bound = 'true';

    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function saveCanvasState() {
        doodleHistory.push(canvas.toDataURL());
        if (doodleHistory.length > 15) doodleHistory.shift();
    }

    function getCanvasPos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    canvas.addEventListener('mousedown', (e) => {
        saveCanvasState();
        isDrawing = true;
        hasDrawnDoodle = true;
        const pos = getCanvasPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const pos = getCanvasPos(e);
        const brushEl = document.getElementById('brushSize');
        ctx.strokeStyle = doodleStrokeColor;
        ctx.lineWidth = brushEl ? parseFloat(brushEl.value) : 2;
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    });

    window.addEventListener('mouseup', () => { isDrawing = false; });

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        saveCanvasState();
        isDrawing = true;
        hasDrawnDoodle = true;
        const pos = getCanvasPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        const pos = getCanvasPos(e);
        const brushEl = document.getElementById('brushSize');
        ctx.strokeStyle = doodleStrokeColor;
        ctx.lineWidth = brushEl ? parseFloat(brushEl.value) : 2;
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }, { passive: false });

    window.addEventListener('touchend', () => { isDrawing = false; });
}

document.addEventListener('click', async (e) => {
    const openBtn = e.target.closest('#openComposerBtn');
    if (openBtn) {
        const composer = document.getElementById('noteComposer');
        if (composer) {
            const isOpen = composer.classList.toggle('open');
            openBtn.textContent = isOpen ? '- Click to hide' : '+ New note';
            
            if (isOpen) {
                initNotesWall();
                showCursorSpeech('; write something cool!', 1600, ';');
                const msgInput = document.getElementById('noteMessage');
                if (msgInput) setTimeout(() => msgInput.focus(), 200);
            } else {
                showCursorSpeech(': maybe next time!', 1200, ':');
            }
        }
        return;
    }

    if (e.target.closest('#closeComposer')) {
        const composer = document.getElementById('noteComposer');
        const btn = document.getElementById('openComposerBtn');
        if (composer) composer.classList.remove('open');
        if (composer) composer.classList.remove('open');
        const openBtn = document.getElementById('openComposerBtn');
        if (openBtn) openBtn.textContent = '+ New note';
        if (btn) btn.textContent = '+ New note';
        return;
    }
    if (e.target.closest('#toggleDoodleBtn')) {
        const doodleWrapper = document.getElementById('doodlePadWrapper');
        const doodleArrow = document.getElementById('doodleArrow');
        if (doodleWrapper) {
            const isOpen = doodleWrapper.classList.toggle('open');
            if (doodleArrow) doodleArrow.textContent = isOpen ? '▾' : '▸';
            initNotesWall();
        }
        return;
    }

    const swatch = e.target.closest('.color-swatch');
    if (swatch) {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        doodleStrokeColor = swatch.getAttribute('data-color');
        return;
    }

    if (e.target.closest('#clearDoodle')) {
        const canvas = document.getElementById('doodleCanvas');
        if (canvas) {
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            hasDrawnDoodle = false;
            doodleHistory = [];
        }
        return;
    }

    if (e.target.closest('#undoDoodle')) {
        const canvas = document.getElementById('doodleCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (doodleHistory.length === 0) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                hasDrawnDoodle = false;
            } else {
                const lastState = doodleHistory.pop();
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                };
                img.src = lastState;
            }
        }
        return;
    }

    const link = e.target.closest('a');
    if (!link || link.classList.contains('frame-31') || link.hostname !== window.location.hostname || link.target === '_blank' || link.href.includes('#') || link.href.startsWith('mailto:')) return;
    e.preventDefault();
    navigateToPage(link.href);
});

document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'noteForm') {
        e.preventDefault();
        const textEl = document.getElementById('noteMessage');
        const authorEl = document.getElementById('noteAuthor');
        const canvas = document.getElementById('doodleCanvas');
        const textVal = textEl ? textEl.value.trim() : '';
        const authorVal = (authorEl && authorEl.value.trim()) ? authorEl.value.trim() : 'Anonymous';
        const doodleVal = (hasDrawnDoodle && canvas) ? canvas.toDataURL('image/png') : null;

        if (!textVal && !doodleVal) {
            showCursorSpeech('; write or draw something first!', 1800, ';');
            return;
        }

        const submitBtn = document.getElementById('submitNoteBtn');
        if (submitBtn) {
            submitBtn.textContent = 'Posting...';
            submitBtn.disabled = true;
        }

        const newEntry = {
            text: textVal,
            author: authorVal,
            doodle: doodleVal,
            timestamp: Date.now()
        };

        const localSaved = JSON.parse(localStorage.getItem('sanju_visitor_notes') || '[]');
        localSaved.unshift(newEntry);
        localStorage.setItem('sanju_visitor_notes', JSON.stringify(localSaved));

        if (FIREBASE_DB_URL) {
            try {
                await fetch(`${FIREBASE_DB_URL.replace(/\/$/, '')}/notes.json`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newEntry)
                });
            } catch (err) {}
        }

        e.target.reset();
        if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        hasDrawnDoodle = false;
        doodleHistory = [];

        const doodleWrapper = document.getElementById('doodlePadWrapper');
        const doodleArrow = document.getElementById('doodleArrow');
        const composer = document.getElementById('noteComposer');
        if (doodleWrapper) doodleWrapper.classList.remove('open');
        if (doodleArrow) doodleArrow.textContent = '▸';
        if (composer) composer.classList.remove('open');

        if (submitBtn) {
            submitBtn.textContent = 'Post note ↗';
            submitBtn.disabled = false;
        }

        memoryNotesCache = null;
        showCursorSpeech(': yay! your note is on the wall!', 2400, ';');
        await loadAllNotes();
    }
});

document.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (activeTag === 'input' || activeTag === 'textarea') {
        eyeVelX += (Math.random() - 0.5) * 4;
        eyeVelY = 1.8;
        impulseCursorScale(1.12, 0.9);
    }
    if (e.key === '/' && activeTag !== 'input' && activeTag !== 'textarea') {
        e.preventDefault();
        const brandTrigger = document.querySelector('.frame-31');
        if (brandTrigger) brandTrigger.click();
    } else if (e.key === 'Escape') {
        const wrapper = document.querySelector('.orange-ai-wrapper.open');
        if (wrapper) {
            const closeBtn = wrapper.querySelector('.ai-close-btn');
            if (closeBtn) closeBtn.click();
        }
        const composer = document.getElementById('noteComposer');
        if (composer && composer.classList.contains('open')) {
            composer.classList.remove('open');
            const openBtn = document.getElementById('openComposerBtn');
            if (openBtn) openBtn.textContent = '+ New note';
        }
    }
});

initOrangeAI();
initNotesWall();
init404Timer();

let revealObserver = null;

function initChoreographedReveals() {
    if (revealObserver) revealObserver.disconnect();

    const targets = document.querySelectorAll(
        '.heading h1, .heading h2, .nav-bar, .project-card, .grid-col img, .case-study > *, .note-card, .lost-card'
    );

    revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.08,
        rootMargin: '0px 0px -20px 0px'
    });

    targets.forEach((el, index) => {
        el.classList.remove('is-visible');
        el.classList.add('reveal-item');
        const delay = Math.min(index * 55, 330);
        el.style.transitionDelay = `${delay}ms`;
        revealObserver.observe(el);
    });
}

function initLenisSmoothScroll() {
    if (window.lenisInstance || window.innerWidth <= 768) return;
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/lenis@1.1.20/dist/lenis.min.js';
    script.onload = () => {
        const lenis = new Lenis({
            duration: 1.1,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true
        });
        window.lenisInstance = lenis;
        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    };
    document.head.appendChild(script);
}

initChoreographedReveals();
initLenisSmoothScroll();

function initInteractivePolish() {
    document.querySelectorAll('.cs-image, .about-grid img').forEach(img => {
        if (!img.hasAttribute('data-message')) {
            img.setAttribute('data-message', ': click to inspect full screen');
        }
    });

    document.querySelectorAll('a[href^="mailto:"], a[href*="mail.google.com"]').forEach(emailLink => {
        emailLink.setAttribute('data-message', '; click to copy email');
        if (emailLink.dataset.copyBound === 'true') return;
        emailLink.dataset.copyBound = 'true';

        emailLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const email = 'isanjukatariya@gmail.com';
            navigator.clipboard.writeText(email).then(() => {
                const originalText = emailLink.textContent;
                emailLink.textContent = 'copied: isanjukatariya@gmail.com ✓';
                emailLink.style.color = '#A769F7';
                showCursorSpeech('; email copied to clipboard!', 2400, ';');
                impulseCursorScale(1.3, 0.75);
                setTimeout(() => {
                    emailLink.textContent = originalText;
                    emailLink.style.color = '';
                }, 2400);
            });
        });
    });
}

let lightboxEl = null;

function ensureLightbox() {
    if (document.querySelector('.lightbox-overlay')) {
        lightboxEl = document.querySelector('.lightbox-overlay');
        return lightboxEl;
    }
    lightboxEl = document.createElement('div');
    lightboxEl.className = 'lightbox-overlay';
    lightboxEl.setAttribute('data-message', '; click anywhere or press esc to close');
    lightboxEl.innerHTML = `
        <img class="lightbox-img" src="" alt="Full screen preview" />
        <span class="lightbox-hint">: ESC OR CLICK TO CLOSE</span>
    `;
    document.body.appendChild(lightboxEl);

    lightboxEl.addEventListener('click', () => {
        lightboxEl.classList.remove('open');
        hideCursorSpeech();
    });
    return lightboxEl;
}

document.addEventListener('click', (e) => {
    const zoomImg = e.target.closest('.cs-image, .about-grid img');
    if (zoomImg) {
        const box = ensureLightbox();
        const preview = box.querySelector('.lightbox-img');
        preview.src = zoomImg.src;
        box.classList.add('open');
        impulseCursorScale(1.25, 0.8);
        showCursorSpeech('; full-res view — click anywhere to close', 2200, ';');
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightboxEl && lightboxEl.classList.contains('open')) {
        lightboxEl.classList.remove('open');
    }
});

initInteractivePolish();

function initOrangePreloader() {
    if (sessionStorage.getItem('orangePreloaded') === 'true') return;
    sessionStorage.setItem('orangePreloaded', 'true');

    const loader = document.createElement('div');
    loader.className = 'orange-preloader';
    loader.innerHTML = `
        <div class="preloader-cube" id="preloadCube">
            <span></span><span></span>
        </div>
        <div class="preloader-meta">
            <span>: Orange.OS</span>
            <span class="preloader-percent" id="preloadCount">00%</span>
        </div>
    `;
    document.body.appendChild(loader);

    const countEl = document.getElementById('preloadCount');
    const cubeEl = document.getElementById('preloadCube');
    let progress = 0;

    setTimeout(() => {
        if (cubeEl) cubeEl.classList.add('blink');
        setTimeout(() => cubeEl && cubeEl.classList.remove('blink'), 120);
    }, 380);

    const counterInterval = setInterval(() => {
        progress += Math.floor(Math.random() * 24) + 16;
        if (progress >= 100) {
            progress = 100;
            clearInterval(counterInterval);
            if (countEl) countEl.textContent = '100%';
            setTimeout(() => {
                loader.classList.add('preload-done');
                initChoreographedReveals();
                setTimeout(() => loader.remove(), 750);
            }, 180);
        } else if (countEl) {
            countEl.textContent = `${String(progress).padStart(2, '0')}%`;
        }
    }, 85);
}

function initMagneticElements() {
    if (window.innerWidth <= 768) return;
    const magnets = document.querySelectorAll('.nav-tab, .ai-badge, .ai-chip, .btn-home-orange, .btn-secondary-outline');

    magnets.forEach(btn => {
        if (btn.dataset.magneticBound === 'true') return;
        btn.dataset.magneticBound = 'true';

        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const offsetX = ((e.clientX - rect.left) - rect.width / 2) * 0.22;
            const offsetY = ((e.clientY - rect.top) - rect.height / 2) * 0.28;
            btn.style.transform = `translate3d(${offsetX.toFixed(1)}px, ${offsetY.toFixed(1)}px, 0)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });
}

initOrangePreloader();
initMagneticElements();



(function() {
    const css = `
        @media (hover: none) and (pointer: coarse), (max-width: 768px) {
            .custom-cursor {
                display: none !important;
                opacity: 0 !important;
                visibility: hidden !important;
            }
        }
        .custom-cursor,
        .custom-cursor.cursor-text {
            width: 16px !important;
            height: 16px !important;
        }
        .custom-cursor.cursor-text .cursor-shape {
            width: 16px !important;
            height: 16px !important;
            border-radius: 0px !important;
        }
        .custom-cursor .cursor-face {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            overflow: visible !important;
            pointer-events: none !important;
            opacity: 1 !important;
            visibility: visible !important;
            transition: background-color 0.28s cubic-bezier(0.22, 1, 0.36, 1),
                        box-shadow 0.28s cubic-bezier(0.22, 1, 0.36, 1) !important;
        }
        .custom-cursor.is-docked,
        .custom-cursor.is-docked .cursor-shape,
        .custom-cursor.is-docked .cursor-face {
            --scale-x: 1 !important;
            --scale-y: 1 !important;
            --rotate: 0deg !important;
            width: 16px !important;
            height: 16px !important;
        }
        .custom-cursor.cursor-chat {
            display: inline-flex !important;
            align-items: center !important;
        }
        .custom-cursor.cursor-chat .cursor-shape {
            display: inline-flex !important;
            align-items: center !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        .custom-cursor .cursor-eyes-rig {
            display: none !important;
        }
        .custom-cursor.is-angry .cursor-face {
            background-color: #B82914 !important;
            box-shadow: 0 0 10px rgba(184, 41, 20, 0.45) !important;
        }
        .orange-rig {
            position: relative !important;
            width: 16px !important;
            height: 16px !important;
            background: transparent !important;
            border-radius: 0px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            transform-origin: center center !important;
            will-change: transform !important;
            pointer-events: none !important;
            backface-visibility: hidden !important;
            -webkit-font-smoothing: antialiased !important;
        }
        .orange-eye-wrap {
            position: relative !important;
            width: 11px !important;
            height: 9px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            pointer-events: none !important;
        }
        .orange-eye {
            background-color: #FFFFFF !important;
            border-radius: 0px !important;
            will-change: transform, width, height, clip-path !important;
            transform-origin: center center !important;
            flex-shrink: 0 !important;
            box-sizing: border-box !important;
            transition: clip-path 0.14s ease, background-color 0.12s ease, border 0.12s ease !important;
        }
        .orange-rig.style-arc .orange-eye {
            background-color: transparent !important;
            border-top: 2px solid #FFFFFF !important;
            border-left: 2px solid #FFFFFF !important;
        }
        .orange-rig.style-squish .orange-eye.left {
            background-color: transparent !important;
            border-top: 1.8px solid #FFFFFF !important;
            border-right: 1.8px solid #FFFFFF !important;
        }
        .orange-rig.style-squish .orange-eye.right {
            background-color: transparent !important;
            border-top: 1.8px solid #FFFFFF !important;
            border-left: 1.8px solid #FFFFFF !important;
        }
        .orange-rig.style-hollow .orange-eye {
            background-color: transparent !important;
            border: 1.5px solid #FFFFFF !important;
        }
        .orange-rig.style-angry .orange-eye.left {
            clip-path: polygon(0 0, 100% 42%, 100% 100%, 0 100%) !important;
        }
        .orange-rig.style-angry .orange-eye.right {
            clip-path: polygon(0 42%, 100% 0, 100% 100%, 0 100%) !important;
        }
        .orange-cheek {
            position: absolute !important;
            bottom: 1.5px !important;
            width: 3px !important;
            height: 1.5px !important;
            background-color: #FFB49A !important;
            opacity: 0 !important;
            transform: scale(0.6) !important;
            transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
            pointer-events: none !important;
        }
        .orange-cheek.left { left: 0px !important; }
        .orange-cheek.right { right: 0px !important; }
        .orange-rig.show-blush .orange-cheek {
            opacity: 0.95 !important;
            transform: scale(1) !important;
        }
        .orange-emote {
            position: absolute !important;
            top: -9px !important;
            left: -15px !important;
            right: auto !important;
            font-family: 'Bricolage Grotesque', monospace, sans-serif !important;
            font-size: 10px !important;
            font-weight: 800 !important;
            line-height: 1 !important;
            color: #DC5C2C !important;
            background: transparent !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            opacity: 0 !important;
            transform: translate(4px, 4px) scale(0.35) !important;
            transition: opacity 0.16s ease, transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s ease !important;
            pointer-events: none !important;
            user-select: none !important;
            z-index: 25 !important;
        }
        .custom-cursor.is-angry .orange-emote {
            color: #B82914 !important;
        }
        .orange-emote.show {
            opacity: 1 !important;
            transform: translate(0px, 0px) scale(1) !important;
        }
        .frame-3 {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 8px !important;
        }
        .top-ist-status {
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            white-space: nowrap !important;
            font-variant-numeric: tabular-nums !important;
            cursor: pointer !important;
            transition: color 0.2s ease !important;
            line-height: 1 !important;
        }
        .top-ist-dot {
            width: 6px !important;
            height: 6px !important;
            background-color: #DC5C2C !important;
            border-radius: 0px !important;
            display: inline-block !important;
            flex-shrink: 0 !important;
            animation: statusPulse 2.2s infinite ease-in-out !important;
        }
        @keyframes statusPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.85); }
        }
        @media (max-width: 640px) {
            .top-ist-status {
                font-size: 12px !important;
                letter-spacing: -0.01em !important;
            }
            .top-ist-status .desk-only {
                display: none !important;
            }
        }
        body.blueprint-xray * {
            outline: 1px dashed rgba(220, 92, 44, 0.38) !important;
        }
        body.blueprint-xray .project-card,
        body.blueprint-xray .cs-image,
        body.blueprint-xray .note-card,
        body.blueprint-xray .nav-bar,
        body.blueprint-xray .frame-3 {
            outline: 1px solid #DC5C2C !important;
            background-color: rgba(220, 92, 44, 0.03) !important;
        }
        body.blueprint-xray img {
            filter: grayscale(100%) contrast(1.1) opacity(0.82) !important;
        }
    `;

    function createSpring(initial, stiffness = 0.19, damping = 0.78) {
        return {
            val: initial,
            target: initial,
            vel: 0,
            k: stiffness,
            d: damping,
            step() {
                this.vel += (this.target - this.val) * this.k;
                this.vel *= this.d;
                this.val += this.vel;
                return this.val;
            },
            impulse(force) {
                this.vel += force;
            }
        };
    }

    const MOOD_PRESETS = {
        normal:    { lw: 2.5, lh: 4.2, lrot: 0,   ly: 0,    rw: 2.5, rh: 4.2, rrot: 0,   ry: 0,    blush: false, style: '' },
        blink:     { lw: 3.6, lh: 0.8, lrot: 0,   ly: 0.2,  rw: 3.6, rh: 0.8, rrot: 0,   ry: 0.2,  blush: false, style: '' },
        happy:     { lw: 3.8, lh: 3.8, lrot: 45,  ly: 1.0,  rw: 3.8, rh: 3.8, rrot: 45,  ry: 1.0,  blush: true,  style: 'style-arc' },
        love:      { lw: 4.0, lh: 4.0, lrot: 45,  ly: 0.8,  rw: 4.0, rh: 4.0, rrot: 45,  ry: 0.8,  blush: true,  style: 'style-arc' },
        curious:   { lw: 3.6, lh: 5.0, lrot: -4,  ly: -0.6, rw: 3.2, rh: 2.0, rrot: 6,   ry: 0.4,  blush: false, style: '' },
        skeptical: { lw: 3.5, lh: 1.5, lrot: 8,   ly: 0.4,  rw: 3.4, rh: 4.8, rrot: -4,  ry: -0.6, blush: false, style: '' },
        focus:     { lw: 4.0, lh: 2.0, lrot: 8,   ly: 0.2,  rw: 4.0, rh: 2.0, rrot: -8,  ry: 0.2,  blush: false, style: '' },
        angry:     { lw: 4.4, lh: 3.2, lrot: 18,  ly: 0.3,  rw: 4.4, rh: 3.2, rrot: -18, ry: 0.3,  blush: false, style: 'style-angry' },
        shock:     { lw: 4.4, lh: 4.6, lrot: 0,   ly: -0.4, rw: 4.4, rh: 4.6, rrot: 0,   ry: -0.4, blush: false, style: 'style-hollow' },
        wink:      { lw: 3.8, lh: 1.2, lrot: 8,   ly: 0.3,  rw: 2.8, rh: 4.5, rrot: 0,   ry: -0.3, blush: true,  style: '' },
        squish:    { lw: 3.6, lh: 3.6, lrot: 45,  ly: 0.2,  rw: 3.6, rh: 3.6, rrot: -45, ry: 0.2,  blush: false, style: 'style-squish' },
        dizzy:     { lw: 4.0, lh: 1.4, lrot: 38,  ly: -0.4, rw: 4.0, rh: 1.4, rrot: -38, ry: 0.4,  blush: false, style: '' },
        thinking:  { lw: 3.0, lh: 2.2, lrot: 0,   ly: -1.3, rw: 3.0, rh: 2.2, rrot: 0,   ry: -1.3, blush: false, style: '' },
        sleep:     { lw: 3.6, lh: 1.0, lrot: 0,   ly: 0.8,  rw: 3.6, rh: 1.0, rrot: 0,   ry: 0.8,  blush: false, style: '' }
    };

    function bootUnifiedOrangeSystem() {
        if (!document.getElementById('orange-spring-styles')) {
            const style = document.createElement('style');
            style.id = 'orange-spring-styles';
            style.textContent = css;
            document.head.appendChild(style);
        }

        function mountRig() {
            ensureCursorFace();
            const face = document.querySelector('.custom-cursor .cursor-face');
            if (!face) return null;
            let rig = document.getElementById('orangeRig');
            if (!rig) {
                rig = document.createElement('div');
                rig.id = 'orangeRig';
                rig.className = 'orange-rig';
                rig.innerHTML = `
                    <div class="orange-eye-wrap">
                        <div class="orange-eye left" id="orangeEyeL"></div>
                        <div class="orange-eye right" id="orangeEyeR"></div>
                    </div>
                    <div class="orange-cheek left"></div>
                    <div class="orange-cheek right"></div>
                    <div class="orange-emote" id="orangeEmote"></div>
                `;
                face.appendChild(rig);
            }
            return rig;
        }

        if (!mountRig()) {
            setTimeout(bootUnifiedOrangeSystem, 100);
            return;
        }

        const sScaleX = createSpring(1, 0.20, 0.78);
        const sScaleY = createSpring(1, 0.20, 0.78);
        const sRot    = createSpring(0, 0.16, 0.80);
        const sBobY   = createSpring(0, 0.15, 0.82);

        const sLookX  = createSpring(0, 0.22, 0.78);
        const sLookY  = createSpring(0, 0.22, 0.78);
        const sLookXR = createSpring(0, 0.18, 0.78);
        const sLookYR = createSpring(0, 0.18, 0.78);

        const sLW   = createSpring(2.5, 0.24, 0.76);
        const sLH   = createSpring(4.2, 0.24, 0.76);
        const sLRot = createSpring(0,   0.22, 0.78);
        const sLY   = createSpring(0,   0.22, 0.78);

        const sRW   = createSpring(2.5, 0.24, 0.76);
        const sRH   = createSpring(4.2, 0.24, 0.76);
        const sRRot = createSpring(0,   0.22, 0.78);
        const sRY   = createSpring(0,   0.22, 0.78);

        let mood = 'normal';
        let activeStyle = '';
        let moodTimer = null;
        let idleTimer = null;
        let emoteTimer = null;
        let prevX = window.innerWidth / 2;
        let prevY = window.innerHeight / 2;
        let prevScrollY = window.scrollY;
        let dirChanges = 0;
        let lastDirX = 0;
        let petDecayTimer = null;
        let rapidClicks = 0;
        let clickResetTimer = null;
        let backspaceCount = 0;
        let lastObservedText = '';
        let settleTimer = null;
        let isPeekingEdge = false;
        let t = 0;

        function showEmote(char, ms = 1000) {
            const emote = document.getElementById('orangeEmote');
            if (!emote) return;
            emote.textContent = char;
            emote.classList.add('show');
            clearTimeout(emoteTimer);
            emoteTimer = setTimeout(() => emote.classList.remove('show'), ms);
        }

        function applyPreset(name) {
            const rig = document.getElementById('orangeRig');
            const cursorEl = document.querySelector('.custom-cursor');
            const p = MOOD_PRESETS[name] || MOOD_PRESETS.normal;
            sLW.target = p.lw;
            sLH.target = p.lh;
            sLRot.target = p.lrot;
            sLY.target = p.ly;
            sRW.target = p.rw;
            sRH.target = p.rh;
            sRRot.target = p.rrot;
            sRY.target = p.ry;
            activeStyle = p.style || '';
            if (rig) {
                rig.className = `orange-rig ${activeStyle} ${p.blush ? 'show-blush' : ''}`.trim();
            }
            if (cursorEl) {
                cursorEl.classList.toggle('is-angry', name === 'angry');
            }
        }

        function setMood(newMood, duration = 0, emoteChar = '') {
            const mapped = newMood === 'squint' ? 'squish' : (newMood || 'normal');
            mood = mapped;
            applyPreset(mapped);
            if (emoteChar) showEmote(emoteChar, duration || 1100);
            clearTimeout(moodTimer);
            if (duration > 0) {
                moodTimer = setTimeout(() => {
                    if (mood === mapped) setMood('normal');
                }, duration);
            }
        }

        window.setOrangeExpression = setMood;
        const origSetCursorMood = window.setCursorMood;
        window.setCursorMood = function(m, dur = 0) {
            if (typeof origSetCursorMood === 'function') origSetCursorMood(m, dur);
            if (mood === 'angry') return;
            setMood(m || 'normal', dur);
        };

        function triggerBlink(doubleBlink = false) {
            if (mood === 'sleep' || mood === 'thinking' || mood === 'angry') return;
            const savedMood = mood;
            applyPreset('blink');
            setTimeout(() => {
                applyPreset(savedMood);
                if (doubleBlink) {
                    setTimeout(() => {
                        applyPreset('blink');
                        setTimeout(() => applyPreset(savedMood), 90);
                    }, 100);
                }
            }, 90);
        }

        setInterval(() => {
            if (mood !== 'normal' || !hasStartedMoving || !isMouseActive) return;
            const r = Math.random();
            if (r < 0.64) {
                triggerBlink(Math.random() < 0.35);
            } else if (r < 0.82) {
                const dartX = (Math.random() - 0.5) * 4.2;
                const dartY = (Math.random() - 0.5) * 2.8;
                sLookX.target = dartX;
                sLookXR.target = dartX;
                sLookY.target = dartY;
                sLookYR.target = dartY;
                setTimeout(() => {
                    sLookX.target = 0;
                    sLookXR.target = 0;
                    sLookY.target = 0;
                    sLookYR.target = 0;
                }, 520);
            } else if (r < 0.92) {
                setMood('wink', 480, '✦');
                sRot.impulse(4);
            } else {
                setMood('skeptical', 700);
                sRot.target = -5;
                setTimeout(() => { sRot.target = 0; }, 700);
            }
        }, 2800);

        document.addEventListener('mouseleave', () => {
            targetScaleX = 1;
            targetScaleY = 1;
            scaleX = 1;
            scaleY = 1;
            scaleVelX = 0;
            scaleVelY = 0;
            setMood('sleep', 0, 'zZz');
        });

        document.addEventListener('selectionchange', () => {
            const sel = window.getSelection();
            const selectedText = sel ? sel.toString().trim() : '';
            if (selectedText.length > 2 && mood !== 'angry' && mood !== 'thinking') {
                setMood('focus', 1100);
                const sweep = ((selectedText.length % 12) / 12) * 4.4 - 2.2;
                sLookX.target = sweep;
                sLookXR.target = sweep;
            }
        });

        window.addEventListener('mousemove', (e) => {
            const dx = e.clientX - prevX;
            const dy = e.clientY - prevY;
            prevX = e.clientX;
            prevY = e.clientY;
            const speed = Math.hypot(dx, dy);

            if (mood === 'sleep') {
                setMood('happy', 900, '✦');
                sScaleX.impulse(0.20);
                sScaleY.impulse(-0.16);
            }

            const lx = Math.max(-3.0, Math.min(3.0, dx * 0.20));
            const ly = Math.max(-2.6, Math.min(2.6, dy * 0.20));
            sLookX.target = lx;
            sLookY.target = ly;
            sLookXR.target = lx;
            sLookYR.target = ly;

            const pad = 12;
            const nearEdge = e.clientX <= pad || e.clientX >= window.innerWidth - pad || e.clientY <= pad || e.clientY >= window.innerHeight - pad;
            if (nearEdge) {
                if (!isPeekingEdge && mood === 'normal') {
                    isPeekingEdge = true;
                    setMood('curious', 0);
                }
            } else if (isPeekingEdge) {
                isPeekingEdge = false;
                if (mood === 'curious') setMood('normal');
            }

            const curDirX = Math.sign(dx);
            if (curDirX !== 0 && curDirX !== lastDirX && speed > 3 && speed < 42) {
                dirChanges++;
                lastDirX = curDirX;
                clearTimeout(petDecayTimer);
                petDecayTimer = setTimeout(() => { dirChanges = 0; }, 750);
                if (dirChanges >= 4 && mood !== 'love' && mood !== 'angry') {
                    dirChanges = 0;
                    setMood('love', 1600, '♥');
                    showCursorSpeech('; purr... that feels nice!', 1500, ';');
                    sScaleX.impulse(0.22);
                    sScaleY.impulse(0.22);
                }
            }

            if (speed > 125 && mood !== 'thinking' && mood !== 'speaking' && mood !== 'angry') {
                setMood('dizzy', 950, '~');
                sRot.impulse(dx > 0 ? 12 : -12);
            }

            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                if (mood === 'normal' && hasStartedMoving && isMouseActive) {
                    setMood('sleep', 0, 'zZz');
                }
            }, 7000);
        });

        window.addEventListener('scroll', () => {
            const sy = window.scrollY;
            const sDelta = sy - prevScrollY;
            prevScrollY = sy;
            if (Math.abs(sDelta) > 18 && mood === 'normal' && hasStartedMoving) {
                setMood('squish', 220);
                sScaleY.impulse(Math.min(0.22, Math.abs(sDelta) * 0.0035));
                sScaleX.impulse(-Math.min(0.14, Math.abs(sDelta) * 0.0025));
                sLookY.target = Math.max(-2.6, Math.min(2.6, sDelta * 0.08));
                sLookYR.target = sLookY.target;
            }
        }, { passive: true });

        window.addEventListener('mousedown', (e) => {
            const isInteractive = e.target.closest('a, button, input, textarea, select, canvas, .frame-31, .orange-ai-wrapper, .project-card, .note-composer-box, .lost-card');
            if (!isInteractive) {
                rapidClicks++;
                clearTimeout(clickResetTimer);
                clickResetTimer = setTimeout(() => { rapidClicks = 0; }, 900);

                if (rapidClicks >= 4) {
                    rapidClicks = 0;
                    setMood('angry', 2200, '//');
                    sScaleX.impulse(0.36);
                    sScaleY.impulse(0.36);
                    showCursorSpeech(': HEY! Stop poking me!!', 2000, 'angry');
                    return;
                }
            }

            sScaleX.impulse(0.28);
            sScaleY.impulse(-0.22);
            if (mood !== 'thinking' && mood !== 'speaking' && mood !== 'angry') {
                setMood('squish', 220);
            }
        });

        window.addEventListener('dblclick', (e) => {
            if (mood === 'angry' || e.target.closest('a, button, input, textarea')) return;
            setMood('love', 1100, '✦');
            sRot.val = 0;
            sRot.impulse(52);
            sBobY.impulse(-4.5);
            impulseCursorScale(1.22, 0.80);
            showCursorSpeech('; 360 kickflip!!', 1400, ';');
        });

        window.addEventListener('keydown', (e) => {
            const active = document.activeElement;
            const tag = active ? active.tagName.toLowerCase() : '';

            if (e.key === 'Backspace') {
                backspaceCount++;
                setTimeout(() => { backspaceCount = Math.max(0, backspaceCount - 1); }, 1200);
                if (backspaceCount >= 5) {
                    backspaceCount = 0;
                    setMood('angry', 1800, '//');
                    showCursorSpeech(': aggressive deleting!!', 1600, 'angry');
                    return;
                }
            }

            if (tag === 'input' || tag === 'textarea') {
                const val = (active.value || '').toLowerCase();
                if (/\b(angry|mad|hate|stupid|bad|ugly|dumb|annoying)\b/.test(val)) {
                    setMood('angry', 2000, '//');
                    return;
                }
                if (mood !== 'angry') setMood('focus', 850);
                sBobY.impulse(-1.2);
                const sweep = ((active.value?.length || 0) % 18) / 18 * 4.6 - 2.3;
                sLookX.target = sweep;
                sLookXR.target = sweep;
            } else if (!e.metaKey && !e.ctrlKey && !e.altKey) {
                const key = e.key.toLowerCase();
                if (key === 'c') {
                    copySanjuEmail();
                } else if (key === 'w') {
                    const isXray = document.body.classList.toggle('blueprint-xray');
                    setMood(isXray ? 'focus' : 'happy', 1400, '✦');
                    showCursorSpeech(isXray ? ': blueprint wireframe [W] ON' : '; blueprint wireframe OFF', 1800, isXray ? ':' : ';');
                }
            }
        });

        document.addEventListener('mouseover', (e) => {
            if (mood === 'thinking' || mood === 'speaking' || mood === 'angry') return;
            if (e.target.closest('.project-card, .cs-image, .cs-deck-wrapper')) {
                setMood('curious', 0, '✦');
                sRot.target = -6;
            } else if (e.target.closest('a, button, .nav-tab, .ai-chip, #openComposerBtn')) {
                setMood('happy');
                sScaleY.impulse(0.16);
                sScaleX.impulse(-0.10);
            } else if (e.target.closest('input, textarea')) {
                setMood('focus');
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (mood === 'thinking' || mood === 'speaking' || mood === 'angry') return;
            if (e.target.closest('a, button, .project-card, .cs-image, .cs-deck-wrapper, .nav-tab, .ai-chip, #openComposerBtn, input, textarea')) {
                setMood('normal');
                sRot.target = 0;
            }
        });

           let cachedRig = mountRig();
        let cachedEyeL = document.getElementById('orangeEyeL');
        let cachedEyeR = document.getElementById('orangeEyeR');
        let cachedCursor = document.querySelector('.custom-cursor');
        let cachedAiOut = document.querySelector('.ai-output');
        let wasDocked = null;

        function refreshCachedNodes() {
            cachedRig = mountRig();
            cachedEyeL = document.getElementById('orangeEyeL');
            cachedEyeR = document.getElementById('orangeEyeR');
            cachedCursor = document.querySelector('.custom-cursor');
            cachedAiOut = document.querySelector('.ai-output');
            if (cachedCursor) {
                cachedCursor.style.setProperty('--face-x', '0px');
                cachedCursor.style.setProperty('--face-y', '0px');
                cachedCursor.style.setProperty('--scale-x', '1');
                cachedCursor.style.setProperty('--scale-y', '1');
                cachedCursor.style.setProperty('--rotate', '0deg');
            }
        }
        refreshCachedNodes();
        window.addEventListener('popstate', () => setTimeout(refreshCachedNodes, 60));
        document.addEventListener('click', () => setTimeout(refreshCachedNodes, 120));

        function tick() {
            t += 0.075;
            if (!cachedRig || !cachedRig.isConnected) refreshCachedNodes();

            const isDocked = !hasStartedMoving || !isMouseActive;
            const isChatting = cachedCursor && cachedCursor.classList.contains('cursor-chat');

            if (cachedCursor && isDocked !== wasDocked) {
                wasDocked = isDocked;
                cachedCursor.classList.toggle('is-docked', isDocked);
            }

            if (cachedAiOut) {
                const txt = cachedAiOut.textContent;
                if (txt !== lastObservedText) {
                    lastObservedText = txt;
                    const trimmed = txt.trim();
                    if (trimmed.includes('thinking...')) {
                        setMood('thinking', 0, '...');
                    } else if (trimmed.length > 0 && mood !== 'angry') {
                        mood = 'speaking';
                        applyPreset('normal');
                        sScaleY.impulse((Math.random() * 0.20) - 0.07);
                        sScaleX.impulse((Math.random() * 0.14) - 0.07);
                        sLH.target = 1.8 + Math.random() * 2.6;
                        sRH.target = 1.8 + Math.random() * 2.6;
                        clearTimeout(settleTimer);
                        settleTimer = setTimeout(() => {
                            setMood(trimmed.startsWith(':') ? 'focus' : 'happy', 2200, '✦');
                        }, 140);
                    }
                }
            }

            if (isDocked) {
                sScaleX.target = 1; sScaleY.target = 1;
                sScaleX.val = 1; sScaleY.val = 1;
                sScaleX.vel = 0; sScaleY.vel = 0;
                sRot.target = 0; sRot.val = 0; sRot.vel = 0;
                sBobY.target = 0; sBobY.val = 0; sBobY.vel = 0;
                sLookX.target = 0; sLookY.target = 0;
                sLookXR.target = 0; sLookYR.target = 0;

                if (hasStartedMoving && mood !== 'sleep') {
                    setMood('sleep', 0, 'zZz');
                }
            } else {
                const stretchX = Math.min(0.18, Math.abs(velX) * 0.008) - Math.min(0.10, Math.abs(velY) * 0.004);
                const stretchY = Math.min(0.18, Math.abs(velY) * 0.008) - Math.min(0.10, Math.abs(velX) * 0.004);
                sScaleX.target += ((1 + stretchX) - sScaleX.target) * 0.28;
                sScaleY.target += ((1 + stretchY) - sScaleY.target) * 0.28;

                if (mood === 'normal') {
                    sRot.target = Math.max(-12, Math.min(12, velX * 0.35));
                }
                sLookX.target *= 0.86;
                sLookY.target *= 0.86;
                sLookXR.target *= 0.86;
                sLookYR.target *= 0.86;

                if (mood === 'thinking') {
                    const scan = Math.sin(t * 2.6) * 2.8;
                    sLookX.target = scan; sLookXR.target = scan;
                    sLookY.target = -1.0; sLookYR.target = -1.0;
                    sBobY.target = isChatting ? 0 : Math.sin(t * 3.0) * -1.6;
                } else if (mood === 'angry') {
                    sBobY.target = isChatting ? 0 : Math.sin(t * 14) * 0.9;
                    sRot.target = Math.cos(t * 16) * 4.5;
                    sScaleX.target = 1.08; sScaleY.target = 0.94;
                } else if (mood === 'sleep') {
                    sBobY.target = isChatting ? 0 : Math.sin(t * 0.5) * 0.8;
                    sScaleX.target = 1; sScaleY.target = 1;
                } else {
                    sBobY.target = isChatting ? 0 : Math.sin(t * 1.1) * -0.55;
                }
            }

            const sx = sScaleX.step();
            const sy = sScaleY.step();
            const rt = sRot.step();
            const by = sBobY.step();

            const lx = sLookX.step();
            const ly = sLookY.step();
            const rx = sLookXR.step();
            const ry = sLookYR.step();

            const lw = Math.max(1, sLW.step());
            const lh = Math.max(0.8, sLH.step());
            const lrot = sLRot.step();
            const lOffsetY = sLY.step();

            const rw = Math.max(1, sRW.step());
            const rh = Math.max(0.8, sRH.step());
            const rrot = sRRot.step();
            const rOffsetY = sRY.step();

            if (cachedRig) {
                cachedRig.style.transform = `translate3d(0, ${by.toFixed(2)}px, 0) rotate(${rt.toFixed(2)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
            }

            if (cachedEyeL && cachedEyeR) {
                cachedEyeL.style.width = `${lw.toFixed(2)}px`;
                cachedEyeL.style.height = `${lh.toFixed(2)}px`;
                cachedEyeL.style.transform = `translate3d(${lx.toFixed(2)}px, ${(ly + lOffsetY).toFixed(2)}px, 0) rotate(${lrot.toFixed(1)}deg)`;

                cachedEyeR.style.width = `${rw.toFixed(2)}px`;
                cachedEyeR.style.height = `${rh.toFixed(2)}px`;
                cachedEyeR.style.transform = `translate3d(${rx.toFixed(2)}px, ${(ry + rOffsetY).toFixed(2)}px, 0) rotate(${rrot.toFixed(1)}deg)`;
            }

            requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
    }

    const visits = parseInt(localStorage.getItem('orange_visit_count') || '0', 10) + 1;
    localStorage.setItem('orange_visit_count', String(visits));

    function getSavedVisitorName() {
        try {
            const notes = JSON.parse(localStorage.getItem('sanju_visitor_notes') || '[]');
            const named = notes.find(n => n && n.author && n.author.toLowerCase() !== 'anonymous');
            return named ? named.author.split(' ')[0] : null;
        } catch (e) {
            return null;
        }
    }

    function getVisitorCity() {
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
            if (!tz.includes('/')) return null;
            const city = tz.split('/').pop().replace(/_/g, ' ');
            if (city === 'Calcutta' || city === 'Kolkata') return 'India';
            return city;
        } catch (e) {
            return null;
        }
    }

    function getReferrerSource() {
        const ref = (document.referrer || '').toLowerCase();
        const params = new URLSearchParams(window.location.search);
        const utm = (params.get('ref') || params.get('utm_source') || '').toLowerCase();
        const source = `${ref} ${utm}`;
        if (source.includes('linkedin')) return 'LinkedIn';
        if (source.includes('t.co') || source.includes('twitter') || source.includes('x.com')) return 'X';
        if (source.includes('github')) return 'GitHub';
        if (source.includes('instagram')) return 'Instagram';
        return null;
    }

    function getTimeFlavor() {
        const hr = new Date().getHours();
        const day = new Date().getDay();
        if (hr >= 23 || hr < 4) return "; burning the midnight oil? i'm Orange!";
        if (hr >= 5 && hr < 11) return "; good morning! grab a coffee & explore";
        if (day === 0 || day === 6) return "; weekend portfolio hunting? welcome!";
        return null;
    }

    function getHardwareFlavor() {
        const ua = navigator.userAgent.toLowerCase();
        if (window.screen.width >= 2560) return ": press [W] to toggle blueprint grid view";
        if (ua.includes('mac')) return "; fellow Mac user! press [C] to copy email";
        if (ua.includes('linux')) return ": Linux user spotted! press [W] for wireframe view";
        return "; press [W] for blueprint view or [C] for email";
    }

    let batteryAlert = null;
    if (navigator.getBattery) {
        navigator.getBattery().then(bat => {
            if (!bat.charging && bat.level <= 0.20) {
                batteryAlert = `: heads up—your battery is at ${Math.round(bat.level * 100)}%!`;
            }
        }).catch(() => {});
    }

    function buildPersonalGreeting() {
        const savedName = getSavedVisitorName();
        const refSource = getReferrerSource();
        const city = getVisitorCity();
        const timeMsg = getTimeFlavor();

        if (savedName && visits > 1) return `; welcome back, ${savedName}! missed you ♥`;
        if (refSource) return `; hey ${refSource} traveler! i'm Orange`;
        if (batteryAlert) return batteryAlert;
        if (visits > 2) return `; back for visit #${visits}! glad you're here ♥`;
        if (city && city !== 'India') return `; visiting from ${city}? hi, i'm Orange!`;
        if (timeMsg) return timeMsg;
        if (city === 'India') return "; same timezone as Sanju! hi, i'm Orange";
        return "; hi! i'm Orange, Sanju's AI companion";
    }

    function updatePageClickReactions() {
        if (typeof clickReactions === 'undefined' || !Array.isArray(clickReactions)) return;
        const path = window.location.pathname.toLowerCase();
        const hwLine = getHardwareFlavor();
        let pool = [];

        if (path.includes('velo') || path.includes('workmate') || path.includes('esummit')) {
            pool = [
                ": click any screen to inspect full-res!",
                "; press [W] to inspect the layout wireframe",
                ": press / to ask me about this case study",
                "; press [C] to copy Sanju's email",
                hwLine
            ];
        } else if (path.includes('notes')) {
            pool = [
                "; draw a doodle on the wall!",
                "; leave your name & i'll remember you next time",
                ": 100% live Firebase cloud wall",
                hwLine
            ];
        } else if (path.includes('sidequest')) {
            pool = [
                "; WebGL shaders & 3D experiments live here!",
                ": built with Three.js & custom GLSL",
                hwLine
            ];
        } else if (path.includes('about')) {
            pool = [
                "; press [C] to copy Sanju's email!",
                ": CSE '28 undergrad & product designer",
                "; powered by coffee & One Piece",
                hwLine
            ];
        } else {
            pool = [
                "; press / to ask me anything!",
                "; press [C] to copy Sanju's email",
                ": press [W] to toggle blueprint X-ray mode",
                "; wiggle your mouse to pet me!",
                hwLine
            ];
        }

        if (batteryAlert) pool.unshift(batteryAlert);
        clickReactions.length = 0;
        clickReactions.push(...pool);
    }

    const origShowSpeech = window.showCursorSpeech;
    if (typeof origShowSpeech === 'function') {
        window.showCursorSpeech = function(msg, duration = 0, mood = 'happy') {
            if (typeof msg === 'string' && msg.includes('zzz... press / to wake me up')) {
                return;
            }
            if (typeof msg === 'string' && msg.includes("hi! i'm Sanju's AI companion")) {
                const personalMsg = buildPersonalGreeting();
                const isLove = personalMsg.includes('♥');
                if (isLove && typeof window.setOrangeExpression === 'function') {
                    window.setOrangeExpression('love', 2000, '♥');
                }
                return origShowSpeech(personalMsg, 2800, isLove ? ';' : mood);
            }
            return origShowSpeech(msg, duration, mood);
        };
    }

    function copySanjuEmail() {
        const email = 'isanjukatariya@gmail.com';
        navigator.clipboard.writeText(email).then(() => {
            if (typeof window.setOrangeExpression === 'function') {
                window.setOrangeExpression('love', 1600, '✦');
            }
            if (typeof window.showCursorSpeech === 'function') {
                window.showCursorSpeech('; copied isanjukatariya@gmail.com!', 2200, ';');
            }
            const headerStatus = document.querySelector('.top-ist-status');
            if (headerStatus) {
                headerStatus.dataset.copied = 'true';
                const isMobile = window.innerWidth <= 640;
                headerStatus.innerHTML = `<span class="top-ist-dot"></span><span>${isMobile ? 'Copied email ✓' : 'Copied: isanjukatariya@gmail.com ✓'}</span>`;
                headerStatus.style.color = '#DC5C2C';
                setTimeout(() => {
                    headerStatus.dataset.copied = 'false';
                    headerStatus.style.color = '';
                    updateHeaderClock();
                }, 2200);
            }
        });
    }

    function updateHeaderClock() {
        const topBar = document.querySelector('.frame-3');
        if (!topBar) return;

        let rightEl = topBar.querySelector('.top-ist-status') || topBar.querySelector('.frame-2') || topBar.querySelector('.roles');
        if (!rightEl) {
            rightEl = document.createElement('div');
            rightEl.className = 'frame-2 top-ist-status roles';
            topBar.appendChild(rightEl);
        } else {
            rightEl.classList.add('top-ist-status', 'roles');
        }

        rightEl.setAttribute('data-message', '; press [C] or click to copy email');

        if (rightEl.dataset.boundClick !== 'true') {
            rightEl.dataset.boundClick = 'true';
            rightEl.addEventListener('click', copySanjuEmail);
        }

        if (rightEl.dataset.copied === 'true') return;

        const now = new Date().toLocaleTimeString('en-US', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        rightEl.innerHTML = `<span class="top-ist-dot"></span><span>IST ${now}</span><span class="desk-only">• Available [C]</span>`;
    }

    document.addEventListener('click', (e) => {
        if (e.target.closest('.resume-link')) {
            sessionStorage.setItem('orange_viewing_resume', 'true');
        }
        setTimeout(() => {
            updatePageClickReactions();
            updateHeaderClock();
        }, 140);
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && sessionStorage.getItem('orange_viewing_resume') === 'true') {
            sessionStorage.removeItem('orange_viewing_resume');
            setTimeout(() => {
                if (typeof window.setOrangeExpression === 'function') {
                    window.setOrangeExpression('wink', 1600, '✦');
                }
                if (typeof window.showCursorSpeech === 'function') {
                    window.showCursorSpeech('; liked the resume? press [C] to copy email!', 2600, ';');
                }
            }, 300);
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            bootUnifiedOrangeSystem();
            updateHeaderClock();
            updatePageClickReactions();
        });
    } else {
        bootUnifiedOrangeSystem();
        updateHeaderClock();
        updatePageClickReactions();
    }

    setInterval(updateHeaderClock, 10000);
    window.addEventListener('popstate', () => {
        setTimeout(() => {
            updateHeaderClock();
            updatePageClickReactions();
        }, 100);
    });
})();







(function() {
    const marvelCss = `
        .cad-crosshair-x, .cad-crosshair-y, .cad-coords {
            position: fixed !important;
            pointer-events: none !important;
            z-index: 99998 !important;
            display: none !important;
        }
        body.blueprint-xray .cad-crosshair-x,
        body.blueprint-xray .cad-crosshair-y,
        body.blueprint-xray .cad-coords {
            display: block !important;
        }
        .cad-crosshair-x {
            left: 0 !important;
            right: 0 !important;
            height: 1px !important;
            background: rgba(220, 92, 44, 0.35) !important;
        }
        .cad-crosshair-y {
            top: 0 !important;
            bottom: 0 !important;
            width: 1px !important;
            background: rgba(220, 92, 44, 0.35) !important;
        }
        .cad-coords {
            font-family: 'Bricolage Grotesque', monospace, sans-serif !important;
            font-size: 10px !important;
            font-weight: 700 !important;
            background: #DC5C2C !important;
            color: #FAF8F5 !important;
            padding: 2px 5px !important;
            letter-spacing: 0.04em !important;
            white-space: nowrap !important;
            transform: translate(12px, -24px) !important;
        }
        .cad-spec-badge {
            position: absolute !important;
            top: 0 !important;
            right: 0 !important;
            background: #DC5C2C !important;
            color: #FFFFFF !important;
            font-family: 'Bricolage Grotesque', monospace, sans-serif !important;
            font-size: 10px !important;
            font-weight: 700 !important;
            padding: 2px 6px !important;
            z-index: 30 !important;
            pointer-events: none !important;
            letter-spacing: 0.03em !important;
        }
        .agent-highlight-pulse {
            outline: 2px solid #DC5C2C !important;
            outline-offset: 6px !important;
            transition: outline 0.25s ease, outline-offset 0.25s ease !important;
        }
        .ghost-peer-cursor {
            position: fixed !important;
            width: 14px !important;
            height: 14px !important;
            border: 1.5px dashed #DC5C2C !important;
            background: rgba(220, 92, 44, 0.14) !important;
            pointer-events: none !important;
            z-index: 99990 !important;
            transition: transform 0.65s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }
        .ghost-peer-label {
            position: absolute !important;
            top: -16px !important;
            left: 16px !important;
            font-family: 'Bricolage Grotesque', monospace, sans-serif !important;
            font-size: 9px !important;
            font-weight: 700 !important;
            color: #DC5C2C !important;
            background: #FAF8F5 !important;
            border: 1px solid rgba(220, 92, 44, 0.4) !important;
            padding: 1px 4px !important;
            white-space: nowrap !important;
        }
        .next-case-architectural {
            margin: 72px 0 24px 0 !important;
            padding: 28px 32px !important;
            border: 1px solid rgba(24, 34, 45, 0.16) !important;
            background: rgba(220, 92, 44, 0.025) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 20px !important;
            text-decoration: none !important;
            color: #18222D !important;
            transition: border-color 0.22s ease, background-color 0.22s ease, transform 0.22s ease !important;
            cursor: pointer !important;
        }
        .next-case-architectural:hover {
            border-color: #DC5C2C !important;
            background: rgba(220, 92, 44, 0.07) !important;
            transform: translateY(-2px) !important;
        }
        .next-case-meta {
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
        }
        .next-case-kicker {
            font-size: 11px !important;
            font-weight: 700 !important;
            letter-spacing: 0.08em !important;
            text-transform: uppercase !important;
            color: #DC5C2C !important;
        }
        .next-case-title {
            font-size: 22px !important;
            font-weight: 700 !important;
            color: #18222D !important;
            line-height: 1.2 !important;
        }
        .next-case-sub {
            font-size: 13px !important;
            color: rgba(24, 34, 45, 0.68) !important;
        }
        .next-case-arrow {
            font-size: 20px !important;
            font-weight: 700 !important;
            color: #DC5C2C !important;
            white-space: nowrap !important;
        }
        .sq-tech-pill {
            display: inline-block !important;
            margin-top: 6px !important;
            padding: 2px 7px !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            color: #DC5C2C !important;
            border: 1px solid rgba(220, 92, 44, 0.35) !important;
            background: rgba(220, 92, 44, 0.05) !important;
            letter-spacing: 0.02em !important;
        }
        .live-peer-pill {
            color: #DC5C2C !important;
            font-weight: 700 !important;
            margin-left: 4px !important;
        }
        @media (max-width: 768px) {
            .cad-crosshair-x, .cad-crosshair-y, .cad-coords, .ghost-peer-cursor {
                display: none !important;
            }
            .next-case-architectural {
                padding: 20px !important;
                flex-direction: column !important;
                align-items: flex-start !important;
            }
        }
    `;

    function injectMarvelStyles() {
        if (!document.getElementById('orange-marvel-styles')) {
            const st = document.createElement('style');
            st.id = 'orange-marvel-styles';
            st.textContent = marvelCss;
            document.head.appendChild(st);
        }
    }

    let crossX = null, crossY = null, coordsEl = null;

    function ensureCadHud() {
        injectMarvelStyles();
        if (!crossX) {
            crossX = document.createElement('div');
            crossX.className = 'cad-crosshair-x';
            crossY = document.createElement('div');
            crossY.className = 'cad-crosshair-y';
            coordsEl = document.createElement('div');
            coordsEl.className = 'cad-coords';
            document.body.append(crossX, crossY, coordsEl);
        }
    }

    function refreshCadSpecBadges() {
        document.querySelectorAll('.cad-spec-badge').forEach(b => b.remove());
        if (!document.body.classList.contains('blueprint-xray')) return;

        const targets = document.querySelectorAll('.project-card, .cs-image, .note-card, .cs-stats-row, .lost-card');
        targets.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.width < 40 || rect.height < 25) return;
            const computed = window.getComputedStyle(el);
            if (computed.position === 'static') el.style.position = 'relative';

            const badge = document.createElement('span');
            badge.className = 'cad-spec-badge';
            badge.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}px`;
            el.appendChild(badge);
        });
    }

    window.addEventListener('mousemove', (e) => {
        if (!document.body.classList.contains('blueprint-xray')) return;
        ensureCadHud();
        crossX.style.top = `${e.clientY}px`;
        crossY.style.left = `${e.clientX}px`;
        coordsEl.style.left = `${e.clientX}px`;
        coordsEl.style.top = `${e.clientY}px`;
        coordsEl.textContent = `X:${e.clientX} Y:${e.clientY} // GRID:0PX`;
    });

    const bodyAttrObserver = new MutationObserver(() => {
        ensureCadHud();
        refreshCadSpecBadges();
    });
    bodyAttrObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', () => {
        if (document.body.classList.contains('blueprint-xray')) refreshCadSpecBadges();
    });

    let activeTourTimers = [];
    function clearTour() {
        activeTourTimers.forEach(t => clearTimeout(t));
        activeTourTimers = [];
        document.querySelectorAll('.agent-highlight-pulse').forEach(el => el.classList.remove('agent-highlight-pulse'));
    }

    function pulseAndScrollTo(el, speechText, mood = ';') {
        if (!el) return;
        document.querySelectorAll('.agent-highlight-pulse').forEach(n => n.classList.remove('agent-highlight-pulse'));
        el.classList.add('agent-highlight-pulse');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof window.setOrangeExpression === 'function') {
            window.setOrangeExpression(mood === ';' ? 'happy' : 'focus', 2200, '✦');
        }
        if (speechText && typeof window.showCursorSpeech === 'function') {
            window.showCursorSpeech(speechText, 2400, mood);
        }
        setTimeout(() => el.classList.remove('agent-highlight-pulse'), 2400);
    }

    function runAgenticTour() {
        clearTour();
        const wrapper = document.querySelector('.orange-ai-wrapper.open');
        if (wrapper) {
            const closeBtn = wrapper.querySelector('.ai-close-btn');
            if (closeBtn) closeBtn.click();
        }

        const path = window.location.pathname.toLowerCase();
        const isCaseStudy = path.includes('velo') || path.includes('workmate') || path.includes('esummit');

        if (isCaseStudy) {
            const steps = [
                { sel: '.cs-stats-row, .case-study h1', msg: ': step 1 // core impact & headline metrics', mood: ':' },
                { sel: '.cs-feature-grid, .cs-split-grid, .cs-image', msg: '; step 2 // system architecture & flows', mood: ';' },
                { sel: '.cs-deck-wrapper, .next-case-architectural', msg: ': step 3 // full pitch deck & next project!', mood: ':' }
            ];
            let delay = 100;
            steps.forEach((st) => {
                const target = document.querySelector(st.sel);
                if (target) {
                    activeTourTimers.push(setTimeout(() => pulseAndScrollTo(target, st.msg, st.mood), delay));
                    delay += 2800;
                }
            });
        } else {
            const cards = document.querySelectorAll('.project-card');
            const c1 = cards[0];
            const c2 = cards[1];
            const c3 = cards[2];
            const steps = [
                { el: c1, msg: '; 01 // Velo: <15s QR EV unlock & 3D branding', mood: ';' },
                { el: c2, msg: ': 02 // WorkMate: cut supervisor calls by 80%', mood: ':' },
                { el: c3, msg: '; 03 // E-Summit 26: 10+ tracks & <30s reg', mood: ';' },
                { el: document.querySelector('.top-ist-status') || document.querySelector('.frame-3'), msg: '; press [C] anytime to copy Sanju’s email!', mood: ';' }
            ];
            let delay = 100;
            steps.forEach((st) => {
                if (st.el) {
                    activeTourTimers.push(setTimeout(() => pulseAndScrollTo(st.el, st.msg, st.mood), delay));
                    delay += 2700;
                }
            });
        }
    }

    function executeSmartChipAction(cmd) {
        if (cmd === '__TOUR__') {
            runAgenticTour();
            return true;
        }
        if (cmd === '__BLUEPRINT__') {
            const isXray = document.body.classList.toggle('blueprint-xray');
            refreshCadSpecBadges();
            if (typeof window.setOrangeExpression === 'function') {
                window.setOrangeExpression(isXray ? 'focus' : 'happy', 1500, '✦');
            }
            if (typeof window.showCursorSpeech === 'function') {
                window.showCursorSpeech(isXray ? ': CAD Blueprint HUD [W] ON' : '; CAD Blueprint HUD OFF', 1900, isXray ? ':' : ';');
            }
            return true;
        }
        if (cmd === '__METRICS__') {
            const stats = document.querySelector('.cs-stats-row') || document.querySelector('.project-card');
            if (stats) {
                pulseAndScrollTo(stats, ': key measurable outcomes right here!', ':');
                return true;
            }
        }
        if (cmd === '__COPY_EMAIL__') {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }));
            return true;
        }
        return false;
    }

    function upgradeAiChipsAndContext() {
        const chipContainer = document.querySelector('.orange-ai-wrapper .ai-chips');
        const outputEl = document.querySelector('.orange-ai-wrapper .ai-output');
        if (!chipContainer) return;

        const path = window.location.pathname.toLowerCase();
        if (chipContainer.dataset.upgradedPath === path) return;
        chipContainer.dataset.upgradedPath = path;

        let chipsConfig = [];
        if (path.includes('velo') || path.includes('workmate') || path.includes('esummit')) {
            chipsConfig = [
                { label: '⚡ Highlight Impact Metrics', action: '__METRICS__' },
                { label: '🧭 10s Case Study Tour', action: '__TOUR__' },
                { label: '📐 Toggle CAD Blueprint [W]', action: '__BLUEPRINT__' },
                { label: '📋 Copy Sanju Email [C]', action: '__COPY_EMAIL__' }
            ];
        } else {
            chipsConfig = [
                { label: '🧭 20s Guided Portfolio Tour', action: '__TOUR__' },
                { label: '📐 Toggle CAD Blueprint [W]', action: '__BLUEPRINT__' },
                { label: '🧠 Why Hire Sanju?', q: 'Why should we hire Sanju? What makes his design & frontend work stand out?' },
                { label: '📋 Copy Email [C]', action: '__COPY_EMAIL__' }
            ];
        }

        chipContainer.innerHTML = chipsConfig.map(c =>
            `<button type="button" class="ai-chip" data-action="${c.action || ''}" data-q="${c.q || ''}">${c.label}</button>`
        ).join('');

        chipContainer.querySelectorAll('.ai-chip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const act = btn.getAttribute('data-action');
                const q = btn.getAttribute('data-q');
                if (act && executeSmartChipAction(act)) return;
                if (q) {
                    const inputEl = document.querySelector('.orange-ai-wrapper .ai-input');
                    if (inputEl) {
                        inputEl.value = q;
                        inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                    } else if (outputEl && typeof typeAIMessage === 'function') {
                        typeAIMessage(": Sanju bridges product thinking with real frontend engineering—shipping <15s EV flows (Velo), 80% fewer support calls (WorkMate), and custom 60fps WebGL/JS systems.", outputEl);
                    }
                }
            });
        });
    }

    function injectNextCaseStudyBlock() {
        const path = window.location.pathname.toLowerCase();
        const caseContainer = document.querySelector('.case-study');
        if (!caseContainer || document.querySelector('.next-case-architectural')) return;

        let nextData = null;
        if (path.includes('velo')) {
            nextData = {
                href: 'workmate.html',
                kicker: 'NEXT CASE STUDY // 02 OF 03',
                title: 'WorkMate: Multilingual Workforce Experience',
                sub: 'How 1-tap regional language switching & visual checklists cut supervisor calls by 80%.'
            };
        } else if (path.includes('workmate')) {
            nextData = {
                href: 'esummit.html',
                kicker: 'NEXT CASE STUDY // 03 OF 03',
                title: "E-Summit '26: Ideas Beyond Boundaries",
                sub: 'Designing a high-conversion flagship entrepreneurship platform with 10+ tracks & <30s registration.'
            };
        } else if (path.includes('esummit')) {
            nextData = {
                href: 'velo.html',
                kicker: 'NEXT CASE STUDY // 01 OF 03',
                title: 'Velo: Smart Campus EV Mobility App',
                sub: 'Sub-15s QR unlock flow, live dock radar, pause-ride mode, and custom Blender 3D branding.'
            };
        }

        if (!nextData) return;

        const block = document.createElement('a');
        block.href = nextData.href;
        block.className = 'next-case-architectural';
        block.setAttribute('data-message', `; click to read ${nextData.title.split(':')[0]}`);
        block.innerHTML = `
            <div class="next-case-meta">
                <span class="next-case-kicker">${nextData.kicker}</span>
                <span class="next-case-title">${nextData.title}</span>
                <span class="next-case-sub">${nextData.sub}</span>
            </div>
            <span class="next-case-arrow">Explore Next →</span>
        `;
        caseContainer.appendChild(block);
    }

    function decorateSideQuestSpecs() {
        const path = window.location.pathname.toLowerCase();
        if (!path.includes('sidequest')) return;

        
        cards.forEach((card, idx) => {
            if (card.querySelector('.sq-tech-pill')) return;
            const desc = card.querySelector('p') || card;
            const pill = document.createElement('div');
            pill.className = 'sq-tech-pill';
            pill.textContent = specs[idx % specs.length];
            desc.appendChild(pill);
        });
    }

    const sessionId = 'peer_' + Math.random().toString(36).slice(2, 9);
    const visitorCity = (() => {
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
            return tz.includes('/') ? tz.split('/').pop().replace(/_/g, ' ') : 'Visitor';
        } catch (e) { return 'Visitor'; }
    })();

    let normX = 0.5, normY = 0.3;
    window.addEventListener('mousemove', (e) => {
        normX = Number((e.clientX / Math.max(1, window.innerWidth)).toFixed(3));
        normY = Number((e.clientY / Math.max(1, window.innerHeight)).toFixed(3));
    });

    const ghostNodes = new Map();

    async function syncMultiplayerPresence() {
        if (typeof FIREBASE_DB_URL === 'undefined' || !FIREBASE_DB_URL) return;
        const base = FIREBASE_DB_URL.replace(/\/$/, '');
        const now = Date.now();

        try {
            await fetch(`${base}/presence/${sessionId}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    x: normX,
                    y: normY,
                    city: visitorCity,
                    page: window.location.pathname.replace(/\//g, '') || 'index.html',
                    ts: now
                })
            });

            const res = await fetch(`${base}/presence.json`);
            if (!res.ok) return;
            const all = await res.json();
            if (!all || typeof all !== 'object') return;

            let activeCount = 0;
            const activeIds = new Set();

            Object.entries(all).forEach(([id, data]) => {
                if (!data || typeof data !== 'object') return;
                const age = now - (data.ts || 0);
                if (age < 25000) {
                    activeCount++;
                    if (id !== sessionId && window.innerWidth > 768) {
                        activeIds.add(id);
                        let ghost = ghostNodes.get(id);
                        if (!ghost) {
                            ghost = document.createElement('div');
                            ghost.className = 'ghost-peer-cursor';
                            ghost.innerHTML = `<span class="ghost-peer-label"></span>`;
                            document.body.appendChild(ghost);
                            ghostNodes.set(id, ghost);
                        }
                        const gx = Math.round((data.x || 0.5) * window.innerWidth);
                        const gy = Math.round((data.y || 0.3) * window.innerHeight);
                        ghost.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
                        const label = ghost.querySelector('.ghost-peer-label');
                        if (label) label.textContent = `: ${data.city || 'peer'}`;
                    }
                } else if (age > 60000) {
                    fetch(`${base}/presence/${id}.json`, { method: 'DELETE' }).catch(() => {});
                }
            });

            ghostNodes.forEach((node, id) => {
                if (!activeIds.has(id)) {
                    node.remove();
                    ghostNodes.delete(id);
                }
            });

            const headerStatus = document.querySelector('.top-ist-status');
            if (headerStatus && headerStatus.dataset.copied !== 'true') {
                let peerBadge = headerStatus.querySelector('.live-peer-pill');
                if (activeCount > 1) {
                    if (!peerBadge) {
                        peerBadge = document.createElement('span');
                        peerBadge.className = 'live-peer-pill';
                        headerStatus.appendChild(peerBadge);
                    }
                    peerBadge.textContent = `• ${activeCount} LIVE`;
                } else if (peerBadge) {
                    peerBadge.remove();
                }
            }
        } catch (e) {}
    }

    window.addEventListener('beforeunload', () => {
        if (typeof FIREBASE_DB_URL !== 'undefined' && FIREBASE_DB_URL) {
            const base = FIREBASE_DB_URL.replace(/\/$/, '');
            navigator.sendBeacon && navigator.sendBeacon(`${base}/presence/${sessionId}.json`, 'null');
        }
    });

    function bootAllMarvelUpgrades() {
        ensureCadHud();
        upgradeAiChipsAndContext();
        injectNextCaseStudyBlock();
        decorateSideQuestSpecs();
        if (document.body.classList.contains('blueprint-xray')) {
            refreshCadSpecBadges();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootAllMarvelUpgrades);
    } else {
        bootAllMarvelUpgrades();
    }

    setTimeout(syncMultiplayerPresence, 1200);
    setInterval(syncMultiplayerPresence, 6500);

    window.addEventListener('popstate', () => setTimeout(bootAllMarvelUpgrades, 120));
    document.addEventListener('click', () => setTimeout(bootAllMarvelUpgrades, 180));
})();
