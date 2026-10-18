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
            showCursorSpeech("zzz... press / to wake me up", 2800, 'sleep');
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
            cursor.classList.add('cursor-text');
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

        const stiffness = 0.26;
        const damping = 0.68;
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
    const q = rawQuery.toLowerCase().trim();
    if (q.includes('home') || q.includes('back to work')) {
        return { text: "; Teleporting you back to Sanju's main Work page right now!", nav: 'index.html' };
    }
    if (q.includes('velo') || q.includes('cycle') || q.includes('mobility')) {
        return { text: ": Velo is a campus EV cycle and scooter rental platform with real-time tracking, custom 3D branding, and seamless booking. Want me to open the case study?", nav: q.includes('open') || q.includes('show') ? 'velo.html' : null };
    }
    if (q.includes('workmate') || q.includes('multilingual') || q.includes('workforce')) {
        return { text: ": WorkMate is a multilingual workforce management app designed to bridge language barriers for daily task management and communication.", nav: q.includes('open') || q.includes('show') ? 'workmate.html' : null };
    }
    if (q.includes('esummit') || q.includes('e-summit') || q.includes('iconnect')) {
        return { text: ": E-Summit '26 is an event platform built to showcase startup culture, innovation, and entrepreneurship.", nav: q.includes('open') || q.includes('show') ? 'esummit.html' : null };
    }
    if (q.includes('note') || q.includes('wall') || q.includes('doodle')) {
        return { text: "; Taking you to the Notes wall where you can leave a message or drawing!", nav: 'notes.html' };
    }
    if (q.includes('side quest') || q.includes('3d') || q.includes('webgl') || q.includes('shader') || q.includes('akatsuki')) {
        return { text: "; Taking you to Side Quests—where the WebGL shaders, Three.js experiments, and creative coding live!", nav: 'sidequest.html' };
    }
    if (q.includes('stack') || q.includes('tool') || q.includes('skill') || q.includes('code')) {
        return { text: ": Sanju designs in Figma & Framer, and builds with HTML5, CSS3, Vanilla JS, React, Tailwind CSS, and Three.js / WebGL shaders." };
    }
    if (q.includes('hire') || q.includes('intern') || q.includes('contact') || q.includes('email') || q.includes('freelance')) {
        return { text: "; Sanju is open to UI/UX & Product Design internships and collaborations! Reach out directly at isanjukatariya@gmail.com." };
    }
    if (q.includes('coffee') || q.includes('anime') || q.includes('manga') || q.includes('fun')) {
        return { text: "; Powered by iced coffee, One Piece, Cowboy Bebop, and manga. Usually overthinking micro-interactions at 2 AM." };
    }
    if (q.includes('who') || q.includes('about') || q.includes('sanju')) {
        return { text: ": Sanju Singh is a UI/UX & Product Designer and CSE undergrad ('28) who loves blending clean visual systems with interactive code." };
    }
    return { text: ": Ask me about Sanju's projects (Velo, WorkMate, E-Summit), his design/tech stack, internship availability, or type 'notes' to visit the wall." };
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

    async function handleQuery(queryText) {
        pauseRedirect();
        const cleanQuery = queryText.trim();
        if (!cleanQuery) return;
        inputEl.value = '';
        showCursorSpeech('; thinking...', 1200, ';');
        typeAIMessage('; thinking...', outputEl);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: cleanQuery, currentPage: window.location.pathname })
            });
            if (!res.ok) throw new Error('API fallback');
            const data = await res.json();
            if (!data.text || data.text.includes('circuits blinked')) throw new Error('API fallback');
            typeAIMessage(data.text, outputEl);
            if (data.nav) setTimeout(() => navigateToPage(data.nav), 1600);
        } catch (err) {
            const fallback = getAIReply(cleanQuery);
            typeAIMessage(fallback.text, outputEl);
            if (fallback.nav) setTimeout(() => navigateToPage(fallback.nav), 1400);
        }
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
