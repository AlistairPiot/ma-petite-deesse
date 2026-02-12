/* ============================================
   Mon Doudou — Application principale
   Animations GSAP
   ============================================ */

(function () {
    "use strict";

    // ────────────────────────────────────────────
    // CONFIGURATION
    // ────────────────────────────────────────────

    const CREDENTIALS = {
        username: atob("bW9uZG91ZG91"),
        password: atob("amV0YWltZTIwMjY="),
    };

    const START_DATE = "2026-02-14";
    const TOTAL_DAYS = 365;
    const MIN_SCORE = 4;

    // ────────────────────────────────────────────
    // QUESTIONS DU QUIZ
    // ────────────────────────────────────────────
    const QUIZ_QUESTIONS = [
        {
            question: "Combien de raisons ai-je trouvées pour t'aimer ?",
            choices: ["5", "15", "100", "365"],
            correct: 3,
        },
        {
            question: "Quelle fleur symbolise l'amour passionné ?",
            choices: [
                "La tulipe 🌷",
                "Le tournesol 🌻",
                "La rose rouge 🌹",
                "Le lys ⚜️",
            ],
            correct: 2,
        },
        {
            question: "Quel est ta créature préféré pour la Saint-Valentin ?",
            choices: ["Un chat 🐈", "Un chien 🐶", "Un doudou 🧸", "Bobby 🐍"],
            correct: 3,
        },
        {
            question: "On va faire quoi ce soir ?",
            choices: [
                "un TakenooooKOOO 😏",
                "Lire un livre 📕",
                "Faire un footing 🏃",
                "Une dictée 😬",
            ],
            correct: 0,
        },
        {
            question: "Et ce midi ça sera ?",
            choices: [
                "Salade 🥗",
                "Riz 🍚",
                "Un repas qui se finit par une fontaîne en chocolat 🍫",
                "un sandwich 🥪",
            ],
            correct: 2,
        },
    ];

    // ────────────────────────────────────────────
    // ÉLÉMENTS DU DOM
    // ────────────────────────────────────────────
    const $ = (sel) => document.querySelector(sel);

    const loginScreen = $("#login-screen");
    const quizScreen = $("#quiz-screen");
    const calendarScreen = $("#calendar-screen");
    const transitionOverlay = $("#transition-overlay");

    const loginForm = $("#login-form");
    const usernameInput = $("#username");
    const passwordInput = $("#password");
    const loginError = $("#login-error");

    const quizProgressBar = $("#quiz-progress-bar");
    const quizQuestionNum = $("#quiz-question-number");
    const quizQuestionText = $("#quiz-question-text");
    const quizChoices = $("#quiz-choices");
    const quizBody = $("#quiz-body");
    const quizResult = $("#quiz-result");
    const quizResultText = $("#quiz-result-text");
    const quizRetryBtn = $("#quiz-retry-btn");
    const quizCalendarBtn = $("#quiz-calendar-btn");
    const quizScoreTrack = $("#quiz-score-track");
    const quizRecap = $("#quiz-recap");

    const monthTabs = $("#month-tabs");
    const calendarGrid = $("#calendar-grid");
    const calendarSubtitle = $("#calendar-subtitle");
    const calendarMessage = $("#calendar-message");
    const logoutBtn = $("#logout-btn");

    const reasonModal = $("#reason-modal");
    const modalOverlay = reasonModal.querySelector(".modal-overlay");
    const modalClose = reasonModal.querySelector(".modal-close");
    const modalDayTitle = $("#modal-day-title");
    const modalDayDate = $("#modal-day-date");
    const modalReasonText = $("#modal-reason-text");
    const modalContent = reasonModal.querySelector(".modal-content");
    const modalHeart = reasonModal.querySelector(".modal-heart");

    // ────────────────────────────────────────────
    // ÉTAT
    // ────────────────────────────────────────────
    let currentQuestion = 0;
    let score = 0;
    let userAnswers = [];
    let isAnswerLocked = false;
    let cachedMonths = null;
    let activeMonthIndex = 0;
    let isTransitioning = false;

    // ────────────────────────────────────────────
    // GSAP DEFAULTS
    // ────────────────────────────────────────────
    gsap.defaults({ overwrite: "auto" });

    // ────────────────────────────────────────────
    // UTILITAIRES — DATE (timezone Europe/Paris)
    // ────────────────────────────────────────────

    function getNowParis() {
        const formatter = new Intl.DateTimeFormat("fr-FR", {
            timeZone: "Europe/Paris",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
        const parts = formatter.formatToParts(new Date());
        return {
            year: +parts.find((p) => p.type === "year").value,
            month: +parts.find((p) => p.type === "month").value,
            day: +parts.find((p) => p.type === "day").value,
            hour: +parts.find((p) => p.type === "hour").value,
            dateStr:
                parts.find((p) => p.type === "year").value +
                "-" +
                parts.find((p) => p.type === "month").value +
                "-" +
                parts.find((p) => p.type === "day").value,
        };
    }

    function getTodayParis() {
        return getNowParis().dateStr;
    }

    function diffDays(dateStr1, dateStr2) {
        const d1 = new Date(dateStr1 + "T00:00:00");
        const d2 = new Date(dateStr2 + "T00:00:00");
        return Math.floor((d1 - d2) / 86400000);
    }

    function getTodayIndex() {
        var params = new URLSearchParams(window.location.search);
        var debugDay = parseInt(params.get("day"), 10);
        if (debugDay >= 0 && debugDay <= TOTAL_DAYS) return debugDay;

        const now = getNowParis();
        if (now.dateStr === START_DATE && now.hour < 16) return 0;
        const diff = diffDays(now.dateStr, START_DATE);
        if (diff < 0) return 0;
        return diff + 1;
    }

    function getUnlockedCount() {
        return Math.min(getTodayIndex(), TOTAL_DAYS);
    }

    function getDateForDay(dayIndex) {
        const [y, m, d] = START_DATE.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        date.setDate(date.getDate() + dayIndex - 1);
        return date;
    }

    function formatDateFR(date) {
        return date.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    }

    // ────────────────────────────────────────────
    // UTILITAIRES — LOCALSTORAGE
    // ────────────────────────────────────────────

    function getOpenedDays() {
        try {
            return JSON.parse(localStorage.getItem("openedDays") || "[]");
        } catch (_) {
            return [];
        }
    }

    function markDayOpened(dayIndex) {
        var opened = getOpenedDays();
        if (!opened.includes(dayIndex)) {
            opened.push(dayIndex);
            localStorage.setItem("openedDays", JSON.stringify(opened));
        }
    }

    // ────────────────────────────────────────────
    // GSAP — ANIMATIONS D'ÉCRAN
    // ────────────────────────────────────────────

    /** Transition rideau entre deux écrans */
    function wipeTransition(fromScreen, toScreen, setupFn, onRevealed) {
        if (isTransitioning) return;
        isTransitioning = true;

        var tl = gsap.timeline({
            onComplete: function () {
                isTransitioning = false;
            },
        });

        tl.set(transitionOverlay, {
            display: "block",
            scaleX: 0,
            transformOrigin: "left center",
        })
            .to(transitionOverlay, {
                scaleX: 1,
                duration: 0.45,
                ease: "power4.inOut",
            })
            .add(function () {
                if (fromScreen) fromScreen.hidden = true;
                toScreen.hidden = false;
                if (setupFn) setupFn();
            })
            .set(transitionOverlay, { transformOrigin: "right center" })
            .to(transitionOverlay, {
                scaleX: 0,
                duration: 0.45,
                ease: "power4.inOut",
            })
            .add(function () {
                if (onRevealed) onRevealed();
            }, "-=0.25")
            .set(transitionOverlay, { display: "none" });
    }

    /** Entrée animée — Login */
    function animateLoginIn() {
        var card = loginScreen.querySelector(".card");
        var heart = card.querySelector(".logo-heart");
        var h1 = card.querySelector("h1");
        var subtitle = card.querySelector(".subtitle");
        var formGroups = card.querySelectorAll(".form-group");
        var btn = card.querySelector(".btn");
        var errorText = card.querySelector(".error-text");

        var tl = gsap.timeline();

        tl.fromTo(
            card,
            { opacity: 0, y: 80, scale: 0.7, rotateX: 25 },
            {
                opacity: 1,
                y: 0,
                scale: 1,
                rotateX: 0,
                duration: 0.9,
                ease: "back.out(1.4)",
            },
        );

        tl.fromTo(
            heart,
            { opacity: 0, y: -60, scale: 0, rotation: -180 },
            {
                opacity: 1,
                y: 0,
                scale: 1,
                rotation: 0,
                duration: 0.8,
                ease: "elastic.out(1, 0.5)",
            },
            "-=0.5",
        );

        tl.fromTo(
            h1,
            { opacity: 0, y: 25, letterSpacing: "15px" },
            {
                opacity: 1,
                y: 0,
                letterSpacing: "0px",
                duration: 0.5,
                ease: "power3.out",
            },
            "-=0.4",
        );

        tl.fromTo(
            subtitle,
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
            "-=0.2",
        );

        formGroups.forEach(function (group, i) {
            tl.fromTo(
                group,
                {
                    opacity: 0,
                    x: i % 2 === 0 ? -50 : 50,
                    rotateY: i % 2 === 0 ? -15 : 15,
                },
                {
                    opacity: 1,
                    x: 0,
                    rotateY: 0,
                    duration: 0.5,
                    ease: "power3.out",
                },
                "-=0.2",
            );
        });

        if (errorText) {
            gsap.set(errorText, { opacity: 1 });
        }

        tl.fromTo(
            btn,
            { opacity: 0, y: 25, scale: 0.8 },
            {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.5,
                ease: "back.out(2.5)",
            },
            "-=0.15",
        );
    }

    /** Entrée animée — Quiz */
    function animateQuizIn() {
        var card = quizScreen.querySelector(".card");
        var heart = card.querySelector(".logo-heart");
        var h2 = card.querySelector("h2");
        var subtitle = card.querySelector(".subtitle");

        var tl = gsap.timeline();

        tl.fromTo(
            card,
            { opacity: 0, scale: 0.3, rotateY: 120 },
            {
                opacity: 1,
                scale: 1,
                rotateY: 0,
                duration: 1,
                ease: "elastic.out(1, 0.6)",
            },
        );

        tl.fromTo(
            heart,
            { opacity: 0, scale: 0 },
            {
                opacity: 1,
                scale: 1,
                duration: 0.6,
                ease: "elastic.out(1, 0.4)",
            },
            "-=0.5",
        );

        tl.fromTo(
            [h2, subtitle],
            { opacity: 0, y: 20 },
            {
                opacity: 1,
                y: 0,
                stagger: 0.1,
                duration: 0.4,
                ease: "power2.out",
            },
            "-=0.3",
        );

        // Score track hearts
        var scoreHearts = quizScoreTrack.querySelectorAll(".score-heart");
        if (scoreHearts.length > 0) {
            tl.fromTo(
                scoreHearts,
                { opacity: 0, scale: 0, y: 10 },
                {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    stagger: 0.08,
                    duration: 0.4,
                    ease: "elastic.out(1, 0.5)",
                },
                "-=0.2",
            );
        }

        // Question elements
        var questionElements = [quizQuestionNum, quizQuestionText];
        tl.fromTo(
            questionElements,
            { opacity: 0, x: 40 },
            {
                opacity: 1,
                x: 0,
                stagger: 0.08,
                duration: 0.4,
                ease: "power2.out",
            },
            "-=0.15",
        );

        var choices = quizChoices.querySelectorAll(".quiz-choice");
        if (choices.length > 0) {
            tl.fromTo(
                choices,
                { opacity: 0, x: 50, scale: 0.85 },
                {
                    opacity: 1,
                    x: 0,
                    scale: 1,
                    stagger: 0.08,
                    duration: 0.45,
                    ease: "back.out(1.5)",
                },
                "-=0.15",
            );
        }
    }

    /** Entrée animée — Calendrier */
    function animateCalendarIn() {
        var header = calendarScreen.querySelector(".calendar-header");
        var message = calendarMessage;

        var tl = gsap.timeline();

        if (header) {
            var headerChildren = header.children;
            tl.fromTo(
                headerChildren,
                { opacity: 0, y: -40 },
                {
                    opacity: 1,
                    y: 0,
                    stagger: 0.1,
                    duration: 0.5,
                    ease: "power3.out",
                },
            );
        }

        if (!message.hidden) {
            tl.fromTo(
                message,
                { opacity: 0, scale: 0.8, y: 30 },
                {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    duration: 0.6,
                    ease: "back.out(1.4)",
                },
                "-=0.2",
            );
            return;
        }

        var tabButtons = monthTabs.querySelectorAll(".month-tab");
        if (tabButtons.length > 0) {
            tl.fromTo(
                tabButtons,
                { opacity: 0, x: -30, scale: 0.7 },
                {
                    opacity: 1,
                    x: 0,
                    scale: 1,
                    stagger: 0.04,
                    duration: 0.45,
                    ease: "back.out(1.8)",
                },
                "-=0.2",
            );
        }

        animateDayCardsIn(0.15);
    }

    /** Cascade des cartes jour */
    function animateDayCardsIn(delay) {
        var cards = calendarGrid.querySelectorAll(".day-card");
        if (cards.length === 0) return;

        gsap.fromTo(
            cards,
            { opacity: 0, y: 60, scale: 0.5, rotateX: 30 },
            {
                opacity: 1,
                y: 0,
                scale: 1,
                rotateX: 0,
                stagger: {
                    each: 0.03,
                    from: "start",
                    ease: "power1.in",
                },
                duration: 0.55,
                ease: "back.out(1.3)",
                delay: delay || 0,
            },
        );
    }

    /** Sparkles (particules) autour d'un élément */
    function createSparkles(element) {
        var rect = element.getBoundingClientRect();
        var centerX = rect.left + rect.width / 2;
        var centerY = rect.top + rect.height / 2;
        var colors = [
            "#be185d",
            "#ec4899",
            "#f9a8d4",
            "#fbbf24",
            "#f472b6",
            "#a855f7",
        ];

        for (var i = 0; i < 24; i++) {
            var sparkle = document.createElement("div");
            sparkle.className = "sparkle";
            sparkle.style.left = centerX + "px";
            sparkle.style.top = centerY + "px";
            sparkle.style.background =
                colors[Math.floor(Math.random() * colors.length)];
            document.body.appendChild(sparkle);

            var angle = (Math.PI * 2 * i) / 24 + (Math.random() - 0.5) * 0.6;
            var distance = 50 + Math.random() * 100;
            var size = 4 + Math.random() * 8;

            gsap.set(sparkle, { width: size, height: size, scale: 1 });

            gsap.to(sparkle, {
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                opacity: 0,
                scale: 0,
                duration: 0.5 + Math.random() * 0.5,
                ease: "power3.out",
                onComplete: function () {
                    this.targets()[0].remove();
                },
            });
        }
    }

    /** Confetti (pluie de confettis colorés) */
    function showConfetti() {
        var colors = [
            "#be185d",
            "#ec4899",
            "#f9a8d4",
            "#fbbf24",
            "#a855f7",
            "#06b6d4",
            "#10b981",
            "#f43f5e",
        ];
        var container = document.createElement("div");
        container.className = "confetti-container";
        document.body.appendChild(container);

        for (var i = 0; i < 100; i++) {
            (function () {
                var confetti = document.createElement("div");
                var w = 6 + Math.random() * 8;
                var isCircle = Math.random() > 0.5;
                var h = isCircle ? w : w * 2.5;
                confetti.style.cssText =
                    "position:absolute;top:-20px;pointer-events:none;" +
                    "width:" +
                    w +
                    "px;height:" +
                    h +
                    "px;" +
                    "background:" +
                    colors[Math.floor(Math.random() * colors.length)] +
                    ";" +
                    "border-radius:" +
                    (isCircle ? "50%" : "2px") +
                    ";" +
                    "left:" +
                    Math.random() * 100 +
                    "%;";
                container.appendChild(confetti);

                gsap.to(confetti, {
                    y: window.innerHeight + 50,
                    x: (Math.random() - 0.5) * 250,
                    rotation: (Math.random() - 0.5) * 720,
                    duration: 1.5 + Math.random() * 2.5,
                    delay: Math.random() * 1,
                    ease: "power1.in",
                });
                gsap.to(confetti, {
                    opacity: 0,
                    duration: 0.5,
                    delay: 2 + Math.random() * 1.5,
                });
            })();
        }

        setTimeout(function () {
            container.remove();
        }, 5000);
    }

    // ────────────────────────────────────────────
    // NAVIGATION ENTRE ÉCRANS
    // ────────────────────────────────────────────

    function showScreen(screen, setupFn) {
        var screens = [loginScreen, quizScreen, calendarScreen];
        var fromScreen = null;

        for (var i = 0; i < screens.length; i++) {
            if (!screens[i].hidden && screens[i] !== screen) {
                fromScreen = screens[i];
                break;
            }
        }

        if (fromScreen) {
            wipeTransition(fromScreen, screen, setupFn, function () {
                animateScreenIn(screen);
            });
        } else {
            screens.forEach(function (s) {
                s.hidden = s !== screen;
            });
            if (setupFn) setupFn();
            animateScreenIn(screen);
        }
    }

    function animateScreenIn(screen) {
        if (screen === loginScreen) animateLoginIn();
        else if (screen === quizScreen) animateQuizIn();
        else if (screen === calendarScreen) animateCalendarIn();
    }

    function isQuizExpired() {
        var now = getTodayParis();
        return now >= "2026-02-15";
    }

    function navigateToCorrectScreen() {
        var isLoggedIn = localStorage.getItem("loggedIn") === "true";
        var quizPassed = localStorage.getItem("quizPassed") === "true";

        if (!isLoggedIn) {
            showScreen(loginScreen);
        } else if (!quizPassed && !isQuizExpired()) {
            showScreen(quizScreen, initQuiz);
        } else {
            showScreen(calendarScreen, initCalendar);
        }
    }

    // ────────────────────────────────────────────
    // CONNEXION
    // ────────────────────────────────────────────

    function handleLogin(e) {
        e.preventDefault();
        if (isTransitioning) return;

        var user = usernameInput.value.trim().toLowerCase();
        var pass = passwordInput.value;

        if (user === CREDENTIALS.username && pass === CREDENTIALS.password) {
            localStorage.setItem("loggedIn", "true");
            loginError.hidden = true;

            var card = loginScreen.querySelector(".card");
            gsap.to(card, {
                scale: 1.03,
                boxShadow: "0 0 40px rgba(190, 24, 93, 0.3)",
                duration: 0.25,
                yoyo: true,
                repeat: 1,
                ease: "power2.inOut",
                onComplete: function () {
                    gsap.set(card, { clearProps: "scale,boxShadow" });
                    navigateToCorrectScreen();
                },
            });
        } else {
            loginError.hidden = false;
            var tl = gsap.timeline();
            tl.to(loginForm, {
                x: -12,
                duration: 0.06,
                ease: "power2.inOut",
            })
                .to(loginForm, {
                    x: 12,
                    duration: 0.06,
                    ease: "power2.inOut",
                    repeat: 3,
                    yoyo: true,
                })
                .to(loginForm, {
                    x: 0,
                    duration: 0.15,
                    ease: "elastic.out(1, 0.3)",
                });

            gsap.fromTo(
                loginError,
                { opacity: 0, y: -10 },
                { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
            );

            passwordInput.value = "";
            passwordInput.focus();
        }
    }

    function handleLogout() {
        if (isTransitioning) return;
        localStorage.removeItem("loggedIn");
        usernameInput.value = "";
        passwordInput.value = "";
        loginError.hidden = true;
        showScreen(loginScreen);
    }

    // ────────────────────────────────────────────
    // QUIZ — SCORE TRACK
    // ────────────────────────────────────────────

    function initScoreTrack() {
        quizScoreTrack.innerHTML = "";
        for (var i = 0; i < QUIZ_QUESTIONS.length; i++) {
            var heart = document.createElement("span");
            heart.className = "score-heart";
            heart.textContent = "🤍";
            quizScoreTrack.appendChild(heart);
        }
    }

    function fillScoreHeart(index) {
        var hearts = quizScoreTrack.querySelectorAll(".score-heart");
        if (!hearts[index]) return;
        hearts[index].textContent = "❤️";
        gsap.fromTo(
            hearts[index],
            { scale: 0.2 },
            { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.3)" },
        );
    }

    function breakScoreHeart(index) {
        var hearts = quizScoreTrack.querySelectorAll(".score-heart");
        if (!hearts[index]) return;
        hearts[index].textContent = "💔";
        gsap.fromTo(
            hearts[index],
            { rotation: -25, scale: 1.4 },
            { rotation: 0, scale: 1, duration: 0.5, ease: "power2.out" },
        );
    }

    // ────────────────────────────────────────────
    // QUIZ — LOGIQUE
    // ────────────────────────────────────────────

    function initQuiz() {
        currentQuestion = 0;
        score = 0;
        userAnswers = [];
        isAnswerLocked = false;
        quizResult.hidden = true;
        quizBody.hidden = false;
        gsap.set(quizProgressBar, { width: "0%" });
        initScoreTrack();
        renderQuestion();
    }

    function renderQuestion() {
        var q = QUIZ_QUESTIONS[currentQuestion];
        var total = QUIZ_QUESTIONS.length;
        isAnswerLocked = false;

        quizQuestionNum.textContent =
            "Question " + (currentQuestion + 1) + "/" + total;
        quizQuestionText.textContent = q.question;

        gsap.to(quizProgressBar, {
            width: (currentQuestion / total) * 100 + "%",
            duration: 0.6,
            ease: "power2.out",
        });

        quizChoices.innerHTML = "";
        q.choices.forEach(function (choice, i) {
            var btn = document.createElement("button");
            btn.className = "quiz-choice";
            btn.type = "button";
            btn.textContent = choice;
            btn.addEventListener("click", function () {
                handleAnswer(i);
            });
            quizChoices.appendChild(btn);
        });

        // Animer l'entrée des éléments
        var tl = gsap.timeline();
        tl.fromTo(
            quizQuestionNum,
            { opacity: 0, x: 35 },
            { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" },
        );
        tl.fromTo(
            quizQuestionText,
            { opacity: 0, x: 35 },
            { opacity: 1, x: 0, duration: 0.35, ease: "power2.out" },
            "-=0.15",
        );

        var choices = quizChoices.querySelectorAll(".quiz-choice");
        tl.fromTo(
            choices,
            { opacity: 0, x: 50, scale: 0.85 },
            {
                opacity: 1,
                x: 0,
                scale: 1,
                stagger: 0.08,
                duration: 0.4,
                ease: "back.out(1.5)",
            },
            "-=0.1",
        );
    }

    /** Gère le clic sur une réponse — feedback immédiat + auto-avancement */
    function handleAnswer(index) {
        if (isAnswerLocked) return;
        isAnswerLocked = true;

        var q = QUIZ_QUESTIONS[currentQuestion];
        var isCorrect = index === q.correct;
        userAnswers.push(index);

        var buttons = quizChoices.querySelectorAll(".quiz-choice");

        // Désactiver tous les boutons
        buttons.forEach(function (btn) {
            btn.style.pointerEvents = "none";
        });

        // Toujours montrer la bonne réponse
        buttons[q.correct].classList.add("correct");

        if (isCorrect) {
            score++;
            fillScoreHeart(currentQuestion);

            // Sparkles + glow sur la bonne réponse
            createSparkles(buttons[index]);
            gsap.fromTo(
                buttons[index],
                { boxShadow: "0 0 0px rgba(5, 150, 105, 0)" },
                {
                    boxShadow: "0 0 30px rgba(5, 150, 105, 0.5)",
                    duration: 0.3,
                    yoyo: true,
                    repeat: 1,
                },
            );
        } else {
            // Marquer la mauvaise réponse
            buttons[index].classList.add("wrong");
            breakScoreHeart(currentQuestion);

            // Shake la mauvaise réponse
            gsap.to(buttons[index], {
                x: -10,
                duration: 0.06,
                repeat: 5,
                yoyo: true,
                ease: "power2.inOut",
                onComplete: function () {
                    gsap.set(buttons[index], { x: 0 });
                },
            });

            // Pulse la bonne réponse pour attirer l'attention
            gsap.fromTo(
                buttons[q.correct],
                { scale: 1 },
                {
                    scale: 1.04,
                    duration: 0.3,
                    yoyo: true,
                    repeat: 2,
                    ease: "power2.inOut",
                },
            );
        }

        currentQuestion++;

        // Auto-avancement
        var isLast = currentQuestion >= QUIZ_QUESTIONS.length;
        var advanceDelay = isLast ? 2000 : 1500;

        setTimeout(function () {
            if (isLast) {
                showQuizResult();
            } else {
                transitionToNextQuestion();
            }
        }, advanceDelay);
    }

    /** Transition glissée entre deux questions */
    function transitionToNextQuestion() {
        var elements = [quizQuestionNum, quizQuestionText, quizChoices];
        gsap.to(elements, {
            opacity: 0,
            x: -60,
            stagger: 0.05,
            duration: 0.3,
            ease: "power3.in",
            onComplete: function () {
                gsap.set(elements, { clearProps: "all" });
                renderQuestion();
            },
        });
    }

    // ────────────────────────────────────────────
    // QUIZ — RÉSULTAT SPECTACULAIRE
    // ────────────────────────────────────────────

    function showQuizResult() {
        var total = QUIZ_QUESTIONS.length;
        var passed = score >= MIN_SCORE;

        gsap.to(quizProgressBar, {
            width: "100%",
            duration: 0.5,
            ease: "power2.out",
        });

        var card = quizScreen.querySelector(".card");
        var tl = gsap.timeline();

        // Phase 1 : Quiz body disparait
        tl.to(quizBody, {
            opacity: 0,
            scale: 0.85,
            duration: 0.4,
            ease: "power3.in",
        });

        // Phase 2 : Card flash lumineux
        tl.to(card, {
            boxShadow: passed
                ? "0 0 80px rgba(190, 24, 93, 0.5), 0 0 160px rgba(236, 72, 153, 0.2)"
                : "0 0 60px rgba(220, 38, 38, 0.35)",
            duration: 0.25,
            yoyo: true,
            repeat: 2,
            ease: "power2.inOut",
        });

        // Phase 3 : Préparer le contenu
        tl.add(function () {
            quizBody.hidden = true;
            gsap.set(quizBody, { clearProps: "all" });
            buildQuizResult(total, passed);
            quizResult.hidden = false;
        });

        // Phase 4 : Score hearts wave
        tl.add(function () {
            var hearts = quizScoreTrack.querySelectorAll(".score-heart");
            gsap.fromTo(
                hearts,
                { scale: 0.5, y: 5 },
                {
                    scale: 1,
                    y: 0,
                    stagger: 0.1,
                    duration: 0.5,
                    ease: "elastic.out(1, 0.4)",
                },
            );
        });

        // Phase 5 : Texte résultat — entrée dramatique
        tl.fromTo(
            quizResultText,
            { opacity: 0, scale: 0.15, y: 70, rotateX: 40 },
            {
                opacity: 1,
                scale: 1,
                y: 0,
                rotateX: 0,
                duration: 1,
                ease: "elastic.out(1, 0.45)",
            },
            "+=0.1",
        );

        // Phase 6 : Confetti + cœurs si réussi
        if (passed) {
            tl.add(function () {
                showConfetti();
                showHearts();
            }, "-=0.6");
        }

        // Phase 7 : Recap cascade
        tl.add(function () {
            var items = quizRecap.querySelectorAll(".recap-item");
            gsap.fromTo(
                items,
                { opacity: 0, x: 50, scale: 0.85 },
                {
                    opacity: 1,
                    x: 0,
                    scale: 1,
                    stagger: 0.12,
                    duration: 0.5,
                    ease: "back.out(1.5)",
                },
            );
        }, "+=0.15");

        // Phase 8 : Bouton
        var btnDelay = "+=(" + (QUIZ_QUESTIONS.length * 0.12 + 0.3) + ")";
        if (passed) {
            tl.fromTo(
                quizCalendarBtn,
                { opacity: 0, y: 30, scale: 0.6 },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.6,
                    ease: "back.out(2.5)",
                },
                btnDelay,
            );
        } else {
            tl.fromTo(
                quizRetryBtn,
                { opacity: 0, y: 25 },
                { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
                btnDelay,
            );
        }
    }

    /** Construit le contenu HTML du résultat + recap */
    function buildQuizResult(total, passed) {
        if (passed) {
            quizResultText.innerHTML =
                "Bravo mon amour ! 🎉<br>" +
                "Tu as obtenu <strong>" +
                score +
                "/" +
                total +
                "</strong> !<br>" +
                "Ton calendrier t'attend...";
            quizRetryBtn.hidden = true;
            quizCalendarBtn.hidden = false;
            localStorage.setItem("quizPassed", "true");
        } else {
            quizResultText.innerHTML =
                "Tu as obtenu <strong>" +
                score +
                "/" +
                total +
                "</strong>.<br>" +
                "Il faut au moins " +
                MIN_SCORE +
                " bonnes réponses !<br>" +
                "Réessaie, je sais que tu peux le faire ! ❤️";
            quizRetryBtn.hidden = false;
            quizCalendarBtn.hidden = true;
        }

        // Recap de chaque question
        quizRecap.innerHTML = "";
        QUIZ_QUESTIONS.forEach(function (q, i) {
            var isCorrect = userAnswers[i] === q.correct;
            var item = document.createElement("div");
            item.className = "recap-item " + (isCorrect ? "correct" : "wrong");

            var html =
                '<div class="recap-header">' +
                '<span class="recap-icon">' +
                (isCorrect ? "✅" : "❌") +
                "</span>" +
                '<span class="recap-question">' +
                q.question +
                "</span>" +
                "</div>";

            if (isCorrect) {
                html +=
                    '<div class="recap-answer correct-answer">' +
                    q.choices[q.correct] +
                    "</div>";
            } else {
                html +=
                    '<div class="recap-answer wrong-answer">' +
                    q.choices[userAnswers[i]] +
                    "</div>";
                html +=
                    '<div class="recap-answer correct-answer">Bonne réponse : ' +
                    q.choices[q.correct] +
                    "</div>";
            }

            item.innerHTML = html;
            quizRecap.appendChild(item);
        });
    }

    // ────────────────────────────────────────────
    // ANIMATION CŒURS (GSAP)
    // ────────────────────────────────────────────

    function showHearts() {
        var container = document.createElement("div");
        container.className = "hearts-container";
        var hearts = ["❤️", "💕", "💖", "💗", "💝", "💘"];

        document.body.appendChild(container);

        for (var i = 0; i < 45; i++) {
            (function () {
                var heart = document.createElement("span");
                heart.className = "floating-heart";
                heart.textContent =
                    hearts[Math.floor(Math.random() * hearts.length)];
                heart.style.left = Math.random() * 100 + "%";
                heart.style.fontSize = 16 + Math.random() * 28 + "px";
                container.appendChild(heart);

                var duration = 2.5 + Math.random() * 3;
                var delay = Math.random() * 2.5;
                var xDrift = (Math.random() - 0.5) * 160;

                gsap.timeline({ delay: delay })
                    .set(heart, { opacity: 1, scale: 0 })
                    .to(heart, {
                        scale: 1,
                        duration: 0.3,
                        ease: "back.out(3)",
                    })
                    .to(
                        heart,
                        {
                            y: -(window.innerHeight + 120),
                            x: xDrift,
                            rotation: (Math.random() - 0.5) * 360,
                            duration: duration,
                            ease: "power1.out",
                        },
                        "-=0.15",
                    )
                    .to(
                        heart,
                        {
                            opacity: 0,
                            scale: 0.3,
                            duration: duration * 0.35,
                        },
                        "-=" + (duration * 0.35).toFixed(2),
                    );
            })();
        }

        setTimeout(function () {
            container.remove();
        }, 8000);
    }

    // ────────────────────────────────────────────
    // CALENDRIER
    // ────────────────────────────────────────────

    function initCalendar() {
        var todayIndex = getTodayIndex();
        var unlockedUpTo = getUnlockedCount();

        if (todayIndex === 0) {
            calendarMessage.hidden = false;
            calendarMessage.innerHTML =
                '<div class="message-card">' +
                '<span class="message-icon">🔒</span>' +
                "<p>Le calendrier s'ouvre le <strong>14 février 2026 à 16h</strong> ❤️</p>" +
                "<p>Patience, mon amour...</p>" +
                "</div>";
            monthTabs.innerHTML = "";
            calendarGrid.innerHTML = "";
            calendarSubtitle.textContent = "";
            return;
        }

        calendarMessage.hidden = true;

        if (todayIndex > TOTAL_DAYS) {
            calendarSubtitle.textContent =
                "Les 365 jours sont débloqués ! Merci pour cette année d'amour ❤️";
        } else {
            calendarSubtitle.textContent =
                "Jour " + todayIndex + " sur " + TOTAL_DAYS;
        }

        if (!cachedMonths) {
            cachedMonths = buildMonths();
        }

        renderMonthTabs(cachedMonths, todayIndex, unlockedUpTo);
        var currentMonthIdx = findCurrentMonth(cachedMonths, todayIndex);
        selectMonth(currentMonthIdx, todayIndex, unlockedUpTo);
    }

    function buildMonths() {
        var months = [];
        var current = null;

        for (var i = 1; i <= TOTAL_DAYS; i++) {
            var date = getDateForDay(i);
            var key =
                date.getFullYear() +
                "-" +
                String(date.getMonth() + 1).padStart(2, "0");

            if (!current || current.key !== key) {
                current = {
                    key: key,
                    label: date.toLocaleDateString("fr-FR", {
                        month: "long",
                        year: "numeric",
                    }),
                    days: [],
                };
                months.push(current);
            }

            current.days.push({
                index: i,
                date: date,
                dayOfMonth: date.getDate(),
            });
        }

        return months;
    }

    function findCurrentMonth(months, todayIndex) {
        if (todayIndex <= 0) return 0;

        var clamped = Math.min(todayIndex, TOTAL_DAYS);
        for (var i = 0; i < months.length; i++) {
            var days = months[i].days;
            if (
                clamped >= days[0].index &&
                clamped <= days[days.length - 1].index
            ) {
                return i;
            }
        }

        return months.length - 1;
    }

    function renderMonthTabs(months, todayIndex, unlockedUpTo) {
        monthTabs.innerHTML = "";
        months.forEach(function (month, i) {
            var btn = document.createElement("button");
            btn.className = "month-tab";
            btn.type = "button";
            btn.textContent = month.label;
            btn.addEventListener("click", function () {
                selectMonth(i, todayIndex, unlockedUpTo);
            });
            monthTabs.appendChild(btn);
        });
    }

    function selectMonth(index, todayIndex, unlockedUpTo) {
        activeMonthIndex = index;
        var month = cachedMonths[index];

        var tabs = monthTabs.querySelectorAll(".month-tab");
        tabs.forEach(function (tab, i) {
            tab.classList.toggle("active", i === index);
        });

        if (tabs[index]) {
            tabs[index].scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "center",
            });
        }

        var currentCards = calendarGrid.querySelectorAll(".day-card");
        if (currentCards.length > 0) {
            gsap.to(currentCards, {
                opacity: 0,
                y: -25,
                scale: 0.75,
                stagger: 0.015,
                duration: 0.2,
                ease: "power2.in",
                onComplete: function () {
                    renderDays(month.days, todayIndex, unlockedUpTo);
                    animateDayCardsIn(0);
                },
            });
        } else {
            renderDays(month.days, todayIndex, unlockedUpTo);
            animateDayCardsIn(0);
        }
    }

    function renderDays(days, todayIndex, unlockedUpTo) {
        var openedDays = getOpenedDays();
        calendarGrid.innerHTML = "";

        days.forEach(function (day) {
            var card = document.createElement("button");
            card.className = "day-card";
            card.type = "button";

            var isLocked = day.index > unlockedUpTo;
            var isToday =
                day.index === todayIndex &&
                todayIndex >= 1 &&
                todayIndex <= TOTAL_DAYS;
            var isOpened = openedDays.includes(day.index);

            if (isLocked) {
                card.classList.add("locked");
            } else if (isToday) {
                card.classList.add("today");
            } else if (isOpened) {
                card.classList.add("opened");
            } else {
                card.classList.add("available");
            }

            var shortMonth = day.date.toLocaleDateString("fr-FR", {
                month: "short",
            });

            card.innerHTML =
                '<span class="day-number">Jour ' +
                day.index +
                "</span>" +
                '<span class="day-date">' +
                day.dayOfMonth +
                " " +
                shortMonth +
                "</span>" +
                (isLocked ? '<span class="day-lock">🔒</span>' : "") +
                (isToday ? '<span class="day-badge">Aujourd\'hui</span>' : "") +
                (isOpened && !isToday
                    ? '<span class="day-check">✓</span>'
                    : "");

            card.setAttribute(
                "aria-label",
                "Jour " +
                    day.index +
                    ", " +
                    formatDateFR(day.date) +
                    (isLocked ? ", verrouillé" : ""),
            );

            card.addEventListener("click", function () {
                handleDayClick(day, todayIndex, unlockedUpTo);
            });

            calendarGrid.appendChild(card);
        });
    }

    function handleDayClick(day, todayIndex, unlockedUpTo) {
        if (day.index > unlockedUpTo) {
            var unlockDate = getDateForDay(day.index);
            openModal(
                "Jour " + day.index,
                formatDateFR(unlockDate),
                "Reviens le " + formatDateFR(unlockDate) + " ❤️",
                true,
            );
            return;
        }

        markDayOpened(day.index);
        openModal(
            "Jour " + day.index,
            formatDateFR(day.date),
            REASONS[day.index - 1],
            false,
        );

        var month = cachedMonths[activeMonthIndex];
        renderDays(month.days, todayIndex, unlockedUpTo);
    }

    // ────────────────────────────────────────────
    // MODAL (GSAP)
    // ────────────────────────────────────────────

    function openModal(title, date, text, isLocked) {
        modalDayTitle.textContent = title;
        modalDayDate.textContent = date;
        modalReasonText.textContent = text;
        modalContent.classList.toggle("locked", isLocked);

        gsap.set(modalOverlay, { opacity: 0 });
        gsap.set(modalContent, {
            opacity: 0,
            scale: 0.2,
            y: 100,
            rotateX: 35,
        });
        gsap.set(modalHeart, { scale: 0, rotation: -270 });
        gsap.set([modalDayTitle, modalDayDate, modalReasonText], {
            opacity: 0,
            y: 20,
        });
        gsap.set(modalClose, { opacity: 0, scale: 0 });

        reasonModal.hidden = false;
        document.body.style.overflow = "hidden";

        var tl = gsap.timeline();

        tl.to(modalOverlay, {
            opacity: 1,
            duration: 0.35,
            ease: "power2.out",
        });

        tl.to(
            modalContent,
            {
                opacity: 1,
                scale: 1,
                y: 0,
                rotateX: 0,
                duration: 0.8,
                ease: "elastic.out(1, 0.55)",
            },
            "-=0.2",
        );

        tl.to(
            modalHeart,
            {
                scale: 1,
                rotation: 0,
                duration: 0.7,
                ease: "elastic.out(1, 0.4)",
            },
            "-=0.5",
        );

        tl.to(
            [modalDayTitle, modalDayDate],
            {
                opacity: 1,
                y: 0,
                stagger: 0.08,
                duration: 0.35,
                ease: "power2.out",
            },
            "-=0.35",
        );

        tl.to(
            modalReasonText,
            {
                opacity: 1,
                y: 0,
                duration: 0.45,
                ease: "power2.out",
            },
            "-=0.15",
        );

        tl.to(
            modalClose,
            {
                opacity: 1,
                scale: 1,
                duration: 0.3,
                ease: "back.out(3)",
            },
            "-=0.3",
        );

        if (!isLocked) {
            tl.add(function () {
                createSparkles(modalContent);
            }, "-=0.45");
        }

        modalClose.focus();
    }

    function closeModal() {
        var tl = gsap.timeline();

        tl.to(modalContent, {
            opacity: 0,
            scale: 0.7,
            y: 40,
            rotateX: -15,
            duration: 0.3,
            ease: "power3.in",
        });

        tl.to(
            modalOverlay,
            {
                opacity: 0,
                duration: 0.25,
                ease: "power2.in",
            },
            "-=0.15",
        );

        tl.add(function () {
            reasonModal.hidden = true;
            document.body.style.overflow = "";
            gsap.set(
                [
                    modalContent,
                    modalOverlay,
                    modalHeart,
                    modalDayTitle,
                    modalDayDate,
                    modalReasonText,
                    modalClose,
                ],
                { clearProps: "all" },
            );
        });
    }

    // ────────────────────────────────────────────
    // VÉRIFICATION DES RAISONS
    // ────────────────────────────────────────────

    function checkReasons() {
        if (typeof REASONS === "undefined") {
            document.body.innerHTML =
                '<div style="padding:2rem;text-align:center;color:#be185d;font-family:sans-serif">' +
                "<h1>Erreur</h1>" +
                "<p>Le fichier <code>reasons.js</code> n'est pas chargé.</p>" +
                "</div>";
            return false;
        }
        if (REASONS.length !== TOTAL_DAYS) {
            document.body.innerHTML =
                '<div style="padding:2rem;text-align:center;color:#be185d;font-family:sans-serif">' +
                "<h1>Erreur de configuration</h1>" +
                "<p><code>reasons.js</code> contient <strong>" +
                REASONS.length +
                "</strong> entrées " +
                "au lieu de <strong>" +
                TOTAL_DAYS +
                "</strong>.</p>" +
                "</div>";
            return false;
        }
        return true;
    }

    // ────────────────────────────────────────────
    // ÉVÉNEMENTS
    // ────────────────────────────────────────────

    function bindEvents() {
        loginForm.addEventListener("submit", handleLogin);
        logoutBtn.addEventListener("click", handleLogout);

        quizRetryBtn.addEventListener("click", initQuiz);
        quizCalendarBtn.addEventListener("click", function () {
            if (isTransitioning) return;
            showScreen(calendarScreen, initCalendar);
        });

        modalClose.addEventListener("click", closeModal);
        modalOverlay.addEventListener("click", closeModal);
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && !reasonModal.hidden) {
                closeModal();
            }
        });
    }

    // ────────────────────────────────────────────
    // INITIALISATION
    // ────────────────────────────────────────────

    function init() {
        if (!checkReasons()) return;
        bindEvents();
        navigateToCorrectScreen();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
