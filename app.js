/* ============================================
   Mon Doudou — Application principale
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

    // Date de début (Jour 1) et nombre total de jours
    const START_DATE = "2026-02-14";
    const TOTAL_DAYS = 365;

    // Score minimum pour réussir le quiz (sur 5)
    const MIN_SCORE = 4;

    // ────────────────────────────────────────────
    // QUESTIONS DU QUIZ
    // Pour personnaliser : modifie les questions, choix et l'index de la bonne réponse (0-indexé)
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
            question: "On va faire quoi se soir ?",
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

    const loginForm = $("#login-form");
    const usernameInput = $("#username");
    const passwordInput = $("#password");
    const loginError = $("#login-error");

    const quizProgressBar = $("#quiz-progress-bar");
    const quizQuestionNum = $("#quiz-question-number");
    const quizQuestionText = $("#quiz-question-text");
    const quizChoices = $("#quiz-choices");
    const quizNextBtn = $("#quiz-next-btn");
    const quizBody = $("#quiz-body");
    const quizResult = $("#quiz-result");
    const quizResultText = $("#quiz-result-text");
    const quizRetryBtn = $("#quiz-retry-btn");
    const quizCalendarBtn = $("#quiz-calendar-btn");

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

    // ────────────────────────────────────────────
    // ÉTAT
    // ────────────────────────────────────────────
    let currentQuestion = 0;
    let selectedAnswer = -1;
    let score = 0;
    let cachedMonths = null;
    let activeMonthIndex = 0;

    // ────────────────────────────────────────────
    // UTILITAIRES — DATE (timezone Europe/Paris)
    // ────────────────────────────────────────────

    /** Obtenir la date et l'heure actuelles à Paris */
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

    /** Raccourci : date à Paris au format YYYY-MM-DD */
    function getTodayParis() {
        return getNowParis().dateStr;
    }

    /** Différence en jours entre deux dates YYYY-MM-DD */
    function diffDays(dateStr1, dateStr2) {
        const d1 = new Date(dateStr1 + "T00:00:00");
        const d2 = new Date(dateStr2 + "T00:00:00");
        return Math.floor((d1 - d2) / 86400000);
    }

    /** Index du jour actuel (1-365 = jour actif, 0 = pas commencé, >365 = terminé) */
    function getTodayIndex() {
        // Debug : ?day=140 dans l'URL pour simuler le jour 140
        var params = new URLSearchParams(window.location.search);
        var debugDay = parseInt(params.get("day"), 10);
        if (debugDay >= 0 && debugDay <= TOTAL_DAYS) return debugDay;

        const now = getNowParis();
        // Le jour 1 (14 fév) se débloque à 16h, les autres à minuit
        if (now.dateStr === START_DATE && now.hour < 16) return 0;
        const diff = diffDays(now.dateStr, START_DATE);
        if (diff < 0) return 0;
        return diff + 1;
    }

    /** Nombre de jours débloqués (clampé à TOTAL_DAYS) */
    function getUnlockedCount() {
        return Math.min(getTodayIndex(), TOTAL_DAYS);
    }

    /** Date (objet Date) correspondant à un jour donné (1-365) */
    function getDateForDay(dayIndex) {
        const [y, m, d] = START_DATE.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        date.setDate(date.getDate() + dayIndex - 1);
        return date;
    }

    /** Formater une date en français lisible */
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
    // NAVIGATION ENTRE ÉCRANS
    // ────────────────────────────────────────────

    function showScreen(screen) {
        [loginScreen, quizScreen, calendarScreen].forEach(function (s) {
            s.hidden = true;
        });
        screen.hidden = false;
    }

    /** Le quiz est auto-validé à partir du 15 février 2026 (Paris) */
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
            showScreen(quizScreen);
            initQuiz();
        } else {
            showScreen(calendarScreen);
            initCalendar();
        }
    }

    // ────────────────────────────────────────────
    // CONNEXION
    // ────────────────────────────────────────────

    function handleLogin(e) {
        e.preventDefault();
        var user = usernameInput.value.trim().toLowerCase();
        var pass = passwordInput.value;

        if (user === CREDENTIALS.username && pass === CREDENTIALS.password) {
            localStorage.setItem("loggedIn", "true");
            loginError.hidden = true;
            navigateToCorrectScreen();
        } else {
            loginError.hidden = false;
            passwordInput.value = "";
            passwordInput.focus();
        }
    }

    function handleLogout() {
        localStorage.removeItem("loggedIn");
        usernameInput.value = "";
        passwordInput.value = "";
        loginError.hidden = true;
        showScreen(loginScreen);
    }

    // ────────────────────────────────────────────
    // QUIZ
    // ────────────────────────────────────────────

    function initQuiz() {
        currentQuestion = 0;
        selectedAnswer = -1;
        score = 0;
        quizResult.hidden = true;
        quizBody.hidden = false;
        quizNextBtn.disabled = true;
        renderQuestion();
    }

    function renderQuestion() {
        var q = QUIZ_QUESTIONS[currentQuestion];
        var total = QUIZ_QUESTIONS.length;
        selectedAnswer = -1;
        quizNextBtn.disabled = true;

        quizQuestionNum.textContent =
            "Question " + (currentQuestion + 1) + "/" + total;
        quizQuestionText.textContent = q.question;
        quizProgressBar.style.width = (currentQuestion / total) * 100 + "%";

        quizChoices.innerHTML = "";
        q.choices.forEach(function (choice, i) {
            var btn = document.createElement("button");
            btn.className = "quiz-choice";
            btn.type = "button";
            btn.textContent = choice;
            btn.addEventListener("click", function () {
                selectAnswer(i);
            });
            quizChoices.appendChild(btn);
        });
    }

    function selectAnswer(index) {
        selectedAnswer = index;
        quizNextBtn.disabled = false;
        var buttons = quizChoices.querySelectorAll(".quiz-choice");
        buttons.forEach(function (btn, i) {
            btn.classList.toggle("selected", i === index);
        });
    }

    function handleNextQuestion() {
        if (selectedAnswer === -1) return;

        if (selectedAnswer === QUIZ_QUESTIONS[currentQuestion].correct) {
            score++;
        }

        currentQuestion++;
        if (currentQuestion < QUIZ_QUESTIONS.length) {
            renderQuestion();
        } else {
            showQuizResult();
        }
    }

    function showQuizResult() {
        quizBody.hidden = true;
        quizResult.hidden = false;
        quizProgressBar.style.width = "100%";
        var total = QUIZ_QUESTIONS.length;

        if (score >= MIN_SCORE) {
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
            showHearts();
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
    }

    // ────────────────────────────────────────────
    // ANIMATION CŒURS
    // ────────────────────────────────────────────

    function showHearts() {
        var container = document.createElement("div");
        container.className = "hearts-container";
        var hearts = ["❤️", "💕", "💖", "💗", "💝", "💘"];

        for (var i = 0; i < 35; i++) {
            var heart = document.createElement("span");
            heart.className = "floating-heart";
            heart.textContent =
                hearts[Math.floor(Math.random() * hearts.length)];
            heart.style.left = Math.random() * 100 + "%";
            heart.style.animationDelay = Math.random() * 2.5 + "s";
            heart.style.animationDuration = 2.5 + Math.random() * 3 + "s";
            heart.style.fontSize = 16 + Math.random() * 24 + "px";
            container.appendChild(heart);
        }

        document.body.appendChild(container);
        setTimeout(function () {
            container.remove();
        }, 6000);
    }

    // ────────────────────────────────────────────
    // CALENDRIER
    // ────────────────────────────────────────────

    function initCalendar() {
        var todayIndex = getTodayIndex();
        var unlockedUpTo = getUnlockedCount();

        // Pas encore commencé
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

        // Construire les mois (cache)
        if (!cachedMonths) {
            cachedMonths = buildMonths();
        }

        renderMonthTabs(cachedMonths, todayIndex, unlockedUpTo);
        var currentMonthIdx = findCurrentMonth(cachedMonths, todayIndex);
        selectMonth(currentMonthIdx, todayIndex, unlockedUpTo);
    }

    /** Construire la structure mois → jours */
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

    /** Trouver l'index du mois qui contient le jour actuel */
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

    /** Afficher les onglets de mois */
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

    /** Sélectionner un mois et afficher ses jours */
    function selectMonth(index, todayIndex, unlockedUpTo) {
        activeMonthIndex = index;
        var month = cachedMonths[index];

        // Mettre à jour l'onglet actif
        var tabs = monthTabs.querySelectorAll(".month-tab");
        tabs.forEach(function (tab, i) {
            tab.classList.toggle("active", i === index);
        });

        // Scroll l'onglet en vue
        if (tabs[index]) {
            tabs[index].scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "center",
            });
        }

        renderDays(month.days, todayIndex, unlockedUpTo);
    }

    /** Afficher la grille de jours pour un mois donné */
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

    /** Gérer le clic sur un jour */
    function handleDayClick(day, todayIndex, unlockedUpTo) {
        if (day.index > unlockedUpTo) {
            // Jour verrouillé
            var unlockDate = getDateForDay(day.index);
            openModal(
                "Jour " + day.index,
                formatDateFR(unlockDate),
                "Reviens le " + formatDateFR(unlockDate) + " ❤️",
                true,
            );
            return;
        }

        // Jour accessible
        markDayOpened(day.index);
        openModal(
            "Jour " + day.index,
            formatDateFR(day.date),
            REASONS[day.index - 1],
            false,
        );

        // Mettre à jour la grille (état "opened")
        var month = cachedMonths[activeMonthIndex];
        renderDays(month.days, todayIndex, unlockedUpTo);
    }

    // ────────────────────────────────────────────
    // MODAL
    // ────────────────────────────────────────────

    function openModal(title, date, text, isLocked) {
        modalDayTitle.textContent = title;
        modalDayDate.textContent = date;
        modalReasonText.textContent = text;
        modalContent.classList.toggle("locked", isLocked);

        reasonModal.hidden = false;
        // Force reflow pour l'animation
        void reasonModal.offsetWidth;
        reasonModal.classList.add("visible");

        modalClose.focus();
        document.body.style.overflow = "hidden";
    }

    function closeModal() {
        reasonModal.classList.remove("visible");
        document.body.style.overflow = "";
        setTimeout(function () {
            reasonModal.hidden = true;
        }, 300);
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

        quizNextBtn.addEventListener("click", handleNextQuestion);
        quizRetryBtn.addEventListener("click", initQuiz);
        quizCalendarBtn.addEventListener("click", function () {
            showScreen(calendarScreen);
            initCalendar();
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
