const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl2');
const speedControl = document.getElementById('speed');
const infoBox = document.getElementById('info');

if (!gl) alert("WebGL 2.0 isn't available");

const planetPositions = [
    { name: 'Sun', radius: 0.05, orbitRadius: 0, speed: 0, color: [1.0, 1.0, 0.0, 1.0] },
    { name: 'Mercury', radius: 0.02, orbitRadius: 0.2, speed: 0.67, color: [0.7, 0.7, 0.7, 1.0] },
    { name: 'Venus', radius: 0.03, orbitRadius: 0.35, speed: 0.465, color: [1.0, 0.9, 0.0, 1.0] },
    { name: 'Earth', radius: 0.04, orbitRadius: 0.5, speed: 0.365, color: [0.0, 0.5, 1.0, 1.0] },
    { name: 'Mars', radius: 0.03, orbitRadius: 0.65, speed: 0.287, color: [1.0, 0.3, 0.3, 1.0] }
];

let time = 0;
let zoom = 1.0;
let projectionMatrixLoc;
let overallSpeed = parseFloat(speedControl.value);  
let overallSpeedTmp = parseFloat(speedControl.value); ;

function init() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    console.log(canvas.width, canvas.height);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);

    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positionLocation = gl.getAttribLocation(program, 'a_Position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    projectionMatrixLoc = gl.getUniformLocation(program, 'u_ProjectionMatrix');
}

function drawPlanet(planet, angle) {
    const x = Math.cos(angle) * planet.orbitRadius; 
    const y = Math.sin(angle) * planet.orbitRadius; 

    const canvasX = x; 
    const canvasY = -y; 

    const numSegments = 100; 
    const circleVertices = [];
    const radius = planet.radius;
    circleVertices.push(canvasX, canvasY);  

    for (let i = 0; i <= numSegments; i++) {
        const theta = (i / numSegments) * 2 * Math.PI;
        const circleX = canvasX + Math.cos(theta) * radius;
        const circleY = canvasY + Math.sin(theta) * radius;
        circleVertices.push(circleX, circleY);
    } 
    
    const verticesArray = new Float32Array(circleVertices);
    
    gl.bufferData(gl.ARRAY_BUFFER, verticesArray, gl.STATIC_DRAW);

    const colorLocation = gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'u_Color');
    gl.uniform4fv(colorLocation, new Float32Array(planet.color));

    gl.drawArrays(gl.TRIANGLE_FAN, 0, numSegments + 2);

    return { x: canvasX, y: canvasY }; 
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    const aspect = canvas.width / canvas.height;

    const projectionMatrix = [
        zoom / aspect, 0, 0, 0,
        0, zoom, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];
    gl.uniformMatrix4fv(projectionMatrixLoc, false, new Float32Array(projectionMatrix));
    
    planetPositions.forEach((planet) => {
        const angle = time * planet.speed;
        const position = drawPlanet(planet, angle);
        planet.currentPosition = { x: position.x, y: position.y };  
    });

    time += 0.01 * overallSpeed;
    requestAnimationFrame(render);
}

function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    
    const mouseX = event.clientX - rect.left; 
    const mouseY = event.clientY - rect.top;

    const x = ((mouseX / canvas.width) * 2 - 1) * (canvas.width/ canvas.height);
    const y = (mouseY / canvas.height) * -2 + 1;

    let hovered = false;
    
    console.log(`Normalized Mouse coordinates: (${x.toFixed(2)}, ${y.toFixed(2)})`);

    planetPositions.forEach(planet => {
        
        const dist = Math.hypot(x - planet.currentPosition.x, y - planet.currentPosition.y);

        
        console.log(`Checking ${planet.name}: position=(${planet.currentPosition.x.toFixed(2)}, ${planet.currentPosition.y.toFixed(2)}), distance=${dist.toFixed(2)}, planet radius=${planet.radius * 2}`);

        if (dist < planet.radius * 2) {
            hovered = true;
            infoBox.style.display = 'block';
            infoBox.style.left = `${event.clientX + 10}px`;
            infoBox.style.top = `${event.clientY + 10}px`;
            infoBox.textContent = planet.name;
        }
    });

    if (!hovered) {
        infoBox.style.display = 'none';
    }
}

function pause() {
    if (overallSpeed === 0) {
        return
    }
    overallSpeedTmp = overallSpeed;
    overallSpeed = 0;
    speedControl.value = 0;
}


function resume() {
    if (overallSpeed !== 0) {
        return
    }
    overallSpeed = overallSpeedTmp;
    speedControl.value = overallSpeed;
}

function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}

window.addEventListener('resize', resizeCanvas);
canvas.addEventListener('mousemove', handleMouseMove);
speedControl.addEventListener('input', (event) => {
    overallSpeed = parseFloat(event.target.value);
});

init();
render();
