// Some browsers (Safari) refuse to start audio on a newly loaded page without a fresh tap or key
// press, even when the reader was listening on the page before. When that happens, offer one
// button that resumes, instead of leaving the reader to find Play.
let continueButton = null;

export function playOrOfferToContinue(audio) {
    audio.play().catch(error => {
        if (error?.name === 'NotAllowedError') showContinueButton(audio);
    });
}

function showContinueButton(audio) {
    if (continueButton) return;
    continueButton = document.createElement('button');
    continueButton.type = 'button';
    continueButton.id = 'webbook-continue-playing';
    continueButton.className = 'webbook';
    continueButton.textContent = 'Continue playing';
    continueButton.addEventListener('click', () => {
        audio.play().catch(() => {});
    });
    document.body.append(continueButton);

    const remove = () => {
        continueButton?.remove();
        continueButton = null;
        audio.removeEventListener('play', remove);
        document.removeEventListener('keydown', dismissOnEscape);
    };
    const dismissOnEscape = e => {
        if (e.key === 'Escape') remove();
    };
    audio.addEventListener('play', remove);
    document.addEventListener('keydown', dismissOnEscape);
    // The reader was listening, not looking, so take them straight to the one thing to do
    continueButton.focus({ preventScroll: true });
}
