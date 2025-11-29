/**
 * ENTITY RESCUE SCRIPT
 * Paste this into the browser console to force-spawn organisms
 * Use this if the automatic initialization fails
 */

(function () {
    console.log('🚑 ENTITY RESCUE PROTOCOL INITIATED');
    console.log('==================================');

    // Step 1: Check if entity system is loaded
    if (typeof window.entityManager === 'undefined') {
        console.error('❌ EntityManager not found! Scripts may not be loaded.');
        console.log('💡 Refresh the page and try again.');
        return;
    }

    console.log('✓ EntityManager found');

    // Step 2: Check for canvas
    const canvas = document.getElementById('organism-canvas');
    if (!canvas) {
        console.error('❌ Canvas element not found!');
        console.log('💡 The canvas might be missing from the HTML.');
        return;
    }

    console.log(`✓ Canvas found (${canvas.width}x${canvas.height})`);

    // Step 3: Force connect renderer
    if (!window.entityManager.renderer) {
        if (typeof EntityRenderer === 'undefined') {
            console.error('❌ EntityRenderer class not loaded!');
            return;
        }

        try {
            window.entityManager.renderer = new EntityRenderer(canvas);
            console.log('✓ Renderer forcefully connected');
        } catch (e) {
            console.error('❌ Failed to create renderer:', e.message);
            return;
        }
    } else {
        console.log('✓ Renderer already connected');
    }

    // Step 4: Check if animation is running
    if (!window.entityManager.running) {
        window.entityManager.start();
        console.log('✓ Animation loop started');
    } else {
        console.log('✓ Animation already running');
    }

    // Step 5: Clear any dead entities
    window.entityManager.clear();
    console.log('🗑️  Cleared any existing entities');

    // Step 6: SPAWN NEW LIFE!
    console.log('');
    console.log('🌱 SPAWNING NEW ORGANISMS...');

    const count = 5;
    for (let i = 0; i < count; i++) {
        const entity = window.entityManager.spawn({
            x: 100 + Math.random() * (window.innerWidth - 200),
            y: 100 + Math.random() * (window.innerHeight - 200),
            size: 40 + Math.random() * 60,
            speed: 0.8 + Math.random() * 1.5,
            tentacles: Math.floor(4 + Math.random() * 8)
        });

        console.log(`  ✓ Spawned organism ${i + 1}: ${entity.id.substr(0, 20)}...`);
        console.log(`    - Size: ${Math.round(entity.size)}px`);
        console.log(`    - Color: ${entity.color}`);
        console.log(`    - Pattern: ${entity.skinPattern}`);
        console.log(`    - Particles: ${entity.particles.length}`);
    }

    console.log('');
    console.log('🎉 SUCCESS! Your organisms are ALIVE!');
    console.log(`📊 Total organisms: ${window.entityManager.entities.length}`);
    console.log(`🎨 Renderer: ${window.entityManager.renderer ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`▶️  Animation: ${window.entityManager.running ? 'RUNNING' : 'STOPPED'}`);
    console.log('');
    console.log('👀 Look at your screen - you should see colorful blobs floating around!');
    console.log('');
    console.log('💡 Additional commands:');
    console.log('  - entityManager.spawnMultiple(10) - spawn 10 more');
    console.log('  - entityManager.clear() - remove all');
    console.log('  - entityManager.entities - view all living organisms');
})();
