const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl2');
const speedControl = document.getElementById('speed');
const infoBox = document.getElementById('info');

if (!gl) alert("WebGL 2.0 isn't available");

const sunPosition = [0, 0];
const planetPositions = [
    { name: 'Mercury', radius: 0.02, orbitRadius: 0.2, speed: 0.67, color: [0.7, 0.7, 0.7, 1.0] },
    { name: 'Venus', radius: 0.03, orbitRadius: 0.35, speed: 0.465, color: [1.0, 0.9, 0.0, 1.0] },
    { name: 'Earth', radius: 0.04, orbitRadius: 0.5, speed: 0.365, color: [0.0, 0.5, 1.0, 1.0] },
    { name: 'Mars', radius: 0.03, orbitRadius: 0.65, speed: 0.287, color: [1.0, 0.3, 0.3, 1.0] }
];

let time = 0;
let zoom = 1.0;
let projectionMatrixLoc;
let overallSpeed = parseFloat(speedControl.value);  


canvas.addEventListener('mousemove', handleMouseMove);

function init() {
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

    const numSegments = 30; 
    const circleVertices = [];
    const radius = planet.radius;

    circleVertices.push(x, y);  

    for (let i = 0; i <= numSegments; i++) {
        const theta = (i / numSegments) * 2 * Math.PI;
        const circleX = x + Math.cos(theta) * radius;
        const circleY = y + Math.sin(theta) * radius;
        circleVertices.push(circleX, circleY);
    }
    
    const verticesArray = new Float32Array(circleVertices);
    
    gl.bufferData(gl.ARRAY_BUFFER, verticesArray, gl.STATIC_DRAW);

    const colorLocation = gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'u_Color');
    gl.uniform4fv(colorLocation, new Float32Array(planet.color));

    
    gl.drawArrays(gl.TRIANGLE_FAN, 0, numSegments + 2);

    return { x, y };
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

    drawPlanet({ orbitRadius: 0, radius: 0.05, color: [1.0, 1.0, 0.0, 1.0] }, 0);

    planetPositions.forEach((planet) => {
        const angle = time * planet.speed ;
        planet.currentPosition = drawPlanet(planet, angle);
    });

    time += 0.01 * overallSpeed;
    requestAnimationFrame(render);
}

function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / canvas.width) * 2 - 1;
    const y = ((rect.top - event.clientY) / canvas.height) * 2 + 1; 
    
    let hovered = false;
    planetPositions.forEach(planet => {
        const dist = Math.hypot(x - planet.currentPosition.x, y - planet.currentPosition.y);
        console.log(dist, planet.radius * 2);
        
        if (dist < planet.radius * 2) {
            hovered = true;
            infoBox.style.display = 'block';
            infoBox.style.left = `${event.clientX + 10}px`;
            infoBox.style.top = `${event.clientY + 10}px`;
            infoBox.textContent = planet.name;
        }
    });

    if (!hovered) infoBox.style.display = 'none';
}

speedControl.addEventListener('input', (event) => {
    overallSpeed = parseFloat(event.target.value);
});

init();
render();
