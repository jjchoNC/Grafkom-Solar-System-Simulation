"use strict";


var canvas;
var gl;

var positionsArray = [];
var normalsArray = [];

var ambient = 0.5;
var diffuse = 0.5;
var specular = 0.5;

var materialColor = vec4(1.0, 1.0, 1.0, 1.0);

var lightPosition = vec4(1.0, 1.0, 1.0, 0.0);
var materialAmbient = vec4(1.0, 0.0, 1.0, 1.0);
var materialDiffuse = vec4(1.0, 0.8, 0.0, 1.0);
var materialSpecular = vec4(1.0, 0.8, 0.0, 1.0);
var materialShininess = 20.0;

var program;
var theta = vec3(0, 0, 0);
var thetaLoc;
var flag = false;
var axis = 0;
var zoom = 1.0;

var orbitAngle = 0.0;


const speedControl = document.getElementById('speed');

let overallSpeed = parseFloat(speedControl.value);
let overallSpeedTmp = parseFloat(speedControl.value);;

const solarPlanet = [
    { name: 'Sun', radius: 0.06, orbitRadius: 0, speed: 0, color: [1.0, 1.0, 0.0, 1.0] },
    { name: 'Mercury', radius: 0.02, orbitRadius: 0.1, speed: 0.57, color: [0.7, 0.7, 0.7, 1.0] },
    { name: 'Venus', radius: 0.03, orbitRadius: 0.175, speed: 0.365, color: [1.0, 0.9, 0.0, 1.0] },
    { name: 'Earth', radius: 0.04, orbitRadius: 0.25, speed: 0.265, color: [0.0, 0.5, 1.0, 1.0] },
    { name: 'Mars', radius: 0.03, orbitRadius: 0.32, speed: 0.187, color: [1.0, 0.3, 0.3, 1.0] },

];

var devicePixelRatio = window.devicePixelRatio || 1;
var cameraX = 0;  // Initial X-axis position for the camera
var cameraY = 0;  // Initial Y-axis position for the camera
var eye = vec3(cameraX, cameraY, 1.0);
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

function init() {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;


    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.1, 1.0);
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    createSphere(3, 0.75);

    thetaLoc = gl.getUniformLocation(program, "theta");

    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    var normalLoc = gl.getAttribLocation(program, "aNormal");
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalLoc);
}

