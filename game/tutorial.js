document.addEventListener("DOMContentLoaded", function () {
    setTimeout(() => {
        const tutorial = document.createElement("div");
        tutorial.id = "tutorialBox";
        tutorial.style.position = "fixed";
        tutorial.style.top = "50%";
        tutorial.style.left = "50%";
        tutorial.style.transform = "translate(-50%, -50%)";
        tutorial.style.padding = "20px";
        tutorial.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        tutorial.style.color = "white";
        tutorial.style.fontSize = "20px";
        tutorial.style.borderRadius = "10px";
        tutorial.style.textAlign = "center";
        tutorial.style.opacity = "0";
        tutorial.style.transition = "opacity 1s ease-in-out";
        document.body.appendChild(tutorial);

        const steps = [
            "Step 1: HURRY UP PLACE A BUILDING NUMBER 2",
            "Step 2: THEN BUILDING 1 GATHER 500 URANIUM TO WIN",
            "Step 3: HIT THE G BUTTON TO SPAWN ENEMY BASE",
			"Step 4: SPAWN  WORKERS WITH 7 FIGHTERS with 8",
        ];

        let stepIndex = 0;

        function showNextStep() {
            if (stepIndex < steps.length) {
                tutorial.innerText = steps[stepIndex];
                tutorial.style.opacity = "1";
                setTimeout(() => {
                    tutorial.style.opacity = "0";
                    stepIndex++;
                    setTimeout(showNextStep, 1000);
                }, 3000);
            } else {
                setTimeout(() => {
                    tutorial.remove();
                }, 1000);
            }
        }

        showNextStep();
    }, 15000); // 30 seconds delay
});
