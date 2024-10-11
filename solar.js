const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl2');

if (!gl) alert("WebGL 2.0 isn't available");

const sunPosition = [0, 0];
const planetPositions = [
    { name: 'Mercury', radius: 0.02, orbitRadius: 0.2, speed: 0.01, color: [0.7, 0.7, 0.7, 1.0] },
    { name: 'Venus', radius: 0.03, orbitRadius: 0.35, speed: 0.008, color: [1.0, 0.9, 0.0, 1.0] },
    { name: 'Earth', radius: 0.04, orbitRadius: 0.5, speed: 0.006, color: [0.0, 0.5, 1.0, 1.0] },
    { name: 'Mars', radius: 0.03, orbitRadius: 0.65, speed: 0.005, color: [1.0, 0.3, 0.3, 1.0] }
];

let time = 0;  
let zoom = 1.0;
let projectionMatrixLoc; 

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

    const planetPosition = new Float32Array([x, y]);
    gl.bufferData(gl.ARRAY_BUFFER, planetPosition, gl.STATIC_DRAW);

    const colorLocation = gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'u_Color');
    gl.uniform4fv(colorLocation, new Float32Array(planet.color));

    gl.drawArrays(gl.POINTS, 0, 1);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    const projectionMatrix = [
        zoom, 0, 0, 0,
        0, zoom, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];
    gl.uniformMatrix4fv(projectionMatrixLoc, false, new Float32Array(projectionMatrix));

    drawPlanet({ orbitRadius: 0, color: [1.0, 1.0, 0.0, 1.0] }, 0); 

    planetPositions.forEach((planet) => {
        const angle = time * planet.speed * 100;
        drawPlanet(planet, angle);
    });

    time += 0.01;
    requestAnimationFrame(render);
}

init();
render();