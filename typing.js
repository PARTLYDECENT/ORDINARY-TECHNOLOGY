document.addEventListener('DOMContentLoaded', () => {
    const shoutoutBaseText = "Initializing connection... Designmiii @ Instagram... Signal acquired. ";
    const shoutoutSuffix = "🎨✨";
    const fullText = shoutoutBaseText + shoutoutSuffix;
    const typingElement = document.getElementById('shoutout');
    let i = 0;
    let isDeleting = false;
    let loopCount = 0;

    function typeWriter() {
        if (!typingElement) return; // Exit if element not found

        const currentText = fullText.substring(0, i);

        if (isDeleting) {
            // Deleting phase (only delete the suffix)
            if (i > shoutoutBaseText.length) {
                 typingElement.innerHTML = shoutoutBaseText + fullText.substring(shoutoutBaseText.length, i - 1);
                 i--;
                 setTimeout(typeWriter, 50); // Faster deleting
            } else {
                isDeleting = false;
                loopCount++;
                 // Optional: Add a pause before retyping suffix
                 setTimeout(typeWriter, 800);
            }
        } else {
            // Typing phase
            typingElement.innerHTML = currentText;
            if (i < fullText.length) {
                typingElement.innerHTML += '<span class="cursor-blink">|</span>'; // Add temporary cursor
                 i++;
                 // Add random delay for more natural typing
                 setTimeout(typeWriter, Math.random() * 100 + 40);
             } else {
                // Finished typing full text
                typingElement.innerHTML = fullText; // Ensure full text is shown without cursor
                isDeleting = true;
                // Pause before deleting suffix
                 setTimeout(typeWriter, 4000);
             }
        }
         // Remove temporary cursor after short delay (if not deleting base text)
         if (!isDeleting && i <= fullText.length) {
            setTimeout(() => {
                const cursor = typingElement.querySelector('.cursor-blink');
                if(cursor) cursor.remove();
             }, 30);
         }
    }

    // Initial call with a delay
    setTimeout(typeWriter, 1500);
});

// Simple CSS for the temporary cursor (add to style.css or keep inline if preferred)
const style = document.createElement('style');
style.innerHTML = `
  .cursor-blink {
    animation: blink-temp 0.5s step-end infinite;
    font-weight: bold;
    margin-left: 1px;
    color: var(--primary-color);
  }
  @keyframes blink-temp {
    from, to { opacity: 1; }
    50% { opacity: 0; }
  }
`;
document.head.appendChild(style);