function createSphere(subdivisions, radius) {
    const t = (1 + Math.sqrt(5)) / 2;

    const vertices = [
        vec3(-1, t, 0), vec3(1, t, 0), vec3(-1, -t, 0), vec3(1, -t, 0),
        vec3(0, -1, t), vec3(0, 1, t), vec3(0, -1, -t), vec3(0, 1, -t),
        vec3(t, 0, -1), vec3(t, 0, 1), vec3(-t, 0, -1), vec3(-t, 0, 1)
    ];

    vertices.forEach((v, i) => {
        vertices[i] = normalize(v);
    });

    const indices = [
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
        [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
        [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];
    function subdivide(v1, v2, v3, depth) {
        if (depth === 0) {
            positionsArray.push(vec4(radius * v1[0], radius * v1[1], radius * v1[2], 1.0));
            positionsArray.push(vec4(radius * v2[0], radius * v2[1], radius * v2[2], 1.0));
            positionsArray.push(vec4(radius * v3[0], radius * v3[1], radius * v3[2], 1.0));

            normalsArray.push(vec3(v1[0], v1[1], v1[2]));
            normalsArray.push(vec3(v2[0], v2[1], v2[2]));
            normalsArray.push(vec3(v3[0], v3[1], v3[2]));
        } else {
            let v12 = normalize(mix(v1, v2, 0.5));
            let v23 = normalize(mix(v2, v3, 0.5));
            let v31 = normalize(mix(v3, v1, 0.5));

            subdivide(v1, v12, v31, depth - 1);
            subdivide(v2, v23, v12, depth - 1);
            subdivide(v3, v31, v23, depth - 1);
            subdivide(v12, v23, v31, depth - 1);
        }
    }

    indices.forEach(triangle => {
        subdivide(vertices[triangle[0]], vertices[triangle[1]], vertices[triangle[2]], subdivisions);
    });

    return {
        positionsArray: positionsArray,
        normalsArray: normalsArray
    };
}

function updateLighting() {
    var lightAmbient = vec4(ambient, 0.5, 0.5, 1.0);
    var lightDiffuse = vec4(diffuse, 1.0, 1.0, 1.0);
    var lightSpecular = vec4(specular, 1.0, 1.0, 1.0);

    var ambientProduct = mult(lightAmbient, materialAmbient);
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var specularProduct = mult(lightSpecular, materialSpecular);

    gl.uniform4fv(gl.getUniformLocation(program, "uAmbientProduct"), ambientProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "uDiffuseProduct"), diffuseProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "uSpecularProduct"), specularProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "uLightPosition"), lightPosition);
    gl.uniform1f(gl.getUniformLocation(program, "uShininess"), materialShininess);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var aspect = canvas.width / canvas.height;
    var projectionMatrix = ortho(-0.25 * aspect * (1 / zoom), 0.25 * aspect * (1 / zoom), -0.25 * (1 / zoom), 0.25 * (1 / zoom), -100, 100);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uProjectionMatrix"), false, flatten(projectionMatrix));
    var modelViewMatrix = lookAt(vec3(cameraX, cameraY, 1.0), at, up);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uModelViewMatrix"), false, flatten(modelViewMatrix));

    // draw path
    solarPlanet.forEach((planet) => {
        var orbitVertices = [];
        for (let i = 0; i < 360; i++) {
            const x = Math.cos(i * Math.PI / 180) * planet.orbitRadius;
            const z = Math.sin(i * Math.PI / 180) * planet.orbitRadius;
            orbitVertices.push(vec4(x, 0.0, z, 1.0));
        }
        var orbitBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, orbitBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(orbitVertices), gl.STATIC_DRAW);
        var orbitPositionLoc = gl.getAttribLocation(program, "aOrbitPos");
        gl.vertexAttribPointer(orbitPositionLoc, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(orbitPositionLoc);

        gl.uniform4fv(gl.getUniformLocation(program, "uMaterialColor"), flatten(vec4(1.0, 1.0, 1.0, 1.0)));
        gl.uniform1f(gl.getUniformLocation(program, "uDrawOrbit"), 1.0);
        gl.drawArrays(gl.LINE_LOOP, 0, orbitVertices.length);
    });

    // draw planets
    solarPlanet.forEach((planet) => {
        const angle = orbitAngle * planet.speed;
        const x = Math.cos(angle) * (planet.orbitRadius);
        const z = Math.sin(angle) * (planet.orbitRadius);

        var planetModelViewMatrix = mult(modelViewMatrix, translate(x, 0.0, z));
        planetModelViewMatrix = mult(planetModelViewMatrix, scale(planet.radius, planet.radius, planet.radius));

        gl.uniform4fv(gl.getUniformLocation(program, "uMaterialColor"), flatten(vec4(planet.color)));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "uModelViewMatrix"), false, flatten(planetModelViewMatrix));

        var vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);
        var positionLoc = gl.getAttribLocation(program, "aPlanetPos");
        gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionLoc);

        gl.uniform1f(gl.getUniformLocation(program, "uDrawOrbit"), 0.0);
        gl.drawArrays(gl.TRIANGLES, 0, positionsArray.length);
    });

    orbitAngle += 0.01 * overallSpeed;
    requestAnimationFrame(render);
}

document.getElementById('camera-slider').addEventListener('input', (event) => {
    cameraX = parseFloat(event.target.value);
});

document.getElementById('camera-sliderY').addEventListener('input', (event) => {
    cameraY = parseFloat(event.target.value);
});

document.getElementById('zoom-slider').addEventListener('input', (event) => {
    zoom = parseFloat(event.target.value);
});

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
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    console.log(canvas.width, canvas.height);
    gl.viewport(0, 0, canvas.width, canvas.height);
}

window.addEventListener('resize', resizeCanvas);
speedControl.addEventListener('input', (event) => {
    overallSpeed = parseFloat(event.target.value);
});

document.getElementById('planet-form').addEventListener('submit', function (event) {
    event.preventDefault();

    const planetName = document.getElementById('planet-name').value;
    const planetRadius = parseFloat(document.getElementById('planet-radius').value);
    const orbitRadius = parseFloat(document.getElementById('planet-orbit-radius').value);
    const planetSpeed = parseFloat(document.getElementById('planet-speed').value);

    if (!planetName || isNaN(planetRadius) || isNaN(orbitRadius) || isNaN(planetSpeed)) {
        alert("Please enter valid planet details.");
        return;
    }

    let maxPlanetRadius = -1;
    let indexMaxPlanetRadius = -1;

    for (let i = 0; i < solarPlanet.length; i++) {
        if (solarPlanet[i].radius > maxPlanetRadius) {
            maxPlanetRadius = solarPlanet[i].radius;
            indexMaxPlanetRadius = i;
        }
    }

    if (planetRadius + orbitRadius < maxPlanetRadius + solarPlanet[indexMaxPlanetRadius].orbitRadius) {
        alert("The new planet will collide with the existing planet. Please enter valid planet details.");
        return;
    }

    solarPlanet.push({
        name: planetName,
        radius: planetRadius,
        orbitRadius: orbitRadius,
        speed: planetSpeed,
        color: [Math.random(), Math.random(), Math.random(), 1.0]
    });

    document.getElementById('planet-form').reset();
    render();
});

init();
updateLighting();
render();