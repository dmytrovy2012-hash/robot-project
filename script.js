let selected = {
    head: null,
    body: null,
    legs: null
};

function buildRobot() {
    const messageEl = document.getElementById("build-message");

    if (!selected.head || !selected.body || !selected.legs) {
        messageEl.innerText = "⚠️ Please choose all parts first!";
        messageEl.style.display = "block";
        setTimeout(() => messageEl.style.display = "none", 3000);
        return;
    }

    messageEl.innerText = "✅ Your robot is being built!";
    messageEl.style.display = "block";
    setTimeout(() => messageEl.style.display = "none", 3000);
}

function setupSelection(containerClass, type) {
    const cards = document.querySelectorAll(containerClass + " .presetrobot-cards");
    cards.forEach(card => {
        card.addEventListener("click", () => {
            cards.forEach(c => c.classList.remove("selected"));
            card.classList.add("selected");
            const name = card.querySelector("p").innerText;
            selected[type] = name;
            updateSummary();
        });
    });
}

function updateSummary() {
    document.getElementById("summary").innerHTML = `
        <p><strong>Head:</strong> ${selected.head || 'None selected'}</p>
        <p><strong>Body:</strong> ${selected.body || 'None selected'}</p>
        <p><strong>Legs:</strong> ${selected.legs || 'None selected'}</p>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    setupSelection(".head-in-midell", "head");
    setupSelection(".body-in-midell", "body");
    setupSelection(".lowerbody-in-midell", "legs");

    const openBtn = document.getElementById("openForm");
    const form = document.getElementById("formBox");
    const overlay = document.getElementById("overlay");
    const closeBtn = document.getElementById("closeBtn");

    openBtn.addEventListener("click", () => {
        form.style.display = "block";
        overlay.style.display = "block";
    });

    closeBtn.addEventListener("click", () => {
        form.style.display = "none";
        overlay.style.display = "none";
    });

    overlay.addEventListener("click", () => {
        form.style.display = "none";
        overlay.style.display = "none";
    });
});