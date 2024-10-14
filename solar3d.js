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

var projectionMatrix;
var program;
var theta = vec3(0, 0, 0);
var thetaLoc;
var flag = false;
var axis = 0;

var orbitAngle = 0.0;


const speedControl = document.getElementById('speed');

let overallSpeed = parseFloat(speedControl.value);

const solarPlanet = [
    { name: 'Sun', radius: 0.05, orbitRadius: 0, speed: 0, color: [1.0, 1.0, 0.0, 1.0] },
    { name: 'Mercury', radius: 0.02, orbitRadius: 0.2, speed: 0.57, color: [0.7, 0.7, 0.7, 1.0] },
    { name: 'Venus', radius: 0.03, orbitRadius: 0.35, speed: 0.365, color: [1.0, 0.9, 0.0, 1.0] },
    { name: 'Earth', radius: 0.04, orbitRadius: 0.5, speed: 0.265, color: [0.0, 0.5, 1.0, 1.0] },
    { name: 'Mars', radius: 0.03, orbitRadius: 0.65, speed: 0.187, color: [1.0, 0.3, 0.3, 1.0] }
];

var cameraX = 0;  // Initial X-axis position for the camera
var cameraY = 0;  // Initial Y-axis position for the camera
var eye = vec3(cameraX, cameraY, 1.0);
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

function init() {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    // Get the device pixel ratio
    var devicePixelRatio = window.devicePixelRatio || 1;

    // Adjust the canvas size to match the device pixel ratio
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;


    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.1, 1.0); 
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    createSphere();

    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    var normalLoc = gl.getAttribLocation(program, "aNormal");
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalLoc);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);
    var positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    thetaLoc = gl.getUniformLocation(program, "theta");

    var aspect = canvas.width / canvas.height;
    projectionMatrix = ortho(-0.25 * aspect, 0.25 * aspect, -0.25, 0.25, -100, 100);
    
    // document.getElementById("ButtonX").onclick = function () { axis = 0; };
    // document.getElementById("ButtonY").onclick = function () { axis = 1; };
    // document.getElementById("ButtonZ").onclick = function () { axis = 2; };
    // document.getElementById("ButtonT").onclick = function () { flag = !flag; };
}

function createSphere() {
    var latitudeBands = 100;
    var longitudeBands = 100;
    var radius = 0.5;

    for (var latNumber = 0; latNumber <= latitudeBands; latNumber++) {
        var theta = latNumber * Math.PI / latitudeBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber = 0; longNumber <= longitudeBands; longNumber++) {
        var phi = longNumber * 2 * Math.PI / longitudeBands;
        var sinPhi = Math.sin(phi);
        var cosPhi = Math.cos(phi);

        var x = cosPhi * sinTheta;
        var y = cosTheta;
        var z = sinPhi * sinTheta;
        var normal = vec3(x, y, z);
        normalsArray.push(normal);
        positionsArray.push(vec4(radius * x, radius * y, radius * z, 1.0));
        }
    }

    // Generate indices for the sphere's triangle strips
    for (var latNumber = 0; latNumber < latitudeBands; latNumber++) {
        for (var longNumber = 0; longNumber < longitudeBands; longNumber++) {
        var first = (latNumber * (longitudeBands + 1)) + longNumber;
        var second = first + longitudeBands + 1;

        positionsArray.push(positionsArray[first]);
        normalsArray.push(normalsArray[first]);

        positionsArray.push(positionsArray[second]);
        normalsArray.push(normalsArray[second]);

        positionsArray.push(positionsArray[first + 1]);
        normalsArray.push(normalsArray[first + 1]);

        positionsArray.push(positionsArray[second]);
        normalsArray.push(normalsArray[second]);

        positionsArray.push(positionsArray[second + 1]);
        normalsArray.push(normalsArray[second + 1]);

        positionsArray.push(positionsArray[first + 1]);
        normalsArray.push(normalsArray[first + 1]);
        }
    }
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
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uProjectionMatrix"), false, flatten(projectionMatrix));
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Move camera based on the cameraX value
    var modelViewMatrix = lookAt(vec3(cameraX, cameraY, 1.0), at, up);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uModelViewMatrix"), false, flatten(modelViewMatrix));

    // Increment orbit angles
    orbitAngle += 0.01 * overallSpeed;

    solarPlanet.forEach((planet) => {
        const angle = orbitAngle * planet.speed;
        const x = Math.cos(angle) * (planet.orbitRadius + planet.radius);
        const z = Math.sin(angle) * (planet.orbitRadius + planet.radius);

        var planetModelViewMatrix = mult(modelViewMatrix, translate(x, 0.0, z));
        planetModelViewMatrix = mult(planetModelViewMatrix, scale(planet.radius, planet.radius, planet.radius));

        gl.uniform4fv(gl.getUniformLocation(program, "uMaterialColor"), flatten(vec4(planet.color)));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "uModelViewMatrix"), false, flatten(planetModelViewMatrix));

        gl.drawArrays(gl.TRIANGLES, 0, positionsArray.length);
    });

    requestAnimationFrame(render);
}

document.getElementById('camera-slider').addEventListener('input', (event) => {
    cameraX = parseFloat(event.target.value);
});

document.getElementById('camera-sliderY').addEventListener('input', (event) => {
    cameraY = parseFloat(event.target.value);
});



speedControl.addEventListener('input', (event) => {
    overallSpeed = parseFloat(event.target.value);
});

init();
updateLighting();
render();