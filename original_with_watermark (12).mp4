Delete Button Logic: The delete button's onclick function now prompts for a password before allowing the deletion of comments. Replace "yourPassword" with a secure password that only the developer knows.




 <!-- Tutorial Section -->
    <section id="tutorial" class="content-section">
        <h2 class="section-title">TUTORIAL</h2>
        <div class="tutorial-container">
            <div class="tutorial-step">
                <h3 class="step-title">Step 1: Understanding the Structure</h3>
                <p>The Game Hub is structured with a main <span class="highlight">index.html</span> file (this page) that loads games through an iframe. Each game should be in its own folder in the same directory as index.html.</p>
                <div class="code-example">
                    /game-hub/
                    ├── index.html           (this main portal page)
                    ├── ordinary-recycling/  (game folder)
                    │   ├── index.html
                    │   ├── game.js
                    │   └── ...other files
                    ├── ordinary-mars-builder/ (game folder)
                    │   ├── index.html
                    │   ├── game.js
                    │   └── ...other files
                    ├── game/                (your Babylon.js game folder)
                    │   ├── index.html
                    │   ├── game.js
                    │   └── ...other files
                    └── webapp/              (additional games folder)
                        └── game2/           (your new game folder)
                            ├── index.html
                            └── ...other files
                </div>
            </div>
            
            <div class="tutorial-step">
                <h3 class="step-title">Step 2: Adding Your Game</h3>
                <p>To add your Babylon.js game to the portal:</p>
                <ol>
                    <li>Create a folder with your game name in the same directory as this index.html</li>
                    <li>Place all your game files (HTML, JS, assets) in that folder</li>
                    <li>Make sure your game has an index.html file as the entry point</li>
                    <li>Update the dropdown menu in this file to include your game</li>
                </ol>
                <p>Your game's index.html should load all the necessary scripts and assets relative to its location:</p>
                <div class="code-example">
                    &lt;!-- Inside your game's index.html -->
                    &lt;html>
                    &lt;head>
                        &lt;title>My Babylon.js Game&lt;/title>
                        &lt;script src="game.js">&lt;/script>
                        &lt;!-- Load other assets relative to this file -->
                    &lt;/head>
                    &lt;body>
                        &lt;canvas id="renderCanvas">&lt;/canvas>
                    &lt;/body>
                    &lt;/html>
                </div>
            </div>
            
            <div class="tutorial-step">
                <h3 class="step-title">Step 3: How the Portal Works</h3>
                <p>The Game Hub works by:</p>
                <ol>
                    <li>Loading games in an iframe when selected from the dropdown</li>
                    <li>The JavaScript changes the iframe's src attribute to point to your game's index.html</li>
                    <li>Your game runs in its own contained environment within the iframe</li>
                </ol>
                <p>The dropdown selection triggers this JavaScript function:</p>
                <div class="code-example">
                    // When a game is selected from the dropdown
                    gameSelector.addEventListener('change', () => {
                        const selectedGame = gameSelector.value;
                        gameIframe.src = `${selectedGame}/index.html`;
                    });
                </div>
            </div>
            
            <div class="tutorial-step">
                <h3 class="step-title">Step 4: Troubleshooting</h3>
                <p>If your game doesn't load correctly:</p>
                <ul>
                    <li>Check that your folder name matches exactly what's in the dropdown value</li>
                    <li>Verify that your game has an index.html file at the root of its folder</li>
                    <li>Make sure your game loads all assets with relative paths, not absolute paths</li>
                    <li>Check browser console for any JavaScript errors</li>
                </ul>
                <p>For Babylon.js specific issues, make sure your game initializes properly when loaded in an iframe.</p>
            </div>
        </div>
    </section>
